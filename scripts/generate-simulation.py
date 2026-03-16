#!/usr/bin/env python3
"""
Generate deterministic fake tournament results for the simulation branch.

This creates a complete 63-game bracket with hardcoded results designed to
produce maximum leaderboard drama:

Champion: Arizona (1-seed, West)
Final Four: Florida (S), Arizona (W), Duke (E), Iowa State (MW)

Key storylines:
- Only the-auto-researcher picks Arizona as champion (+320 pts)
- Scout/Quant/Historian all pick Duke — score well but lose the 320-pt championship
- Iowa State (2) upsets Michigan (1) in E8 — hurts models with Michigan in FF
- 8 R64 upsets keep things realistic

Usage:
    python scripts/generate-simulation.py                # Full tournament
    python scripts/generate-simulation.py --partial 32   # First 32 games only
    python scripts/generate-simulation.py --dry-run      # Print summary, don't write
"""

import json
import argparse
from pathlib import Path
from datetime import datetime

RESULTS_PATH = Path(__file__).parent.parent / "data" / "results" / "actual-results.json"

# ============================================================
# HARDCODED BRACKET — designed for leaderboard drama
# ============================================================

# R64: 32 games. Format: (gameId, region, team1, seed1, team2, seed2, winner, score1, score2)
# Upsets marked with * in comments
R64_RESULTS = [
    # === EAST ===
    ("r64-east-1", "East", "Duke", 1, "Siena", 16, "Duke", 85, 58),
    ("r64-east-2", "East", "Ohio State", 8, "TCU", 9, "Ohio State", 71, 68),
    ("r64-east-3", "East", "St. John's", 5, "Northern Iowa", 12, "St. John's", 74, 65),
    ("r64-east-4", "East", "Kansas", 4, "Cal Baptist", 13, "Kansas", 79, 62),
    ("r64-east-5", "East", "Louisville", 6, "South Florida", 11, "Louisville", 72, 66),
    ("r64-east-6", "East", "Michigan State", 3, "North Dakota State", 14, "Michigan State", 77, 59),
    ("r64-east-7", "East", "UCLA", 7, "UCF", 10, "UCF", 68, 71),  # * UPSET
    ("r64-east-8", "East", "UConn", 2, "Furman", 15, "UConn", 82, 61),
    # === SOUTH ===
    ("r64-south-1", "South", "Florida", 1, "Prairie View A&M", 16, "Florida", 88, 55),
    ("r64-south-2", "South", "Clemson", 8, "Iowa", 9, "Iowa", 65, 70),  # * UPSET
    ("r64-south-3", "South", "Vanderbilt", 5, "McNeese", 12, "McNeese", 67, 72),  # * UPSET
    ("r64-south-4", "South", "Nebraska", 4, "Troy", 13, "Nebraska", 76, 63),
    ("r64-south-5", "South", "North Carolina", 6, "VCU", 11, "North Carolina", 80, 71),
    ("r64-south-6", "South", "Illinois", 3, "Penn", 14, "Illinois", 81, 60),
    ("r64-south-7", "South", "Saint Mary's", 7, "Texas A&M", 10, "Texas A&M", 64, 69),  # * UPSET
    ("r64-south-8", "South", "Houston", 2, "Idaho", 15, "Houston", 83, 57),
    # === WEST ===
    ("r64-west-1", "West", "Arizona", 1, "LIU", 16, "Arizona", 91, 54),
    ("r64-west-2", "West", "Villanova", 8, "Utah State", 9, "Utah State", 66, 72),  # * UPSET
    ("r64-west-3", "West", "Wisconsin", 5, "High Point", 12, "Wisconsin", 75, 64),
    ("r64-west-4", "West", "Arkansas", 4, "Hawaii", 13, "Arkansas", 78, 65),
    ("r64-west-5", "West", "BYU", 6, "Texas", 11, "Texas", 69, 73),  # * UPSET
    ("r64-west-6", "West", "Gonzaga", 3, "Kennesaw State", 14, "Gonzaga", 84, 62),
    ("r64-west-7", "West", "Miami", 7, "Missouri", 10, "Miami", 70, 67),
    ("r64-west-8", "West", "Purdue", 2, "Queens", 15, "Purdue", 80, 58),
    # === MIDWEST ===
    ("r64-midwest-1", "Midwest", "Michigan", 1, "UMBC", 16, "Michigan", 87, 56),
    ("r64-midwest-2", "Midwest", "Georgia", 8, "Saint Louis", 9, "Georgia", 69, 66),
    ("r64-midwest-3", "Midwest", "Texas Tech", 5, "Akron", 12, "Texas Tech", 73, 61),
    ("r64-midwest-4", "Midwest", "Alabama", 4, "Hofstra", 13, "Alabama", 81, 67),
    ("r64-midwest-5", "Midwest", "Tennessee", 6, "SMU", 11, "SMU", 70, 74),  # * UPSET
    ("r64-midwest-6", "Midwest", "Virginia", 3, "Wright State", 14, "Virginia", 68, 55),
    ("r64-midwest-7", "Midwest", "Kentucky", 7, "Santa Clara", 10, "Santa Clara", 71, 75),  # * UPSET
    ("r64-midwest-8", "Midwest", "Iowa State", 2, "Tennessee State", 15, "Iowa State", 84, 59),
]

