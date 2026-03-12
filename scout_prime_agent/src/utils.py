"""
Shared utilities for The Scout Prime pipeline.
JSON I/O, API helpers, and scoring bridge to optimizer_agent.
"""

import os
import sys
import json
from datetime import datetime

# Paths
AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH_DIR = os.path.join(AGENT_DIR, "research")
RUN_LOG_PATH = os.path.join(AGENT_DIR, "run_log.md")
PROJECT_ROOT = os.path.dirname(AGENT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Import scoring utilities from optimizer_agent
OPTIMIZER_SRC = os.path.join(PROJECT_ROOT, "optimizer_agent", "src")
import importlib.util
_spec = importlib.util.spec_from_file_location(
    "optimizer_utils", os.path.join(OPTIMIZER_SRC, "utils.py")
)
_optimizer_utils = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_optimizer_utils)

ESPN_ROUND_POINTS = _optimizer_utils.ESPN_ROUND_POINTS
MAX_ESPN_POINTS = _optimizer_utils.MAX_ESPN_POINTS
ROUND_ORDER = _optimizer_utils.ROUND_ORDER
simulate_bracket_espn = _optimizer_utils.simulate_bracket_espn
get_espn_percentile = _optimizer_utils.get_espn_percentile
load_espn_percentiles = _optimizer_utils.load_espn_percentiles

# Re-export for convenience
__all__ = [
    "ESPN_ROUND_POINTS", "MAX_ESPN_POINTS", "ROUND_ORDER",
    "simulate_bracket_espn", "get_espn_percentile",
    "load_json", "save_json", "load_teams_json", "load_barttorvik",
    "load_actual_results", "get_r64_matchups",
    "append_to_run_log", "print_results",
    "AGENT_DIR", "RESEARCH_DIR", "PROJECT_ROOT", "DATA_DIR",
]


def load_json(filepath):
    """Load a JSON file and return its contents."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data, filepath, indent=2):
    """Save data to a JSON file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
    print(f"  Saved: {filepath}")


def load_teams_json(year=None):
    """
    Load team metadata from data/meta/teams.json.
    If year specified, filter to that year's teams.
    """
    filepath = os.path.join(DATA_DIR, "meta", "teams.json")
    if not os.path.exists(filepath):
        print(f"  WARNING: teams.json not found at {filepath}")
        return {}

    data = load_json(filepath)

    if isinstance(data, list):
        teams = {t["name"]: t for t in data if "name" in t}
    elif isinstance(data, dict):
        teams = data
    else:
        return {}

    return teams


def load_barttorvik(year):
    """
    Load BartTorvik stats for a given year.
    Checks optimizer_agent/research/ first (has historical CSVs),
    then scout_prime_agent/research/.
    Returns dict keyed by team name -> stats dict.
    """
    import csv

    # Check optimizer_agent first (has barttorvik_YYYY.csv files)
    optimizer_research = os.path.join(PROJECT_ROOT, "optimizer_agent", "research")
    filepath = os.path.join(optimizer_research, f"barttorvik_{year}.csv")
    if not os.path.exists(filepath):
        filepath = os.path.join(RESEARCH_DIR, f"barttorvik_{year}.csv")
    if not os.path.exists(filepath):
        print(f"  WARNING: No BartTorvik data for {year}")
        return {}

    teams = {}
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_map = {h.strip().lower(): i for i, h in enumerate(header)}

        for row in reader:
            if len(row) < 5:
                continue
            team = row[col_map.get("team", 1)].strip()
            try:
                stats = {
                    "adj_o": float(row[col_map["adjoe"]]),
                    "adj_d": float(row[col_map["adjde"]]),
                    "adj_em": round(float(row[col_map["adjoe"]]) - float(row[col_map["adjde"]]), 2),
                    "tempo": float(row[col_map["adjt"]]),
                    "barthag": float(row[col_map["barthag"]]),
                    "wab": float(row[col_map["wab"]]),
                    "elite_sos": float(row[col_map["elite sos"]]),
                }
                # Optional columns
                for col_name in ["sos", "ncsos", "conf_winpct", "efg_pct", "oreb_pct",
                                 "dreb_pct", "tov_pct", "ftrate", "ft_pct", "threep_pct",
                                 "threep_rate", "twop_pct"]:
                    if col_name in col_map:
                        try:
                            stats[col_name] = float(row[col_map[col_name]])
                        except (ValueError, IndexError):
                            pass

                teams[team] = stats
            except (ValueError, IndexError, KeyError):
                continue

    return teams


# Name mapping: tournament names -> BartTorvik names
TOURNAMENT_TO_BARTTORVIK = {
    "UConn": "Connecticut",
    "Ole Miss": "Mississippi",
    "BYU": "Brigham Young",
    "Saint Mary's": "Saint Mary's",
    "St. John's": "St. John's",
    "Iowa State": "Iowa St.",
    "Michigan State": "Michigan St.",
    "Mississippi State": "Mississippi St.",
    "Colorado State": "Colorado St.",
    "Utah State": "Utah St.",
    "Alabama State": "Alabama St.",
    "Norfolk State": "Norfolk St.",
    "McNeese": "McNeese St.",
    "UC San Diego": "UC San Diego",
    "SIU Edwardsville": "SIU Edwardsville",
    "Mount St. Mary's": "Mount St. Mary's",
    "Omaha": "Nebraska Omaha",
    "UNC Wilmington": "UNC Wilmington",
    "VCU": "Virginia Commonwealth",
    "New Mexico State": "New Mexico St.",
    "NC State": "N.C. State",
    "North Carolina": "North Carolina",
}


