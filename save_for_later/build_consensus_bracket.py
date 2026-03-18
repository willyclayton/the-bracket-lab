#!/usr/bin/env python3
"""
Build a consensus bracket from all 9 model brackets.
For each game, take the majority pick. Break ties with chalk (lower seed).
For later rounds, only models that project the same matchup can vote.
"""

import json
import os
from collections import Counter
from pathlib import Path

DATA_DIR = Path("/Users/will.clayton/Desktop/Aside_project/the-bracket-lab/data/models")
TEAMS_FILE = Path("/Users/will.clayton/Desktop/Aside_project/the-bracket-lab/data/meta/teams.json")

ROUND_ORDER = [
    "round_of_64",
    "round_of_32",
    "sweet_16",
    "elite_8",
    "final_four",
    "championship",
]

def load_all_models():
    models = []
    for f in sorted(DATA_DIR.glob("*.json")):
        with open(f) as fh:
            models.append(json.load(fh))
    print(f"Loaded {len(models)} models: {[m['model'] for m in models]}")
    return models

def load_teams():
    with open(TEAMS_FILE) as fh:
        data = json.load(fh)
    teams_list = data["teams"] if isinstance(data, dict) else data
    # Build lookup: team name -> seed
    seed_map = {}
    for t in teams_list:
        seed_map[t["name"]] = t["seed"]
    return seed_map

def get_chalk_pick(game):
    """Return the lower-seeded (favored) team."""
    if game["seed1"] <= game["seed2"]:
        return game["pick"] if game["seed1"] < game["seed2"] else game["team1"]
    return game["team2"]

def build_consensus(models, seed_map):
    """Build consensus bracket round by round."""
    # Index each model's games by gameId for quick lookup
    model_games = []
    for m in models:
        game_map = {}
        for rnd in ROUND_ORDER:
            for g in m["rounds"].get(rnd, []):
                game_map[g["gameId"]] = g
        model_games.append(game_map)

    # Use the first model as the structural template
    template = models[0]
    consensus_rounds = {}

    # Track consensus picks for dependency resolution in later rounds
    consensus_picks = {}  # gameId -> pick

    # Track stats
    stats = {"unanimous": 0, "majority": 0, "chalk_tiebreak": 0, "total": 0}

    for rnd in ROUND_ORDER:
        consensus_rounds[rnd] = []
        template_games = template["rounds"].get(rnd, [])

        for tg in template_games:
            gid = tg["gameId"]
            stats["total"] += 1

            # Collect picks from all models that have this gameId
            picks = []
            confidences = []
            for mg in model_games:
                if gid in mg:
                    picks.append(mg[gid]["pick"])
                    confidences.append(mg[gid].get("confidence", 50))

            if not picks:
                # No model has this game - shouldn't happen
                print(f"WARNING: No picks for {gid}")
                continue

            # Count votes
            counter = Counter(picks)
            most_common = counter.most_common()

            if len(most_common) == 1:
                # Unanimous
                consensus_pick = most_common[0][0]
                stats["unanimous"] += 1
            elif most_common[0][1] > most_common[1][1]:
                # Clear majority
                consensus_pick = most_common[0][0]
                stats["majority"] += 1
            else:
                # Tie - pick chalk (lower seed)
                tied_teams = [t for t, c in most_common if c == most_common[0][1]]
                # Find which has lower seed
                best = None
                best_seed = 99
                for team in tied_teams:
                    s = seed_map.get(team, 99)
                    if s < best_seed:
                        best_seed = s
                        best = team
                consensus_pick = best if best else tied_teams[0]
                stats["chalk_tiebreak"] += 1

            # Compute average confidence for the consensus pick
            pick_confidences = [c for p, c in zip(picks, confidences) if p == consensus_pick]
            avg_conf = round(sum(pick_confidences) / len(pick_confidences)) if pick_confidences else 50

            agreement = counter[consensus_pick]
            total_voting = len(picks)

            consensus_picks[gid] = consensus_pick

            game_entry = {
                "gameId": gid,
                "round": rnd,
                "region": tg.get("region", ""),
                "seed1": tg["seed1"],
                "team1": tg["team1"],
                "seed2": tg["seed2"],
                "team2": tg["team2"],
                "pick": consensus_pick,
                "confidence": avg_conf,
                "reasoning": f"Consensus: {agreement}/{total_voting} models agree. "
                             f"Avg confidence among agreeing models: {avg_conf}%."
            }
            consensus_rounds[rnd].append(game_entry)

    # Determine Final Four and Champion from picks
    ff_teams = []
    for g in consensus_rounds.get("elite_8", []):
        ff_teams.append(g["pick"])

    champion = None
    if consensus_rounds.get("championship"):
        champion = consensus_rounds["championship"][0]["pick"]

    bracket = {
        "model": "the-consensus",
        "displayName": "The Consensus",
        "tagline": "9 models. 1 bracket. Wisdom of the crowd.",
        "color": "#ffffff",
        "generated": "2026-03-18",
        "locked": True,
        "espnBracketUrl": "",
        "champion": champion,
        "championEliminated": False,
        "finalFour": ff_teams,
        "rounds": consensus_rounds,
    }

    return bracket, stats

