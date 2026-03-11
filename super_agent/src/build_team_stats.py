"""
Build team_stats.csv from BartTorvik data.
Matches tournament team names to BartTorvik team names and extracts
pre-tournament metrics for each team-year combination.

Source: barttorvik.com (free, pre-tournament stats available before March Madness)
"""

import os
import csv
import re

RESEARCH_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "research")
YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025]


def load_barttorvik(year):
    """Load BartTorvik data for a given year, return dict keyed by team name."""
    filepath = os.path.join(RESEARCH_DIR, f"barttorvik_{year}.csv")
    teams = {}
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        # Find column indices (case-insensitive)
        col_map = {h.strip().lower(): i for i, h in enumerate(header)}

        for row in reader:
            if len(row) < 5:
                continue
            team = row[col_map.get("team", 1)].strip()
            try:
                adjoe = float(row[col_map.get("adjoe", 4)])
                adjde = float(row[col_map.get("adjde", 6)])
                sos = float(row[col_map.get("sos", 15)]) if "sos" in col_map else 0.0

                # Tempo: 'adjt' is standalone in 2023+ or embedded in 'fun rk, adjt' in earlier years
                adjt_col = col_map.get("adjt", None)
                if adjt_col is None:
                    for key in col_map:
                        if "adjt" in key.lower():
                            adjt_col = col_map[key]
                            break
                tempo = float(row[adjt_col]) if adjt_col is not None and adjt_col < len(row) else 0.0

                # New columns (Phase 2)
                barthag = float(row[col_map["barthag"]]) if "barthag" in col_map else 0.0
                wab = float(row[col_map["wab"]]) if "wab" in col_map else 0.0
                elite_sos = float(row[col_map["elite sos"]]) if "elite sos" in col_map else 0.0
                ncsos = float(row[col_map["ncsos"]]) if "ncsos" in col_map else 0.0
                conf_winpct = float(row[col_map["conf win%"]]) if "conf win%" in col_map else 0.0
            except (ValueError, IndexError):
                continue

            adj_em = adjoe - adjde
            teams[team] = {
                "adj_em": round(adj_em, 2),
                "adj_o": round(adjoe, 2),
                "adj_d": round(adjde, 2),
                "tempo": round(tempo, 2),
                "sos": round(sos, 4),
                "barthag": round(barthag, 6),
                "wab": round(wab, 2),
                "elite_sos": round(elite_sos, 4),
                "ncsos": round(ncsos, 4),
                "conf_winpct": round(conf_winpct, 4),
            }
    return teams


def normalize_name(name):
    """Normalize team name for fuzzy matching."""
    name = name.strip().lower()
    # Common substitutions
    name = re.sub(r'\bst\.\b', 'saint', name)
    name = re.sub(r'\bst\b', 'state', name)
    name = name.replace("(", "").replace(")", "")
    name = name.replace("-", " ").replace("'", "")
    name = re.sub(r'\s+', ' ', name).strip()
    return name


