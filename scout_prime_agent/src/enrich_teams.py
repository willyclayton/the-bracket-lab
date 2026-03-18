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
    teams.json uses nested structure (coaching.*, close_games.*, etc.) —
    this function extracts and flattens relevant fields.
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
            # Top-level fields
            for field in ["record", "conference", "kenpomRank", "conference_strength_score"]:
                if field in meta:
                    profile[field] = meta[field]

            # Coaching (nested under coaching.*)
            coaching = meta.get("coaching", {})
            if coaching:
                profile["coach"] = coaching.get("coach_name", "")
                profile["coach_tournament_record"] = coaching.get("tournament_record", "")
                profile["coach_final_fours"] = coaching.get("final_fours", 0)
                profile["coach_championships"] = coaching.get("championships", 0)
                profile["first_tournament_coach"] = coaching.get("first_tournament", False)
                profile["coach_seasons"] = coaching.get("seasons_at_program", 0)
                profile["coach_tournament_appearances"] = coaching.get("tournament_appearances_as_hc", 0)

            # Close games (nested under close_games.*)
            close_games = meta.get("close_games", {})
            if close_games:
                profile["close_game_record"] = close_games.get("record", "")
                profile["close_game_win_pct"] = close_games.get("win_pct", 0)

            # Momentum (nested under momentum.*)
            momentum = meta.get("momentum", {})
            if momentum:
                profile["last_10"] = momentum.get("last_10_record", "")
                profile["momentum_flag"] = momentum.get("flag", "neutral")
                profile["conf_tourney_result"] = momentum.get("conf_tournament_result", "")
                profile["hot_cold_delta"] = momentum.get("hot_cold_delta", 0)

            # Roster (nested under roster.*)
            roster = meta.get("roster", {})
            if roster:
                profile["returning_minutes_pct"] = roster.get("experience_returning_minutes_pct", 0)
                profile["avg_player_year"] = roster.get("average_player_year", 0)
                profile["is_freshman_heavy"] = roster.get("is_freshman_heavy", False)
                profile["is_senior_led"] = roster.get("is_senior_led", False)
                profile["tournament_experience_count"] = roster.get("players_with_tournament_experience", 0)

            # Shooting (nested under shooting.* — supplement BartTorvik, don't overwrite)
            shooting = meta.get("shooting", {})
            if shooting:
                for src, dst in [
                    ("three_pt_variance_risk_score", "three_pt_variance_risk"),
                    ("ft_pct_close_games", "ft_pct_close_games"),
                    ("ft_pressure_delta", "ft_pressure_delta"),
                ]:
                    if src in shooting and dst not in profile:
                        profile[dst] = shooting[src]

            # Ball control (nested under ball_control.*)
            ball_control = meta.get("ball_control", {})
            if ball_control:
                for src, dst in [
                    ("forced_turnover_rate", "forced_to_rate"),
                    ("turnover_margin", "turnover_margin"),
                ]:
                    if src in ball_control:
                        profile[dst] = ball_control[src]

            # Scout profile (nested under scout_profile.*)
            scout_profile = meta.get("scout_profile", {})
            if scout_profile:
                profile["injuries"] = scout_profile.get("injuries", [])
                profile["injury_impact"] = scout_profile.get("injury_impact", "none")
                profile["style"] = scout_profile.get("style", "")
                profile["tempo_bucket"] = scout_profile.get("tempo_bucket", "")

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
    has_coaching = sum(1 for p in enriched.values() if "coach" in p and p["coach"])
    has_close_games = sum(1 for p in enriched.values() if "close_game_record" in p and p["close_game_record"])
    has_momentum = sum(1 for p in enriched.values() if "last_10" in p and p["last_10"])
    has_roster = sum(1 for p in enriched.values() if "returning_minutes_pct" in p)
    has_shooting = sum(1 for p in enriched.values() if "threep_pct" in p)
    has_ball_control = sum(1 for p in enriched.values() if "forced_to_rate" in p)
    has_style = sum(1 for p in enriched.values() if "style" in p and p["style"])
    has_intangibles = sum(1 for p in enriched.values() if "intangibles" in p)

    # Count total fields per team (excluding name/seed/year)
    field_counts = [len([k for k in p if k not in ("name", "seed", "year")]) for p in enriched.values()]
    avg_fields = sum(field_counts) / len(field_counts) if field_counts else 0

    print(f"\n   Coverage:")
    print(f"     Efficiency:   {has_efficiency}/{len(enriched)}")
    print(f"     Coaching:     {has_coaching}/{len(enriched)}")
    print(f"     Close Games:  {has_close_games}/{len(enriched)}")
    print(f"     Momentum:     {has_momentum}/{len(enriched)}")
    print(f"     Roster:       {has_roster}/{len(enriched)}")
    print(f"     Shooting:     {has_shooting}/{len(enriched)}")
    print(f"     Ball Control: {has_ball_control}/{len(enriched)}")
    print(f"     Style:        {has_style}/{len(enriched)}")
    print(f"     Intangibles:  {has_intangibles}/{len(enriched)}")
    print(f"\n   Avg fields per team: {avg_fields:.1f}")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