# R32: 16 games. Winners from R64 feed in.
# Matchup pattern: game 1+2 winners play, 3+4 winners play, etc.
R32_RESULTS = [
    # === EAST ===
    ("r32-east-1", "East", "Duke", 1, "Ohio State", 8, "Duke", 78, 65),
    ("r32-east-2", "East", "St. John's", 5, "Kansas", 4, "Kansas", 70, 74),
    ("r32-east-3", "East", "Louisville", 6, "Michigan State", 3, "Michigan State", 67, 72),
    ("r32-east-4", "East", "UCF", 10, "UConn", 2, "UConn", 63, 77),
    # === SOUTH ===
    ("r32-south-1", "South", "Florida", 1, "Iowa", 9, "Florida", 79, 68),
    ("r32-south-2", "South", "McNeese", 12, "Nebraska", 4, "Nebraska", 65, 71),
    ("r32-south-3", "South", "North Carolina", 6, "Illinois", 3, "Illinois", 69, 74),
    ("r32-south-4", "South", "Texas A&M", 10, "Houston", 2, "Houston", 62, 75),
    # === WEST ===
    ("r32-west-1", "West", "Arizona", 1, "Utah State", 9, "Arizona", 80, 66),
    ("r32-west-2", "West", "Wisconsin", 5, "Arkansas", 4, "Arkansas", 68, 73),
    ("r32-west-3", "West", "Texas", 11, "Gonzaga", 3, "Gonzaga", 64, 78),
    ("r32-west-4", "West", "Miami", 7, "Purdue", 2, "Purdue", 65, 76),
    # === MIDWEST ===
    ("r32-midwest-1", "Midwest", "Michigan", 1, "Georgia", 8, "Michigan", 81, 68),
    ("r32-midwest-2", "Midwest", "Texas Tech", 5, "Alabama", 4, "Alabama", 67, 72),
    ("r32-midwest-3", "Midwest", "SMU", 11, "Virginia", 3, "Virginia", 66, 70),
    ("r32-midwest-4", "Midwest", "Santa Clara", 10, "Iowa State", 2, "Iowa State", 63, 79),
]

# S16: 8 games
S16_RESULTS = [
    ("s16-east-1", "East", "Duke", 1, "Kansas", 4, "Duke", 76, 69),
    ("s16-east-2", "East", "Michigan State", 3, "UConn", 2, "UConn", 68, 74),
    ("s16-south-1", "South", "Florida", 1, "Nebraska", 4, "Florida", 77, 65),
    ("s16-south-2", "South", "Illinois", 3, "Houston", 2, "Houston", 70, 73),
    ("s16-west-1", "West", "Arizona", 1, "Arkansas", 4, "Arizona", 82, 70),
    ("s16-west-2", "West", "Gonzaga", 3, "Purdue", 2, "Gonzaga", 71, 68),
    ("s16-midwest-1", "Midwest", "Michigan", 1, "Alabama", 4, "Michigan", 75, 69),
    ("s16-midwest-2", "Midwest", "Virginia", 3, "Iowa State", 2, "Iowa State", 67, 74),
]

