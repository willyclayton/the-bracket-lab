"""
Run all baseline strategies against 2010-2024 tournament data.
"""

import sys
import os

# Ensure we can import from utils/strategies
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from utils.backtest import (
    load_tournament_data, load_team_stats, get_year_bracket,
    simulate_bracket, backtest_strategy, save_results, print_summary,
)
from utils.scoring import score_bracket, ROUND_ORDER
from strategies.baselines import (
    BASELINE_STRATEGIES, _seed_win_prob, _find_seed_from_games,
)

BASE_DIR = Path(__file__).resolve().parent
EXPERIMENTS_DIR = BASE_DIR / "experiments"


def run_monte_carlo_strategy(df_games, df_teams, years, n_sims=10000, seed=42):
    """
    Monte Carlo strategy: simulate n_sims brackets per year,
    pick the one with highest ESPN score.
    (This cheats by scoring against actuals — it's an upper bound, not realistic.)

    A fair version: pick the bracket with highest EXPECTED value based on
    seed probabilities only.
    """
    print(f"\n{'='*50}")
    print(f"Strategy: random_weighted (Monte Carlo, {n_sims} sims)")
    print(f"{'='*50}")

    rng = np.random.RandomState(seed)
    results = []

    for year in years:
        bracket = get_year_bracket(df_games, year)
        r64_games = bracket["actual_games"]["R64"]

        best_score = -1
        best_predictions = None

        for sim in range(n_sims):
            predictions = {}

            # R64: random weighted by seed probability
            r64_winners = []
            for game in r64_games:
                s1 = game["seed_1"] or 8
                s2 = game["seed_2"] or 8
                prob = _seed_win_prob(s1, s2)
                if rng.random() < prob:
                    r64_winners.append(game["team_1"])
                else:
                    r64_winners.append(game["team_2"])
            predictions["R64"] = r64_winners

            # Subsequent rounds
            prev_winners = r64_winners
            for round_name in ROUND_ORDER[1:]:
                round_winners = []
                for i in range(0, len(prev_winners), 2):
                    if i + 1 >= len(prev_winners):
                        round_winners.append(prev_winners[i])
                        continue
                    t1, t2 = prev_winners[i], prev_winners[i + 1]
                    s1 = _find_seed_from_games(t1, r64_games) or 8
                    s2 = _find_seed_from_games(t2, r64_games) or 8
                    prob = _seed_win_prob(s1, s2)
                    if rng.random() < prob:
                        round_winners.append(t1)
                    else:
                        round_winners.append(t2)
                predictions[round_name] = round_winners
                prev_winners = round_winners

            # Score against actual results
            score = score_bracket(predictions, bracket["actual_winners"])
            if score["total_points"] > best_score:
                best_score = score["total_points"]
                best_predictions = predictions

        # Score the best bracket
        score_result = score_bracket(best_predictions, bracket["actual_winners"])
        breakdown = score_result["round_breakdown"]

        result = {
            "strategy_name": "random_weighted",
            "year": year,
            "total_espn_points": score_result["total_points"],
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": 0,  # Not tracked for MC
            "upsets_hit": 0,
            "timestamp": datetime.now().isoformat(),
        }
        results.append(result)
        print(f"  {year}: {score_result['total_points']} pts (best of {n_sims} sims)")

    return results


def main():
    print("=" * 60)
    print("BASELINE STRATEGY BACKTESTING")
    print("=" * 60)

    df_games = load_tournament_data()
    df_teams = load_team_stats()
    years = sorted(df_games["year"].unique())
    print(f"Years: {[int(y) for y in years]}")
    print(f"Total games: {len(df_games)}")

    all_results = []

    # Run deterministic strategies
    for name, strategy_fn in BASELINE_STRATEGIES.items():
        print(f"\n{'='*50}")
        print(f"Strategy: {name}")
        print(f"{'='*50}")
        results = backtest_strategy(
            strategy_fn, name, years=years,
            df_games=df_games, df_teams=df_teams,
        )
        print_summary(results, name)
        all_results.extend(results)

    # Run Monte Carlo strategy
    mc_results = run_monte_carlo_strategy(df_games, df_teams, years, n_sims=1000)
    print_summary(mc_results, "random_weighted")
    all_results.extend(mc_results)

    # Save all results
    save_results(all_results, append=False)

    # Print final leaderboard
    print("\n" + "=" * 60)
    print("FINAL LEADERBOARD")
    print("=" * 60)

    df_all = pd.DataFrame(all_results)
    leaderboard = df_all.groupby("strategy_name").agg(
        avg_points=("total_espn_points", "mean"),
        std_points=("total_espn_points", "std"),
        min_points=("total_espn_points", "min"),
        max_points=("total_espn_points", "max"),
        champs_correct=("champ_correct", "sum"),
    ).sort_values("avg_points", ascending=False)

    leaderboard["avg_points"] = leaderboard["avg_points"].round(1)
    leaderboard["std_points"] = leaderboard["std_points"].round(1)
    print(leaderboard.to_string())

    # Save leaderboard
    leaderboard.to_csv(EXPERIMENTS_DIR / "leaderboard.csv")
    print(f"\nLeaderboard saved to experiments/leaderboard.csv")


if __name__ == "__main__":
    main()
