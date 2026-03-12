"""
Run 2 & 3: Game-Level LR + Expected Value Optimization
========================================================
Run 2: Same logistic regression as super_agent Run 5, but scored by ESPN points.
Run 3: Expected value bracket optimization — instead of picking per-game favorites,
       optimize the complete bracket for maximum expected ESPN points using path probabilities.

Usage:
    python optimizer_agent/src/optimizer_v1.py          # runs both Run 2 and Run 3
    python optimizer_agent/src/optimizer_v1.py --run 2  # just Run 2
    python optimizer_agent/src/optimizer_v1.py --run 3  # just Run 3
"""

import os
import sys
import json
import numpy as np
from itertools import product as iterproduct

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_tournament_games, split_train_test, merge_team_stats,
    simulate_bracket_espn, get_espn_percentile,
    print_espn_results, append_espn_to_run_log,
    ESPN_ROUND_POINTS, ROUND_ORDER, RESEARCH_DIR, PROJECT_ROOT,
)


# Train/test configuration
TRAIN_YEARS = [y for y in range(2010, 2022) if y != 2020]
FEATURES = ["adj_em", "tempo", "barthag", "wab", "elite_sos"]


def build_features(games, feature_columns):
    """Build feature matrix: seed_diff + stat diffs."""
    X = []
    y = []
    game_info = []

    for game in games:
        features = [game["seed1"] - game["seed2"]]
        for col in feature_columns:
            v1 = float(game.get(f"{col}_1", 0) or 0)
            v2 = float(game.get(f"{col}_2", 0) or 0)
            features.append(v1 - v2)

        X.append(features)
        y.append(1 if game["winner"] == game["team1"] else 0)
        game_info.append(game)

    return np.array(X), np.array(y), game_info


