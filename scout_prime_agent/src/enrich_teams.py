"""
Step 1: Compile enriched team profiles.
Merges BartTorvik efficiency data with additional per-team context
(coaching records, roster info, close-game records, momentum) into
a single teams_enriched.json file.

Usage:
    python scout_prime_agent/src/enrich_teams.py --year 2024
    python scout_prime_agent/src/enrich_teams.py --year 2025
"""

import os
import sys
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_barttorvik, get_team_stats, get_r64_matchups,
    load_teams_json, load_json, save_json, RESEARCH_DIR, DATA_DIR, PROJECT_ROOT,
)


def load_research_data(data_type, year=None):
    """
    Load supplementary research data if available.
    Checks data/research/ for historical-teams.json, seed-history.json, etc.
    """
    research_dir = os.path.join(DATA_DIR, "research")
    filenames = {
        "historical_teams": "historical-teams.json",
        "seed_history": "seed-history.json",
        "upset_factors": "upset-factors.json",
    }

    filename = filenames.get(data_type)
    if not filename:
        return None

    filepath = os.path.join(research_dir, filename)
    if os.path.exists(filepath):
        with open(filepath) as f:
            return json.load(f)
    return None


def load_intangibles(year):
    """
    Load intangibles intel from data/research/intangibles_YYYY.json.
    Returns dict keyed by team name, or empty dict if file doesn't exist.
    """
    filepath = os.path.join(DATA_DIR, "research", f"intangibles_{year}.json")
    if os.path.exists(filepath):
        data = load_json(filepath)
        return data.get("teams", {})
    return {}


def enrich_team(team_name, seed, bt_stats, teams_meta, year, intangibles=None):
    """
    Build an enriched profile for a single team.
    Combines BartTorvik stats with any available metadata and intangibles.
    """
    profile = {
        "name": team_name,
        "seed": seed,
        "year": year,
    }

    # BartTorvik efficiency stats
    if bt_stats:
        profile.update(bt_stats)

    # Team metadata from teams.json (if available)
    if teams_meta:
        meta = teams_meta.get(team_name, {})
        if meta:
            for field in ["conference", "record", "close_game_record", "last_10",
                         "coach", "coach_tournament_record", "coach_final_fours",
                         "coach_championships", "first_tournament_coach",
                         "experience", "returning_minutes_pct", "style",
                         "injuries", "conf_tourney_result", "road_neutral_record",
                         "quad_1_record", "transfer_count", "bench_scoring_pct"]:
                if field in meta:
                    profile[field] = meta[field]

    # Intangibles intel (if available)
    if intangibles and team_name in intangibles:
        profile["intangibles"] = intangibles[team_name]

    return profile


def main():
    parser = argparse.ArgumentParser(description="Enrich team profiles for Scout Prime")
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    args = parser.parse_args()
    year = args.year

    print("=" * 60)
    print(f"  ENRICHING TEAM PROFILES — {year}")
    print("=" * 60)

    # Load BartTorvik stats
    print(f"\n1. Loading BartTorvik {year} stats...")
    bt_data = load_barttorvik(year)
    print(f"   Found stats for {len(bt_data)} teams")

    # Load team metadata
    print(f"\n2. Loading team metadata...")
    teams_meta = load_teams_json(year)
    print(f"   Found metadata for {len(teams_meta)} teams")

    # Load intangibles (optional)
    print(f"\n2b. Loading intangibles intel...")
    intangibles = load_intangibles(year)
    if intangibles:
        print(f"   Found intangibles for {len(intangibles)} teams")
    else:
        print(f"   No intangibles file found (pipeline continues without it)")

    # Get tournament teams from bracket structure
    print(f"\n3. Loading bracket structure...")
    matchups, _ = get_r64_matchups(year)
    if not matchups:
        print(f"   ERROR: No R64 matchups found for {year}")
        return

    # Collect all tournament teams
    tournament_teams = {}
    for m in matchups:
        tournament_teams[m["team1"]] = m["seed1"]
        tournament_teams[m["team2"]] = m["seed2"]
    print(f"   {len(tournament_teams)} tournament teams")

    # Enrich each team
    print(f"\n4. Building enriched profiles...")
    enriched = {}
    missing_stats = []

    for team_name, seed in tournament_teams.items():
        bt_stats = get_team_stats(team_name, bt_data)
        if not bt_stats:
            missing_stats.append(team_name)

        profile = enrich_team(team_name, seed, bt_stats, teams_meta, year, intangibles)
        enriched[team_name] = profile

    if missing_stats:
        print(f"   WARNING: Missing BartTorvik stats for: {', '.join(missing_stats)}")

    # Save enriched profiles
    output_path = os.path.join(RESEARCH_DIR, f"teams_enriched_{year}.json")
    save_json(enriched, output_path)
    print(f"\n   Enriched {len(enriched)} team profiles")

    # Summary stats
    has_efficiency = sum(1 for p in enriched.values() if "adj_em" in p)
    has_coaching = sum(1 for p in enriched.values() if "coach_tournament_record" in p)
    has_shooting = sum(1 for p in enriched.values() if "threep_pct" in p)
    has_intangibles = sum(1 for p in enriched.values() if "intangibles" in p)
    print(f"\n   Coverage:")
    print(f"     Efficiency:   {has_efficiency}/{len(enriched)}")
    print(f"     Coaching:     {has_coaching}/{len(enriched)}")
    print(f"     Shooting:     {has_shooting}/{len(enriched)}")
    print(f"     Intangibles:  {has_intangibles}/{len(enriched)}")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