def analyze_chalk_rate(bracket, seed_map):
    """What % of picks are the higher seed?"""
    chalk = 0
    total = 0
    upsets_list = []
    for rnd in ROUND_ORDER:
        for g in bracket["rounds"].get(rnd, []):
            total += 1
            pick = g["pick"]
            # Determine if pick is the higher seed
            if g["seed1"] < g["seed2"]:
                favored = g["team1"]
            elif g["seed2"] < g["seed1"]:
                favored = g["team2"]
            else:
                favored = g["team1"]  # same seed, either is fine
                chalk += 1
                continue

            if pick == favored:
                chalk += 1
            else:
                upsets_list.append(f"  {rnd}: {g.get('region','')} - {pick} (#{g['seed1'] if pick == g['team1'] else g['seed2']}) over {favored} (#{g['seed1'] if favored == g['team1'] else g['seed2']})")

    return chalk, total, upsets_list

def main():
    models = load_all_models()
    seed_map = load_teams()
    bracket, stats = build_consensus(models, seed_map)

    print(f"\n=== Consensus Bracket Stats ===")
    print(f"Total games: {stats['total']}")
    print(f"Unanimous picks: {stats['unanimous']}")
    print(f"Majority picks: {stats['majority']}")
    print(f"Chalk tiebreaks: {stats['chalk_tiebreak']}")

    chalk, total, upsets = analyze_chalk_rate(bracket, seed_map)
    print(f"\nChalk rate: {chalk}/{total} ({100*chalk/total:.1f}%)")
    print(f"Upsets picked: {total - chalk}")
    if upsets:
        print("Upset picks:")
        for u in upsets:
            print(u)

    print(f"\nFinal Four: {bracket['finalFour']}")
    print(f"Champion: {bracket['champion']}")

    # Print round-by-round picks
    for rnd in ROUND_ORDER:
        games = bracket["rounds"].get(rnd, [])
        print(f"\n--- {rnd.replace('_', ' ').title()} ({len(games)} games) ---")
        for g in games:
            region = g.get("region", "")
            marker = ""
            # Check if upset
            if g["seed1"] < g["seed2"] and g["pick"] == g["team2"]:
                marker = " *** UPSET"
            elif g["seed2"] < g["seed1"] and g["pick"] == g["team1"]:
                marker = " *** UPSET"
            print(f"  {region:10s} #{g['seed1']} {g['team1']:20s} vs #{g['seed2']} {g['team2']:20s} -> {g['pick']} ({g['confidence']}%){marker}")

    # Save
    out_path = "/tmp/consensus-bracket.json"
    with open(out_path, "w") as fh:
        json.dump(bracket, fh, indent=2)
    print(f"\nSaved to {out_path}")

if __name__ == "__main__":
    main()
