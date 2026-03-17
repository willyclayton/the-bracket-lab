"""
Step 3: Build per-game data packets (matchup contexts).
Combines enriched team profiles, historical archetypes, seed matchup history,
and upset vulnerability scores into a single context packet per game.

These packets are what get fed to the LLM for each matchup prediction.

Usage:
    python scout_prime_agent/src/build_matchup_contexts.py --year 2024 --round round_of_64
    python scout_prime_agent/src/build_matchup_contexts.py --year 2024 --round all
"""

import os
import sys
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    get_r64_matchups, load_json, save_json,
    RESEARCH_DIR, DATA_DIR, PROJECT_ROOT,
)


def load_seed_history():
    """Load seed matchup history from data/research/seed-history.json."""
    filepath = os.path.join(DATA_DIR, "research", "seed-history.json")
    if os.path.exists(filepath):
        return load_json(filepath)
    return {}


def load_upset_factors():
    """Load upset vulnerability factors from data/research/upset-factors.json."""
    filepath = os.path.join(DATA_DIR, "research", "upset-factors.json")
    if os.path.exists(filepath):
        return load_json(filepath)
    return {}


def load_intangibles(year):
    """Load intangibles intel from data/research/intangibles_YYYY.json."""
    filepath = os.path.join(DATA_DIR, "research", f"intangibles_{year}.json")
    if os.path.exists(filepath):
        data = load_json(filepath)
        return data.get("teams", {})
    return {}


def compute_upset_vulnerability(team1_stats, team2_stats, seed1, seed2, upset_factors):
    """
    Compute upset vulnerability score for a matchup.
    Higher score = more likely upset. Range [0, 1].
    Only meaningful when seed1 < seed2 (team1 is favored).
    """
    if seed1 >= seed2:
        # team2 is favored or equal seeds; flip perspective
        seed1, seed2 = seed2, seed1
        team1_stats, team2_stats = team2_stats, team1_stats

    if not team1_stats or not team2_stats:
        return 0.5  # Unknown

    score = 0.0
    factors = 0

    # Factor 1: Small efficiency gap (underdog within striking distance)
    em1 = team1_stats.get("adj_em", 0)
    em2 = team2_stats.get("adj_em", 0)
    gap = em1 - em2
    if gap < 5:
        score += 0.8  # Very close
    elif gap < 10:
        score += 0.5  # Moderate gap
    elif gap < 15:
        score += 0.2  # Large gap
    else:
        score += 0.0  # Dominant favorite
    factors += 1

    # Factor 2: 3-point variance (teams that rely on 3s are volatile)
    threep_rate1 = team1_stats.get("threep_rate", 0)
    if threep_rate1 and threep_rate1 > 40:
        score += 0.3  # Favorite is 3-dependent
    factors += 1

    # Factor 3: Tempo mismatch (underdog can control pace)
    tempo1 = team1_stats.get("tempo", 0)
    tempo2 = team2_stats.get("tempo", 0)
    if tempo1 and tempo2 and abs(tempo1 - tempo2) > 6:
        score += 0.2  # Pace disruption possible
    factors += 1

    # Factor 4: Seed pairing history
    seed_key = f"{min(seed1, seed2)}_vs_{max(seed1, seed2)}"
    if upset_factors and seed_key in upset_factors:
        hist_upset_rate = upset_factors[seed_key].get("upset_rate", 0)
        score += hist_upset_rate * 0.5
    factors += 1

    # Factor 5: Turnover vulnerability
    tov1 = team1_stats.get("tov_pct", 0)
    if tov1 and tov1 > 18:
        score += 0.2  # Favorite turns it over
    factors += 1

    return round(min(score / factors, 1.0), 3) if factors > 0 else 0.5


def get_seed_matchup_info(seed1, seed2, seed_history):
    """Get historical context for a specific seed matchup."""
    if not seed_history:
        return None

    # Try both orderings
    key1 = f"{seed1}_vs_{seed2}"
    key2 = f"{seed2}_vs_{seed1}"

    for key in [key1, key2]:
        if key in seed_history:
            return seed_history[key]

    # Try as nested dict
    if isinstance(seed_history, dict):
        for matchup_type, data in seed_history.items():
            if isinstance(data, dict):
                s1 = data.get("seed1")
                s2 = data.get("seed2")
                if (s1 == seed1 and s2 == seed2) or (s1 == seed2 and s2 == seed1):
                    return data

    return None


