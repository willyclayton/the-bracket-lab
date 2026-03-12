"""
Collect team-level stats from sports-reference.com ratings pages (2010-2024).
Output: data/processed/team_seasons.csv with SRS-based rankings.
"""

import time
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


def collect_sportsref_ratings(year):
    """Scrape sports-reference.com ratings page for team stats."""
    url = f"https://www.sports-reference.com/cbb/seasons/men/{year}-ratings.html"
    cache = RAW_DIR / f"sportsref_ratings_{year}.html"

    try:
        html = fetch_with_cache(url, cache)
    except Exception as e:
        print(f"  Error fetching {year}: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"id": "ratings"})
    if not table:
        print(f"  No ratings table found for {year}")
        return []

    teams = []
    rows = table.find("tbody").find_all("tr") if table.find("tbody") else table.find_all("tr")[1:]

    for row in rows:
        # Skip header rows embedded in tbody
        if row.get("class") and "thead" in " ".join(row.get("class", [])):
            continue

        cells = row.find_all(["td", "th"])
        if len(cells) < 8:
            continue

        # Extract data by data-stat attribute (more reliable than position)
        data = {}
        for cell in cells:
            stat = cell.get("data-stat", "")
            val = cell.get_text(strip=True)
            if stat:
                data[stat] = val

        # Also get school name from the link
        school_link = row.find("a", href=lambda h: h and "/cbb/schools/" in h)
        school_name = school_link.get_text(strip=True) if school_link else data.get("school_name", "")

        if not school_name:
            continue

        try:
            team = {
                "year": year,
                "team": school_name,
                "conference": data.get("conf_abbr", ""),
                "wins": _safe_int(data.get("wins", "")),
                "losses": _safe_int(data.get("losses", "")),
                "ppg": _safe_float(data.get("pts_per_g", "")),
                "opp_ppg": _safe_float(data.get("opp_pts_per_g", "")),
                "mov": _safe_float(data.get("mov", "")),
                "sos": _safe_float(data.get("sos", "")),
                "srs": _safe_float(data.get("srs", "")),
                "rank": _safe_int(data.get("ranker", "")),
            }
            teams.append(team)
        except Exception:
            continue

    return teams


def _safe_int(val):
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def main():
    print("=" * 60)
    print("Collecting Team Stats from Sports-Reference (2010-2024)")
    print("=" * 60)

    all_teams = []

    for year in YEARS:
        print(f"\nYear {year}:")
        teams = collect_sportsref_ratings(year)
        all_teams.extend(teams)
        print(f"  {len(teams)} teams")

    if all_teams:
        df = pd.DataFrame(all_teams)

        # Compute SRS-based rank per year where missing
        for year in YEARS:
            mask = (df["year"] == year) & df["srs"].notna()
            if mask.any():
                df.loc[mask, "srs_rank"] = df.loc[mask, "srs"].rank(ascending=False).astype(int)

        path = PROCESSED_DIR / "team_seasons.csv"
        df.to_csv(path, index=False)
        print(f"\nSaved {len(df)} team records to {path}")

        # Quick quality check
        print(f"\nColumns: {list(df.columns)}")
        print(f"Sample (top 5 by SRS, 2024):")
        yr = df[df.year == 2024].nlargest(5, "srs")
        print(yr[["team", "srs", "srs_rank", "wins", "losses", "mov"]].to_string())
    else:
        print("\nERROR: No team stats collected!")


if __name__ == "__main__":
    main()
