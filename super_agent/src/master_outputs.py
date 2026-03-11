"""
Master Outputs — Backtest Super Agent on 2023 & 2024 (Cascade Brackets)

Trains the Run 5 logistic regression model on 2010-2019 data, then generates
full 63-game cascade brackets for 2023 and 2024. Compares cascade accuracy
(model builds its own bracket, errors compound) vs independent accuracy
(model predicts each actual matchup independently).

Usage:
    cd super_agent && python src/master_outputs.py
"""

import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_tournament_games, load_team_stats, merge_team_stats,
    RESEARCH_DIR, SUPER_AGENT_DIR,
)
from model_runner import build_features, build_model
from generate_bracket import predict_game, generate_reasoning

OUTPUT_DIR = os.path.join(SUPER_AGENT_DIR, "master_outputs")

FEATURES = ["adj_em", "tempo", "barthag", "wab", "elite_sos"]
TRAIN_YEARS = list(range(2010, 2020))

ROUND_NAMES = ["round_of_64", "round_of_32", "sweet_16", "elite_8", "final_four", "championship"]
ROUND_POINTS = {
    "round_of_64": 10,
    "round_of_32": 20,
    "sweet_16": 40,
    "elite_8": 80,
    "final_four": 160,
    "championship": 320,
}
ROUND_GAME_COUNTS = {
    "round_of_64": 32,
    "round_of_32": 16,
    "sweet_16": 8,
    "elite_8": 4,
    "final_four": 2,
    "championship": 1,
}


def train_model():
    """Train Run 5 logistic regression on 2010-2019."""
    from sklearn.preprocessing import StandardScaler

    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    games = load_tournament_games(data_file)
    games = merge_team_stats(games, stat_columns=FEATURES)
    train = [g for g in games if g["year"] in TRAIN_YEARS]

    X_train, y_train, _ = build_features(train, FEATURES)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    model = build_model("logistic")
    model.fit(X_train_s, y_train)

    print(f"Trained on {len(train)} games (2010-2019)")
    return model, scaler


def get_year_games(all_games, year):
    """Extract all games for a given year, organized by round."""
    year_games = [g for g in all_games if g["year"] == year]
    by_round = {}
    for g in year_games:
        rnd = g["round"]
        if rnd not in by_round:
            by_round[rnd] = []
        by_round[rnd].append(g)
    # Sort each round by game_id
    for rnd in by_round:
        by_round[rnd].sort(key=lambda g: g["game_id"])
    return by_round


def get_actual_advancers(games_by_round):
    """Build set of teams that actually advanced in each round."""
    advancers = {}
    for rnd in ROUND_NAMES:
        advancers[rnd] = set()
        for g in games_by_round.get(rnd, []):
            advancers[rnd].add(g["winner"])
    return advancers


def predict_single_game(model, scaler, team_stats, t1, seed1, t2, seed2):
    """Predict a single game using team stats dict."""
    stats1 = team_stats.get(t1, {})
    stats2 = team_stats.get(t2, {})

    if not stats1 or not stats2:
        # Fallback: pick lower seed
        if not stats1:
            print(f"  WARNING: No stats for {t1}")
        if not stats2:
            print(f"  WARNING: No stats for {t2}")
        pred = 1 if seed1 <= seed2 else 0
        conf = 0.55
        diffs = {}
    else:
        pred, conf, diffs = predict_game(model, scaler, stats1, stats2, seed1, seed2, FEATURES)

    winner = t1 if pred == 1 else t2
    winner_seed = seed1 if pred == 1 else seed2
    reasoning = generate_reasoning(t1, t2, seed1, seed2, diffs, pred, conf)

    return winner, winner_seed, conf, reasoning