# Known name mismatches between sources
NAME_ALIASES = {
    # Tournament name -> BartTorvik name
    "UConn": "Connecticut",
    "UCSB": "UC Santa Barbara",
    "USC": "Southern California",
    "UCF": "Central Florida",
    "UNC": "North Carolina",
    "ETSU": "East Tennessee St.",
    "VCU": "Virginia Commonwealth",
    "SMU": "Southern Methodist",
    "BYU": "Brigham Young",
    "UMBC": "Maryland Baltimore County",
    "LIU Brooklyn": "Long Island University",
    "LIU": "Long Island University",
    "Saint Mary's": "Saint Mary's",
    "St. Mary's": "Saint Mary's",
    "Ole Miss": "Mississippi",
    "UNC Wilmington": "North Carolina Wilmington",
    "UNC Asheville": "UNC Asheville",
    "FGCU": "Florida Gulf Coast",
    "Florida Gulf Coast": "Florida Gulf Coast",
    "North Carolina A&T": "North Carolina A&T",
    "Middle Tennessee": "Middle Tennessee St.",
    "Stephen F. Austin": "Stephen F. Austin",
    "NC State": "North Carolina St.",
    "SFA": "Stephen F. Austin",
    "Northern Kentucky": "Northern Kentucky",
    "Loyola (IL)": "Loyola Chicago",
    "Loyola Chicago": "Loyola Chicago",
    "UT Arlington": "Texas Arlington",
    "Cal State Fullerton": "Cal St. Fullerton",
    "South Dakota St.": "South Dakota St.",
    "South Dakota State": "South Dakota St.",
    "North Dakota State": "North Dakota St.",
    "New Mexico State": "New Mexico St.",
    "Murray State": "Murray St.",
    "Norfolk State": "Norfolk St.",
    "Morehead State": "Morehead St.",
    "Wichita State": "Wichita St.",
    "Wright State": "Wright St.",
    "Weber State": "Weber St.",
    "Penn State": "Penn St.",
    "Boise State": "Boise St.",
    "Iowa State": "Iowa St.",
    "Michigan State": "Michigan St.",
    "Ohio State": "Ohio St.",
    "Colorado State": "Colorado St.",
    "Kansas State": "Kansas St.",
    "Arizona State": "Arizona St.",
    "Oklahoma State": "Oklahoma St.",
    "Oregon State": "Oregon St.",
    "San Diego State": "San Diego St.",
    "Mississippi State": "Mississippi St.",
    "Fresno State": "Fresno St.",
    "Jacksonville State": "Jacksonville St.",
    "Cleveland State": "Cleveland St.",
    "Georgia State": "Georgia St.",
    "Montana State": "Montana St.",
    "Kennesaw State": "Kennesaw St.",
    "Utah State": "Utah St.",
    "Long Beach State": "Long Beach St.",
    "Sacramento State": "Sacramento St.",
    "Cal State Bakersfield": "Cal St. Bakersfield",
    "UNCW": "North Carolina Wilmington",
    "Albany": "Albany",
    "Oakland": "Oakland",
    "Hampton": "Hampton",
    "Coastal Carolina": "Coastal Carolina",
    "UC Irvine": "UC Irvine",
    "UC Davis": "UC Davis",
    "Miami (FL)": "Miami FL",
    "Miami": "Miami FL",
    "Oral Roberts": "Oral Roberts",
    "Texas Southern": "Texas Southern",
    "Grand Canyon": "Grand Canyon",
    "Abilene Christian": "Abilene Christian",
    "Colgate": "Colgate",
    "North Texas": "North Texas",
    "Eastern Washington": "Eastern Washington",
    "Drexel": "Drexel",
    "Hartford": "Hartford",
    "Mount St. Mary's": "Mount St. Mary's",
    "Texas State": "Texas St.",
    "Appalachian State": "Appalachian St.",
    "Kent State": "Kent St.",
    "Ball State": "Ball St.",
    "Lehigh": "Lehigh",
    "Norfolk St.": "Norfolk St.",
    "Long Island": "LIU",
    "NC State": "N.C. State",
    "NC Central": "North Carolina Central",
    "Loyola–Chicago": "Loyola Chicago",
    "Loyola\u2013Chicago": "Loyola Chicago",
    "Gardner–Webb": "Gardner Webb",
    "Gardner\u2013Webb": "Gardner Webb",
    # 2022-2024 additions
    "North Carolina State": "N.C. State",
    "Texas A&M–Corpus Christi": "A&M-Corpus Christi",
    "Texas A&M\u2013Corpus Christi": "A&M-Corpus Christi",
    "Georgia State": "Georgia St.",
    "Grambling State": "Grambling St.",
    "McNeese": "McNeese St.",
    "Washington State": "Washington St.",
    "UAB": "UAB",
    "Fairleigh Dickinson": "Fairleigh Dickinson",
    "Florida Atlantic": "Florida Atlantic",
    "Charleston": "Charleston",
    "Louisiana": "Louisiana",
    "Saint Peter's": "Saint Peter's",
    "Longwood": "Longwood",
    "LSU": "LSU",
    "Wagner": "Wagner",
    "Samford": "Samford",
    "Stetson": "Stetson",
    "James Madison": "James Madison",
    "Western Kentucky": "Western Kentucky",
    "Duquesne": "Duquesne",
    # 2025 additions
    "Alabama State": "Alabama St.",
    "SIU Edwardsville": "SIU Edwardsville",
    "UC San Diego": "UC San Diego",
    "High Point": "High Point",
    "Omaha": "Nebraska Omaha",
    "Mount St. Mary's": "Mount St. Mary's",
}


def match_team(tournament_name, barttorvik_teams):
    """Try to match a tournament team name to BartTorvik data."""
    # Direct match
    if tournament_name in barttorvik_teams:
        return tournament_name

    # Check aliases
    if tournament_name in NAME_ALIASES:
        alias = NAME_ALIASES[tournament_name]
        if alias in barttorvik_teams:
            return alias

    # Fuzzy match by normalized name
    norm_target = normalize_name(tournament_name)
    for bt_name in barttorvik_teams:
        if normalize_name(bt_name) == norm_target:
            return bt_name

    # Partial match
    for bt_name in barttorvik_teams:
        bt_norm = normalize_name(bt_name)
        if norm_target in bt_norm or bt_norm in norm_target:
            return bt_name

    return None


def main():
    # First, get all unique team-year combinations from tournament data
    tournament_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    team_years = set()
    team_seeds = {}  # (year, team) -> seed

    with open(tournament_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = int(row["year"])
            t1 = row["team1"].strip()
            t2 = row["team2"].strip()
            s1 = int(row["seed1"])
            s2 = int(row["seed2"])
            team_years.add((year, t1))
            team_years.add((year, t2))
            team_seeds[(year, t1)] = s1
            team_seeds[(year, t2)] = s2

    print(f"Found {len(team_years)} unique team-year combinations in tournament data")

    # Load BartTorvik data and match
    output_rows = []
    unmatched = []

    for year in YEARS:
        bt_data = load_barttorvik(year)
        year_teams = [(y, t) for y, t in team_years if y == year]

        for yr, team in sorted(year_teams):
            matched_name = match_team(team, bt_data)
            if matched_name:
                stats = bt_data[matched_name]
                output_rows.append({
                    "year": yr,
                    "team": team,
                    "seed": team_seeds.get((yr, team), 0),
                    "adj_em": stats["adj_em"],
                    "adj_o": stats["adj_o"],
                    "adj_d": stats["adj_d"],
                    "tempo": stats["tempo"],
                    "sos": stats["sos"],
                    "barthag": stats["barthag"],
                    "wab": stats["wab"],
                    "elite_sos": stats["elite_sos"],
                    "ncsos": stats["ncsos"],
                    "conf_winpct": stats["conf_winpct"],
                })
            else:
                unmatched.append((yr, team))

    # Write output
    output_file = os.path.join(RESEARCH_DIR, "team_stats.csv")
    fieldnames = ["year", "team", "seed", "adj_em", "adj_o", "adj_d", "tempo", "sos", "barthag", "wab", "elite_sos", "ncsos", "conf_winpct"]

    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Written {len(output_rows)} team-year stats to {output_file}")

    if unmatched:
        print(f"\nWARNING: {len(unmatched)} unmatched teams:")
        for yr, team in sorted(unmatched):
            print(f"  {yr}: {team}")
    else:
        print("\nAll tournament teams matched successfully!")


if __name__ == "__main__":
    main()
