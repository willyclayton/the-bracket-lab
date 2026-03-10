"""
The Quant — Monte Carlo Tournament Simulator
==============================================
Simulates the NCAA tournament 10,000 times using team efficiency ratings.
The bracket output is the most common outcome across all simulations.

Data source: BartTorvik (free) or KenPom ($20/yr)
Required fields per team: AdjO, AdjD, Tempo, SOS

Usage:
  python scripts/quant.py --input data/meta/teams_with_ratings.json --sims 10000 --output data/models/the-quant.json

TODO:
  - [ ] Scrape or manually input team ratings from BartTorvik
  - [ ] Define bracket matchups from Selection Sunday results
  - [ ] Test with 2025 tournament data before running on 2026
"""

import json
import random
import math
from collections import Counter
from typing import Dict, List, Tuple
from dataclasses import dataclass

# ----- Configuration -----
NUM_SIMULATIONS = 10_000
ROUND_NAMES = [
    "round_of_64", "round_of_32", "sweet_16",
    "elite_8", "final_four", "championship"
]

@dataclass
class Team:
    name: str
    seed: int
    region: str
    adj_o: float   # Adjusted offensive efficiency
    adj_d: float   # Adjusted defensive efficiency
    tempo: float   # Possessions per game
    sos: float     # Strength of schedule

def win_probability(team_a: Team, team_b: Team) -> float:
    """
    Calculate probability of team_a beating team_b using efficiency differentials.

    Method: Log5 approach adapted for efficiency ratings.
    Net efficiency = AdjO - AdjD (points above/below average per 100 possessions)
    Convert differential to win probability via logistic function.

    A team with +10 net efficiency vs. a team with 0 net efficiency
    should win roughly 75-80% of the time.
    """
    net_a = team_a.adj_o - team_a.adj_d
    net_b = team_b.adj_o - team_b.adj_d
    diff = net_a - net_b

    # Logistic function — tuned so 10-point differential ≈ 76% win probability
    # Adjust the scaling factor (0.08) based on backtesting
    prob = 1 / (1 + math.exp(-0.08 * diff))

    # Apply small home-court / seed psychological adjustment (optional)
    # Higher seeds get a tiny bump for tournament experience
    seed_bump = (team_b.seed - team_a.seed) * 0.003  # ~0.3% per seed line difference
    prob = min(max(prob + seed_bump, 0.01), 0.99)

    return prob

def simulate_game(team_a: Team, team_b: Team) -> Team:
    """Simulate a single game. Returns the winner."""
    prob_a = win_probability(team_a, team_b)
    return team_a if random.random() < prob_a else team_b

def simulate_tournament(bracket: List[List[Tuple[Team, Team]]]) -> Dict[str, str]:
    """
    Simulate an entire tournament.
    bracket[0] = list of R64 matchups as (team_a, team_b) tuples
    Returns dict mapping gameId to winner name for every game.
    """
    results = {}
    current_teams = []

    for round_idx, round_name in enumerate(ROUND_NAMES):
        if round_idx == 0:
            matchups = bracket[0]
        else:
            # Pair up winners from previous round
            matchups = list(zip(current_teams[::2], current_teams[1::2]))

        current_teams = []
        for i, (team_a, team_b) in enumerate(matchups):
            winner = simulate_game(team_a, team_b)
            game_id = f"{round_name}_{i}"
            results[game_id] = winner.name
            current_teams.append(winner)

    return results

def run_monte_carlo(bracket: List[List[Tuple[Team, Team]]], n_sims: int = NUM_SIMULATIONS):
    """
    Run n_sims tournament simulations.
    Returns the most common winner for each game + confidence percentages.
    """
    all_results = []

    for i in range(n_sims):
        if i % 1000 == 0:
            print(f"  Simulation {i}/{n_sims}...")
        result = simulate_tournament(bracket)
        all_results.append(result)

    # Aggregate: for each game, find most common winner
    game_ids = all_results[0].keys()
    consensus = {}

    for game_id in game_ids:
        winners = [r[game_id] for r in all_results]
        counter = Counter(winners)
        most_common = counter.most_common(1)[0]
        consensus[game_id] = {
            "pick": most_common[0],
            "confidence": round(most_common[1] / n_sims, 3),
            "distribution": {team: round(count / n_sims, 3) for team, count in counter.items()}
        }

    # Champion distribution
    champ_key = [k for k in game_ids if "championship" in k][0]
    champ_dist = consensus[champ_key]["distribution"]
    print(f"\n  Champion probabilities:")
    for team, prob in sorted(champ_dist.items(), key=lambda x: -x[1])[:10]:
        print(f"    {team}: {prob:.1%}")

    return consensus

def main():
    print("=" * 60)
    print("THE QUANT — Monte Carlo Tournament Simulator")
    print(f"Running {NUM_SIMULATIONS:,} simulations...")
    print("=" * 60)

    # TODO: Load actual team data and bracket matchups
    # For now, this is a skeleton. Replace with real data after Selection Sunday.

    print("\n⚠️  No team data loaded yet.")
    print("   Populate data/meta/teams_with_ratings.json after Selection Sunday.")
    print("   Then update this script to load the data and define R64 matchups.")
    print()
    print("To test with fake data, uncomment the test section below.")

    # ----- Uncomment to test with fake data -----
    # fake_teams = [
    #     Team("Team A", 1, "East", 120.0, 95.0, 70.0, 10.0),
    #     Team("Team B", 16, "East", 100.0, 105.0, 68.0, -5.0),
    #     # ... add more teams
    # ]
    # fake_bracket = [[(fake_teams[0], fake_teams[1])]]  # Just one game
    # results = run_monte_carlo(fake_bracket, n_sims=1000)
    # print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
