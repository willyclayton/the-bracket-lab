"""
Shared utilities for The Super Agent ML pipeline.
Data loading, scoring, and evaluation functions.
"""

import os
import json
from datetime import datetime

# Paths
SUPER_AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH_DIR = os.path.join(SUPER_AGENT_DIR, "research")
RUN_LOG_PATH = os.path.join(SUPER_AGENT_DIR, "run_log.md")


def load_tournament_games(filepath):
    """
    Load tournament games from a CSV or JSON file.
    Expected columns: year, round, team1, seed1, team2, seed2, winner, score1, score2
    Returns a list of dicts.
    """
    import pandas as pd

    if filepath.endswith(".csv"):
        df = pd.read_csv(filepath)
    elif filepath.endswith(".json"):
        df = pd.read_json(filepath)
    else:
        raise ValueError(f"Unsupported file format: {filepath}")

    return df.to_dict("records")


def split_train_test(games, test_year=2021):
    """
    Split games into training (2010-2020) and test (2021) sets.
    """
    train = [g for g in games if g["year"] < test_year]
    test = [g for g in games if g["year"] == test_year]
    return train, test


def evaluate_predictions(predictions, actuals):
    """
    Compare predictions to actual outcomes.
    predictions: list of dicts with {game_id, predicted_winner}
    actuals: list of dicts with {game_id, actual_winner}

    Returns dict with overall accuracy and per-round accuracy.
    """
    actual_map = {g["game_id"]: g["actual_winner"] for g in actuals}

    total = 0
    correct = 0
    round_stats = {}

    for pred in predictions:
        game_id = pred["game_id"]
        if game_id not in actual_map:
            continue

        total += 1
        is_correct = pred["predicted_winner"] == actual_map[game_id]
        if is_correct:
            correct += 1

        round_name = pred.get("round", "unknown")
        if round_name not in round_stats:
            round_stats[round_name] = {"total": 0, "correct": 0}
        round_stats[round_name]["total"] += 1
        if is_correct:
            round_stats[round_name]["correct"] += 1

    overall_accuracy = correct / total if total > 0 else 0

    per_round = {}
    for rnd, stats in round_stats.items():
        per_round[rnd] = {
            "accuracy": stats["correct"] / stats["total"] if stats["total"] > 0 else 0,
            "correct": stats["correct"],
            "total": stats["total"],
        }

    return {
        "overall_accuracy": overall_accuracy,
        "correct": correct,
        "total": total,
        "per_round": per_round,
    }


