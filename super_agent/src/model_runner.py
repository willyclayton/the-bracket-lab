"""
Configurable Model Runner — Phase 2 (Runs 4-9)
================================================
Single script replacing per-run model files. Supports multiple model types,
feature sets, interaction terms, multi-year testing, and round-specific models.

Usage:
    python super_agent/src/model_runner.py  (runs all configured runs)
"""

import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_tournament_games, split_train_test_multi, evaluate_predictions,
    evaluate_multi_year, append_to_run_log_multi, print_multi_results,
    merge_team_stats, RESEARCH_DIR,
)


TRAIN_YEARS = list(range(2010, 2020))  # 2010-2019 (630 games)
TEST_YEARS = [2021, 2022, 2023, 2024]  # 252 games total


def build_features(games, feature_columns, interaction_terms=None):
    """
    Build feature matrix for matchup prediction.
    - seed_diff is always the first feature
    - feature_columns: stat columns to compute diffs (e.g., ["adj_em", "tempo"])
    - interaction_terms: list of (col_a, col_b) tuples to multiply after computing diffs
    """
    X = []
    y = []
    game_info = []

    for game in games:
        features = []
        # Always include seed_diff
        features.append(game["seed1"] - game["seed2"])

        # Stat column diffs
        diffs = {}
        for col in feature_columns:
            col1 = f"{col}_1"
            col2 = f"{col}_2"
            val1 = float(game.get(col1, 0) or 0)
            val2 = float(game.get(col2, 0) or 0)
            diff = val1 - val2
            features.append(diff)
            diffs[col] = diff

        # Store seed_diff for interactions
        diffs["seed_diff"] = game["seed1"] - game["seed2"]

        # Also compute diffs for any stat columns present in game but not in feature_columns
        # (needed for interaction terms that reference columns not in the main feature set)
        for key in game:
            if key.endswith("_1") and key not in [f"{c}_1" for c in feature_columns]:
                base = key[:-2]
                col2 = f"{base}_2"
                if col2 in game and base not in diffs:
                    val1 = float(game.get(key, 0) or 0)
                    val2 = float(game.get(col2, 0) or 0)
                    diffs[base] = val1 - val2

        # Interaction terms
        if interaction_terms:
            for col_a, col_b in interaction_terms:
                a_key = col_a.replace("_diff", "") if col_a.endswith("_diff") else col_a
                b_key = col_b.replace("_diff", "") if col_b.endswith("_diff") else col_b
                a_val = diffs.get(a_key, diffs.get(col_a, 0))
                b_val = diffs.get(b_key, diffs.get(col_b, 0))
                features.append(a_val * b_val)

        X.append(features)
        y.append(1 if game["winner"] == game["team1"] else 0)
        game_info.append(game)

    return np.array(X), np.array(y), game_info


def get_feature_names(feature_columns, interaction_terms=None):
    """Generate human-readable feature names."""
    names = ["seed_diff"]
    for col in feature_columns:
        names.append(f"{col}_diff")
    if interaction_terms:
        for col_a, col_b in interaction_terms:
            names.append(f"{col_a}*{col_b}")
    return names


def build_model(model_type, model_params=None):
    """Instantiate a sklearn model."""
    params = model_params or {}
    params.setdefault("random_state", 42)

    if model_type == "logistic":
        from sklearn.linear_model import LogisticRegression
        params.setdefault("max_iter", 1000)
        return LogisticRegression(**params)
    elif model_type == "random_forest":
        from sklearn.ensemble import RandomForestClassifier
        params.setdefault("n_estimators", 200)
        return RandomForestClassifier(**params)
    elif model_type == "gradient_boosting":
        from sklearn.ensemble import GradientBoostingClassifier
        params.setdefault("n_estimators", 200)
        params.setdefault("max_depth", 3)
        params.setdefault("learning_rate", 0.1)
        return GradientBoostingClassifier(**params)
    else:
        raise ValueError(f"Unknown model_type: {model_type}")


