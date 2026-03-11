"""
Data Collection: Convert raw tournament CSVs to pipeline format.
Source: github.com/shoenot/march-madness-games-csv (verified NCAA tournament results)

Converts winner/loser format to team1/team2/winner format expected by utils.py.
Randomly assigns team1/team2 to avoid positional bias in the training data.
"""

import os
import csv
import random

RESEARCH_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "research")

ROUND_MAP = {
    "64": "round_of_64",
    "32": "round_of_32",
    "16": "sweet_16",
    "8": "elite_8",
    "4": "final_four",
    "2": "championship",
}

YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025]


def main():
    random.seed(42)  # Reproducible team1/team2 assignment
    all_games = []
    game_counter = 0

    for year in YEARS:
        raw_file = os.path.join(RESEARCH_DIR, f"raw_{year}.csv")
        if not os.path.exists(raw_file):
            print(f"WARNING: Missing {raw_file}")
            continue

        with open(raw_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                game_counter += 1
                round_name = ROUND_MAP.get(row["round_of"], row["round_of"])

                winner = row["winning_team_name"].strip()
                loser = row["losing_team_name"].strip()
                winner_seed = int(row["winning_team_seed"])
                loser_seed = int(row["losing_team_seed"])
                winner_score = int(row["winning_team_score"])
                loser_score = int(row["losing_team_score"])

                # Randomly assign team1/team2 to avoid positional bias
                if random.random() < 0.5:
                    team1, seed1, score1 = winner, winner_seed, winner_score
                    team2, seed2, score2 = loser, loser_seed, loser_score
                else:
                    team1, seed1, score1 = loser, loser_seed, loser_score
                    team2, seed2, score2 = winner, winner_seed, winner_score

                all_games.append({
                    "year": int(row["year"]),
                    "round": round_name,
                    "game_id": f"{year}_{round_name}_{game_counter}",
                    "team1": team1,
                    "seed1": seed1,
                    "team2": team2,
                    "seed2": seed2,
                    "winner": winner,
                    "score1": score1,
                    "score2": score2,
                })

    # Write combined CSV
    output_file = os.path.join(RESEARCH_DIR, "tournament_games.csv")
    fieldnames = ["year", "round", "game_id", "team1", "seed1", "team2", "seed2", "winner", "score1", "score2"]

    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_games)

    print(f"Written {len(all_games)} games to {output_file}")
    print(f"Years: {sorted(set(g['year'] for g in all_games))}")
    print(f"Games per year:")
    for year in YEARS:
        count = sum(1 for g in all_games if g["year"] == year)
        print(f"  {year}: {count} games")


if __name__ == "__main__":
    main()
