"""
The Quant — Monte Carlo Tournament Simulator
==============================================
Simulates the NCAA tournament N times using BartTorvik efficiency ratings.
The bracket output is the most common outcome across all simulations.

Data source: BartTorvik (free) — AdjO, AdjD, Tempo, Elite SOS
Bracket structure: Loaded from actual-results.json (R64 matchups)

Usage:
  python scripts/quant.py --year 2025 --sims 10000
  python scripts/quant.py --year 2024 --sims 50000
"""

import os
import sys
import random
import math
import argparse
from collections import Counter
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from dataclasses import dataclass

# ----- Path setup & shared utility imports -----
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SCOUT_PRIME_SRC = os.path.join(PROJECT_ROOT, "scout_prime_agent", "src")
sys.path.insert(0, SCOUT_PRIME_SRC)
from utils import (
    get_r64_matchups, load_json, save_json, load_barttorvik,
    resolve_team_name, score_bracket, print_results, ROUND_ORDER,
)

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

def simulate_tournament(bracket: List[Tuple[Team, Team]]) -> Dict[str, str]:
    """
    Simulate an entire tournament.
    bracket = list of R64 matchups as (team_a, team_b) tuples
    Returns dict mapping gameId to winner name for every game.
    """
    results = {}
    current_teams = []

    for round_idx, round_name in enumerate(ROUND_NAMES):
        if round_idx == 0:
            matchups = bracket
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

def run_monte_carlo(bracket: List[Tuple[Team, Team]], n_sims: int = NUM_SIMULATIONS):
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


# ----- Bracket JSON builder -----

def build_team(name: str, seed: int, region: str, bt_data: dict) -> Team:
    """
    Build a Team object from matchup data + BartTorvik stats.
    Falls back to seed-based defaults if stats are missing.
    """
    bt_name = resolve_team_name(name, bt_data) if bt_data else None
    stats = bt_data.get(bt_name) if bt_name else None

    if stats:
        return Team(
            name=name,
            seed=seed,
            region=region,
            adj_o=stats["adj_o"],
            adj_d=stats["adj_d"],
            tempo=stats["tempo"],
            sos=stats.get("elite_sos", 0),
        )
    else:
        print(f"  WARNING: No BartTorvik stats for {name} (seed {seed}), using defaults")
        return Team(
            name=name,
            seed=seed,
            region=region,
            adj_o=105.0,
            adj_d=100.0 - seed * 0.5,
            tempo=68.0,
            sos=0.0,
        )


def get_f4_pairings(results_data: dict) -> List[Tuple[str, str]]:
    """
    Extract Final Four region pairings from the actual-results data.
    Returns list of (region_a, region_b) tuples, e.g. [("South","West"), ("East","Midwest")].
    Falls back to NCAA default if no F4 games exist in results.
    """
    if results_data:
        f4_games = [g for g in results_data["games"] if g["round"] == "final_four"]
        if f4_games:
            pairings = []
            for g in f4_games:
                # Parse region names from gameId like "f4-south-west"
                parts = g["gameId"].replace("f4-", "").split("-")
                # Capitalize each part
                regions = [p.capitalize() for p in parts]
                pairings.append(tuple(regions))
            return pairings

    # Default NCAA pairing (may not match every year)
    return [("South", "West"), ("East", "Midwest")]


def reorder_matchups_for_f4(matchups: list, f4_pairings: List[Tuple[str, str]]) -> list:
    """
    Reorder R64 matchups so that regions are grouped in the order needed
    for the simulation's consecutive F4 pairing to match reality.

    The simulation pairs E8 winners [0] vs [1] and [2] vs [3], where
    the index corresponds to the region's position in the flat matchup list.
    So if F4 pairs (South, West) and (East, Midwest), we need region order
    [South, West, East, Midwest] — not the default [South, East, Midwest, West].
    """
    # Build desired region order from F4 pairings: [pair1_a, pair1_b, pair2_a, pair2_b]
    desired_order = []
    for reg_a, reg_b in f4_pairings:
        desired_order.append(reg_a)
        desired_order.append(reg_b)

    # Group matchups by region
    by_region = {}
    for m in matchups:
        by_region.setdefault(m["region"], []).append(m)

    # Rebuild in desired order
    reordered = []
    for region in desired_order:
        reordered.extend(by_region.get(region, []))

    return reordered


