"""
Historical March Madness data collection (2010-2024).
Sources: sports-reference.com, barttorvik.com
Outputs: data/processed/tournaments.csv, data/processed/team_seasons.csv
"""

import os
import sys
import time
import json
import re
from pathlib import Path

import requests
import pandas as pd
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

YEARS = [y for y in range(2010, 2025) if y != 2020]


def fetch_with_cache(url, cache_path, delay=3):
    """Fetch URL with disk caching."""
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            return f.read()
    print(f"  Fetching: {url}")
    time.sleep(delay)
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(resp.text)
    return resp.text


def parse_team_div(team_div):
    """Parse a team sub-div: <span>seed</span> <a>name</a> <a>score</a>"""
    seed_span = team_div.find("span", recursive=False)
    seed = None
    if seed_span:
        try:
            seed = int(seed_span.get_text(strip=True))
        except ValueError:
            pass

    links = team_div.find_all("a", recursive=False)
    team_name = None
    score = None
    for link in links:
        href = link.get("href", "")
        text = link.get_text(strip=True)
        if "/cbb/schools/" in href:
            team_name = text
        elif "/cbb/boxscores/" in href and text.isdigit():
            score = int(text)

    is_winner = "winner" in (team_div.get("class") or [])
    return {"seed": seed, "team": team_name, "score": score, "is_winner": is_winner}


def parse_game_div(game_div, year, region, round_name):
    """Parse a game div containing two team sub-divs."""
    team_divs = game_div.find_all("div", recursive=False)
    teams = []
    for td in team_divs:
        parsed = parse_team_div(td)
        if parsed["team"]:
            teams.append(parsed)

    if len(teams) < 2:
        return None

    t1, t2 = teams[0], teams[1]
    winner = t1["team"] if t1["is_winner"] else (t2["team"] if t2["is_winner"] else None)

    return {
        "year": year,
        "round": round_name,
        "region": region,
        "seed_1": t1["seed"],
        "team_1": t1["team"],
        "score_1": t1["score"],
        "seed_2": t2["seed"],
        "team_2": t2["team"],
        "score_2": t2["score"],
        "winner": winner,
    }


