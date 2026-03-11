"""
Run 1: Seed-Only Baseline
========================
The simplest possible model: lower seed always wins.
This establishes the accuracy floor that all subsequent runs must beat.

Usage:
    python super_agent/src/baseline.py
"""

import os
import sys

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import load_tournament_games, split_train_test, evaluate_predictions, append_to_run_log, print_results, RESEARCH_DIR


def predict_by_seed(games):
    """
    Predict every game by picking the lower (better) seed.
    If seeds are equal, pick team1 (arbitrary tiebreak).
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
            "actual_winner": game["winner"],
        })

    return predictions, actuals


def main():
    # Load data
    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")

    if not os.path.exists(data_file):
        print(f"ERROR: Data file not found: {data_file}")
        print("Run the research/data collection phase first.")
        print("Expected: tournament_games.csv with columns: year, round, team1, seed1, team2, seed2, winner, score1, score2")
        sys.exit(1)

    games = load_tournament_games(data_file)
    train, test = split_train_test(games, test_year=2021)

    print(f"Loaded {len(games)} total games")
    print(f"Training: {len(train)} games (2010-2020)")
    print(f"Test: {len(test)} games (2021)")

    # Run baseline on test set
    predictions, actuals = predict_by_seed(test)
    results = evaluate_predictions(predictions, actuals)

    # Also run on training set for reference
    train_preds, train_actuals = predict_by_seed(train)
    train_results = evaluate_predictions(train_preds, train_actuals)

    print_results("Run 1: Seed Baseline (2021 Test Set)", results)
    print_results("Run 1: Seed Baseline (2010-2020 Training Set)", train_results)

    # Log results
    append_to_run_log(
        "Run 1: Seed-Only Baseline",
        results,
        notes=f"Lower seed always wins. Training accuracy: {train_results['overall_accuracy']:.1%}. "
              f"This is the floor — all subsequent models must beat {results['overall_accuracy']:.1%} on the 2021 test set."
    )

    return results


if __name__ == "__main__":
    main()