def build_r64_contexts(year):
    """Build matchup context packets for all R64 games."""
    # Load all research data
    enriched_path = os.path.join(RESEARCH_DIR, f"teams_enriched_{year}.json")
    archetypes_path = os.path.join(RESEARCH_DIR, f"historical_archetypes_{year}.json")

    if not os.path.exists(enriched_path):
        print(f"  ERROR: Run enrich_teams.py first — {enriched_path} not found")
        return []

    enriched = load_json(enriched_path)
    archetypes = load_json(archetypes_path) if os.path.exists(archetypes_path) else {}
    seed_history = load_seed_history()
    upset_factors = load_upset_factors()
    intangibles = load_intangibles(year)
    if intangibles:
        print(f"  Loaded intangibles for {len(intangibles)} teams")

    # Get R64 matchups
    matchups, _ = get_r64_matchups(year)
    if not matchups:
        print(f"  ERROR: No R64 matchups for {year}")
        return []

    # Build context for each game
    contexts = []
    for m in matchups:
        team1 = m["team1"]
        team2 = m["team2"]
        seed1 = m["seed1"]
        seed2 = m["seed2"]

        stats1 = enriched.get(team1, {})
        stats2 = enriched.get(team2, {})
        arch1 = archetypes.get(team1, [])
        arch2 = archetypes.get(team2, [])
        seed_info = get_seed_matchup_info(seed1, seed2, seed_history)
        upset_score = compute_upset_vulnerability(stats1, stats2, seed1, seed2, upset_factors)

        context = {
            "gameId": m["gameId"],
            "round": "round_of_64",
            "region": m["region"],
            "team1": team1,
            "seed1": seed1,
            "team2": team2,
            "seed2": seed2,
            "team1_stats": stats1,
            "team2_stats": stats2,
            "team1_archetypes": arch1,
            "team2_archetypes": arch2,
            "seed_matchup_history": seed_info,
            "upset_vulnerability": upset_score,
        }
        contexts.append(context)

    return contexts


def build_later_round_contexts(year, round_name, winners_from_prev, enriched, archetypes,
                               seed_history, upset_factors, bracket_so_far):
    """
    Build matchup contexts for rounds after R64.
    winners_from_prev: dict of {gameId: {"team": name, "seed": seed, "confidence": N, "reasoning": str}}
    bracket_so_far: list of all games picked so far (for "how they got here")
    """
    contexts = []

    # Determine matchup pairings based on bracket structure
    # This maps how winners from previous round pair up
    # The pairing logic depends on the round and region
    if round_name == "round_of_32":
        # R32: pair adjacent R64 winners
        r64_games = [g for g in bracket_so_far if g["round"] == "round_of_64"]
        regions = {}
        for g in r64_games:
            region = g["region"]
            if region not in regions:
                regions[region] = []
            regions[region].append(g)

        for region, games in regions.items():
            games.sort(key=lambda g: g["gameId"])
            for i in range(0, len(games), 2):
                if i + 1 < len(games):
                    g1 = games[i]
                    g2 = games[i + 1]
                    w1_name = g1["pick"]
                    w2_name = g2["pick"]
                    w1_seed = g1["seed1"] if g1["pick"] == g1["team1"] else g1["seed2"]
                    w2_seed = g2["seed1"] if g2["pick"] == g2["team1"] else g2["seed2"]

                    game_id = f"r32-{region.lower()}-{i//2 + 1}"
                    contexts.append(_build_context(
                        game_id, round_name, region,
                        w1_name, w1_seed, w2_name, w2_seed,
                        enriched, archetypes, seed_history, upset_factors,
                        bracket_so_far
                    ))

    elif round_name == "sweet_16":
        r32_games = [g for g in bracket_so_far if g["round"] == "round_of_32"]
        regions = {}
        for g in r32_games:
            region = g["region"]
            if region not in regions:
                regions[region] = []
            regions[region].append(g)

        for region, games in regions.items():
            games.sort(key=lambda g: g["gameId"])
            for i in range(0, len(games), 2):
                if i + 1 < len(games):
                    g1 = games[i]
                    g2 = games[i + 1]
                    w1_name = g1["pick"]
                    w2_name = g2["pick"]
                    w1_seed = g1["seed1"] if g1["pick"] == g1["team1"] else g1["seed2"]
                    w2_seed = g2["seed1"] if g2["pick"] == g2["team1"] else g2["seed2"]

                    game_id = f"s16-{region.lower()}-{i//2 + 1}"
                    contexts.append(_build_context(
                        game_id, round_name, region,
                        w1_name, w1_seed, w2_name, w2_seed,
                        enriched, archetypes, seed_history, upset_factors,
                        bracket_so_far
                    ))

    elif round_name == "elite_8":
        s16_games = [g for g in bracket_so_far if g["round"] == "sweet_16"]
        regions = {}
        for g in s16_games:
            region = g["region"]
            if region not in regions:
                regions[region] = []
            regions[region].append(g)

        for region, games in regions.items():
            games.sort(key=lambda g: g["gameId"])
            if len(games) >= 2:
                g1 = games[0]
                g2 = games[1]
                w1_name = g1["pick"]
                w2_name = g2["pick"]
                w1_seed = g1["seed1"] if g1["pick"] == g1["team1"] else g1["seed2"]
                w2_seed = g2["seed1"] if g2["pick"] == g2["team1"] else g2["seed2"]

                game_id = f"e8-{region.lower()}"
                contexts.append(_build_context(
                    game_id, round_name, region,
                    w1_name, w1_seed, w2_name, w2_seed,
                    enriched, archetypes, seed_history, upset_factors,
                    bracket_so_far
                ))

    elif round_name == "final_four":
        e8_games = [g for g in bracket_so_far if g["round"] == "elite_8"]
        # F4 pairings: South vs East, West vs Midwest (2026)
        region_winners = {}
        for g in e8_games:
            region_winners[g["region"]] = {
                "team": g["pick"],
                "seed": g["seed1"] if g["pick"] == g["team1"] else g["seed2"],
            }

        f4_pairings = [("South", "East"), ("West", "Midwest")]
        for r1, r2 in f4_pairings:
            if r1 in region_winners and r2 in region_winners:
                w1 = region_winners[r1]
                w2 = region_winners[r2]
                game_id = f"f4-{r1.lower()}-{r2.lower()}"
                contexts.append(_build_context(
                    game_id, round_name, "National",
                    w1["team"], w1["seed"], w2["team"], w2["seed"],
                    enriched, archetypes, seed_history, upset_factors,
                    bracket_so_far
                ))

    elif round_name == "championship":
        f4_games = [g for g in bracket_so_far if g["round"] == "final_four"]
        if len(f4_games) >= 2:
            f4_games.sort(key=lambda g: g["gameId"])
            g1 = f4_games[0]
            g2 = f4_games[1]
            w1_name = g1["pick"]
            w2_name = g2["pick"]
            w1_seed = g1["seed1"] if g1["pick"] == g1["team1"] else g1["seed2"]
            w2_seed = g2["seed1"] if g2["pick"] == g2["team1"] else g2["seed2"]

            contexts.append(_build_context(
                "championship", round_name, "National",
                w1_name, w1_seed, w2_name, w2_seed,
                enriched, archetypes, seed_history, upset_factors,
                bracket_so_far
            ))

    return contexts