# E8: 4 games
E8_RESULTS = [
    ("e8-east", "East", "Duke", 1, "UConn", 2, "Duke", 72, 68),
    ("e8-south", "South", "Florida", 1, "Houston", 2, "Florida", 74, 70),
    ("e8-west", "West", "Arizona", 1, "Gonzaga", 3, "Arizona", 78, 73),
    ("e8-midwest", "Midwest", "Michigan", 1, "Iowa State", 2, "Iowa State", 71, 76),  # KEY UPSET
]

# FF: 2 games
FF_RESULTS = [
    ("f4-south-west", "National", "Florida", 1, "Arizona", 1, "Arizona", 69, 74),
    ("f4-east-midwest", "National", "Duke", 1, "Iowa State", 2, "Duke", 78, 72),
]

# Championship
CHAMPIONSHIP = [
    ("championship", "National", "Arizona", 1, "Duke", 1, "Arizona", 73, 68),
]

# Game timestamps (spread across tournament dates)
GAME_DATES = {
    "round_of_64": [
        # Day 1: March 20 (Thursday)
        ("2026-03-20T12:15:00Z", "2026-03-20T14:45:00Z", "2026-03-20T17:15:00Z", "2026-03-20T19:45:00Z",
         "2026-03-20T12:40:00Z", "2026-03-20T15:10:00Z", "2026-03-20T17:40:00Z", "2026-03-20T20:10:00Z"),
        # Day 2: March 21 (Friday)
        ("2026-03-21T12:15:00Z", "2026-03-21T14:45:00Z", "2026-03-21T17:15:00Z", "2026-03-21T19:45:00Z",
         "2026-03-21T12:40:00Z", "2026-03-21T15:10:00Z", "2026-03-21T17:40:00Z", "2026-03-21T20:10:00Z"),
        # Day 3: March 22 (Saturday) - remaining R64
        ("2026-03-22T12:15:00Z", "2026-03-22T14:45:00Z", "2026-03-22T17:15:00Z", "2026-03-22T19:45:00Z",
         "2026-03-22T12:40:00Z", "2026-03-22T15:10:00Z", "2026-03-22T17:40:00Z", "2026-03-22T20:10:00Z"),
        # Day 4: March 23 (Sunday) - remaining R64
        ("2026-03-23T12:15:00Z", "2026-03-23T14:45:00Z", "2026-03-23T17:15:00Z", "2026-03-23T19:45:00Z",
         "2026-03-23T12:40:00Z", "2026-03-23T15:10:00Z", "2026-03-23T17:40:00Z", "2026-03-23T20:10:00Z"),
    ],
    "round_of_32": [
        # March 24-25 (Mon-Tue)
        ("2026-03-24T12:10:00Z", "2026-03-24T14:40:00Z", "2026-03-24T17:10:00Z", "2026-03-24T19:40:00Z",
         "2026-03-24T19:55:00Z", "2026-03-24T22:00:00Z", "2026-03-25T17:10:00Z", "2026-03-25T19:40:00Z"),
        ("2026-03-25T12:10:00Z", "2026-03-25T14:40:00Z", "2026-03-25T17:20:00Z", "2026-03-25T19:50:00Z",
         "2026-03-25T20:00:00Z", "2026-03-25T22:10:00Z", "2026-03-25T22:30:00Z", "2026-03-25T22:50:00Z"),
    ],
    "sweet_16": [
        # March 28-29 (Sat-Sun)
        ("2026-03-28T14:00:00Z", "2026-03-28T16:30:00Z", "2026-03-28T19:00:00Z", "2026-03-28T21:30:00Z"),
        ("2026-03-29T14:00:00Z", "2026-03-29T16:30:00Z", "2026-03-29T19:00:00Z", "2026-03-29T21:30:00Z"),
    ],
    "elite_8": [
        # March 30-31 (Mon-Tue)
        ("2026-03-30T18:00:00Z", "2026-03-30T20:30:00Z"),
        ("2026-03-31T18:00:00Z", "2026-03-31T20:30:00Z"),
    ],
    "final_four": [
        ("2026-04-04T18:00:00Z", "2026-04-04T20:30:00Z"),
    ],
    "championship": [
        ("2026-04-06T21:00:00Z",),
    ],
}