def generate_cascade_bracket(model, scaler, r64_games, team_stats):
    """
    Generate a full 63-game cascade bracket from R64 matchups.
    Returns list of all predicted games.
    """
    all_predictions = []

    # --- ROUND OF 64 ---
    # R64 games are sorted by game_id. Within each year, they come in 4 region
    # blocks of 8 games each. We group them into regions.
    assert len(r64_games) == 32, f"Expected 32 R64 games, got {len(r64_games)}"

    regions = []
    for i in range(4):
        region_games = r64_games[i * 8 : (i + 1) * 8]
        regions.append(region_games)

    r64_winners = []  # List of 32 winners in game_id order
    for region_games in regions:
        for g in region_games:
            winner, winner_seed, conf, reasoning = predict_single_game(
                model, scaler, team_stats,
                g["team1"], g["seed1"], g["team2"], g["seed2"],
            )
            all_predictions.append({
                "round": "round_of_64",
                "team1": g["team1"],
                "seed1": int(g["seed1"]),
                "team2": g["team2"],
                "seed2": int(g["seed2"]),
                "pick": winner,
                "pick_seed": int(winner_seed),
                "confidence": int(conf * 100),
                "reasoning": reasoning,
            })
            r64_winners.append({"team": winner, "seed": int(winner_seed)})

    # --- ROUND OF 32 ---
    # Pair consecutive R64 winners: [0,1], [2,3], ... [30,31]
    r32_winners = []
    for i in range(0, 32, 2):
        w1 = r64_winners[i]
        w2 = r64_winners[i + 1]
        winner, winner_seed, conf, reasoning = predict_single_game(
            model, scaler, team_stats,
            w1["team"], w1["seed"], w2["team"], w2["seed"],
        )
        all_predictions.append({
            "round": "round_of_32",
            "team1": w1["team"],
            "seed1": w1["seed"],
            "team2": w2["team"],
            "seed2": w2["seed"],
            "pick": winner,
            "pick_seed": int(winner_seed),
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        })
        r32_winners.append({"team": winner, "seed": int(winner_seed)})

    # --- SWEET 16 ---
    s16_winners = []
    for i in range(0, 16, 2):
        w1 = r32_winners[i]
        w2 = r32_winners[i + 1]
        winner, winner_seed, conf, reasoning = predict_single_game(
            model, scaler, team_stats,
            w1["team"], w1["seed"], w2["team"], w2["seed"],
        )
        all_predictions.append({
            "round": "sweet_16",
            "team1": w1["team"],
            "seed1": w1["seed"],
            "team2": w2["team"],
            "seed2": w2["seed"],
            "pick": winner,
            "pick_seed": int(winner_seed),
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        })
        s16_winners.append({"team": winner, "seed": int(winner_seed)})

    # --- ELITE 8 ---
    e8_winners = []
    for i in range(0, 8, 2):
        w1 = s16_winners[i]
        w2 = s16_winners[i + 1]
        winner, winner_seed, conf, reasoning = predict_single_game(
            model, scaler, team_stats,
            w1["team"], w1["seed"], w2["team"], w2["seed"],
        )
        all_predictions.append({
            "round": "elite_8",
            "team1": w1["team"],
            "seed1": w1["seed"],
            "team2": w2["team"],
            "seed2": w2["seed"],
            "pick": winner,
            "pick_seed": int(winner_seed),
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        })
        e8_winners.append({"team": winner, "seed": int(winner_seed)})

    # --- FINAL FOUR ---
    # Pair: region 0+1 winners, region 2+3 winners
    f4_winners = []
    for i in range(0, 4, 2):
        w1 = e8_winners[i]
        w2 = e8_winners[i + 1]
        winner, winner_seed, conf, reasoning = predict_single_game(
            model, scaler, team_stats,
            w1["team"], w1["seed"], w2["team"], w2["seed"],
        )
        all_predictions.append({
            "round": "final_four",
            "team1": w1["team"],
            "seed1": w1["seed"],
            "team2": w2["team"],
            "seed2": w2["seed"],
            "pick": winner,
            "pick_seed": int(winner_seed),
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        })
        f4_winners.append({"team": winner, "seed": int(winner_seed)})

    # --- CHAMPIONSHIP ---
    w1 = f4_winners[0]
    w2 = f4_winners[1]
    winner, winner_seed, conf, reasoning = predict_single_game(
        model, scaler, team_stats,
        w1["team"], w1["seed"], w2["team"], w2["seed"],
    )
    all_predictions.append({
        "round": "championship",
        "team1": w1["team"],
        "seed1": w1["seed"],
        "team2": w2["team"],
        "seed2": w2["seed"],
        "pick": winner,
        "pick_seed": int(winner_seed),
        "confidence": int(conf * 100),
        "reasoning": reasoning,
    })

    assert len(all_predictions) == 63, f"Expected 63 games, got {len(all_predictions)}"
    return all_predictions