def _build_context(game_id, round_name, region, team1, seed1, team2, seed2,
                   enriched, archetypes, seed_history, upset_factors, bracket_so_far):
    """Build a single matchup context packet."""
    stats1 = enriched.get(team1, {})
    stats2 = enriched.get(team2, {})
    arch1 = archetypes.get(team1, [])
    arch2 = archetypes.get(team2, [])
    seed_info = get_seed_matchup_info(seed1, seed2, seed_history)
    upset_score = compute_upset_vulnerability(stats1, stats2, seed1, seed2, upset_factors)

    # Build "how they got here" for post-R64 rounds
    how_they_got_here = None
    if round_name != "round_of_64" and bracket_so_far:
        victories1 = _get_victories(team1, bracket_so_far)
        victories2 = _get_victories(team2, bracket_so_far)
        if victories1 or victories2:
            how_they_got_here = {
                team1: victories1,
                team2: victories2,
            }

    return {
        "gameId": game_id,
        "round": round_name,
        "region": region,
        "team1": team1,
        "seed1": seed1,
        "team2": team2,
        "seed2": seed2,
        "team1_stats": stats1,
        "team2_stats": stats2,
        "team1_archetypes": arch1,
        "team2_archetypes": arch2,
        "seed_matchup_history": seed_info,
        "upset_vulnerability": upset_score,
        "how_they_got_here": how_they_got_here,
    }


def _get_victories(team_name, bracket_so_far):
    """Get list of teams a team has beaten so far in the bracket."""
    victories = []
    for game in bracket_so_far:
        if game["pick"] == team_name:
            opponent = game["team2"] if game["team1"] == team_name else game["team1"]
            opp_seed = game["seed2"] if game["team1"] == team_name else game["seed1"]
            victories.append({
                "round": game["round"],
                "opponent": opponent,
                "opponent_seed": opp_seed,
                "confidence": game.get("confidence", 0),
            })
    return victories


def main():
    parser = argparse.ArgumentParser(description="Build matchup contexts for Scout Prime")
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    parser.add_argument("--round", default="round_of_64", help="Round to build contexts for (or 'all')")
    args = parser.parse_args()
    year = args.year

    print("=" * 60)
    print(f"  BUILDING MATCHUP CONTEXTS — {year}")
    print("=" * 60)

    if args.round == "all" or args.round == "round_of_64":
        print(f"\n  Building R64 contexts...")
        contexts = build_r64_contexts(year)
        output_path = os.path.join(RESEARCH_DIR, "matchup_contexts", f"r64_{year}.json")
        save_json(contexts, output_path)
        print(f"  Built {len(contexts)} R64 matchup contexts")

        # Summary
        high_upset = [c for c in contexts if c["upset_vulnerability"] >= 0.6]
        if high_upset:
            print(f"\n  High upset vulnerability games ({len(high_upset)}):")
            for c in sorted(high_upset, key=lambda x: x["upset_vulnerability"], reverse=True):
                print(f"    {c['seed1']}-{c['team1']} vs {c['seed2']}-{c['team2']} "
                      f"(vulnerability: {c['upset_vulnerability']:.3f})")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