def run_single_model(run_name, features, model_type="logistic", model_params=None,
                     interaction_terms=None, stat_columns=None, notes="",
                     test_years=None, train_years=None):
    """
    Run a single model across all test years.
    Returns multi_results dict.
    """
    from sklearn.preprocessing import StandardScaler

    if test_years is None:
        test_years = TEST_YEARS
    if train_years is None:
        train_years = TRAIN_YEARS

    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    games = load_tournament_games(data_file)

    # Determine which stat columns to merge
    all_needed = list(features)
    if stat_columns:
        all_needed = list(set(all_needed + stat_columns))
    games = merge_team_stats(games, stat_columns=all_needed)

    train, test_by_year = split_train_test_multi(games, test_years, train_years=train_years)

    X_train, y_train, train_info = build_features(train, features, interaction_terms)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    model = build_model(model_type, model_params)
    model.fit(X_train_scaled, y_train)

    # Predict per year
    predictions_by_year = {}
    actuals_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        X_test, y_test, test_info = build_features(year_games, features, interaction_terms)
        X_test_scaled = scaler.transform(X_test)

        y_pred = model.predict(X_test_scaled)
        y_proba = model.predict_proba(X_test_scaled)[:, 1]

        preds = []
        acts = []
        for i, game in enumerate(test_info):
            predicted_winner = game["team1"] if y_pred[i] == 1 else game["team2"]
            preds.append({
                "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
                "predicted_winner": predicted_winner,
                "round": game.get("round", "unknown"),
                "confidence": float(max(y_proba[i], 1 - y_proba[i])),
            })
            acts.append({
                "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
                "actual_winner": game["winner"],
            })
        predictions_by_year[year] = preds
        actuals_by_year[year] = acts

    multi_results = evaluate_multi_year(predictions_by_year, actuals_by_year)
    print_multi_results(run_name, multi_results)

    # Print coefficients for logistic, feature importances for tree models
    feature_names = get_feature_names(features, interaction_terms)
    if model_type == "logistic":
        print("Feature Coefficients:")
        for name, coef in zip(feature_names, model.coef_[0]):
            print(f"  {name}: {coef:.4f}")
    elif hasattr(model, "feature_importances_"):
        print("Feature Importances:")
        for name, imp in zip(feature_names, model.feature_importances_):
            print(f"  {name}: {imp:.4f}")

    append_to_run_log_multi(run_name, multi_results, notes=notes)

    return multi_results, model, scaler


def run_round_specific(run_name, features, model_type="logistic", model_params=None,
                       interaction_terms=None, notes=""):
    """
    Train separate models for early rounds (R64, R32) vs later rounds (S16+).
    """
    from sklearn.preprocessing import StandardScaler

    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    games = load_tournament_games(data_file)
    games = merge_team_stats(games, stat_columns=list(features))

    train, test_by_year = split_train_test_multi(games, TEST_YEARS, train_years=TRAIN_YEARS)

    early_rounds = {"round_of_64", "round_of_32"}

    # Split train by round type
    train_early = [g for g in train if g.get("round") in early_rounds]
    train_late = [g for g in train if g.get("round") not in early_rounds]

    # Build & train both models
    X_early, y_early, _ = build_features(train_early, features, interaction_terms)
    X_late, y_late, _ = build_features(train_late, features, interaction_terms)

    scaler_early = StandardScaler()
    scaler_late = StandardScaler()
    X_early_s = scaler_early.fit_transform(X_early)
    X_late_s = scaler_late.fit_transform(X_late)

    model_early = build_model(model_type, model_params)
    model_late = build_model(model_type, model_params)
    model_early.fit(X_early_s, y_early)
    model_late.fit(X_late_s, y_late)

    # Predict per year
    predictions_by_year = {}
    actuals_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        preds = []
        acts = []
        for game in year_games:
            is_early = game.get("round") in early_rounds
            m = model_early if is_early else model_late
            s = scaler_early if is_early else scaler_late

            X_g, _, _ = build_features([game], features, interaction_terms)
            X_g_s = s.transform(X_g)

            pred = m.predict(X_g_s)[0]
            proba = m.predict_proba(X_g_s)[0]

            predicted_winner = game["team1"] if pred == 1 else game["team2"]
            preds.append({
                "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
                "predicted_winner": predicted_winner,
                "round": game.get("round", "unknown"),
                "confidence": float(max(proba)),
            })
            acts.append({
                "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
                "actual_winner": game["winner"],
            })
        predictions_by_year[year] = preds
        actuals_by_year[year] = acts

    multi_results = evaluate_multi_year(predictions_by_year, actuals_by_year)
    print_multi_results(run_name, multi_results)
    append_to_run_log_multi(run_name, multi_results, notes=notes)

    return multi_results, (model_early, model_late), (scaler_early, scaler_late)


