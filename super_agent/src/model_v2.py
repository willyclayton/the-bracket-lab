"""
Run 3: Iteration on v1
=======================
One more signal or approach change based on Run 2 learnings.
This is the FINAL model. After this run, stop and write the checkpoint report.

Usage:
    python super_agent/src/model_v2.py
"""

import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import load_tournament_games, split_train_test, evaluate_predictions, append_to_run_log, print_results, merge_team_stats, RESEARCH_DIR


def build_features(games, feature_columns):
    """
    Build feature matrix for matchup prediction.
    Same as model_v1 but with additional features or transformations.
    """
    X = []
    y = []
    game_info = []

    for game in games:
        features = []
        features.append(game["seed1"] - game["seed2"])

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

    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")

    if not os.path.exists(data_file):
        print(f"ERROR: Data file not found: {data_file}")
        sys.exit(1)

    games = load_tournament_games(data_file)
    games = merge_team_stats(games, stat_columns=["adj_em", "tempo"])
    train, test = split_train_test(games, test_year=2021)

    # Run 3: Keep adj_em (dominant predictor from Run 2) + add tempo differential
    # Rationale: R32 was weakest round (62.5%). Tempo mismatch captures a tactical
    # dimension — slow-paced teams can frustrate high-tempo favorites, explaining
    # some upsets that pure efficiency can't predict.
    # Source: BartTorvik tempo stat, available pre-tournament. No leakage risk.
    extra_features = ["adj_em", "tempo"]

    print(f"Training: {len(train)} games | Test: {len(test)} games")
    print(f"Features: seed_diff + {extra_features if extra_features else '[none yet — fill after Run 2]'}")

    X_train, y_train, train_info = build_features(train, extra_features)
    X_test, y_test, test_info = build_features(test, extra_features)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LogisticRegression(random_state=42, max_iter=1000)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

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
    print_results("Run 3: Model v2 (2021 Test Set)", results)

    feature_names = ["seed_diff"] + extra_features
    print("Feature Coefficients:")
    for name, coef in zip(feature_names, model.coef_[0]):
        print(f"  {name}: {coef:.4f}")

    append_to_run_log(
        "Run 3: Iteration on v1",
        results,
        notes=f"Features: {feature_names}. FINAL RUN — write checkpoint_report.md after reviewing results."
    )

    print("\n" + "=" * 50)
    print("  STOP: Run 3 complete. Write checkpoint_report.md.")
    print("  No more iterations until human review.")
    print("=" * 50)

    return results


if __name__ == "__main__":
    main()