def score_cascade_bracket(predictions, actual_advancers):
    """
    Score a cascade bracket against actual results.

    ESPN-style: you get points if the team you picked to win a round
    actually won a game in that round (i.e., they actually advanced).
    """
    results = {}
    total_score = 0
    total_correct = 0
    total_games = 0

    for rnd in ROUND_NAMES:
        rnd_preds = [p for p in predictions if p["round"] == rnd]
        correct = 0
        for p in rnd_preds:
            if p["pick"] in actual_advancers[rnd]:
                correct += 1

        points = correct * ROUND_POINTS[rnd]
        total_score += points
        total_correct += correct
        total_games += len(rnd_preds)

        results[rnd] = {
            "correct": correct,
            "total": len(rnd_preds),
            "accuracy": correct / len(rnd_preds) if rnd_preds else 0,
            "points": points,
        }

    results["summary"] = {
        "total_correct": total_correct,
        "total_games": total_games,
        "overall_accuracy": total_correct / total_games if total_games else 0,
        "espn_score": total_score,
        "max_possible": 1920,
    }
    return results


def score_independent(model, scaler, team_stats, games_by_round):
    """
    Score the model on each game's ACTUAL matchup independently (no cascade).
    This is what model_runner reports — for comparison.
    """
    results = {}
    total_correct = 0
    total_games = 0

    for rnd in ROUND_NAMES:
        rnd_games = games_by_round.get(rnd, [])
        correct = 0
        for g in rnd_games:
            stats1 = team_stats.get(g["team1"], {})
            stats2 = team_stats.get(g["team2"], {})

            if stats1 and stats2:
                pred, conf, diffs = predict_game(
                    model, scaler, stats1, stats2,
                    g["seed1"], g["seed2"], FEATURES,
                )
                predicted = g["team1"] if pred == 1 else g["team2"]
            else:
                predicted = g["team1"] if g["seed1"] <= g["seed2"] else g["team2"]

            if predicted == g["winner"]:
                correct += 1

        total_correct += correct
        total_games += len(rnd_games)

        results[rnd] = {
            "correct": correct,
            "total": len(rnd_games),
            "accuracy": correct / len(rnd_games) if rnd_games else 0,
        }

    results["summary"] = {
        "total_correct": total_correct,
        "total_games": total_games,
        "overall_accuracy": total_correct / total_games if total_games else 0,
    }
    return results


def write_outputs(year, predictions, cascade_scores, independent_scores):
    """Write bracket.json and accuracy.json for a year."""
    year_dir = os.path.join(OUTPUT_DIR, str(year))
    os.makedirs(year_dir, exist_ok=True)

    # bracket.json — full 63-game bracket
    bracket_path = os.path.join(year_dir, "bracket.json")
    bracket_data = {
        "year": year,
        "model": "Run 5 — Logistic Regression",
        "features": ["seed_diff"] + FEATURES,
        "training": "2010-2019",
        "games": predictions,
        "champion": predictions[-1]["pick"],
        "final_four": [p["pick"] for p in predictions if p["round"] == "elite_8"],
    }
    with open(bracket_path, "w") as f:
        json.dump(bracket_data, f, indent=2)

    # accuracy.json — per-round accuracy + ESPN score
    accuracy_path = os.path.join(year_dir, "accuracy.json")
    accuracy_data = {
        "year": year,
        "cascade": cascade_scores,
        "independent": independent_scores,
    }
    with open(accuracy_path, "w") as f:
        json.dump(accuracy_data, f, indent=2)

    print(f"  Written: {bracket_path}")
    print(f"  Written: {accuracy_path}")