def build_output_json(matchups: list, consensus: dict, results_data: dict,
                      bt_data: dict, n_sims: int) -> dict:
    """
    Build the full bracket JSON from Monte Carlo consensus results.

    The simulation uses generic game_ids (e.g. "round_of_64_0").
    This function maps them back to proper game IDs matching the actual-results format.
    """
    # Determine region order from R64 matchups
    region_order = []
    for m in matchups:
        if m["region"] not in region_order:
            region_order.append(m["region"])

    # Group R64 matchups by region (preserving order within region)
    region_matchups = {r: [] for r in region_order}
    for m in matchups:
        region_matchups[m["region"]].append(m)

    # The simulation processes matchups in the flat order they were given.
    # We need to know the flat index for each R64 game to map simulation game_ids.
    # Build a mapping: simulation game_id -> matchup metadata + consensus result
    rounds_output = {}

    # --- Round of 64 ---
    r64_games = []
    # Track winners per slot for building later rounds
    # winners_by_position[i] = consensus winner of R64 game i
    r64_winners = []

    for i, m in enumerate(matchups):
        sim_key = f"round_of_64_{i}"
        sim_result = consensus[sim_key]
        net_a = _get_net_efficiency(m["team1"], bt_data)
        net_b = _get_net_efficiency(m["team2"], bt_data)
        diff = abs(net_a - net_b)

        r64_games.append({
            "gameId": m["gameId"],
            "round": "round_of_64",
            "region": m["region"],
            "seed1": m["seed1"],
            "team1": m["team1"],
            "seed2": m["seed2"],
            "team2": m["team2"],
            "pick": sim_result["pick"],
            "confidence": int(round(sim_result["confidence"] * 100)),
            "reasoning": _make_reasoning(sim_result, diff, n_sims),
        })

        # Track winner with seed info for later rounds
        if sim_result["pick"] == m["team1"]:
            r64_winners.append({"name": m["team1"], "seed": m["seed1"], "region": m["region"]})
        else:
            r64_winners.append({"name": m["team2"], "seed": m["seed2"], "region": m["region"]})

    rounds_output["round_of_64"] = r64_games

    # --- Round of 32 ---
    r32_games = []
    r32_winners = []
    region_r32_counters = {r: 0 for r in region_order}

    for i in range(0, len(r64_winners), 2):
        sim_key = f"round_of_32_{i // 2}"
        sim_result = consensus[sim_key]
        w1 = r64_winners[i]
        w2 = r64_winners[i + 1]
        region = w1["region"]
        region_r32_counters[region] += 1
        game_num = region_r32_counters[region]

        net_a = _get_net_efficiency(w1["name"], bt_data)
        net_b = _get_net_efficiency(w2["name"], bt_data)
        diff = abs(net_a - net_b)

        r32_games.append({
            "gameId": f"r32-{region.lower()}-{game_num}",
            "round": "round_of_32",
            "region": region,
            "seed1": w1["seed"],
            "team1": w1["name"],
            "seed2": w2["seed"],
            "team2": w2["name"],
            "pick": sim_result["pick"],
            "confidence": int(round(sim_result["confidence"] * 100)),
            "reasoning": _make_reasoning(sim_result, diff, n_sims),
        })

        if sim_result["pick"] == w1["name"]:
            r32_winners.append(w1)
        else:
            r32_winners.append(w2)

    rounds_output["round_of_32"] = r32_games

    # --- Sweet 16 ---
    s16_games = []
    s16_winners = []
    region_s16_counters = {r: 0 for r in region_order}

    for i in range(0, len(r32_winners), 2):
        sim_key = f"sweet_16_{i // 2}"
        sim_result = consensus[sim_key]
        w1 = r32_winners[i]
        w2 = r32_winners[i + 1]
        region = w1["region"]
        region_s16_counters[region] += 1
        game_num = region_s16_counters[region]

        net_a = _get_net_efficiency(w1["name"], bt_data)
        net_b = _get_net_efficiency(w2["name"], bt_data)
        diff = abs(net_a - net_b)

        s16_games.append({
            "gameId": f"s16-{region.lower()}-{game_num}",
            "round": "sweet_16",
            "region": region,
            "seed1": w1["seed"],
            "team1": w1["name"],
            "seed2": w2["seed"],
            "team2": w2["name"],
            "pick": sim_result["pick"],
            "confidence": int(round(sim_result["confidence"] * 100)),
            "reasoning": _make_reasoning(sim_result, diff, n_sims),
        })

        if sim_result["pick"] == w1["name"]:
            s16_winners.append(w1)
        else:
            s16_winners.append(w2)

    rounds_output["sweet_16"] = s16_games

    # --- Elite 8 ---
    e8_games = []
    e8_winners = []

    for i in range(0, len(s16_winners), 2):
        sim_key = f"elite_8_{i // 2}"
        sim_result = consensus[sim_key]
        w1 = s16_winners[i]
        w2 = s16_winners[i + 1]
        region = w1["region"]

        net_a = _get_net_efficiency(w1["name"], bt_data)
        net_b = _get_net_efficiency(w2["name"], bt_data)
        diff = abs(net_a - net_b)

        e8_games.append({
            "gameId": f"e8-{region.lower()}",
            "round": "elite_8",
            "region": region,
            "seed1": w1["seed"],
            "team1": w1["name"],
            "seed2": w2["seed"],
            "team2": w2["name"],
            "pick": sim_result["pick"],
            "confidence": int(round(sim_result["confidence"] * 100)),
            "reasoning": _make_reasoning(sim_result, diff, n_sims),
        })

        if sim_result["pick"] == w1["name"]:
            e8_winners.append(w1)
        else:
            e8_winners.append(w2)

    rounds_output["elite_8"] = e8_games

    # --- Final Four ---
    # E8 winners are in region order. Need to pair them according to the bracket.
    f4_pairings = get_f4_pairings(results_data)

    # Build a lookup: region -> E8 winner
    e8_winner_by_region = {w["region"]: w for w in e8_winners}

    f4_games = []
    f4_winners = []

    for pair_idx, (reg_a, reg_b) in enumerate(f4_pairings):
        sim_key = f"final_four_{pair_idx}"
        sim_result = consensus[sim_key]
        w1 = e8_winner_by_region[reg_a]
        w2 = e8_winner_by_region[reg_b]

        game_id = f"f4-{reg_a.lower()}-{reg_b.lower()}"

        net_a = _get_net_efficiency(w1["name"], bt_data)
        net_b = _get_net_efficiency(w2["name"], bt_data)
        diff = abs(net_a - net_b)

        f4_games.append({
            "gameId": game_id,
            "round": "final_four",
            "region": "National",
            "seed1": w1["seed"],
            "team1": w1["name"],
            "seed2": w2["seed"],
            "team2": w2["name"],
            "pick": sim_result["pick"],
            "confidence": int(round(sim_result["confidence"] * 100)),
            "reasoning": _make_reasoning(sim_result, diff, n_sims),
        })

        if sim_result["pick"] == w1["name"]:
            f4_winners.append(w1)
        else:
            f4_winners.append(w2)

    rounds_output["final_four"] = f4_games

    # --- Championship ---
    sim_key = "championship_0"
    sim_result = consensus[sim_key]
    w1 = f4_winners[0]
    w2 = f4_winners[1]

    net_a = _get_net_efficiency(w1["name"], bt_data)
    net_b = _get_net_efficiency(w2["name"], bt_data)
    diff = abs(net_a - net_b)

    rounds_output["championship"] = [{
        "gameId": "championship",
        "round": "championship",
        "region": "National",
        "seed1": w1["seed"],
        "team1": w1["name"],
        "seed2": w2["seed"],
        "team2": w2["name"],
        "pick": sim_result["pick"],
        "confidence": int(round(sim_result["confidence"] * 100)),
        "reasoning": _make_reasoning(sim_result, diff, n_sims),
    }]

    champion = sim_result["pick"]
    final_four = [w["name"] for w in e8_winners]

    output = {
        "model": "the-quant",
        "displayName": "The Quant",
        "tagline": "10,000 simulations. Zero feelings.",
        "color": "#22c55e",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "locked": True,
        "espnBracketUrl": None,
        "champion": champion,
        "championEliminated": False,
        "finalFour": final_four,
        "rounds": rounds_output,
    }

    return output


