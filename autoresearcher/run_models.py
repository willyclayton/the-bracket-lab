"""
Phase 2: Train ML models with leave-one-year-out cross-validation.
Models: Logistic Regression, Random Forest, XGBoost, Ensemble.
Each model produces win probabilities, which are used to build brackets.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler

from utils.features import build_training_data, load_and_merge, build_features
from utils.backtest import (
    load_tournament_data, load_team_stats, get_year_bracket,
    save_results, print_summary,
)
from utils.scoring import score_bracket, ROUND_ORDER, ROUND_POINTS

BASE_DIR = Path(__file__).resolve().parent
EXPERIMENTS_DIR = BASE_DIR / "experiments"
PROCESSED_DIR = BASE_DIR / "data" / "processed"


def train_and_predict_loocv(X, y, meta, feature_cols, model_class, model_name, **model_kwargs):
    """
    Leave-one-year-out cross-validation.
    For each year: train on all other years, predict probabilities for held-out year.
    Returns: DataFrame with predictions per game.
    """
    years = sorted(meta["year"].unique())
    all_preds = []

    for test_year in years:
        train_mask = meta["year"] != test_year
        test_mask = meta["year"] == test_year

        X_train, y_train = X[train_mask.values], y[train_mask.values]
        X_test, y_test = X[test_mask.values], y[test_mask.values]
        meta_test = meta[test_mask].copy()

        # Scale features
        scaler = StandardScaler()
        X_train_s = scaler.fit_transform(X_train)
        X_test_s = scaler.transform(X_test)

        # Train
        model = model_class(**model_kwargs)
        model.fit(X_train_s, y_train)

        # Predict probabilities
        probs = model.predict_proba(X_test_s)[:, 1]  # P(team_1 wins)

        meta_test = meta_test.copy()
        meta_test["prob_team1"] = probs
        meta_test["pred_winner"] = np.where(probs >= 0.5, meta_test["team_1"], meta_test["team_2"])
        meta_test["correct"] = (meta_test["pred_winner"] == meta_test["winner"]).astype(int)
        meta_test["model"] = model_name

        all_preds.append(meta_test)

    return pd.concat(all_preds, ignore_index=True)


def build_bracket_from_probs(prob_df, bracket_data, year):
    """
    Build a bracket using model probabilities.

    For R64, use direct predictions from the model.
    For later rounds, we need to handle path dependency:
    - The teams that advance depend on earlier predictions
    - For teams we predicted to advance but DON'T have a direct prob for,
      we look up their features and predict on the fly.

    Simplified approach: use the model's R64 predictions, then for later rounds
    pick the team with higher predicted win probability from R64 (as a proxy
    for overall team strength via prob vs a baseline opponent).
    """
    actual_games = bracket_data["actual_games"]
    predictions = {}

    # Build a team strength lookup from the prob_df
    # For each team, their "strength" = average P(win) across their games
    team_strength = {}
    for _, row in prob_df.iterrows():
        t1, t2 = row["team_1"], row["team_2"]
        p = row["prob_team1"]
        if t1 not in team_strength:
            team_strength[t1] = []
        if t2 not in team_strength:
            team_strength[t2] = []
        team_strength[t1].append(p)
        team_strength[t2].append(1 - p)

    for t in team_strength:
        team_strength[t] = np.mean(team_strength[t])

    # R64: use direct predictions from model
    r64_games = actual_games["R64"]
    r64_probs = prob_df[prob_df["round"] == "R64"]
    r64_winners = []

    for game in r64_games:
        t1, t2 = game["team_1"], game["team_2"]
        # Find the matching prediction
        match = r64_probs[
            ((r64_probs["team_1"] == t1) & (r64_probs["team_2"] == t2))
        ]
        if len(match) > 0:
            prob = match.iloc[0]["prob_team1"]
            winner = t1 if prob >= 0.5 else t2
        else:
            # Fallback: use team strength
            s1 = team_strength.get(t1, 0.5)
            s2 = team_strength.get(t2, 0.5)
            winner = t1 if s1 >= s2 else t2
        r64_winners.append(winner)

    predictions["R64"] = r64_winners

    # Subsequent rounds: pick based on team strength
    prev_winners = r64_winners
    for round_name in ROUND_ORDER[1:]:
        round_winners = []
        for i in range(0, len(prev_winners), 2):
            if i + 1 >= len(prev_winners):
                round_winners.append(prev_winners[i])
                continue
            t1, t2 = prev_winners[i], prev_winners[i + 1]

            # Check if we have a direct prediction for this matchup
            match = prob_df[
                ((prob_df["team_1"] == t1) & (prob_df["team_2"] == t2)) |
                ((prob_df["team_1"] == t2) & (prob_df["team_2"] == t1))
            ]
            if len(match) > 0:
                row = match.iloc[0]
                if row["team_1"] == t1:
                    winner = t1 if row["prob_team1"] >= 0.5 else t2
                else:
                    winner = t1 if row["prob_team1"] < 0.5 else t2
            else:
                # Use team strength
                s1 = team_strength.get(t1, 0.5)
                s2 = team_strength.get(t2, 0.5)
                winner = t1 if s1 >= s2 else t2

            round_winners.append(winner)

        predictions[round_name] = round_winners
        prev_winners = round_winners

    return predictions


def backtest_model(prob_df, model_name, df_games):
    """Backtest a model's predictions as a bracket strategy."""
    years = sorted(prob_df["year"].unique())
    results = []

    for year in years:
        bracket = get_year_bracket(df_games, year)
        year_probs = prob_df[prob_df["year"] == year]

        predictions = build_bracket_from_probs(year_probs, bracket, year)
        score_result = score_bracket(predictions, bracket["actual_winners"])
        breakdown = score_result["round_breakdown"]

        result = {
            "strategy_name": model_name,
            "year": year,
            "total_espn_points": score_result["total_points"],
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": 0,
            "upsets_hit": 0,
            "timestamp": datetime.now().isoformat(),
        }
        results.append(result)
        print(f"  {year}: {score_result['total_points']} pts "
              f"({score_result['correct_picks']}/{score_result['total_picks']} correct)")

    return results


