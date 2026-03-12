"""
Shared utilities for The Optimizer ML pipeline.
Data loading, ESPN scoring evaluation, and run logging.

Key difference from super_agent: evaluates by ESPN bracket points, not accuracy.
"""

import os
import json
from datetime import datetime

# Paths
OPTIMIZER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH_DIR = os.path.join(OPTIMIZER_DIR, "research")
RUN_LOG_PATH = os.path.join(OPTIMIZER_DIR, "run_log.md")
PROJECT_ROOT = os.path.dirname(OPTIMIZER_DIR)

# ESPN scoring table
ESPN_ROUND_POINTS = {
    "round_of_64": 10,
    "round_of_32": 20,
    "sweet_16": 40,
    "elite_8": 80,
    "final_four": 160,
    "championship": 320,
}

MAX_ESPN_POINTS = 1920

# Round progression order
ROUND_ORDER = [
    "round_of_64", "round_of_32", "sweet_16",
    "elite_8", "final_four", "championship",
]


def load_tournament_games(filepath=None):
    """
    Load tournament games from CSV.
    Expected columns: year, round, game_id, team1, seed1, team2, seed2, winner, score1, score2
    Returns a list of dicts.
    """
    import pandas as pd

    if filepath is None:
        filepath = os.path.join(RESEARCH_DIR, "tournament_games.csv")

    df = pd.read_csv(filepath)
    return df.to_dict("records")


def load_team_stats(filepath=None):
    """
    Load team stats from CSV.
    Returns dict keyed by (year, team) -> stats dict.
    """
    import pandas as pd

    if filepath is None:
        filepath = os.path.join(RESEARCH_DIR, "team_stats.csv")

    df = pd.read_csv(filepath)
    stats = {}
    for _, row in df.iterrows():
        team = row["team"]
        if not isinstance(team, str) or not team.strip():
            continue
        key = (int(row["year"]), team.strip())
        stats[key] = row.to_dict()
    return stats


def merge_team_stats(games, stat_columns=None):
    """
    Merge team stats into game records.
    For each game, adds {col}_1 and {col}_2 for team1 and team2 stats.
    """
    team_stats = load_team_stats()
    all_stat_cols = ["adj_em", "adj_o", "adj_d", "tempo", "sos", "barthag", "wab", "elite_sos", "ncsos", "conf_winpct"]
    if stat_columns is None:
        stat_columns = all_stat_cols

    enriched = []
    missing_count = 0

    for game in games:
        g = dict(game)
        year = int(g["year"])
        team1 = str(g["team1"]).strip()
        team2 = str(g["team2"]).strip()

        stats1 = team_stats.get((year, team1), {})
        stats2 = team_stats.get((year, team2), {})

        for col in stat_columns:
            g[f"{col}_1"] = stats1.get(col, None)
            g[f"{col}_2"] = stats2.get(col, None)

        if not stats1 or not stats2:
            missing_count += 1

        enriched.append(g)

    if missing_count > 0:
        print(f"WARNING: {missing_count} games had missing team stats")

    return enriched


def split_train_test(games, test_years, train_years=None):
    """
    Split games into training and per-year test sets.
    Default training: 2010-2021 excluding 2020.
    Default test: 2022-2023.
    """
    if train_years is None:
        train_years = [y for y in range(2010, 2022) if y != 2020]
    if isinstance(test_years, int):
        test_years = [test_years]

    train = [g for g in games if g["year"] in train_years]
    test_by_year = {}
    for yr in test_years:
        year_games = [g for g in games if g["year"] == yr]
        if year_games:
            test_by_year[yr] = year_games
    return train, test_by_year


def load_espn_percentiles():
    """Load ESPN percentile lookup table from project data."""
    filepath = os.path.join(PROJECT_ROOT, "data", "espn-percentiles.json")
    if os.path.exists(filepath):
        with open(filepath) as f:
            return json.load(f)
    return {}


def get_espn_percentile(score, year):
    """Look up ESPN percentile for a score in a given year."""
    data = load_espn_percentiles()
    year_str = str(year)
    if year_str not in data:
        return None

    table = data[year_str]["scoreToPercentile"]

    # Above highest data point
    if score >= table[0][0]:
        return table[0][1]
    # Below lowest data point
    if score <= table[-1][0]:
        return table[-1][1]

    # Interpolate
    for i in range(len(table) - 1):
        hi_score, hi_pct = table[i]
        lo_score, lo_pct = table[i + 1]
        if score <= hi_score and score >= lo_score:
            t = (score - lo_score) / (hi_score - lo_score) if hi_score != lo_score else 0
            return round(lo_pct + t * (hi_pct - lo_pct), 1)

    return None