def train_model(games, feature_columns):
    """Train logistic regression on games, return model + scaler."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler

    X, y, _ = build_features(games, feature_columns)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_scaled, y)

    return model, scaler


def predict_game_proba(model, scaler, game, feature_columns):
    """Get P(team1 wins) for a single game."""
    features = [game["seed1"] - game["seed2"]]
    for col in feature_columns:
        v1 = float(game.get(f"{col}_1", 0) or 0)
        v2 = float(game.get(f"{col}_2", 0) or 0)
        features.append(v1 - v2)

    X = np.array([features])
    X_scaled = scaler.transform(X)
    return model.predict_proba(X_scaled)[0, 1]


def run_2_game_level(model, scaler, test_by_year, feature_columns):
    """
    Run 2: Game-level predictions (pick per-game favorite).
    Same as super_agent but scored by ESPN points.
    """
    results_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        predictions = []
        actuals = []

        for game in year_games:
            p_team1 = predict_game_proba(model, scaler, game, feature_columns)
            predicted = game["team1"] if p_team1 >= 0.5 else game["team2"]

            predictions.append({
                "game_id": game.get("game_id"),
                "predicted_winner": predicted,
                "round": game.get("round"),
            })
            actuals.append({
                "game_id": game.get("game_id"),
                "round": game.get("round"),
                "winner": game["winner"],
            })

        bracket_picks = {p["game_id"]: p["predicted_winner"] for p in predictions}
        espn_result = simulate_bracket_espn(bracket_picks, actuals)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)
        results_by_year[year] = (espn_result, espn_pct)

    return results_by_year


def run_3_expected_value(model, scaler, test_by_year, feature_columns):
    """
    Run 3: Expected value bracket optimization.

    Instead of picking the per-game favorite, optimize the complete bracket
    for maximum expected ESPN points. For later rounds, consider path probability:
    picking a team that's likely to reach that round is worth more than picking
    a slightly better team that's unlikely to get there.

    Algorithm:
    1. Compute P(team1 wins) for each R64 game
    2. For R64: pick per-game favorites (same as Run 2 — low stakes per game)
    3. For R32+: compute expected points for each possible pick considering
       the probability that each team actually reaches that game
    4. Pick the team with higher expected points contribution
    """
    results_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        # Organize games by round
        games_by_round = {}
        for game in year_games:
            rnd = game.get("round", "unknown")
            if rnd not in games_by_round:
                games_by_round[rnd] = []
            games_by_round[rnd].append(game)

        # Compute win probabilities for all games
        game_probas = {}
        for game in year_games:
            gid = game.get("game_id")
            p_team1 = predict_game_proba(model, scaler, game, feature_columns)
            game_probas[gid] = {
                "team1": game["team1"],
                "team2": game["team2"],
                "seed1": game["seed1"],
                "seed2": game["seed2"],
                "p_team1": p_team1,
                "round": game.get("round"),
            }

        # Build bracket using expected value optimization
        bracket_picks = {}
        team_reach_prob = {}  # track P(team reaches current round)

        for rnd in ROUND_ORDER:
            if rnd not in games_by_round:
                continue

            pts_per_correct = ESPN_ROUND_POINTS[rnd]

            for game in games_by_round[rnd]:
                gid = game.get("game_id")
                info = game_probas[gid]
                p_t1 = info["p_team1"]
                p_t2 = 1 - p_t1

                t1 = info["team1"]
                t2 = info["team2"]

                # Get reach probability (1.0 for R64, cascaded for later rounds)
                reach_t1 = team_reach_prob.get(t1, 1.0)
                reach_t2 = team_reach_prob.get(t2, 1.0)

                # Expected points for picking each team:
                # EV(pick T1) = P(T1 reaches game) * P(T1 wins game) * points
                # EV(pick T2) = P(T2 reaches game) * P(T2 wins game) * points
                ev_t1 = reach_t1 * p_t1 * pts_per_correct
                ev_t2 = reach_t2 * p_t2 * pts_per_correct

                if ev_t1 >= ev_t2:
                    bracket_picks[gid] = t1
                    # Update reach probability for winner advancing
                    team_reach_prob[t1] = reach_t1 * p_t1
                else:
                    bracket_picks[gid] = t2
                    team_reach_prob[t2] = reach_t2 * p_t2

        # Score
        actuals = [
            {"game_id": g.get("game_id"), "round": g.get("round"), "winner": g["winner"]}
            for g in year_games
        ]
        espn_result = simulate_bracket_espn(bracket_picks, actuals)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)
        results_by_year[year] = (espn_result, espn_pct)

    return results_by_year


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=int, choices=[2, 3], help="Run specific iteration")
    args = parser.parse_args()

    # Load and prepare data
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)

    test_years = [2022]
    train, test_by_year = split_train_test(games, test_years, train_years=TRAIN_YEARS)

    print(f"Training: {len(train)} games ({min(TRAIN_YEARS)}-{max(TRAIN_YEARS)})")
    print(f"Test: {list(test_by_year.keys())}")

    # Train model
    model, scaler = train_model(train, FEATURES)
    print(f"Model trained with features: seed_diff + {', '.join(FEATURES)}")

    # Run 2: Game-level
    if args.run is None or args.run == 2:
        r2 = run_2_game_level(model, scaler, test_by_year, FEATURES)
        print_espn_results("Run 2: Game-Level LR (ESPN Points)", r2)
        append_espn_to_run_log(
            "Run 2: Game-Level LR (ESPN Points)", r2,
            notes="Same logistic regression as super_agent Run 5 (seed_diff + adj_em + tempo + barthag + wab + elite_sos). "
                  "Picks per-game favorite. Scored by ESPN points instead of accuracy.",
        )

    # Run 3: Expected value optimization
    if args.run is None or args.run == 3:
        r3 = run_3_expected_value(model, scaler, test_by_year, FEATURES)
        print_espn_results("Run 3: Expected Value Optimization (ESPN Points)", r3)
        append_espn_to_run_log(
            "Run 3: Expected Value Optimization (ESPN Points)", r3,
            notes="Same model probabilities as Run 2, but picks optimize expected ESPN points "
                  "using path probability (P(team reaches game) * P(team wins) * points_for_round). "
                  "May differ from Run 2 in later rounds where path probability matters more.",
        )


if __name__ == "__main__":
    main()