def collect_tournament_games(year):
    """Parse sports-reference bracket page into game records."""
    url = f"https://www.sports-reference.com/cbb/postseason/men/{year}-ncaa.html"
    cache = RAW_DIR / f"sportsref_bracket_{year}.html"

    try:
        html = fetch_with_cache(url, cache)
    except Exception as e:
        print(f"  Could not fetch: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    brackets_container = soup.find("div", {"id": "brackets"})
    if not brackets_container:
        return []

    bracket_divs = brackets_container.find_all("div", {"id": "bracket"})
    all_games = []

    # Regional round names (5 rounds per region bracket)
    regional_rounds = ["R64", "R32", "S16", "E8", "Regional_Winner"]
    # Final Four rounds (3 rounds in FF bracket)
    ff_rounds = ["F4", "Championship", "Champion"]

    for bi, bd in enumerate(bracket_divs):
        rounds = bd.find_all("div", class_="round")
        is_ff = (bi == len(bracket_divs) - 1)
        round_labels = ff_rounds if is_ff else regional_rounds
        region = "Final Four" if is_ff else f"Region_{bi+1}"

        for ri, rd in enumerate(rounds):
            if ri >= len(round_labels):
                break
            round_name = round_labels[ri]

            # Skip non-game rounds (winner displays)
            if round_name in ("Regional_Winner", "Champion"):
                continue

            game_divs = rd.find_all("div", recursive=False)
            for gd in game_divs:
                game = parse_game_div(gd, year, region, round_name)
                if game:
                    all_games.append(game)

    return all_games


def collect_barttorvik_stats(year):
    """Fetch team stats from barttorvik.com JSON endpoint."""
    url = f"https://barttorvik.com/getadvstats.php?year={year}&top=0&venue=All&type=pointed"
    cache = RAW_DIR / f"barttorvik_json_{year}.json"

    try:
        raw = fetch_with_cache(url, cache, delay=4)
    except Exception as e:
        print(f"  Could not fetch barttorvik for {year}: {e}")
        return []

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        print(f"  Could not parse barttorvik JSON for {year}")
        return []

    if not isinstance(data, list):
        return []

    teams = []
    for row in data:
        if not isinstance(row, list) or len(row) < 10:
            continue
        teams.append({
            "year": year,
            "rank": row[0],
            "team": row[1],
            "conference": row[2],
            "record": row[3],
            "adj_oe": row[4],
            "adj_de": row[5],
            "barthag": row[6],
            "adj_tempo": row[7],
            "sos": row[14] if len(row) > 14 else None,
        })

    return teams


def build_seed_matchup_history(df_games):
    """Build historical seed-vs-seed win rate table from game data."""
    records = []
    for _, g in df_games.iterrows():
        s1, s2, w = g["seed_1"], g["seed_2"], g["winner"]
        if pd.isna(s1) or pd.isna(s2) or pd.isna(w):
            continue
        s1, s2 = int(s1), int(s2)
        higher = min(s1, s2)
        lower = max(s1, s2)
        winner_seed = s1 if w == g["team_1"] else s2
        higher_won = winner_seed == higher
        records.append({"higher_seed": higher, "lower_seed": lower, "higher_won": higher_won})

    df_matchups = pd.DataFrame(records)
    if df_matchups.empty:
        return pd.DataFrame()

    summary = df_matchups.groupby(["higher_seed", "lower_seed"]).agg(
        games=("higher_won", "count"),
        higher_seed_wins=("higher_won", "sum"),
    ).reset_index()
    summary["higher_seed_win_pct"] = summary["higher_seed_wins"] / summary["games"]
    return summary


def main():
    print("=" * 60)
    print("March Madness Historical Data Collection (2010-2024)")
    print("=" * 60)

    all_games = []
    all_teams = []

    print("\n=== Collecting Tournament Results ===")
    for year in YEARS:
        print(f"\nYear {year}:")
        games = collect_tournament_games(year)
        all_games.extend(games)
        rounds = {}
        for g in games:
            rounds[g["round"]] = rounds.get(g["round"], 0) + 1
        print(f"  {len(games)} games: {rounds}")

    print("\n=== Collecting Team Stats (Barttorvik) ===")
    for year in YEARS:
        print(f"\nYear {year}:")
        teams = collect_barttorvik_stats(year)
        all_teams.extend(teams)
        print(f"  {len(teams)} teams")

    # Save tournament games
    df_games = pd.DataFrame(all_games)
    games_path = PROCESSED_DIR / "tournaments.csv"
    df_games.to_csv(games_path, index=False)
    print(f"\nSaved {len(df_games)} tournament games to {games_path}")
    print(f"\nGames per year:\n{df_games.groupby('year').size()}")
    print(f"\nGames per round:\n{df_games.groupby('round').size()}")

    # Check for missing winners
    no_winner = df_games[df_games["winner"].isna()]
    if len(no_winner) > 0:
        print(f"\nWARNING: {len(no_winner)} games with no winner identified!")

    # Save team stats
    if all_teams:
        df_teams = pd.DataFrame(all_teams)
        teams_path = PROCESSED_DIR / "team_seasons.csv"
        df_teams.to_csv(teams_path, index=False)
        print(f"\nSaved {len(df_teams)} team-season records to {teams_path}")

    # Build seed matchup history
    seed_history = build_seed_matchup_history(df_games)
    if not seed_history.empty:
        seed_path = PROCESSED_DIR / "seed_matchup_history.csv"
        seed_history.to_csv(seed_path, index=False)
        print(f"\nSaved {len(seed_history)} seed matchup records to {seed_path}")

    # Summary
    print("\n" + "=" * 60)
    print("COLLECTION COMPLETE")
    print(f"  Tournament games: {len(df_games)}")
    print(f"  Team-season records: {len(all_teams)}")
    print(f"  Years covered: {sorted(df_games['year'].unique())}")
    expected = 63 * len(YEARS)
    print(f"  Expected games: {expected}, got: {len(df_games)}")
    if len(df_games) < expected:
        print(f"  Missing: {expected - len(df_games)} games")
    print("=" * 60)


if __name__ == "__main__":
    main()