def run_ensemble(run_name, model_configs, notes=""):
    """
    Ensemble: average predicted probabilities from multiple model configurations.
    model_configs: list of dicts with {features, model_type, model_params, interaction_terms, round_specific}
    """
    from sklearn.preprocessing import StandardScaler

    data_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    games = load_tournament_games(data_file)

    # Collect all needed stat columns
    all_stats = set()
    for cfg in model_configs:
        all_stats.update(cfg.get("features", []))
    games = merge_team_stats(games, stat_columns=list(all_stats))

    train, test_by_year = split_train_test_multi(games, TEST_YEARS, train_years=TRAIN_YEARS)

    early_rounds = {"round_of_64", "round_of_32"}

    # Train all component models
    trained = []
    for cfg in model_configs:
        feats = cfg["features"]
        mt = cfg.get("model_type", "logistic")
        mp = cfg.get("model_params", None)
        it = cfg.get("interaction_terms", None)
        is_round_specific = cfg.get("round_specific", False)

        if is_round_specific:
            train_early = [g for g in train if g.get("round") in early_rounds]
            train_late = [g for g in train if g.get("round") not in early_rounds]

            X_e, y_e, _ = build_features(train_early, feats, it)
            X_l, y_l, _ = build_features(train_late, feats, it)
            sc_e, sc_l = StandardScaler(), StandardScaler()
            X_e_s = sc_e.fit_transform(X_e)
            X_l_s = sc_l.fit_transform(X_l)
            m_e = build_model(mt, mp)
            m_l = build_model(mt, mp)
            m_e.fit(X_e_s, y_e)
            m_l.fit(X_l_s, y_l)
            trained.append({"type": "round_specific", "early": (m_e, sc_e), "late": (m_l, sc_l),
                            "features": feats, "interactions": it})
        else:
            X_tr, y_tr, _ = build_features(train, feats, it)
            sc = StandardScaler()
            X_tr_s = sc.fit_transform(X_tr)
            m = build_model(mt, mp)
            m.fit(X_tr_s, y_tr)
            trained.append({"type": "single", "model": m, "scaler": sc,
                            "features": feats, "interactions": it})

    # Predict: average probabilities across models
    predictions_by_year = {}
    actuals_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        preds = []
        acts = []
        for game in year_games:
            probas = []
            for comp in trained:
                feats = comp["features"]
                it = comp["interactions"]
                X_g, _, _ = build_features([game], feats, it)

                if comp["type"] == "round_specific":
                    is_early = game.get("round") in early_rounds
                    m, sc = comp["early"] if is_early else comp["late"]
                else:
                    m, sc = comp["model"], comp["scaler"]

                X_g_s = sc.transform(X_g)
                proba = m.predict_proba(X_g_s)[0, 1]
                probas.append(proba)

            avg_proba = np.mean(probas)
            pred = 1 if avg_proba >= 0.5 else 0
            predicted_winner = game["team1"] if pred == 1 else game["team2"]
            preds.append({
                "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
                "predicted_winner": predicted_winner,
                "round": game.get("round", "unknown"),
                "confidence": float(max(avg_proba, 1 - avg_proba)),
            })
            acts.append({
                "game_id": game.get("game_id", f"{game['team1']}_vs_{game['team2']}"),
                "actual_winner": game["winner"],
            })
        predictions_by_year[year] = preds
        actuals_by_year[year] = acts

    multi_results = evaluate_multi_year(predictions_by_year, actuals_by_year)
    print_multi_results(run_name, multi_results)
    append_to_run_log_multi(run_name, multi_results, notes=notes)

    return multi_results


# ============================================================
# RUN CONFIGURATIONS (Runs 4-9)
# ============================================================

def run_4():
    """Multi-year baseline — same features as Run 3 but tested on 4 years."""
    return run_single_model(
        run_name="Run 4: Multi-year baseline",
        features=["adj_em", "tempo"],
        model_type="logistic",
        notes="Same features as Run 3 (seed_diff + adj_em + tempo). Multi-year test: 2021-2024. Establishes honest 4-year baseline.",
    )


