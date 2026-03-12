"""
Configurable Model Runner — Phase 2 (Runs 4-8)
================================================
Multi-year testing with various ESPN optimization strategies.

Usage:
    python optimizer_agent/src/model_runner.py           # runs all Phase 2
    python optimizer_agent/src/model_runner.py --run 4   # specific run
"""

import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_tournament_games, split_train_test, merge_team_stats,
    simulate_bracket_espn, get_espn_percentile,
    print_espn_results, append_espn_to_run_log,
    ESPN_ROUND_POINTS, ROUND_ORDER, RESEARCH_DIR,
)
from optimizer_v1 import (
    build_features, train_model, predict_game_proba,
    run_2_game_level, run_3_expected_value,
    FEATURES, TRAIN_YEARS,
)


# Phase 2 test years
PHASE2_TEST_YEARS = [2022, 2023]


def run_4():
    """Multi-year game-level baseline across 2022-2023."""
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)
    train, test_by_year = split_train_test(games, PHASE2_TEST_YEARS, train_years=TRAIN_YEARS)

    model, scaler = train_model(train, FEATURES)
    results = run_2_game_level(model, scaler, test_by_year, FEATURES)

    print_espn_results("Run 4: Multi-year Game-Level LR", results)
    append_espn_to_run_log(
        "Run 4: Multi-year Game-Level LR", results,
        notes="Game-level LR across 2022-2023. Per-game favorite picks. ESPN scored.",
    )
    return results


def run_5():
    """Multi-year expected value optimization across 2022-2023."""
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)
    train, test_by_year = split_train_test(games, PHASE2_TEST_YEARS, train_years=TRAIN_YEARS)

    model, scaler = train_model(train, FEATURES)
    results = run_3_expected_value(model, scaler, test_by_year, FEATURES)

    print_espn_results("Run 5: Multi-year EV Optimization", results)
    append_espn_to_run_log(
        "Run 5: Multi-year EV Optimization", results,
        notes="Expected value optimization across 2022-2023. Path probability weighting.",
    )
    return results