def print_year_results(year, cascade_scores, independent_scores):
    """Print formatted results for a single year."""
    cs = cascade_scores["summary"]
    ind = independent_scores["summary"]

    print(f"\n{'─' * 60}")
    print(f"  {year} Results")
    print(f"{'─' * 60}")
    print(f"  {'Round':<18} {'Cascade':>12}  {'Independent':>14}  {'ESPN Pts':>10}")
    print(f"  {'─' * 56}")

    for rnd in ROUND_NAMES:
        cr = cascade_scores[rnd]
        ir = independent_scores[rnd]
        c_str = f"{cr['correct']}/{cr['total']} ({cr['accuracy']:.0%})"
        i_str = f"{ir['correct']}/{ir['total']} ({ir['accuracy']:.0%})"
        print(f"  {rnd:<18} {c_str:>12}  {i_str:>14}  {cr['points']:>10}")

    print(f"  {'─' * 56}")
    c_total = f"{cs['total_correct']}/{cs['total_games']} ({cs['overall_accuracy']:.1%})"
    i_total = f"{ind['total_correct']}/{ind['total_games']} ({ind['overall_accuracy']:.1%})"
    print(f"  {'TOTAL':<18} {c_total:>12}  {i_total:>14}  {cs['espn_score']:>10}")
    print(f"  {'Max possible':<18} {'':>12}  {'':>14}  {1920:>10}")