def append_to_run_log(run_name, results, notes=""):
    """
    Append run results to run_log.md in a structured format.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    entry = f"\n## {run_name}\n"
    entry += f"- **Date:** {timestamp}\n"
    entry += f"- **Overall Accuracy:** {results['overall_accuracy']:.1%} ({results['correct']}/{results['total']})\n"

    if results.get("per_round"):
        entry += "- **Per-Round Accuracy:**\n"
        for rnd, stats in sorted(results["per_round"].items()):
            entry += f"  - {rnd}: {stats['accuracy']:.1%} ({stats['correct']}/{stats['total']})\n"

    if notes:
        entry += f"- **Notes:** {notes}\n"

    entry += "\n---\n"

    with open(RUN_LOG_PATH, "a") as f:
        f.write(entry)

    print(f"Results appended to {RUN_LOG_PATH}")


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

    stat_columns: list of columns to merge (e.g., ["adj_em", "tempo"])
                  If None, merges all available stat columns.
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


def split_train_test_multi(games, test_years, train_years=None):
    """
    Split games into training and per-year test sets.
    train_years: explicit list of years for training. If None, uses all years not in test_years.
    Returns (train_games, {year: games_list}).
    """
    if train_years is None:
        train = [g for g in games if g["year"] not in test_years]
    else:
        train = [g for g in games if g["year"] in train_years]
    test_by_year = {}
    for yr in test_years:
        year_games = [g for g in games if g["year"] == yr]
        if year_games:
            test_by_year[yr] = year_games
    return train, test_by_year


def evaluate_multi_year(predictions_by_year, actuals_by_year):
    """
    Evaluate predictions across multiple test years.
    predictions_by_year: {year: [{game_id, predicted_winner, round}, ...]}
    actuals_by_year: {year: [{game_id, actual_winner}, ...]}
    Returns per-year results + aggregate.
    """
    per_year = {}
    agg_correct = 0
    agg_total = 0

    for year in sorted(predictions_by_year.keys()):
        preds = predictions_by_year[year]
        acts = actuals_by_year[year]
        result = evaluate_predictions(preds, acts)
        per_year[year] = result
        agg_correct += result["correct"]
        agg_total += result["total"]

    agg_accuracy = agg_correct / agg_total if agg_total > 0 else 0

    # Aggregate per-round
    agg_per_round = {}
    for year, result in per_year.items():
        for rnd, stats in result.get("per_round", {}).items():
            if rnd not in agg_per_round:
                agg_per_round[rnd] = {"correct": 0, "total": 0}
            agg_per_round[rnd]["correct"] += stats["correct"]
            agg_per_round[rnd]["total"] += stats["total"]
    for rnd in agg_per_round:
        s = agg_per_round[rnd]
        s["accuracy"] = s["correct"] / s["total"] if s["total"] > 0 else 0

    return {
        "per_year": per_year,
        "aggregate": {
            "overall_accuracy": agg_accuracy,
            "correct": agg_correct,
            "total": agg_total,
            "per_round": agg_per_round,
        },
    }


def append_to_run_log_multi(run_name, multi_results, notes=""):
    """
    Append multi-year run results to run_log.md.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    agg = multi_results["aggregate"]

    entry = f"\n## {run_name}\n"
    entry += f"- **Date:** {timestamp}\n"
    entry += f"- **Aggregate Accuracy:** {agg['overall_accuracy']:.1%} ({agg['correct']}/{agg['total']})\n"

    # Per-year breakdown
    entry += "- **Per-Year Accuracy:**\n"
    for year, result in sorted(multi_results["per_year"].items()):
        entry += f"  - {year}: {result['overall_accuracy']:.1%} ({result['correct']}/{result['total']})\n"

    # Aggregate per-round
    if agg.get("per_round"):
        entry += "- **Aggregate Per-Round Accuracy:**\n"
        for rnd, stats in sorted(agg["per_round"].items()):
            entry += f"  - {rnd}: {stats['accuracy']:.1%} ({stats['correct']}/{stats['total']})\n"

    if notes:
        entry += f"- **Notes:** {notes}\n"

    entry += "\n---\n"

    with open(RUN_LOG_PATH, "a") as f:
        f.write(entry)

    print(f"Results appended to {RUN_LOG_PATH}")


def print_multi_results(run_name, multi_results):
    """Print formatted multi-year results to stdout."""
    agg = multi_results["aggregate"]
    print(f"\n{'='*60}")
    print(f"  {run_name}")
    print(f"{'='*60}")
    print(f"  Aggregate: {agg['overall_accuracy']:.1%} ({agg['correct']}/{agg['total']})")

    print(f"\n  Per-Year Breakdown:")
    for year, result in sorted(multi_results["per_year"].items()):
        bar = "#" * int(result["overall_accuracy"] * 20)
        print(f"    {year}:  {result['overall_accuracy']:5.1%}  {bar}  ({result['correct']}/{result['total']})")

    if agg.get("per_round"):
        print(f"\n  Aggregate Per-Round:")
        for rnd, stats in sorted(agg["per_round"].items()):
            bar = "#" * int(stats["accuracy"] * 20)
            print(f"    {rnd:20s}  {stats['accuracy']:5.1%}  {bar}  ({stats['correct']}/{stats['total']})")

    print(f"{'='*60}\n")


def print_results(run_name, results):
    """Print formatted results to stdout."""
    print(f"\n{'='*50}")
    print(f"  {run_name}")
    print(f"{'='*50}")
    print(f"  Overall: {results['overall_accuracy']:.1%} ({results['correct']}/{results['total']})")

    if results.get("per_round"):
        print(f"\n  Per-Round Breakdown:")
        for rnd, stats in sorted(results["per_round"].items()):
            bar = "#" * int(stats["accuracy"] * 20)
            print(f"    {rnd:20s}  {stats['accuracy']:5.1%}  {bar}  ({stats['correct']}/{stats['total']})")

    print(f"{'='*50}\n")
