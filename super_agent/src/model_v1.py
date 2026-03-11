"""
Run 2: Seed + Best Feature (Logistic Regression)
=================================================
Add the single most promising feature from research to the seed baseline.
Use a simple logistic regression model.
Must beat the seed-only baseline on the 2021 test set.

Usage:
    python super_agent/src/model_v1.py
"""

import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import load_tournament_games, split_train_test, evaluate_predictions, append_to_run_log, print_results, merge_team_stats, RESEARCH_DIR


def build_features(games, feature_columns):
    """
    Build feature matrix for matchup prediction.
    For each game, compute the difference between team1 and team2 features.
    Target: 1 if team1 wins, 0 if team2 wins.
    """
    X = []
    y = []
    game_info = []

    for game in games:
        features = []
        # Seed difference (team1_seed - team2_seed) — negative means team1 is favored
        features.append(game["seed1"] - game["seed2"])

        # Add additional features as differences
        for col in feature_columns:
            col1 = f"{col}_1"
            col2 = f"{col}_2"
            if col1 in game and col2 in game:
                val1 = game.get(col1, 0) or 0
                val2 = game.get(col2, 0) or 0
                features.append(float(val1) - float(val2))

        X.append(features)
        y.append(1 if game["winner"] == game["team1"] else 0)
        game_info.append(game)

    return np.array(X), np.array(y), game_info


def main():
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler

    # Load data
    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")

    if not os.path.exists(data_file):
        print(f"ERROR: Data file not found: {data_file}")
        sys.exit(1)

    games = load_tournament_games(data_file)
    games = merge_team_stats(games, stat_columns=["adj_em"])
    train, test = split_train_test(games, test_year=2021)

    # Run 2: Add adjusted efficiency margin (AdjOE - AdjDE)
    # Source: BartTorvik pre-tournament data. Available end of regular season (pre-March).
    # This is the single strongest predictor of tournament success per sports analytics literature.
    extra_features = ["adj_em"]

    print(f"Training: {len(train)} games | Test: {len(test)} games")
    print(f"Features: seed_diff + {extra_features if extra_features else '[none yet — add after research]'}")

    # Build feature matrices
    X_train, y_train, train_info = build_features(train, extra_features)
    X_test, y_test, test_info = build_features(test, extra_features)

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train logistic regression
    model = LogisticRegression(random_state=42, max_iter=1000)
    model.fit(X_train_scaled, y_train)

    # Predict on test set
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    # Build predictions list for evaluation
    predictions = []
    actuals = []
    for i, game in enumerate(test_info):
        predicted_winner = game["team1"] if y_pred[i] == 1 else game["team2"]
        predictions.append({
            "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
            "predicted_winner": predicted_winner,
            "round": game.get("round", "unknown"),
            "confidence": float(max(y_proba[i], 1 - y_proba[i])),
        })
        actuals.append({
            "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
            "actual_winner": game["winner"],
        })

    results = evaluate_predictions(predictions, actuals)
    print_results("Run 2: Logistic Regression (2021 Test Set)", results)

    # Feature importance
    feature_names = ["seed_diff"] + extra_features
    print("Feature Coefficients:")
    for name, coef in zip(feature_names, model.coef_[0]):
        print(f"  {name}: {coef:.4f}")

    # Log results
    append_to_run_log(
        "Run 2: Seed + Best Feature (Logistic Regression)",
        results,
        notes=f"Features: {feature_names}. Coefficients: {dict(zip(feature_names, [f'{c:.4f}' for c in model.coef_[0]]))}."
    )

    return results


if __name__ == "__main__":
    main()
