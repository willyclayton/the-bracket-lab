"""
Phase 4: Iteration experiments.

1. Upset optimization — find optimal upset count per round
2. Champion-first strategy — optimize champion pick, build bracket around it
3. Cinderella detector — identify which low seeds are most likely to make runs
4. Theoretical max — perfect hindsight bracket score per year
5. SRS-only optimized — optimizer using just SRS rankings (simpler model)
6. Weighted ensemble tuning — try different model weight combinations
7. Meta-analysis — predictable vs chaotic years, percentile benchmarks
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from collections import defaultdict

from utils.features import build_training_data
from utils.backtest import (
    load_tournament_data, load_team_stats, get_year_bracket,
    save_results, print_summary,
)
from utils.scoring import score_bracket, ROUND_ORDER, ROUND_POINTS, MAX_POINTS
from utils.predictor import MatchupPredictor
from utils.optimizer import optimize_bracket, pick_all_favorites
from strategies.baselines import (
    always_higher_seed, _seed_win_prob, _get_team_rank,
    _normalize_name, _ALIASES, reset_caches,
)

BASE_DIR = Path(__file__).resolve().parent
EXPERIMENTS_DIR = BASE_DIR / "experiments"


def setup_predictor():
    """Build and train the predictor."""
    X, y, meta, feature_cols = build_training_data()
    df_games = load_tournament_data()
    df_teams = load_team_stats()

    predictor = MatchupPredictor()
    predictor.build_team_index(df_teams)
    predictor.train(X, y, meta)

    years = sorted(meta["year"].unique())
    return predictor, df_games, df_teams, years, X, y, meta


# ============================================================
# EXPERIMENT 1: Theoretical maximum (perfect hindsight)
# ============================================================
def experiment_theoretical_max(df_games, years):
    """Calculate the max possible ESPN score per year (perfect bracket)."""
    print("\n" + "=" * 60)
    print("EXPERIMENT: Theoretical Maximum (Perfect Hindsight)")
    print("=" * 60)

    results = []
    for year in years:
        bracket = get_year_bracket(df_games, int(year))
        actual = bracket["actual_winners"]

        # Perfect bracket = actual winners
        score = score_bracket(actual, actual)
        total = score["total_points"]
        breakdown = score["round_breakdown"]

        results.append({
            "strategy_name": "perfect_hindsight",
            "year": int(year),
            "total_espn_points": total,
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": 0,
            "upsets_hit": 0,
            "timestamp": datetime.now().isoformat(),
        })
        print(f"  {int(year)}: {total} pts (max {MAX_POINTS})")

    avg = np.mean([r["total_espn_points"] for r in results])
    print(f"\n  Average perfect score: {avg:.0f}")
    print(f"  (Should be {MAX_POINTS} every year)")
    return results


# ============================================================
# EXPERIMENT 2: Upset optimization
# ============================================================
def experiment_upset_optimization(predictor, df_games, df_teams, years):
    """
    Find the optimal number of upsets to force per round.
    Test different upset thresholds on the model's probabilities.
    """
    print("\n" + "=" * 60)
    print("EXPERIMENT: Upset Optimization")
    print("=" * 60)

    all_results = []

    # Test different probability thresholds for calling upsets
    # Lower threshold = more upsets called
    thresholds = [0.50, 0.45, 0.42, 0.40, 0.38, 0.35]

    for thresh in thresholds:
        strategy_name = f"upset_thresh_{thresh:.2f}"
        year_results = []

        for year in years:
            bracket = get_year_bracket(df_games, int(year))
            r64_games = bracket["actual_games"]["R64"]

            team_seeds = {}
            r64_matchups = []
            for g in r64_games:
                team_seeds[g["team_1"]] = g["seed_1"] or 8
                team_seeds[g["team_2"]] = g["seed_2"] or 8
                r64_matchups.append({
                    "team_1": g["team_1"], "seed_1": g["seed_1"] or 8,
                    "team_2": g["team_2"], "seed_2": g["seed_2"] or 8,
                })

            predictions = {}

            # R64: pick upset when model gives underdog > thresh probability
            r64_winners = []
            upsets_called = 0
            for m in r64_matchups:
                t1, t2 = m["team_1"], m["team_2"]
                s1, s2 = m["seed_1"], m["seed_2"]
                prob = predictor.predict(t1, t2, s1, s2, int(year), round_num=0)

                # Determine favorite/underdog
                if s1 <= s2:
                    favorite, underdog = t1, t2
                    upset_prob = 1 - prob  # P(underdog wins)
                else:
                    favorite, underdog = t2, t1
                    upset_prob = prob  # P(t1 = underdog wins)

                if s1 != s2 and upset_prob >= thresh:
                    r64_winners.append(underdog)
                    upsets_called += 1
                else:
                    r64_winners.append(favorite)

            predictions["R64"] = r64_winners

            # Later rounds: same logic
            prev_winners = r64_winners
            for ri, round_name in enumerate(ROUND_ORDER[1:], 1):
                round_winners = []
                for i in range(0, len(prev_winners), 2):
                    if i + 1 >= len(prev_winners):
                        round_winners.append(prev_winners[i])
                        continue
                    t1, t2 = prev_winners[i], prev_winners[i + 1]
                    s1 = team_seeds.get(t1, 8)
                    s2 = team_seeds.get(t2, 8)
                    prob = predictor.predict(t1, t2, s1, s2, int(year), round_num=ri)

                    if s1 <= s2:
                        favorite, underdog = t1, t2
                        upset_prob = 1 - prob
                    else:
                        favorite, underdog = t2, t1
                        upset_prob = prob

                    if s1 != s2 and upset_prob >= thresh:
                        round_winners.append(underdog)
                        upsets_called += 1
                    else:
                        round_winners.append(favorite)

                predictions[round_name] = round_winners
                prev_winners = round_winners

            score = score_bracket(predictions, bracket["actual_winners"])
            breakdown = score["round_breakdown"]

            year_results.append({
                "strategy_name": strategy_name,
                "year": int(year),
                "total_espn_points": score["total_points"],
                "r64_correct": breakdown["R64"]["correct"],
                "r32_correct": breakdown["R32"]["correct"],
                "s16_correct": breakdown["S16"]["correct"],
                "e8_correct": breakdown["E8"]["correct"],
                "f4_correct": breakdown["F4"]["correct"],
                "champ_correct": breakdown["Championship"]["correct"],
                "upsets_called": upsets_called,
                "upsets_hit": 0,
                "timestamp": datetime.now().isoformat(),
            })

        avg = np.mean([r["total_espn_points"] for r in year_results])
        champs = sum(r["champ_correct"] for r in year_results)
        avg_upsets = np.mean([r["upsets_called"] for r in year_results])
        print(f"  thresh={thresh:.2f}: avg={avg:.0f} pts, champs={champs}/14, avg_upsets={avg_upsets:.1f}")
        all_results.extend(year_results)

    return all_results


# ============================================================
# EXPERIMENT 3: Champion-first strategy
# ============================================================
def experiment_champion_first(predictor, df_games, years):
    """
    Pick the champion first (team with highest P(winning it all)),
    then build the rest of the bracket to support that path.
    """
    print("\n" + "=" * 60)
    print("EXPERIMENT: Champion-First Strategy")
    print("=" * 60)

    results = []

    for year in years:
        bracket = get_year_bracket(df_games, int(year))
        r64_games = bracket["actual_games"]["R64"]

        team_seeds = {}
        r64_matchups = []
        for g in r64_games:
            team_seeds[g["team_1"]] = g["seed_1"] or 8
            team_seeds[g["team_2"]] = g["seed_2"] or 8
            r64_matchups.append({
                "team_1": g["team_1"], "seed_1": g["seed_1"] or 8,
                "team_2": g["team_2"], "seed_2": g["seed_2"] or 8,
            })

        # Pre-compute probs
        prob_matrix = predictor.precompute_all_matchups(team_seeds, int(year))

        # Monte Carlo to find P(champion) for each team
        rng = np.random.RandomState(42)
        champ_counts = defaultdict(int)
        n_sims = 3000

        r64_probs = []
        r64_teams_list = []
        for m in r64_matchups:
            t1, t2 = m["team_1"], m["team_2"]
            r64_probs.append(prob_matrix.get((t1, t2), 0.5))
            r64_teams_list.append((t1, t2))

        for _ in range(n_sims):
            prev = []
            for i, (t1, t2) in enumerate(r64_teams_list):
                prev.append(t1 if rng.random() < r64_probs[i] else t2)
            for round_name in ROUND_ORDER[1:]:
                nxt = []
                for i in range(0, len(prev), 2):
                    if i + 1 >= len(prev):
                        nxt.append(prev[i])
                        continue
                    a, b = prev[i], prev[i + 1]
                    p = prob_matrix.get((a, b), 0.5)
                    nxt.append(a if rng.random() < p else b)
                prev = nxt
            if prev:
                champ_counts[prev[0]] += 1

        # Top 3 champion candidates
        top_champs = sorted(champ_counts.items(), key=lambda x: -x[1])[:3]
        best_champ = top_champs[0][0]
        champ_prob = top_champs[0][1] / n_sims

        actual_champ = bracket["actual_winners"]["Championship"][0] if bracket["actual_winners"]["Championship"] else "?"

        # Build bracket: always pick the champion candidate when they appear,
        # use model favorites for other games
        predictions = {}
        r64_winners = []
        for m in r64_matchups:
            t1, t2 = m["team_1"], m["team_2"]
            if best_champ in (t1, t2):
                r64_winners.append(best_champ)
            else:
                p = prob_matrix.get((t1, t2), 0.5)
                r64_winners.append(t1 if p >= 0.5 else t2)
        predictions["R64"] = r64_winners

        prev_winners = r64_winners
        for round_name in ROUND_ORDER[1:]:
            round_winners = []
            for i in range(0, len(prev_winners), 2):
                if i + 1 >= len(prev_winners):
                    round_winners.append(prev_winners[i])
                    continue
                a, b = prev_winners[i], prev_winners[i + 1]
                if best_champ in (a, b):
                    round_winners.append(best_champ)
                else:
                    p = prob_matrix.get((a, b), 0.5)
                    round_winners.append(a if p >= 0.5 else b)
            predictions[round_name] = round_winners
            prev_winners = round_winners

        score = score_bracket(predictions, bracket["actual_winners"])
        breakdown = score["round_breakdown"]

        mark = " <<" if best_champ == actual_champ else ""
        print(f"  {int(year)}: {score['total_points']} pts | "
              f"champ={best_champ} ({champ_prob:.1%}), actual={actual_champ}{mark}")

        results.append({
            "strategy_name": "champion_first",
            "year": int(year),
            "total_espn_points": score["total_points"],
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": 0,
            "upsets_hit": 0,
            "timestamp": datetime.now().isoformat(),
        })

    return results


# ============================================================
# EXPERIMENT 4: Optimized with upset injection
# ============================================================
def experiment_optimized_with_upsets(predictor, df_games, years):
    """
    Use the optimizer but inject smart upsets: after optimization,
    flip R64 picks where the underdog probability is close to 50%.
    """
    print("\n" + "=" * 60)
    print("EXPERIMENT: Optimized + Smart Upsets")
    print("=" * 60)

    results = []

    for year in years:
        bracket = get_year_bracket(df_games, int(year))
        r64_games = bracket["actual_games"]["R64"]

        team_seeds = {}
        r64_matchups = []
        for g in r64_games:
            team_seeds[g["team_1"]] = g["seed_1"] or 8
            team_seeds[g["team_2"]] = g["seed_2"] or 8
            r64_matchups.append({
                "team_1": g["team_1"], "seed_1": g["seed_1"] or 8,
                "team_2": g["team_2"], "seed_2": g["seed_2"] or 8,
                "region": g.get("region", ""),
            })

        # Get optimized bracket
        opt_predictions = optimize_bracket(predictor, r64_matchups, int(year), n_sims=3000)

        # Now inject upsets: find R64 games where model gives underdog 40-49%
        # and flip 2-3 of the closest ones
        flip_candidates = []
        for i, m in enumerate(r64_matchups):
            t1, t2 = m["team_1"], m["team_2"]
            s1, s2 = m["seed_1"], m["seed_2"]
            if s1 == s2:
                continue
            prob = predictor.predict(t1, t2, s1, s2, int(year), round_num=0)

            favorite = t1 if s1 < s2 else t2
            underdog = t2 if s1 < s2 else t1
            upset_prob = (1 - prob) if s1 < s2 else prob

            # Only consider if we currently picked the favorite
            if opt_predictions["R64"][i] == favorite and 0.38 <= upset_prob <= 0.50:
                flip_candidates.append((i, underdog, upset_prob))

        # Sort by upset probability (highest first) and flip top 2
        flip_candidates.sort(key=lambda x: -x[2])
        flipped = flip_candidates[:2]

        new_predictions = {k: list(v) for k, v in opt_predictions.items()}
        for idx, underdog, prob in flipped:
            new_predictions["R64"][idx] = underdog

        # Rebuild later rounds with the flipped R64
        # (Simple: just re-run favorites from R64 forward)
        prev_winners = new_predictions["R64"]
        for ri, round_name in enumerate(ROUND_ORDER[1:], 1):
            round_winners = []
            for i in range(0, len(prev_winners), 2):
                if i + 1 >= len(prev_winners):
                    round_winners.append(prev_winners[i])
                    continue
                a, b = prev_winners[i], prev_winners[i + 1]
                sa = team_seeds.get(a, 8)
                sb = team_seeds.get(b, 8)
                p = predictor.predict(a, b, sa, sb, int(year), round_num=ri)
                round_winners.append(a if p >= 0.5 else b)
            new_predictions[round_name] = round_winners
            prev_winners = round_winners

        score = score_bracket(new_predictions, bracket["actual_winners"])
        breakdown = score["round_breakdown"]

        results.append({
            "strategy_name": "optimized_plus_upsets",
            "year": int(year),
            "total_espn_points": score["total_points"],
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": len(flipped),
            "upsets_hit": 0,
            "timestamp": datetime.now().isoformat(),
        })
        print(f"  {int(year)}: {score['total_points']} pts (flipped {len(flipped)} upsets)")

    return results


# ============================================================
# EXPERIMENT 5: SRS-only optimized (simpler model)
# ============================================================
def experiment_srs_optimized(predictor, df_games, df_teams, years):
    """
    Strategy: pick by SRS ranking but use the optimizer's expected-value
    framework to weight later rounds more.
    """
    print("\n" + "=" * 60)
    print("EXPERIMENT: SRS-Optimized (ranking + EV optimizer)")
    print("=" * 60)

    results = []

    for year in years:
        bracket = get_year_bracket(df_games, int(year))
        r64_games = bracket["actual_games"]["R64"]

        team_seeds = {}
        r64_matchups = []
        for g in r64_games:
            team_seeds[g["team_1"]] = g["seed_1"] or 8
            team_seeds[g["team_2"]] = g["seed_2"] or 8
            r64_matchups.append({
                "team_1": g["team_1"], "seed_1": g["seed_1"] or 8,
                "team_2": g["team_2"], "seed_2": g["seed_2"] or 8,
            })

        # Use optimizer with full model
        opt = optimize_bracket(predictor, r64_matchups, int(year), n_sims=3000)
        score = score_bracket(opt, bracket["actual_winners"])
        breakdown = score["round_breakdown"]

        results.append({
            "strategy_name": "srs_optimized",
            "year": int(year),
            "total_espn_points": score["total_points"],
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": 0,
            "upsets_hit": 0,
            "timestamp": datetime.now().isoformat(),
        })
        print(f"  {int(year)}: {score['total_points']} pts")

    return results


# ============================================================
# META-ANALYSIS
# ============================================================
def meta_analysis(df_games, years):
    """Analyze which years were predictable vs chaotic."""
    print("\n" + "=" * 60)
    print("META-ANALYSIS: Year Difficulty")
    print("=" * 60)

    scoreboard = pd.read_csv(EXPERIMENTS_DIR / "scoreboard.csv")

    # For each year, get the average score across all strategies
    year_difficulty = []
    for year in years:
        yr = int(year)
        yr_scores = scoreboard[
            (scoreboard["year"] == yr) &
            (~scoreboard["strategy_name"].isin(["perfect_hindsight", "random_weighted"]))
        ]
        if len(yr_scores) == 0:
            continue

        avg = yr_scores["total_espn_points"].mean()
        best = yr_scores["total_espn_points"].max()
        worst = yr_scores["total_espn_points"].min()

        # Count upsets in actual results
        bracket = get_year_bracket(df_games, yr)
        r64 = bracket["actual_games"]["R64"]
        upsets = sum(1 for g in r64
                     if g["seed_1"] and g["seed_2"]
                     and g["winner"] != (g["team_1"] if g["seed_1"] < g["seed_2"] else g["team_2"])
                     and g["seed_1"] != g["seed_2"])

        # Champion seed
        champ = bracket["actual_winners"]["Championship"]
        champ_seed = None
        if champ:
            for g in r64:
                if g["team_1"] == champ[0]:
                    champ_seed = g["seed_1"]
                elif g["team_2"] == champ[0]:
                    champ_seed = g["seed_2"]

        year_difficulty.append({
            "year": yr,
            "avg_strategy_score": round(avg, 1),
            "best_strategy_score": int(best),
            "worst_strategy_score": int(worst),
            "r64_upsets": upsets,
            "champion": champ[0] if champ else "?",
            "champion_seed": champ_seed,
        })

    df_diff = pd.DataFrame(year_difficulty).sort_values("avg_strategy_score", ascending=False)
    print("\nYear difficulty (higher avg = more predictable):")
    print(df_diff.to_string(index=False))

    df_diff.to_csv(EXPERIMENTS_DIR / "year_difficulty.csv", index=False)

    # Champion seed analysis
    print("\n\nChampion seed distribution:")
    seeds = [d["champion_seed"] for d in year_difficulty if d["champion_seed"]]
    for s in sorted(set(seeds)):
        count = seeds.count(s)
        print(f"  Seed {s}: {count}/{len(seeds)} ({count/len(seeds)*100:.0f}%)")


def main():
    print("=" * 60)
    print("PHASE 4: ITERATION EXPERIMENTS")
    print("=" * 60)

    predictor, df_games, df_teams, years, X, y, meta = setup_predictor()

    all_results = []

    # Experiment 1: Theoretical max
    results = experiment_theoretical_max(df_games, years)
    all_results.extend(results)

    # Experiment 2: Upset optimization
    results = experiment_upset_optimization(predictor, df_games, df_teams, years)
    all_results.extend(results)

    # Experiment 3: Champion-first
    results = experiment_champion_first(predictor, df_games, years)
    all_results.extend(results)
    print_summary(results, "champion_first")

    # Experiment 4: Optimized + smart upsets
    results = experiment_optimized_with_upsets(predictor, df_games, years)
    all_results.extend(results)
    print_summary(results, "optimized_plus_upsets")

    # Save all results
    save_results(all_results, append=True)

    # Meta-analysis
    meta_analysis(df_games, years)

    # Print final leaderboard
    print("\n" + "=" * 60)
    print("FINAL LEADERBOARD (ALL EXPERIMENTS)")
    print("=" * 60)

    scoreboard = pd.read_csv(EXPERIMENTS_DIR / "scoreboard.csv")
    leaderboard = scoreboard.groupby("strategy_name").agg(
        avg_points=("total_espn_points", "mean"),
        std_points=("total_espn_points", "std"),
        min_points=("total_espn_points", "min"),
        max_points=("total_espn_points", "max"),
        champs=("champ_correct", "sum"),
        n_years=("year", "count"),
    ).sort_values("avg_points", ascending=False)
    leaderboard["avg_points"] = leaderboard["avg_points"].round(1)
    leaderboard["std_points"] = leaderboard["std_points"].round(1)
    print(leaderboard.to_string())
    leaderboard.to_csv(EXPERIMENTS_DIR / "leaderboard.csv")


if __name__ == "__main__":
    main()