def get_game_times():
    """Flatten game dates into a sequential list per round."""
    times = {}
    for round_name, date_groups in GAME_DATES.items():
        flat = []
        for group in date_groups:
            flat.extend(group)
        times[round_name] = flat
    return times


def build_game(game_tuple, round_name, game_time, completed=True):
    """Build a game dict from tuple data."""
    game_id, region, t1, s1, t2, s2, winner, sc1, sc2 = game_tuple
    return {
        "gameId": game_id,
        "round": round_name,
        "region": region,
        "team1": t1,
        "seed1": s1,
        "team2": t2,
        "seed2": s2,
        "score1": sc1 if completed else None,
        "score2": sc2 if completed else None,
        "winner": winner if completed else None,
        "completed": completed,
        "gameTime": game_time if completed else None,
    }


def generate_results(partial=None):
    """Generate full results JSON. If partial=N, only first N games are completed."""
    times = get_game_times()
    games = []
    game_count = 0

    all_rounds = [
        ("round_of_64", R64_RESULTS),
        ("round_of_32", R32_RESULTS),
        ("sweet_16", S16_RESULTS),
        ("elite_8", E8_RESULTS),
        ("final_four", FF_RESULTS),
        ("championship", CHAMPIONSHIP),
    ]

    for round_name, round_games in all_rounds:
        round_times = times[round_name]
        for i, game_tuple in enumerate(round_games):
            time_idx = min(i, len(round_times) - 1)
            completed = partial is None or game_count < partial
            games.append(build_game(game_tuple, round_name, round_times[time_idx], completed))
            game_count += 1

    # Determine current round
    completed_count = sum(1 for g in games if g["completed"])
    if completed_count == 63:
        current_round = "championship"
    elif completed_count >= 60:
        current_round = "final_four"
    elif completed_count >= 56:
        current_round = "elite_8"
    elif completed_count >= 48:
        current_round = "sweet_16"
    elif completed_count >= 32:
        current_round = "round_of_32"
    elif completed_count > 0:
        current_round = "round_of_64"
    else:
        current_round = "pre-tournament"

    return {
        "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "currentRound": current_round,
        "games": games,
    }


def print_summary(results):
    """Print scoring summary for verification."""
    games = results["games"]
    completed = [g for g in games if g["completed"]]
    upsets_r64 = [g for g in completed if g["round"] == "round_of_64"
                  and g["winner"] == g["team2"] and g["seed2"] > g["seed1"]]

    print(f"=== Simulation Summary ===")
    print(f"Total games: {len(games)}")
    print(f"Completed: {len(completed)}")
    print(f"Current round: {results['currentRound']}")
    print()

    # Print by round
    round_names = ["round_of_64", "round_of_32", "sweet_16", "elite_8", "final_four", "championship"]
    for rn in round_names:
        round_games = [g for g in completed if g["round"] == rn]
        if round_games:
            print(f"--- {rn.replace('_', ' ').title()} ({len(round_games)} games) ---")
            for g in round_games:
                upset_marker = " *UPSET*" if (g["winner"] == g["team2"] and g["seed2"] > g["seed1"]) or \
                                              (g["winner"] == g["team1"] and g["seed1"] > g["seed2"]) else ""
                print(f"  ({g['seed1']}) {g['team1']} {g['score1']} - {g['score2']} {g['team2']} ({g['seed2']})  →  {g['winner']}{upset_marker}")
            print()

    if upsets_r64:
        print(f"R64 Upsets: {len(upsets_r64)}")
        for g in upsets_r64:
            print(f"  ({g['seed2']}) {g['winner']} over ({g['seed1']}) {g['team1']}")
    print()

    # Champion
    champ_game = next((g for g in completed if g["round"] == "championship"), None)
    if champ_game:
        print(f"CHAMPION: {champ_game['winner']}")


def main():
    parser = argparse.ArgumentParser(description="Generate fake tournament results for simulation")
    parser.add_argument("--partial", type=int, help="Only complete first N games")
    parser.add_argument("--dry-run", action="store_true", help="Print summary without writing file")
    args = parser.parse_args()

    results = generate_results(partial=args.partial)
    print_summary(results)

    if not args.dry_run:
        RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(RESULTS_PATH, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nWrote {RESULTS_PATH}")
    else:
        print("\n(dry run — no file written)")


if __name__ == "__main__":
    main()