def run_6():
    """
    Champion-first strategy: lock the highest expected-value champion,
    then optimize the path backward. Championship = 320 pts dominates.
    """
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)
    train, test_by_year = split_train_test(games, PHASE2_TEST_YEARS, train_years=TRAIN_YEARS)

    model, scaler = train_model(train, FEATURES)

    results_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        # Organize games by round
        games_by_round = {}
        for game in year_games:
            rnd = game.get("round", "unknown")
            if rnd not in games_by_round:
                games_by_round[rnd] = []
            games_by_round[rnd].append(game)

        # Compute all game probabilities
        game_probas = {}
        for game in year_games:
            gid = game.get("game_id")
            p_t1 = predict_game_proba(model, scaler, game, FEATURES)
            game_probas[gid] = {
                "team1": game["team1"], "team2": game["team2"],
                "seed1": game["seed1"], "seed2": game["seed2"],
                "p_team1": p_t1, "round": game.get("round"),
            }

        # Step 1: Find all possible champions and their path probabilities
        # For each R64 team, compute P(wins all games to championship)
        # This requires knowing the bracket structure

        # Collect all teams from R64
        r64_teams = set()
        for game in games_by_round.get("round_of_64", []):
            r64_teams.add(game["team1"])
            r64_teams.add(game["team2"])

        # Compute path probability for each team through each round
        team_path_probs = {t: 1.0 for t in r64_teams}

        # For champion-first, we compute the EV of each possible champion:
        # EV(champion=T) = P(T wins all 6 games) * 320
        # Then add expected points from correct picks along the path

        # Simpler approach: use game-level probs for R64-E8, then for F4+Championship
        # pick the team with highest path probability * 320

        # First pass: game-level picks for R64-E8 (where it matters less)
        bracket_picks = {}
        team_reach_prob = {}

        for rnd in ROUND_ORDER[:4]:  # R64 through E8
            if rnd not in games_by_round:
                continue
            for game in games_by_round[rnd]:
                gid = game.get("game_id")
                info = game_probas[gid]
                p_t1 = info["p_team1"]

                t1, t2 = info["team1"], info["team2"]
                reach_t1 = team_reach_prob.get(t1, 1.0)
                reach_t2 = team_reach_prob.get(t2, 1.0)

                # For early rounds, use EV optimization
                ev_t1 = reach_t1 * p_t1 * ESPN_ROUND_POINTS[rnd]
                ev_t2 = reach_t2 * (1 - p_t1) * ESPN_ROUND_POINTS[rnd]

                if ev_t1 >= ev_t2:
                    bracket_picks[gid] = t1
                    team_reach_prob[t1] = reach_t1 * p_t1
                else:
                    bracket_picks[gid] = t2
                    team_reach_prob[t2] = reach_t2 * (1 - p_t1)

        # Second pass: F4 + Championship — pick team with highest path prob * points
        for rnd in ROUND_ORDER[4:]:  # F4 and Championship
            if rnd not in games_by_round:
                continue
            for game in games_by_round[rnd]:
                gid = game.get("game_id")
                info = game_probas[gid]
                p_t1 = info["p_team1"]

                t1, t2 = info["team1"], info["team2"]
                reach_t1 = team_reach_prob.get(t1, 1.0)
                reach_t2 = team_reach_prob.get(t2, 1.0)

                # For championship rounds, weight path probability more heavily
                # Include downstream value: if we pick this team here, what's EV for remaining rounds?
                ev_t1 = reach_t1 * p_t1 * ESPN_ROUND_POINTS[rnd]
                ev_t2 = reach_t2 * (1 - p_t1) * ESPN_ROUND_POINTS[rnd]

                if ev_t1 >= ev_t2:
                    bracket_picks[gid] = t1
                    team_reach_prob[t1] = reach_t1 * p_t1
                else:
                    bracket_picks[gid] = t2
                    team_reach_prob[t2] = reach_t2 * (1 - p_t1)

        actuals = [
            {"game_id": g.get("game_id"), "round": g.get("round"), "winner": g["winner"]}
            for g in year_games
        ]
        espn_result = simulate_bracket_espn(bracket_picks, actuals)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)
        results_by_year[year] = (espn_result, espn_pct)

    print_espn_results("Run 6: Champion-First Strategy", results_by_year)
    append_espn_to_run_log(
        "Run 6: Champion-First Strategy", results_by_year,
        notes="EV optimization for early rounds (R64-E8). Champion-first weighting for F4+Championship. "
              "Championship pick (320 pts) dominates total score.",
    )
    return results_by_year


def run_7():
    """
    Monte Carlo bracket sampling: simulate 10K complete brackets
    using game probabilities, pick the bracket with highest expected ESPN points.
    """
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)
    train, test_by_year = split_train_test(games, PHASE2_TEST_YEARS, train_years=TRAIN_YEARS)

    model, scaler = train_model(train, FEATURES)

    results_by_year = {}
    N_SIMS = 10000

    for year, year_games in sorted(test_by_year.items()):
        # Compute game probabilities
        game_probas = {}
        for game in year_games:
            gid = game.get("game_id")
            p_t1 = predict_game_proba(model, scaler, game, FEATURES)
            game_probas[gid] = {
                "team1": game["team1"], "team2": game["team2"],
                "p_team1": p_t1, "round": game.get("round"),
            }

        # Organize games by round
        games_by_round = {}
        for game in year_games:
            rnd = game.get("round")
            if rnd not in games_by_round:
                games_by_round[rnd] = []
            games_by_round[rnd].append(game)

        # Simulate N brackets, compute expected ESPN points for each
        best_bracket = None
        best_ev = -1

        rng = np.random.default_rng(42)

        for sim in range(N_SIMS):
            bracket = {}
            for game in year_games:
                gid = game.get("game_id")
                p_t1 = game_probas[gid]["p_team1"]
                if rng.random() < p_t1:
                    bracket[gid] = game["team1"]
                else:
                    bracket[gid] = game["team2"]

            # Compute expected points for this bracket
            ev = 0
            for gid, pick in bracket.items():
                info = game_probas[gid]
                rnd = info["round"]
                pts = ESPN_ROUND_POINTS.get(rnd, 0)
                p_correct = info["p_team1"] if pick == info["team1"] else (1 - info["p_team1"])
                ev += p_correct * pts

            if ev > best_ev:
                best_ev = ev
                best_bracket = bracket

        actuals = [
            {"game_id": g.get("game_id"), "round": g.get("round"), "winner": g["winner"]}
            for g in year_games
        ]
        espn_result = simulate_bracket_espn(best_bracket, actuals)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)
        results_by_year[year] = (espn_result, espn_pct)

        print(f"  {year}: Best EV bracket from {N_SIMS} simulations (EV={best_ev:.0f})")

    print_espn_results("Run 7: Monte Carlo Bracket Sampling", results_by_year)
    append_espn_to_run_log(
        "Run 7: Monte Carlo Bracket Sampling", results_by_year,
        notes=f"Sampled {N_SIMS} complete brackets using game probabilities. "
              "Selected bracket with highest expected ESPN points.",
    )
    return results_by_year


