"""
Step 2: Find historical twins for each tournament team.
Matches each team's statistical profile against historical tournament teams
(2010-present) using cosine similarity on normalized efficiency vectors.

Temporal isolation: for year Y, only uses historical data from years < Y.

Usage:
    python scout_prime_agent/src/build_archetypes.py --year 2024
    python scout_prime_agent/src/build_archetypes.py --year 2025
"""

import os
import sys
import json
import argparse
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_barttorvik, get_team_stats, resolve_team_name,
    save_json, RESEARCH_DIR, PROJECT_ROOT,
)


# Features used for archetype matching (must exist in BartTorvik data)
ARCHETYPE_FEATURES = ["adj_em", "adj_o", "adj_d", "tempo", "barthag", "wab", "elite_sos"]


def load_historical_teams():
    """
    Load historical tournament teams from data/research/historical-teams.json
    or build from BartTorvik archives.
    """
    # Try pre-built historical teams file
    hist_path = os.path.join(PROJECT_ROOT, "data", "research", "historical-teams.json")
    if os.path.exists(hist_path):
        with open(hist_path) as f:
            data = json.load(f)
        # Handle both formats: flat list or {metadata, teams} dict
        if isinstance(data, dict) and "teams" in data:
            return data["teams"]
        return data

    # Fallback: build from BartTorvik CSVs + tournament_games.csv
    print("  Building historical team database from BartTorvik archives...")
    optimizer_research = os.path.join(PROJECT_ROOT, "optimizer_agent", "research")
    games_path = os.path.join(optimizer_research, "tournament_games.csv")

    if not os.path.exists(games_path):
        print("  ERROR: tournament_games.csv not found")
        return []

    import csv
    # Load tournament games to get team results
    team_results = {}  # (year, team) -> deepest round
    round_depth = {
        "round_of_64": 1, "round_of_32": 2, "sweet_16": 3,
        "elite_8": 4, "final_four": 5, "championship": 6
    }

    with open(games_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = int(row["year"])
            winner = row["winner"]
            rnd = row["round"]
            depth = round_depth.get(rnd, 0)

            key = (year, winner)
            if key not in team_results or depth > team_results[key]:
                team_results[key] = depth

    # Map depth back to result label
    depth_to_result = {
        0: "R64 Loss", 1: "R64 Win", 2: "R32 Win",
        3: "Sweet 16", 4: "Elite 8", 5: "Final Four", 6: "Champion"
    }

    # Build historical team profiles with BartTorvik stats
    historical = []
    years = [y for y in range(2010, 2026) if y != 2020]

    for year in years:
        bt_data = load_barttorvik(year)
        if not bt_data:
            continue

        for team, stats in bt_data.items():
            # Check if this team was in the tournament
            depth = team_results.get((year, team), None)
            if depth is None:
                # Try alternate names
                for (y, t), d in team_results.items():
                    if y == year and (t.lower() == team.lower() or
                                     t.replace("St.", "State") == team or
                                     team.replace("St.", "State") == t):
                        depth = d
                        break

            if depth is not None:
                entry = {
                    "year": year,
                    "team": team,
                    "result": depth_to_result.get(depth, f"Round {depth}"),
                    "result_depth": depth,
                }
                for feat in ARCHETYPE_FEATURES:
                    if feat in stats:
                        entry[feat] = stats[feat]
                historical.append(entry)

    return historical


def compute_similarity(profile1, profile2, features):
    """
    Compute similarity between two team profiles using inverse Euclidean distance.
    Features are scaled by typical ranges to ensure fair weighting.
    Returns a value between 0 and 1 (higher = more similar).
    """
    # Typical ranges for scaling features to [0, 1]-ish
    feature_ranges = {
        "adj_em": 40.0,   # roughly -10 to 30
        "adj_o": 30.0,    # roughly 95 to 125
        "adj_d": 20.0,    # roughly 85 to 105
        "tempo": 15.0,    # roughly 60 to 75
        "barthag": 0.5,   # roughly 0.5 to 1.0
        "wab": 15.0,      # roughly -5 to 10
        "elite_sos": 1.0, # roughly 0 to 1
    }

    diffs = []
    for feat in features:
        v1 = profile1.get(feat)
        v2 = profile2.get(feat)
        if v1 is not None and v2 is not None:
            scale = feature_ranges.get(feat, 1.0)
            diffs.append(((float(v1) - float(v2)) / scale) ** 2)

    if len(diffs) < 3:  # Need at least 3 features for meaningful comparison
        return 0.0

    distance = np.sqrt(np.mean(diffs))
    # Convert distance to similarity: 1/(1+d)
    return float(1.0 / (1.0 + distance))


def flatten_historical_team(team):
    """Flatten a historical team's nested stats into the same flat format as enriched profiles."""
    flat = dict(team)
    if "efficiency" in team:
        eff = team["efficiency"]
        # Map camelCase nested keys to snake_case flat keys
        mapping = {"adjO": "adj_o", "adjD": "adj_d", "adjEM": "adj_em",
                   "tempo": "tempo", "barthag": "barthag", "sos": "sos",
                   "wab": "wab", "elite_sos": "elite_sos"}
        for src, dst in mapping.items():
            if src in eff and dst not in flat:
                flat[dst] = eff[src]
    return flat


def find_archetypes(team_profile, historical_teams, year, top_n=3):
    """
    Find the top-N historical twins for a team.
    Temporal isolation: only considers teams from years < target year.
    """
    candidates = [h for h in historical_teams if h["year"] < year]

    similarities = []
    for candidate in candidates:
        flat_candidate = flatten_historical_team(candidate)
        sim = compute_similarity(team_profile, flat_candidate, ARCHETYPE_FEATURES)
        if sim > 0:  # Only include positive similarities
            similarities.append({
                "year": candidate["year"],
                "team": candidate["team"],
                "result": candidate.get("result") or candidate.get("tournament_result", "Unknown"),
                "result_depth": candidate.get("result_depth") or candidate.get("rounds_won", 0),
                "similarity": round(sim, 4),
            })

    # Sort by similarity descending
    similarities.sort(key=lambda x: x["similarity"], reverse=True)
    return similarities[:top_n]


def main():
    parser = argparse.ArgumentParser(description="Build historical archetypes for Scout Prime")
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    parser.add_argument("--top-n", type=int, default=3, help="Number of twins per team")
    args = parser.parse_args()
    year = args.year

    print("=" * 60)
    print(f"  BUILDING HISTORICAL ARCHETYPES — {year}")
    print("=" * 60)

    # Load enriched team profiles
    enriched_path = os.path.join(RESEARCH_DIR, f"teams_enriched_{year}.json")
    if not os.path.exists(enriched_path):
        print(f"  ERROR: Run enrich_teams.py first — {enriched_path} not found")
        return

    with open(enriched_path) as f:
        enriched = json.load(f)
    print(f"\n1. Loaded {len(enriched)} enriched team profiles")

    # Load historical teams
    print(f"\n2. Loading historical tournament teams (years < {year})...")
    historical = load_historical_teams()
    historical_before = [h for h in historical if h["year"] < year]
    print(f"   {len(historical_before)} historical teams available")

    # Find archetypes for each team
    print(f"\n3. Finding top-{args.top_n} archetypes per team...")
    archetypes = {}

    for team_name, profile in enriched.items():
        twins = find_archetypes(profile, historical, year, args.top_n)
        archetypes[team_name] = twins

        if twins:
            best = twins[0]
            print(f"   {team_name:25s} -> {best['year']} {best['team']:20s} "
                  f"(sim={best['similarity']:.3f}, {best['result']})")

    # Save
    output_path = os.path.join(RESEARCH_DIR, f"historical_archetypes_{year}.json")
    save_json(archetypes, output_path)

    # Summary stats
    total_twins = sum(len(t) for t in archetypes.values())
    avg_sim = np.mean([t[0]["similarity"] for t in archetypes.values() if t])
    print(f"\n   Total archetypes: {total_twins}")
    print(f"   Average best-match similarity: {avg_sim:.3f}")

    # Interesting finding: which archetypes went deepest?
    deep_runs = []
    for team, twins in archetypes.items():
        for twin in twins:
            if twin["result_depth"] >= 5:  # Final Four or better
                deep_runs.append((team, twin))
    if deep_runs:
        print(f"\n   Teams with Final Four+ archetypes:")
        for team, twin in deep_runs[:10]:
            print(f"     {team} -> {twin['year']} {twin['team']} ({twin['result']})")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