def run_5():
    """Feature expansion — add barthag, wab, elite_sos."""
    return run_single_model(
        run_name="Run 5: Feature expansion",
        features=["adj_em", "tempo", "barthag", "wab", "elite_sos"],
        model_type="logistic",
        notes="Added barthag (power rating), wab (Wins Above Bubble), elite_sos (SOS vs top teams). All pre-tournament, no leakage.",
    )


def run_6():
    """Interactions — add seed_diff * adj_em interaction + adj_o/adj_d separately."""
    return run_single_model(
        run_name="Run 6: Interactions + separate O/D",
        features=["adj_o", "adj_d", "tempo", "barthag", "wab"],
        model_type="logistic",
        interaction_terms=[("seed_diff", "adj_em")],
        stat_columns=["adj_em", "adj_o", "adj_d", "tempo", "barthag", "wab"],
        notes="Split adj_em into adj_o/adj_d separately. Added seed_diff*adj_em_diff interaction. Captures non-linear matchup dynamics.",
    )


def run_7():
    """Model upgrade — GradientBoosting with best features from Run 6."""
    return run_single_model(
        run_name="Run 7: GradientBoosting",
        features=["adj_o", "adj_d", "tempo", "barthag", "wab"],
        model_type="gradient_boosting",
        model_params={"n_estimators": 200, "max_depth": 3, "learning_rate": 0.1},
        interaction_terms=[("seed_diff", "adj_em")],
        stat_columns=["adj_em", "adj_o", "adj_d", "tempo", "barthag", "wab"],
        notes="GradientBoostingClassifier with same features as Run 6. Tree-based models handle interactions natively.",
    )


def run_8():
    """Round-specific — separate models for R64/R32 vs S16+."""
    return run_round_specific(
        run_name="Run 8: Round-specific models",
        features=["adj_o", "adj_d", "tempo", "barthag", "wab"],
        model_type="logistic",
        interaction_terms=[("seed_diff", "adj_em")],
        notes="Separate logistic models for early (R64/R32) vs late (S16+) rounds. Different factors may drive early vs late upsets.",
    )


def run_9():
    """Ensemble — average probabilities from best logistic + GBT + round-specific."""
    return run_ensemble(
        run_name="Run 9: Ensemble",
        model_configs=[
            # Best logistic (Run 6 config)
            {
                "features": ["adj_o", "adj_d", "tempo", "barthag", "wab"],
                "model_type": "logistic",
                "interaction_terms": [("seed_diff", "adj_em")],
            },
            # GradientBoosting (Run 7 config)
            {
                "features": ["adj_o", "adj_d", "tempo", "barthag", "wab"],
                "model_type": "gradient_boosting",
                "model_params": {"n_estimators": 200, "max_depth": 3, "learning_rate": 0.1},
                "interaction_terms": [("seed_diff", "adj_em")],
            },
            # Round-specific logistic (Run 8 config)
            {
                "features": ["adj_o", "adj_d", "tempo", "barthag", "wab"],
                "model_type": "logistic",
                "interaction_terms": [("seed_diff", "adj_em")],
                "round_specific": True,
            },
        ],
        notes="Ensemble of Run 6 (logistic) + Run 7 (GBT) + Run 8 (round-specific). Averaged probabilities.",
    )


def run_10():
    """2025 holdout test — Run 5 model on unseen 2025 data."""
    return run_single_model(
        run_name="Run 10: 2025 holdout test",
        features=["adj_em", "tempo", "barthag", "wab", "elite_sos"],
        model_type="logistic",
        test_years=[2025],
        train_years=list(range(2010, 2020)),
        notes="Run 5 model (best) tested on 2025 as final holdout year. Train: 2010-2019. Model has never seen 2025 data. Validates 5-year accuracy (2021-2025).",
    )


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run model iterations 4-10")
    parser.add_argument("--run", type=int, choices=[4, 5, 6, 7, 8, 9, 10],
                        help="Run a specific iteration (default: all)")
    args = parser.parse_args()

    run_funcs = {4: run_4, 5: run_5, 6: run_6, 7: run_7, 8: run_8, 9: run_9, 10: run_10}

    if args.run:
        run_funcs[args.run]()
    else:
        for num in [4, 5, 6, 7, 8, 9]:
            print(f"\n{'#'*60}")
            print(f"  STARTING RUN {num}")
            print(f"{'#'*60}")
            run_funcs[num]()