def simulate_bracket_espn(bracket_picks, actual_results):
    """
    Score a complete bracket using ESPN points.

    bracket_picks: dict of {game_id: predicted_winner} for all 63 games
    actual_results: list of dicts with {game_id, round, winner}

    Returns dict with:
    - total_points: total ESPN bracket points
    - max_points: 1920
    - per_round: {round: {points, correct, total, possible}}
    - correct_picks: total correct picks
    - total_games: total games scored
    """
    actual_map = {}
    for g in actual_results:
        if g.get("winner"):
            actual_map[g["game_id"]] = {
                "winner": g["winner"],
                "round": g["round"],
            }

    total_points = 0
    correct_picks = 0
    total_games = 0
    per_round = {}

    for game_id, predicted in bracket_picks.items():
        if game_id not in actual_map:
            continue

        actual = actual_map[game_id]
        rnd = actual["round"]
        pts = ESPN_ROUND_POINTS.get(rnd, 0)

        if rnd not in per_round:
            per_round[rnd] = {"points": 0, "correct": 0, "total": 0, "possible": 0}

        per_round[rnd]["total"] += 1
        per_round[rnd]["possible"] += pts
        total_games += 1

        if predicted == actual["winner"]:
            total_points += pts
            correct_picks += 1
            per_round[rnd]["points"] += pts
            per_round[rnd]["correct"] += 1

    accuracy = correct_picks / total_games if total_games > 0 else 0

    return {
        "total_points": total_points,
        "max_points": MAX_ESPN_POINTS,
        "accuracy": accuracy,
        "correct_picks": correct_picks,
        "total_games": total_games,
        "per_round": per_round,
    }


def build_bracket_from_predictions(predictions, bracket_structure):
    """
    Build a complete bracket (63 picks) from per-game predictions.
    Uses bracket cascade: winners advance to next round matchups.

    predictions: list of dicts with {game_id, predicted_winner, round}
    bracket_structure: list of dicts defining all 63 games with {game_id, round, team1, seed1, team2, seed2}

    Returns dict of {game_id: predicted_winner}
    """
    return {p["game_id"]: p["predicted_winner"] for p in predictions}


def format_espn_results(run_name, year, espn_result, espn_pct=None):
    """Format ESPN scoring results for display."""
    lines = []
    lines.append(f"  {year}: {espn_result['total_points']}/{espn_result['max_points']} ESPN pts")
    if espn_pct is not None:
        lines.append(f"         ESPN Percentile: {espn_pct:.1f}%")
    lines.append(f"         Accuracy: {espn_result['accuracy']:.1%} ({espn_result['correct_picks']}/{espn_result['total_games']})")

    if espn_result.get("per_round"):
        for rnd in ROUND_ORDER:
            if rnd in espn_result["per_round"]:
                r = espn_result["per_round"][rnd]
                lines.append(f"         {rnd:20s}  {r['correct']}/{r['total']} correct  ({r['points']}/{r['possible']} pts)")

    return "\n".join(lines)


def print_espn_results(run_name, results_by_year):
    """Print formatted ESPN results for all test years."""
    print(f"\n{'='*60}")
    print(f"  {run_name}")
    print(f"{'='*60}")

    total_pts = 0
    total_correct = 0
    total_games = 0

    for year in sorted(results_by_year.keys()):
        espn_result, espn_pct = results_by_year[year]
        print(format_espn_results(run_name, year, espn_result, espn_pct))
        total_pts += espn_result["total_points"]
        total_correct += espn_result["correct_picks"]
        total_games += espn_result["total_games"]
        print()

    if len(results_by_year) > 1:
        avg_pts = total_pts / len(results_by_year)
        avg_acc = total_correct / total_games if total_games > 0 else 0
        print(f"  Average: {avg_pts:.0f} ESPN pts, {avg_acc:.1%} accuracy")

    print(f"{'='*60}\n")


def append_espn_to_run_log(run_name, results_by_year, notes=""):
    """
    Append ESPN-scored run results to run_log.md.
    results_by_year: {year: (espn_result, espn_percentile)}
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    entry = f"\n## {run_name}\n"
    entry += f"- **Date:** {timestamp}\n"

    for year in sorted(results_by_year.keys()):
        espn_result, espn_pct = results_by_year[year]
        pct_str = f", ESPN Percentile: {espn_pct:.1f}%" if espn_pct is not None else ""
        entry += f"- **{year}:** {espn_result['total_points']}/{espn_result['max_points']} ESPN pts{pct_str}\n"
        entry += f"  - Accuracy: {espn_result['accuracy']:.1%} ({espn_result['correct_picks']}/{espn_result['total_games']})\n"
        if espn_result.get("per_round"):
            for rnd in ROUND_ORDER:
                if rnd in espn_result["per_round"]:
                    r = espn_result["per_round"][rnd]
                    entry += f"  - {rnd}: {r['correct']}/{r['total']} correct ({r['points']}/{r['possible']} pts)\n"

    if len(results_by_year) > 1:
        avg_pts = sum(r[0]["total_points"] for r in results_by_year.values()) / len(results_by_year)
        entry += f"- **Average ESPN Points:** {avg_pts:.0f}\n"

    if notes:
        entry += f"- **Notes:** {notes}\n"

    entry += "\n---\n"

    with open(RUN_LOG_PATH, "a") as f:
        f.write(entry)

    print(f"Results appended to {RUN_LOG_PATH}")