def analyze_feature_importance(X, y, feature_cols):
    """Train on all data and show feature importances."""
    scaler = StandardScaler()
    X_s = scaler.fit_transform(X)

    # Logistic Regression coefficients
    lr = LogisticRegression(max_iter=1000, C=1.0)
    lr.fit(X_s, y)
    lr_imp = pd.DataFrame({
        "feature": feature_cols,
        "lr_coef": lr.coef_[0],
        "lr_abs_coef": np.abs(lr.coef_[0]),
    }).sort_values("lr_abs_coef", ascending=False)

    # Gradient Boosting feature importance
    gb_model = GradientBoostingClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42,
    )
    gb_model.fit(X_s, y)
    gb_imp = pd.DataFrame({
        "feature": feature_cols,
        "gb_importance": gb_model.feature_importances_,
    }).sort_values("gb_importance", ascending=False)

    print("\n=== Feature Importance ===")
    print("\nLogistic Regression (standardized coefficients):")
    print(lr_imp.to_string(index=False))
    print("\nGradient Boosting (importance):")
    print(gb_imp.to_string(index=False))

    return lr_imp, gb_imp


def main():
    print("=" * 60)
    print("PHASE 2: ML MODEL TRAINING & BACKTESTING")
    print("=" * 60)

    # Load data
    X, y, meta, feature_cols = build_training_data()
    df_games = load_tournament_data()

    # Feature importance analysis
    analyze_feature_importance(X, y, feature_cols)

    # Define models
    models = {
        "ml_logistic": (LogisticRegression, {"max_iter": 1000, "C": 1.0}),
        "ml_random_forest": (RandomForestClassifier, {
            "n_estimators": 300, "max_depth": 6, "min_samples_leaf": 5,
            "random_state": 42,
        }),
        "ml_gradient_boost": (GradientBoostingClassifier, {
            "n_estimators": 200, "max_depth": 4, "learning_rate": 0.1,
            "random_state": 42,
        }),
    }

    all_results = []
    model_preds = {}

    for model_name, (model_class, kwargs) in models.items():
        print(f"\n{'='*50}")
        print(f"Model: {model_name}")
        print(f"{'='*50}")

        # Train with LOOCV
        preds = train_and_predict_loocv(X, y, meta, feature_cols, model_class, model_name, **kwargs)
        model_preds[model_name] = preds

        # Game-level accuracy
        acc = preds["correct"].mean()
        print(f"  Game-level accuracy: {acc:.3f}")

        # Round-level accuracy
        for rnd in ROUND_ORDER:
            rnd_preds = preds[preds["round"] == rnd]
            if len(rnd_preds) > 0:
                rnd_acc = rnd_preds["correct"].mean()
                print(f"    {rnd}: {rnd_acc:.3f} ({int(rnd_preds['correct'].sum())}/{len(rnd_preds)})")

        # Backtest as bracket strategy
        print(f"\n  Bracket backtest:")
        results = backtest_model(preds, model_name, df_games)
        print_summary(results, model_name)
        all_results.extend(results)

    # Ensemble: average probabilities from all models
    print(f"\n{'='*50}")
    print(f"Model: ml_ensemble")
    print(f"{'='*50}")

    # Merge all model predictions
    ensemble_preds = model_preds["ml_logistic"].copy()
    ensemble_preds["prob_team1"] = np.mean([
        model_preds["ml_logistic"]["prob_team1"].values,
        model_preds["ml_random_forest"]["prob_team1"].values,
        model_preds["ml_gradient_boost"]["prob_team1"].values,
    ], axis=0)
    ensemble_preds["pred_winner"] = np.where(
        ensemble_preds["prob_team1"] >= 0.5,
        ensemble_preds["team_1"],
        ensemble_preds["team_2"],
    )
    ensemble_preds["correct"] = (ensemble_preds["pred_winner"] == ensemble_preds["winner"]).astype(int)
    ensemble_preds["model"] = "ml_ensemble"

    acc = ensemble_preds["correct"].mean()
    print(f"  Game-level accuracy: {acc:.3f}")

    print(f"\n  Bracket backtest:")
    ensemble_results = backtest_model(ensemble_preds, "ml_ensemble", df_games)
    print_summary(ensemble_results, "ml_ensemble")
    all_results.extend(ensemble_results)

    # Save all results
    save_results(all_results, append=True)

    # Print combined leaderboard
    print("\n" + "=" * 60)
    print("UPDATED LEADERBOARD (including ML models)")
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

    # Save predictions for later use by optimizer
    for name, preds in model_preds.items():
        preds.to_csv(EXPERIMENTS_DIR / f"preds_{name}.csv", index=False)
    ensemble_preds.to_csv(EXPERIMENTS_DIR / f"preds_ml_ensemble.csv", index=False)
    print(f"\nPredictions saved to experiments/")


if __name__ == "__main__":
    main()