def write_summary(all_results):
    """Write summary.md comparing all years."""
    summary_path = os.path.join(OUTPUT_DIR, "summary.md")

    lines = ["# Super Agent — Master Backtest Results\n"]
    lines.append(f"**Model:** Run 5 — Logistic Regression")
    lines.append(f"**Features:** seed_diff + {', '.join(FEATURES)}")
    lines.append(f"**Training:** 2010-2019 (630 games)\n")

    lines.append("## Summary\n")
    lines.append(f"| Year | Cascade Accuracy | ESPN Score | Independent Accuracy |")
    lines.append(f"|------|-----------------|------------|---------------------|")

    for year, (cascade, independent) in sorted(all_results.items()):
        cs = cascade["summary"]
        ind = independent["summary"]
        lines.append(
            f"| {year} | {cs['overall_accuracy']:.1%} ({cs['total_correct']}/{cs['total_games']}) "
            f"| {cs['espn_score']}/1920 "
            f"| {ind['overall_accuracy']:.1%} ({ind['total_correct']}/{ind['total_games']}) |"
        )

    # Aggregate
    agg_cascade_correct = sum(r[0]["summary"]["total_correct"] for r in all_results.values())
    agg_cascade_total = sum(r[0]["summary"]["total_games"] for r in all_results.values())
    agg_espn = sum(r[0]["summary"]["espn_score"] for r in all_results.values())
    agg_ind_correct = sum(r[1]["summary"]["total_correct"] for r in all_results.values())
    agg_ind_total = sum(r[1]["summary"]["total_games"] for r in all_results.values())

    agg_cascade_acc = agg_cascade_correct / agg_cascade_total if agg_cascade_total else 0
    agg_ind_acc = agg_ind_correct / agg_ind_total if agg_ind_total else 0

    lines.append(
        f"| **Aggregate** | **{agg_cascade_acc:.1%}** ({agg_cascade_correct}/{agg_cascade_total}) "
        f"| **{agg_espn}**/{1920 * len(all_results)} "
        f"| **{agg_ind_acc:.1%}** ({agg_ind_correct}/{agg_ind_total}) |"
    )

    lines.append("\n## Per-Round Breakdown\n")
    lines.append(f"| Round | {'  |  '.join(str(y) for y in sorted(all_results.keys()))} |")
    lines.append(f"|-------|{'|'.join(['--------'] * len(all_results))}|")
    for rnd in ROUND_NAMES:
        cols = []
        for year in sorted(all_results.keys()):
            cr = all_results[year][0][rnd]
            cols.append(f" {cr['correct']}/{cr['total']} ({cr['accuracy']:.0%})")
        lines.append(f"| {rnd} |{'|'.join(cols)}|")

    lines.append("\n---")
    lines.append("*Cascade accuracy: model builds its own bracket (errors compound).*")
    lines.append("*Independent accuracy: model predicts each actual matchup (no cascade).*")

    with open(summary_path, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\nWritten: {summary_path}")


def main():
    print("=" * 60)
    print("  SUPER AGENT — MASTER BACKTEST")
    print("  Cascade brackets for 2023 & 2024")
    print("=" * 60)

    # Step 1: Train model
    print("\n1. Training Run 5 model...")
    model, scaler = train_model()

    # Step 2: Load data
    print("\n2. Loading tournament data...")
    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    all_games = load_tournament_games(data_file)
    team_stats_dict = load_team_stats()
    print(f"   {len(all_games)} total games loaded")
    print(f"   {len(team_stats_dict)} team-year stat entries loaded")

    # Step 3: Process each year
    test_years = [2023, 2024]
    all_results = {}

    for year in test_years:
        print(f"\n{'=' * 60}")
        print(f"  Processing {year}...")
        print(f"{'=' * 60}")

        # Get year's games organized by round
        games_by_round = get_year_games(all_games, year)

        # Build team stats lookup for this year: team_name -> stats
        year_team_stats = {}
        for (y, team), stats in team_stats_dict.items():
            if y == year:
                year_team_stats[team] = stats

        print(f"  {len(year_team_stats)} teams with stats for {year}")

        # Get R64 matchups (sorted by game_id)
        r64_games = games_by_round.get("round_of_64", [])
        print(f"  {len(r64_games)} R64 games")

        # Generate cascade bracket
        print(f"\n  Generating cascade bracket...")
        predictions = generate_cascade_bracket(model, scaler, r64_games, year_team_stats)
        champion = predictions[-1]["pick"]
        final_four = [p["pick"] for p in predictions if p["round"] == "elite_8"]
        print(f"  Champion: {champion}")
        print(f"  Final Four: {', '.join(final_four)}")

        # Score cascade bracket
        actual_advancers = get_actual_advancers(games_by_round)
        cascade_scores = score_cascade_bracket(predictions, actual_advancers)

        # Score independent predictions
        independent_scores = score_independent(model, scaler, year_team_stats, games_by_round)

        # Print results
        print_year_results(year, cascade_scores, independent_scores)

        # Write outputs
        print(f"\n  Writing outputs...")
        write_outputs(year, predictions, cascade_scores, independent_scores)

        all_results[year] = (cascade_scores, independent_scores)

    # Step 4: Summary
    print(f"\n{'=' * 60}")
    print(f"  COMPARISON SUMMARY")
    print(f"{'=' * 60}")
    print(f"\n  {'Year':<8} {'Cascade':>15} {'ESPN Score':>12} {'Independent':>15} {'Gap':>8}")
    print(f"  {'─' * 58}")
    for year in test_years:
        cs = all_results[year][0]["summary"]
        ind = all_results[year][1]["summary"]
        gap = ind["overall_accuracy"] - cs["overall_accuracy"]
        print(
            f"  {year:<8} {cs['overall_accuracy']:>14.1%} {cs['espn_score']:>12} "
            f"{ind['overall_accuracy']:>14.1%} {gap:>+7.1%}"
        )

    # Aggregate
    agg_cc = sum(r[0]["summary"]["total_correct"] for r in all_results.values())
    agg_ct = sum(r[0]["summary"]["total_games"] for r in all_results.values())
    agg_espn = sum(r[0]["summary"]["espn_score"] for r in all_results.values())
    agg_ic = sum(r[1]["summary"]["total_correct"] for r in all_results.values())
    agg_it = sum(r[1]["summary"]["total_games"] for r in all_results.values())
    agg_ca = agg_cc / agg_ct if agg_ct else 0
    agg_ia = agg_ic / agg_it if agg_it else 0
    print(f"  {'─' * 58}")
    print(
        f"  {'Agg':<8} {agg_ca:>14.1%} {agg_espn:>12} "
        f"{agg_ia:>14.1%} {agg_ia - agg_ca:>+7.1%}"
    )

    # Write summary markdown
    write_summary(all_results)

    print(f"\n{'=' * 60}")
    print(f"  DONE — outputs in {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