def _get_net_efficiency(team_name: str, bt_data: dict) -> float:
    """Get net efficiency (AdjO - AdjD) for a team, with fallback."""
    bt_name = resolve_team_name(team_name, bt_data) if bt_data else None
    if bt_name and bt_name in bt_data:
        stats = bt_data[bt_name]
        return stats["adj_o"] - stats["adj_d"]
    return 0.0


def _make_reasoning(sim_result: dict, eff_diff: float, n_sims: int) -> str:
    """Build a reasoning string from simulation results."""
    pct = sim_result["confidence"] * 100
    return (
        f"Simulation: {sim_result['pick']} wins {pct:.1f}% of {n_sims:,} iterations. "
        f"Adjusted efficiency differential: {eff_diff:+.1f}."
    )


def main():
    parser = argparse.ArgumentParser(description="The Quant — Monte Carlo Tournament Simulator")
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    parser.add_argument("--sims", type=int, default=10_000, help="Number of simulations (default: 10000)")
    args = parser.parse_args()

    year = args.year
    n_sims = args.sims

    print("=" * 60)
    print(f"  THE QUANT — Monte Carlo Tournament Simulator ({year})")
    print(f"  Running {n_sims:,} simulations...")
    print("=" * 60)

    # 1. Load R64 matchups
    print(f"\n1. Loading R64 matchups for {year}...")
    matchups, results_data = get_r64_matchups(year)
    if not matchups:
        print(f"   ERROR: No R64 matchups found for {year}. Check actual-results.json.")
        return
    print(f"   Found {len(matchups)} R64 matchups")

    # 2. Load BartTorvik stats
    print(f"\n2. Loading BartTorvik stats for {year}...")
    bt_data = load_barttorvik(year)
    if bt_data:
        print(f"   Loaded stats for {len(bt_data)} teams")
    else:
        print("   WARNING: No BartTorvik data found. Using seed-based defaults for all teams.")

    # 3. Reorder matchups so F4 pairings align with simulation structure
    print(f"\n3. Building bracket...")
    f4_pairings = get_f4_pairings(results_data)
    matchups = reorder_matchups_for_f4(matchups, f4_pairings)
    region_order = []
    for m in matchups:
        if m["region"] not in region_order:
            region_order.append(m["region"])
    print(f"   Region order (F4 aligned): {' / '.join(region_order)}")
    print(f"   F4 pairings: {' vs '.join(f'{a}-{b}' for a, b in f4_pairings)}")

    # Build Team objects and R64 bracket
    bracket = []
    for m in matchups:
        t1 = build_team(m["team1"], m["seed1"], m["region"], bt_data)
        t2 = build_team(m["team2"], m["seed2"], m["region"], bt_data)
        bracket.append((t1, t2))
    print(f"   Built {len(bracket)} R64 matchups across {len(region_order)} regions")

    # 4. Run Monte Carlo simulation
    print(f"\n4. Running Monte Carlo simulation ({n_sims:,} iterations)...")
    consensus = run_monte_carlo(bracket, n_sims=n_sims)

    # 5. Build output JSON
    print(f"\n5. Building bracket JSON...")
    output = build_output_json(matchups, consensus, results_data, bt_data, n_sims)
    print(f"   Champion: {output['champion']}")
    print(f"   Final Four: {', '.join(output['finalFour'])}")

    # 6. Save output
    if year >= 2026:
        output_path = os.path.join(PROJECT_ROOT, "data", "models", "the-quant.json")
    else:
        output_path = os.path.join(PROJECT_ROOT, "data", "archive", str(year), "models", "the-quant.json")

    save_json(output, output_path)

    # 7. Score against actual results
    print(f"\n6. Scoring against actual results...")
    espn_result, espn_pct = score_bracket(output["rounds"], year)
    if espn_result:
        results_by_year = {year: (espn_result, espn_pct)}
        print_results(f"The Quant — {n_sims:,} sims", results_by_year)
    else:
        print("   No actual results available for scoring (tournament not yet played).")

    print(f"\nDone. Output: {output_path}")


if __name__ == "__main__":
    main()