def resolve_team_name(team_name, bt_data):
    """Resolve a tournament team name to its BartTorvik equivalent."""
    if team_name in bt_data:
        return team_name
    alias = TOURNAMENT_TO_BARTTORVIK.get(team_name)
    if alias and alias in bt_data:
        return alias
    # Fuzzy matching
    for bt_name in bt_data:
        if team_name.lower().replace("state", "st.") == bt_name.lower():
            return bt_name
        if bt_name.lower().replace("st.", "state") == team_name.lower():
            return bt_name
    return None


def get_team_stats(team_name, bt_data):
    """Look up team stats from BartTorvik data with name resolution."""
    resolved = resolve_team_name(team_name, bt_data)
    if resolved:
        return bt_data[resolved]
    print(f"  WARNING: No stats found for {team_name}")
    return None


def load_actual_results(year):
    """Load actual tournament results for a given year."""
    if year >= 2026:
        filepath = os.path.join(DATA_DIR, "results", "actual-results.json")
    else:
        filepath = os.path.join(DATA_DIR, "archive", str(year), "results", "actual-results.json")

    if not os.path.exists(filepath):
        print(f"  WARNING: No results file for {year}")
        return None

    return load_json(filepath)


def get_r64_matchups(year):
    """
    Extract R64 matchups from actual-results.json.
    Returns (matchups_list, full_results_data).
    Only extracts teams/seeds/regions — NOT winners.
    """
    results = load_actual_results(year)
    if not results:
        return [], None

    matchups = []
    for game in results["games"]:
        if game["round"] == "round_of_64":
            matchups.append({
                "gameId": game["gameId"],
                "region": game["region"],
                "team1": game["team1"],
                "seed1": game["seed1"],
                "team2": game["team2"],
                "seed2": game["seed2"],
            })
    return matchups, results


def score_bracket(rounds, year):
    """
    Score a generated bracket against actual results.
    Returns (espn_result, espn_percentile).
    """
    results = load_actual_results(year)
    if not results:
        return None, None

    bracket_picks = {}
    for rnd_games in rounds.values():
        for g in rnd_games:
            bracket_picks[g["gameId"]] = g["pick"]

    actual_list = [
        {"game_id": g["gameId"], "round": g["round"], "winner": g.get("winner")}
        for g in results["games"] if g.get("winner")
    ]

    espn_result = simulate_bracket_espn(bracket_picks, actual_list)
    espn_pct = get_espn_percentile(espn_result["total_points"], year)

    return espn_result, espn_pct


def print_results(run_name, results_by_year):
    """Print formatted results for all test years."""
    print(f"\n{'='*60}")
    print(f"  {run_name}")
    print(f"{'='*60}")

    for year in sorted(results_by_year.keys()):
        espn_result, espn_pct = results_by_year[year]
        pct_str = f" (ESPN {espn_pct:.1f}%ile)" if espn_pct else ""
        print(f"  {year}: {espn_result['total_points']}/{espn_result['max_points']} ESPN pts{pct_str}")
        print(f"         Accuracy: {espn_result['accuracy']:.1%} ({espn_result['correct_picks']}/{espn_result['total_games']})")
        if espn_result.get("per_round"):
            for rnd in ROUND_ORDER:
                if rnd in espn_result["per_round"]:
                    r = espn_result["per_round"][rnd]
                    print(f"         {rnd:20s}  {r['correct']}/{r['total']} correct  ({r['points']}/{r['possible']} pts)")
        print()

    print(f"{'='*60}\n")


def append_to_run_log(run_name, results_by_year, notes=""):
    """Append results to run_log.md."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    entry = f"\n## {run_name}\n"
    entry += f"- **Date:** {timestamp}\n"

    for year in sorted(results_by_year.keys()):
        espn_result, espn_pct = results_by_year[year]
        pct_str = f", ESPN Percentile: {espn_pct:.1f}%" if espn_pct else ""
        entry += f"- **{year}:** {espn_result['total_points']}/{espn_result['max_points']} ESPN pts{pct_str}\n"
        entry += f"  - Accuracy: {espn_result['accuracy']:.1%} ({espn_result['correct_picks']}/{espn_result['total_games']})\n"
        if espn_result.get("per_round"):
            for rnd in ROUND_ORDER:
                if rnd in espn_result["per_round"]:
                    r = espn_result["per_round"][rnd]
                    entry += f"  - {rnd}: {r['correct']}/{r['total']} correct ({r['points']}/{r['possible']} pts)\n"

    if notes:
        entry += f"- **Notes:** {notes}\n"

    entry += "\n---\n"

    with open(RUN_LOG_PATH, "a") as f:
        f.write(entry)

    print(f"Results appended to {RUN_LOG_PATH}")
