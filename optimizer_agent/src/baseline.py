"""
Run 1: Seed-Only Baseline (ESPN Points)
========================================
Lower seed always wins. Scored by ESPN bracket points (not accuracy).
This establishes the ESPN points floor that all subsequent runs must beat.

Usage:
    python optimizer_agent/src/baseline.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_tournament_games, split_train_test, merge_team_stats,
    simulate_bracket_espn, get_espn_percentile,
    print_espn_results, append_espn_to_run_log,
    RESEARCH_DIR, ROUND_ORDER,
)


def predict_by_seed(games):
    """
    Predict every game by picking the lower (better) seed.
    If seeds are equal, pick team1 (arbitrary tiebreak).
    Returns list of predictions and list of actuals.
    """
    predictions = []
    actuals = []

    for game in games:
        seed1 = game["seed1"]
        seed2 = game["seed2"]

        # Lower seed = better team
        if seed1 <= seed2:
            predicted = game["team1"]
        else:
            predicted = game["team2"]

        predictions.append({
            "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
            "predicted_winner": predicted,
            "round": game.get("round", "unknown"),
        })

        actuals.append({
            "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
            "round": game.get("round", "unknown"),
            "winner": game["winner"],
        })

    return predictions, actuals


def main():
    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")

    if not os.path.exists(data_file):
        print(f"ERROR: Data file not found: {data_file}")
        sys.exit(1)

    games = load_tournament_games(data_file)

    # Test on 2022 (single year for Phase 1)
    test_years = [2022]
    train, test_by_year = split_train_test(games, test_years)

    print(f"Loaded {len(games)} total games")
    print(f"Training: {len(train)} games")
    print(f"Test years: {list(test_by_year.keys())}")

    results_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        predictions, actuals = predict_by_seed(year_games)

        # Build bracket picks dict
        bracket_picks = {p["game_id"]: p["predicted_winner"] for p in predictions}

        # Score using ESPN points
        espn_result = simulate_bracket_espn(bracket_picks, actuals)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)

        results_by_year[year] = (espn_result, espn_pct)

    print_espn_results("Run 1: Seed Baseline (ESPN Points)", results_by_year)

    append_espn_to_run_log(
        "Run 1: Seed Baseline (ESPN Points)",
        results_by_year,
        notes="Lower seed always wins. This is the ESPN points floor. "
              "All subsequent models must beat this on ESPN points (not just accuracy).",
    )

    return results_by_year


if __name__ == "__main__":
    main()
