"""
Step 5: Backtest Scout Prime brackets against actual results.
Scores generated brackets and compares to Optimizer baseline.

Usage:
    python scout_prime_agent/src/validate.py --year 2024
    python scout_prime_agent/src/validate.py --year 2025
    python scout_prime_agent/src/validate.py --compare  # Compare all runs
"""

import os
import sys
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_json, score_bracket, print_results,
    RESEARCH_DIR, PROJECT_ROOT, ROUND_ORDER, ESPN_ROUND_POINTS,
)

# Optimizer baseline scores (from optimizer_agent runs 9-10)
OPTIMIZER_BASELINE = {
    2024: {"points": 920, "percentile": 72.0, "champion": "UConn", "champion_correct": True},
    2025: {"points": 900, "percentile": 51.0, "champion": "Duke", "champion_correct": False},
}


def load_scout_prime_bracket(year):
    """Load a Scout Prime bracket for a given year."""
    if year >= 2026:
        filepath = os.path.join(PROJECT_ROOT, "data", "models", "the-scout-prime.json")
    else:
        filepath = os.path.join(PROJECT_ROOT, "data", "archive", str(year), "models", "the-scout-prime.json")

    if not os.path.exists(filepath):
        return None
    return load_json(filepath)


def validate_bracket(bracket):
    """Validate bracket structure and integrity."""
    issues = []

    if not bracket:
        return ["Bracket is None"]

    # Check all rounds exist
    for rnd in ROUND_ORDER:
        games = bracket.get("rounds", {}).get(rnd, [])
        expected = {
            "round_of_64": 32, "round_of_32": 16, "sweet_16": 8,
            "elite_8": 4, "final_four": 2, "championship": 1,
        }
        if len(games) != expected[rnd]:
            issues.append(f"{rnd}: expected {expected[rnd]} games, got {len(games)}")

    # Check all games have picks
    for rnd in ROUND_ORDER:
        for game in bracket.get("rounds", {}).get(rnd, []):
            if not game.get("pick"):
                issues.append(f"{game['gameId']}: missing pick")
            if game.get("pick") not in [game.get("team1"), game.get("team2")]:
                issues.append(f"{game['gameId']}: pick '{game.get('pick')}' not in matchup")

    # Check winner cascade (winners must appear in next round)
    prev_winners = set()
    for rnd in ROUND_ORDER:
        games = bracket.get("rounds", {}).get(rnd, [])
        if rnd != "round_of_64":
            for game in games:
                if game["team1"] not in prev_winners:
                    issues.append(f"{rnd} {game['gameId']}: {game['team1']} didn't win previous round")
                if game["team2"] not in prev_winners:
                    issues.append(f"{rnd} {game['gameId']}: {game['team2']} didn't win previous round")
        prev_winners = {game["pick"] for game in games}

    # Check champion matches championship winner
    champ_game = bracket.get("rounds", {}).get("championship", [{}])[0] if bracket.get("rounds", {}).get("championship") else {}
    if bracket.get("champion") != champ_game.get("pick"):
        issues.append(f"Champion mismatch: header says '{bracket.get('champion')}', game says '{champ_game.get('pick')}'")

    return issues


def count_upsets(bracket):
    """Count number of upset picks (lower seed beating higher seed)."""
    upsets = []
    for rnd in ROUND_ORDER:
        for game in bracket.get("rounds", {}).get(rnd, []):
            pick_seed = game["seed1"] if game["pick"] == game["team1"] else game["seed2"]
            other_seed = game["seed2"] if game["pick"] == game["team1"] else game["seed1"]
            if pick_seed > other_seed:
                upsets.append({
                    "round": rnd,
                    "pick": game["pick"],
                    "pick_seed": pick_seed,
                    "opponent": game["team1"] if game["pick"] == game["team2"] else game["team2"],
                    "opponent_seed": other_seed,
                })
    return upsets


def main():
    parser = argparse.ArgumentParser(description="Validate Scout Prime brackets")
    parser.add_argument("--year", type=int, help="Year to validate")
    parser.add_argument("--compare", action="store_true", help="Compare all available brackets")
    args = parser.parse_args()

    if args.compare:
        print("=" * 60)
        print("  SCOUT PRIME vs OPTIMIZER COMPARISON")
        print("=" * 60)

        for year in [2024, 2025]:
            bracket = load_scout_prime_bracket(year)
            if not bracket:
                print(f"\n  {year}: No Scout Prime bracket found")
                continue

            espn_result, espn_pct = score_bracket(bracket["rounds"], year)
            if not espn_result:
                print(f"\n  {year}: No actual results available")
                continue

            baseline = OPTIMIZER_BASELINE.get(year, {})
            delta = espn_result["total_points"] - baseline.get("points", 0)
            pct_delta = (espn_pct or 0) - baseline.get("percentile", 0)

            print(f"\n  {year}:")
            print(f"    Scout Prime: {espn_result['total_points']} pts ({espn_pct:.1f}%ile)")
            print(f"    Optimizer:   {baseline.get('points', 'N/A')} pts ({baseline.get('percentile', 'N/A')}%ile)")
            print(f"    Delta:       {'+' if delta >= 0 else ''}{delta} pts ({'+' if pct_delta >= 0 else ''}{pct_delta:.1f}%ile)")
            print(f"    SP Champion: {bracket.get('champion', 'N/A')}")
            print(f"    Opt Champion: {baseline.get('champion', 'N/A')} ({'correct' if baseline.get('champion_correct') else 'wrong'})")

        print(f"\n{'='*60}")
        return

    if not args.year:
        print("ERROR: Specify --year or --compare")
        return

    year = args.year
    print("=" * 60)
    print(f"  VALIDATING SCOUT PRIME BRACKET — {year}")
    print("=" * 60)

    bracket = load_scout_prime_bracket(year)
    if not bracket:
        print(f"\n  ERROR: No bracket found for {year}")
        print(f"  Run: python scout_prime_agent/src/generate_bracket.py --year {year}")
        return

    # Structural validation
    print(f"\n1. Structural validation...")
    issues = validate_bracket(bracket)
    if issues:
        print(f"   ISSUES FOUND:")
        for issue in issues:
            print(f"     - {issue}")
    else:
        print(f"   All checks passed")

    # Upset analysis
    print(f"\n2. Upset picks...")
    upsets = count_upsets(bracket)
    print(f"   {len(upsets)} upsets picked")
    for u in upsets:
        print(f"     {u['round']}: {u['pick_seed']}-{u['pick']} over {u['opponent_seed']}-{u['opponent']}")

    # Score
    print(f"\n3. Scoring...")
    espn_result, espn_pct = score_bracket(bracket["rounds"], year)
    if espn_result:
        run_name = f"Scout Prime Validation — {year}"
        results_by_year = {year: (espn_result, espn_pct)}
        print_results(run_name, results_by_year)

        # Compare to baseline
        baseline = OPTIMIZER_BASELINE.get(year, {})
        if baseline:
            delta = espn_result["total_points"] - baseline["points"]
            print(f"  vs Optimizer: {'+' if delta >= 0 else ''}{delta} pts")
    else:
        print(f"   No actual results available for {year}")

    print(f"\n  Champion: {bracket.get('champion', 'N/A')}")
    print(f"  Final Four: {', '.join(bracket.get('finalFour', []))}")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
