"""
Phase 3: Full pipeline — ML predictor + bracket optimizer.
Trains an ensemble predictor, then uses Monte Carlo optimization
to find the bracket maximizing expected ESPN points.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from utils.features import build_training_data, load_and_merge
from utils.backtest import (
    load_tournament_data, load_team_stats, get_year_bracket,
    save_results, print_summary,
)
from utils.scoring import score_bracket, ROUND_ORDER
from utils.predictor import MatchupPredictor
from utils.optimizer import optimize_bracket

BASE_DIR = Path(__file__).resolve().parent
EXPERIMENTS_DIR = BASE_DIR / "experiments"


def run_optimized_strategy(strategy_name, n_sims=20000, target_year=None):
    """Train predictor, optimize brackets, backtest.

    If target_year is set, only process that single year (trains on all other years).
    """
    print("=" * 60)
    print(f"OPTIMIZED STRATEGY: {strategy_name}")
    print(f"Monte Carlo sims per year: {n_sims}")
    if target_year:
        print(f"Target year: {target_year}")
    print("=" * 60)

    # Load data
    X, y, meta, feature_cols = build_training_data()
    df_games = load_tournament_data()
    df_teams = load_team_stats()
    years = [target_year] if target_year else sorted(meta["year"].unique())

    # Build predictor
    print("\nTraining ensemble predictor...")
    predictor = MatchupPredictor()
    predictor.build_team_index(df_teams)
    predictor.train(X, y, meta)
    print("  Done.")

    # Also run "ml_favorites" — just pick the model's favorite every game
    # (no optimization, just to isolate the optimizer's contribution)
    results_favorites = []
    results_optimized = []

    for year in years:
        bracket = get_year_bracket(df_games, int(year))
        r64_games = bracket["actual_games"]["R64"]

        # Build R64 matchup list
        r64_matchups = []
        for g in r64_games:
            r64_matchups.append({
                "team_1": g["team_1"],
                "seed_1": g["seed_1"] or 8,
                "team_2": g["team_2"],
                "seed_2": g["seed_2"] or 8,
                "region": g["region"],
            })

        # Strategy 1: Just pick favorites (model without optimization)
        from utils.optimizer import pick_all_favorites
        team_seeds = {}
        for m in r64_matchups:
            team_seeds[m["team_1"]] = m["seed_1"]
            team_seeds[m["team_2"]] = m["seed_2"]

        fav_predictions = pick_all_favorites(predictor, r64_matchups, int(year), team_seeds)
        fav_score = score_bracket(fav_predictions, bracket["actual_winners"])
        breakdown = fav_score["round_breakdown"]

        results_favorites.append({
            "strategy_name": "ml_favorites",
            "year": int(year),
            "total_espn_points": fav_score["total_points"],
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
        print(f"  {int(year)} favorites: {fav_score['total_points']} pts", end="")

        # Strategy 2: Optimized bracket
        opt_predictions = optimize_bracket(predictor, r64_matchups, int(year), n_sims=n_sims)
        opt_score = score_bracket(opt_predictions, bracket["actual_winners"])
        breakdown = opt_score["round_breakdown"]

        results_optimized.append({
            "strategy_name": strategy_name,
            "year": int(year),
            "total_espn_points": opt_score["total_points"],
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
        print(f" | optimized: {opt_score['total_points']} pts")

        # Show champion picks
        fav_champ = fav_predictions["Championship"][0] if fav_predictions["Championship"] else "?"
        opt_champ = opt_predictions["Championship"][0] if opt_predictions["Championship"] else "?"
        actual_champ = bracket["actual_winners"]["Championship"][0] if bracket["actual_winners"]["Championship"] else "?"
        champ_mark = " ✓" if opt_champ == actual_champ else ""
        print(f"    Champion: fav={fav_champ}, opt={opt_champ}, actual={actual_champ}{champ_mark}")

    print_summary(results_favorites, "ml_favorites")
    print_summary(results_optimized, strategy_name)

    # Save
    all_results = results_favorites + results_optimized
    save_results(all_results, append=True)

    # Print updated leaderboard
    print("\n" + "=" * 60)
    print("UPDATED LEADERBOARD")
    print("=" * 60)

    scoreboard = pd.read_csv(EXPERIMENTS_DIR / "scoreboard.csv")
    leaderboard = scoreboard.groupby("strategy_name").agg(
        avg_points=("total_espn_points", "mean"),
        std_points=("total_espn_points", "std"),
        min_points=("total_espn_points", "min"),
        max_points=("total_espn_points", "max"),
        champs_correct=("champ_correct", "sum"),
    ).sort_values("avg_points", ascending=False)
    leaderboard["avg_points"] = leaderboard["avg_points"].round(1)
    leaderboard["std_points"] = leaderboard["std_points"].round(1)
    print(leaderboard.to_string())
    leaderboard.to_csv(EXPERIMENTS_DIR / "leaderboard.csv")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=None, help="Target a single year")
    parser.add_argument("--sims", type=int, default=5000, help="Monte Carlo simulations")
    args = parser.parse_args()
    run_optimized_strategy("ml_optimized", n_sims=args.sims, target_year=args.year)
