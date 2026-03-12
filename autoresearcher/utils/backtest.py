"""
Bracket backtesting engine.

Takes a strategy function, simulates a full bracket for a given year,
and scores it using ESPN points.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

from utils.scoring import ROUND_ORDER, ROUND_POINTS, GAMES_PER_ROUND, score_bracket

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RESULTS_DIR = BASE_DIR / "data" / "results"
EXPERIMENTS_DIR = BASE_DIR / "experiments"


def load_tournament_data():
    """Load and index tournament game data."""
    df = pd.read_csv(PROCESSED_DIR / "tournaments.csv")
    return df


def load_team_stats():
    """Load team season stats."""
    df = pd.read_csv(PROCESSED_DIR / "team_seasons.csv")
    return df


def get_year_bracket(df_games, year):
    """
    Build the bracket structure for a given year.

    Returns a dict with:
        - 'R64_matchups': list of (team1_info, team2_info) tuples
        - 'actual_winners': dict mapping round -> list of winners
        - 'actual_games': dict mapping round -> list of game dicts
    """
    year_games = df_games[df_games["year"] == year].copy()

    actual_winners = {}
    actual_games = {}

    for round_name in ROUND_ORDER:
        round_games = year_games[year_games["round"] == round_name]
        winners = round_games["winner"].tolist()
        actual_winners[round_name] = winners

        games_list = []
        for _, g in round_games.iterrows():
            games_list.append({
                "seed_1": int(g["seed_1"]) if pd.notna(g["seed_1"]) else None,
                "team_1": g["team_1"],
                "score_1": g["score_1"],
                "seed_2": int(g["seed_2"]) if pd.notna(g["seed_2"]) else None,
                "team_2": g["team_2"],
                "score_2": g["score_2"],
                "winner": g["winner"],
                "region": g["region"],
            })
        actual_games[round_name] = games_list

    return {
        "actual_winners": actual_winners,
        "actual_games": actual_games,
    }


def simulate_bracket(strategy_fn, bracket_data, team_stats=None, year=None):
    """
    Simulate a full bracket using a strategy function.

    The strategy function receives a matchup dict and returns the predicted winner.
    Strategy signature: strategy_fn(team1_info, team2_info, round_name, **kwargs) -> winner_name

    For R64, we use the actual matchups.
    For subsequent rounds, the winners of previous rounds are paired up in order.

    Returns:
        dict mapping round -> list of predicted winners
    """
    actual_games = bracket_data["actual_games"]
    predictions = {}

    # R64: use actual matchups
    r64_games = actual_games["R64"]
    r64_winners = []
    for game in r64_games:
        t1 = {"team": game["team_1"], "seed": game["seed_1"], "region": game["region"]}
        t2 = {"team": game["team_2"], "seed": game["seed_2"], "region": game["region"]}
        winner = strategy_fn(t1, t2, "R64", team_stats=team_stats, year=year)
        r64_winners.append(winner)
    predictions["R64"] = r64_winners

    # Subsequent rounds: pair winners from previous round
    prev_winners = r64_winners
    prev_games = r64_games

    for round_name in ROUND_ORDER[1:]:
        round_winners = []
        actual_round = actual_games.get(round_name, [])

        # Pair up previous winners
        for i in range(0, len(prev_winners), 2):
            if i + 1 >= len(prev_winners):
                # Odd team out — shouldn't happen in valid bracket
                round_winners.append(prev_winners[i])
                continue

            team1_name = prev_winners[i]
            team2_name = prev_winners[i + 1]

            # Get seed info from actual games
            t1_seed = _find_seed(team1_name, actual_games, bracket_data)
            t2_seed = _find_seed(team2_name, actual_games, bracket_data)
            region = _find_region(team1_name, actual_games)

            t1 = {"team": team1_name, "seed": t1_seed, "region": region}
            t2 = {"team": team2_name, "seed": t2_seed, "region": region}

            winner = strategy_fn(t1, t2, round_name, team_stats=team_stats, year=year)
            round_winners.append(winner)

        predictions[round_name] = round_winners
        prev_winners = round_winners

    return predictions


def _find_seed(team_name, actual_games, bracket_data):
    """Look up a team's seed from R64 matchups."""
    for game in actual_games.get("R64", []):
        if game["team_1"] == team_name:
            return game["seed_1"]
        if game["team_2"] == team_name:
            return game["seed_2"]
    return None


def _find_region(team_name, actual_games):
    """Look up a team's region."""
    for game in actual_games.get("R64", []):
        if game["team_1"] == team_name or game["team_2"] == team_name:
            return game["region"]
    return None