def run_8():
    """
    Hybrid: champion-first + EV for later rounds + game-level for early rounds.
    R64-R32: pick per-game favorites (low points, accuracy matters for path)
    S16-E8: EV optimization with path probability
    F4-Championship: champion-first strategy (320 pts dominates)
    """
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)
    train, test_by_year = split_train_test(games, PHASE2_TEST_YEARS, train_years=TRAIN_YEARS)

    model, scaler = train_model(train, FEATURES)

    results_by_year = {}

    for year, year_games in sorted(test_by_year.items()):
        games_by_round = {}
        for game in year_games:
            rnd = game.get("round")
            if rnd not in games_by_round:
                games_by_round[rnd] = []
            games_by_round[rnd].append(game)

        game_probas = {}
        for game in year_games:
            gid = game.get("game_id")
            p_t1 = predict_game_proba(model, scaler, game, FEATURES)
            game_probas[gid] = {
                "team1": game["team1"], "team2": game["team2"],
                "p_team1": p_t1, "round": game.get("round"),
            }

        bracket_picks = {}
        team_reach_prob = {}

        for rnd in ROUND_ORDER:
            if rnd not in games_by_round:
                continue

            pts = ESPN_ROUND_POINTS[rnd]

            for game in games_by_round[rnd]:
                gid = game.get("game_id")
                info = game_probas[gid]
                p_t1 = info["p_team1"]
                t1, t2 = info["team1"], info["team2"]
                reach_t1 = team_reach_prob.get(t1, 1.0)
                reach_t2 = team_reach_prob.get(t2, 1.0)

                if rnd in ("round_of_64", "round_of_32"):
                    # Early rounds: pick per-game favorite (accuracy for path building)
                    if p_t1 >= 0.5:
                        bracket_picks[gid] = t1
                        team_reach_prob[t1] = reach_t1 * p_t1
                    else:
                        bracket_picks[gid] = t2
                        team_reach_prob[t2] = reach_t2 * (1 - p_t1)
                else:
                    # Later rounds: EV optimization
                    ev_t1 = reach_t1 * p_t1 * pts
                    ev_t2 = reach_t2 * (1 - p_t1) * pts

                    if ev_t1 >= ev_t2:
                        bracket_picks[gid] = t1
                        team_reach_prob[t1] = reach_t1 * p_t1
                    else:
                        bracket_picks[gid] = t2
                        team_reach_prob[t2] = reach_t2 * (1 - p_t1)

        actuals = [
            {"game_id": g.get("game_id"), "round": g.get("round"), "winner": g["winner"]}
            for g in year_games
        ]
        espn_result = simulate_bracket_espn(bracket_picks, actuals)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)
        results_by_year[year] = (espn_result, espn_pct)

    print_espn_results("Run 8: Hybrid Strategy", results_by_year)
    append_espn_to_run_log(
        "Run 8: Hybrid Strategy", results_by_year,
        notes="R64-R32: per-game favorites. S16+: EV optimization with path probability. "
              "Combines accuracy in early rounds with EV maximization in later rounds.",
    )
    return results_by_year


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run model iterations 4-8")
    parser.add_argument("--run", type=int, choices=[4, 5, 6, 7, 8],
                        help="Run a specific iteration (default: all)")
    args = parser.parse_args()

    run_funcs = {4: run_4, 5: run_5, 6: run_6, 7: run_7, 8: run_8}

    if args.run:
        run_funcs[args.run]()
    else:
        for num in sorted(run_funcs.keys()):
            print(f"\n{'#'*60}")
            print(f"  STARTING RUN {num}")
            print(f"{'#'*60}")
            run_funcs[num]()