def backtest_strategy(strategy_fn, strategy_name, years=None, df_games=None, df_teams=None):
    """
    Backtest a strategy across multiple years.

    Returns:
        list of result dicts, one per year
    """
    if df_games is None:
        df_games = load_tournament_data()
    if years is None:
        years = sorted(df_games["year"].unique())

    results = []

    for year in years:
        bracket = get_year_bracket(df_games, year)
        predictions = simulate_bracket(strategy_fn, bracket, team_stats=df_teams, year=year)
        score_result = score_bracket(predictions, bracket["actual_winners"])

        # Count upsets called and hit
        upsets_called = 0
        upsets_hit = 0
        for round_name in ROUND_ORDER:
            actual_round_games = bracket["actual_games"].get(round_name, [])
            pred_winners = predictions.get(round_name, [])

            for game in actual_round_games:
                s1, s2 = game["seed_1"], game["seed_2"]
                if s1 is None or s2 is None:
                    continue
                # An upset pick = picking the lower-seeded team (higher number)
                higher_seed_team = game["team_1"] if s1 < s2 else game["team_2"]
                lower_seed_team = game["team_2"] if s1 < s2 else game["team_1"]

                # Check if strategy predicted an upset for this matchup position
                # We need to check if any predicted winner was the lower seed
                if lower_seed_team in pred_winners:
                    upsets_called += 1
                    if game["winner"] == lower_seed_team:
                        upsets_hit += 1

        breakdown = score_result["round_breakdown"]
        result = {
            "strategy_name": strategy_name,
            "year": year,
            "total_espn_points": score_result["total_points"],
            "r64_correct": breakdown["R64"]["correct"],
            "r32_correct": breakdown["R32"]["correct"],
            "s16_correct": breakdown["S16"]["correct"],
            "e8_correct": breakdown["E8"]["correct"],
            "f4_correct": breakdown["F4"]["correct"],
            "champ_correct": breakdown["Championship"]["correct"],
            "upsets_called": upsets_called,
            "upsets_hit": upsets_hit,
            "timestamp": datetime.now().isoformat(),
        }
        results.append(result)

        print(f"  {year}: {score_result['total_points']} pts "
              f"({score_result['correct_picks']}/{score_result['total_picks']} correct)")

    return results


def save_results(results, append=True):
    """Save results to the scoreboard CSV."""
    EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
    scoreboard_path = EXPERIMENTS_DIR / "scoreboard.csv"

    df = pd.DataFrame(results)
    if append and scoreboard_path.exists():
        existing = pd.read_csv(scoreboard_path)
        df = pd.concat([existing, df], ignore_index=True)

    df.to_csv(scoreboard_path, index=False)
    print(f"\nSaved {len(results)} results to {scoreboard_path}")
    return df


def print_summary(results, strategy_name):
    """Print a summary of backtest results."""
    df = pd.DataFrame(results)
    avg = df["total_espn_points"].mean()
    best_year = df.loc[df["total_espn_points"].idxmax()]
    worst_year = df.loc[df["total_espn_points"].idxmin()]

    print(f"\n{'=' * 50}")
    print(f"Strategy: {strategy_name}")
    print(f"{'=' * 50}")
    print(f"Average ESPN Points: {avg:.1f} / 1920")
    print(f"Best Year:  {int(best_year['year'])} ({int(best_year['total_espn_points'])} pts)")
    print(f"Worst Year: {int(worst_year['year'])} ({int(worst_year['total_espn_points'])} pts)")
    print(f"Std Dev: {df['total_espn_points'].std():.1f}")

    print(f"\nRound-by-round averages:")
    for col, label in [
        ("r64_correct", "R64"),
        ("r32_correct", "R32"),
        ("s16_correct", "S16"),
        ("e8_correct", "E8"),
        ("f4_correct", "F4"),
        ("champ_correct", "Champ"),
    ]:
        avg_correct = df[col].mean()
        total = GAMES_PER_ROUND.get(label, GAMES_PER_ROUND.get("Championship", 1))
        print(f"  {label:12s}: {avg_correct:.1f}/{total} ({avg_correct/total*100:.0f}%)")

    champ_rate = df["champ_correct"].sum() / len(df) * 100
    print(f"\nChampion correct: {int(df['champ_correct'].sum())}/{len(df)} ({champ_rate:.0f}%)")
    print(f"Avg upsets called: {df['upsets_called'].mean():.1f}")
    print(f"Avg upsets hit: {df['upsets_hit'].mean():.1f}")
