"""
The Chaos Agent — Upset Detector Bracket Generator.
Uses upset vulnerability scoring from research data and historical seed upset
rates to flip picks from favorites to underdogs when threshold is exceeded.

The Chaos Agent is aggressive but not random. Every upset pick is backed by a
composite vulnerability score derived from efficiency gaps, shooting variance,
free throw pressure, momentum, and 40 years of seed matchup history.

Usage:
    python scripts/chaos.py --year 2024
    python scripts/chaos.py --year 2025
    python scripts/chaos.py --year 2026
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

# Set up paths (same pattern as scout_export_context.py)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Import shared utilities from scout_prime_agent
SCOUT_PRIME_SRC = os.path.join(PROJECT_ROOT, "scout_prime_agent", "src")
sys.path.insert(0, SCOUT_PRIME_SRC)
from utils import (
    get_r64_matchups, load_json, save_json, load_barttorvik,
    resolve_team_name, score_bracket, print_results, ROUND_ORDER,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ROUND_NAMES = [
    "round_of_64", "round_of_32", "sweet_16",
    "elite_8", "final_four", "championship",
]

ROUND_LABELS = {
    "round_of_64": "Round of 64",
    "round_of_32": "Round of 32",
    "sweet_16": "Sweet 16",
    "elite_8": "Elite 8",
    "final_four": "Final Four",
    "championship": "Championship",
}

# Upset thresholds by round.
# Each entry: (standard_threshold, lower_seed_line_threshold)
# Lower thresholds apply to 5v12, 6v11, 7v10 style matchups.
ROUND_THRESHOLDS = {
    "round_of_64": (55, 48),
    "round_of_32": (50, 42),
    "sweet_16":    (45, 38),
    "elite_8":     (40, 35),
    "final_four":  (35, 30),
    "championship": (35, 30),
}

# Seed matchup strings for which we NEVER pick an upset in R64
NEVER_UPSET_MATCHUPS = {"1v16", "2v15"}

# Seed matchup strings that get the lower threshold
LOWER_THRESHOLD_MATCHUPS = {"5v12", "6v11", "7v10"}

# ---------------------------------------------------------------------------
# Upset vulnerability scoring
# ---------------------------------------------------------------------------


def get_seed_matchup_key(seed_high, seed_low):
    """Return the canonical matchup string like '5v12'."""
    s1 = min(seed_high, seed_low)
    s2 = max(seed_high, seed_low)
    return f"{s1}v{s2}"


def lookup_seed_upset_rate(seed_matchup_key, seed_history):
    """Look up the historical upset rate for a seed matchup from seed-history.json."""
    for entry in seed_history.get("round_of_64_matchups", []):
        if entry.get("matchup") == seed_matchup_key:
            return entry.get("upset_rate", 0.0)
    return 0.0


def compute_upset_score(
    higher_seed, lower_seed,
    higher_seed_name, lower_seed_name,
    bt_data, seed_history, upset_factors,
    round_name="round_of_64",
):
    """
    Compute the upset vulnerability score (0-100) for a matchup.
    higher_seed = the favored team (lower seed number).
    lower_seed = the underdog (higher seed number).

    Returns (score, breakdown_dict) where breakdown_dict has per-factor details.
    """
    breakdown = {}

    # Resolve BartTorvik stats
    hs_bt_name = resolve_team_name(higher_seed_name, bt_data) if bt_data else None
    ls_bt_name = resolve_team_name(lower_seed_name, bt_data) if bt_data else None
    hs_stats = bt_data.get(hs_bt_name, {}) if hs_bt_name else {}
    ls_stats = bt_data.get(ls_bt_name, {}) if ls_bt_name else {}

    total_score = 0.0

    # --- Factor a: Seed line base rate (weight 0.30, max 30 pts) ---
    matchup_key = get_seed_matchup_key(higher_seed, lower_seed)
    upset_rate = lookup_seed_upset_rate(matchup_key, seed_history)
    # For later rounds, use a generic upset estimate based on seed gap
    if round_name != "round_of_64" or upset_rate == 0.0:
        seed_gap = abs(lower_seed - higher_seed)
        if seed_gap <= 1:
            upset_rate = 0.45
        elif seed_gap <= 3:
            upset_rate = 0.35
        elif seed_gap <= 5:
            upset_rate = 0.25
        elif seed_gap <= 8:
            upset_rate = 0.15
        else:
            upset_rate = 0.05
    factor_a = upset_rate * 100 * 0.30
    breakdown["seed_base_rate"] = {
        "upset_rate": round(upset_rate, 4),
        "contribution": round(factor_a, 2),
        "max": 30,
    }
    total_score += factor_a

    # --- Factor b: AdjEM gap (weight 0.25, max 25 pts) ---
    hs_em = hs_stats.get("adj_em", None)
    ls_em = ls_stats.get("adj_em", None)
    if hs_em is not None and ls_em is not None:
        gap = hs_em - ls_em
    else:
        # Default: assume moderate gap based on seed difference
        gap = (lower_seed - higher_seed) * 2.5

    if gap >= 20:
        factor_b = 0
    elif gap >= 10:
        factor_b = 5
    elif gap >= 5:
        factor_b = 12
    else:
        factor_b = 25

    breakdown["adjEM_gap"] = {
        "gap": round(gap, 2),
        "contribution": factor_b,
        "max": 25,
    }
    total_score += factor_b

    # --- Factor c: 3pt variance risk (weight 0.15, max 15 pts) ---
    threep = hs_stats.get("threep_pct", None)
    if threep is not None:
        if threep > 0.38:
            factor_c = 0
        elif threep >= 0.35:
            factor_c = 6
        elif threep >= 0.32:
            factor_c = 11
        else:
            factor_c = 15
    else:
        factor_c = 6  # default moderate risk when data missing

    breakdown["three_pt_variance"] = {
        "higher_seed_3pt_pct": round(threep, 4) if threep else None,
        "contribution": factor_c,
        "max": 15,
    }
    total_score += factor_c

    # --- Factor d: Close game performance (weight 0.12, max 12 pts) ---
    # Use WAB as proxy; fall back to barthag
    wab = hs_stats.get("wab", None)
    barthag = hs_stats.get("barthag", None)

    if wab is not None:
        # WAB ranges roughly from -10 to +10; high WAB = safe
        if wab >= 6:
            factor_d = 0
        elif wab >= 3:
            factor_d = 3
        elif wab >= 0:
            factor_d = 7
        else:
            factor_d = 12
    elif barthag is not None:
        if barthag >= 0.85:
            factor_d = 0
        elif barthag >= 0.75:
            factor_d = 3
        elif barthag >= 0.65:
            factor_d = 7
        else:
            factor_d = 12
    else:
        factor_d = 3  # default mild risk

    breakdown["close_game"] = {
        "wab": round(wab, 2) if wab is not None else None,
        "barthag": round(barthag, 4) if barthag is not None else None,
        "contribution": factor_d,
        "max": 12,
    }
    total_score += factor_d

    # --- Factor e: FT pressure (weight 0.08, max 8 pts) ---
    ft_pct = hs_stats.get("ft_pct", None)
    if ft_pct is not None:
        if ft_pct >= 0.75:
            factor_e = 0
        elif ft_pct >= 0.72:
            factor_e = 2
        elif ft_pct >= 0.68:
            factor_e = 5
        else:
            factor_e = 8
    else:
        factor_e = 2  # default mild risk

    breakdown["ft_pressure"] = {
        "ft_pct": round(ft_pct, 4) if ft_pct else None,
        "contribution": factor_e,
        "max": 8,
    }
    total_score += factor_e

    # --- Factor f: Momentum (weight 0.06, max 6 pts) ---
    ls_barthag = ls_stats.get("barthag", None)
    if ls_barthag is not None:
        if ls_barthag > 0.8:
            factor_f = 6
        elif ls_barthag > 0.7:
            factor_f = 3
        else:
            factor_f = 0
    else:
        factor_f = 0

    breakdown["momentum"] = {
        "lower_seed_barthag": round(ls_barthag, 4) if ls_barthag else None,
        "contribution": factor_f,
        "max": 6,
    }
    total_score += factor_f

    # --- Factor g: First tournament coach (weight 0.04, max 4 pts) ---
    factor_g = 0  # default — can't determine from BartTorvik data
    breakdown["first_tournament_coach"] = {
        "contribution": factor_g,
        "max": 4,
        "note": "Defaulted to 0 — coach metadata not available in BartTorvik data",
    }
    total_score += factor_g

    return round(total_score, 2), breakdown


# ---------------------------------------------------------------------------
# Decision logic
# ---------------------------------------------------------------------------


def should_pick_upset(
    higher_seed, lower_seed, upset_score,
    round_name="round_of_64",
):
    """
    Decide whether to pick the upset based on the upset score and thresholds.
    Returns (pick_upset: bool, threshold_used: int, reason: str).
    """
    matchup_key = get_seed_matchup_key(higher_seed, lower_seed)

    # NEVER upset for 1v16 or 2v15 in R64
    if round_name == "round_of_64" and matchup_key in NEVER_UPSET_MATCHUPS:
        return False, 999, "Never pick upset for this seed matchup"

    std_threshold, lower_threshold = ROUND_THRESHOLDS.get(
        round_name, (55, 48)
    )

    # Use lower threshold for upset-prone seed lines
    if matchup_key in LOWER_THRESHOLD_MATCHUPS:
        threshold = lower_threshold
    else:
        # For later rounds, check if seed gap is small (like 5v12 equivalent)
        seed_gap = abs(lower_seed - higher_seed)
        if round_name != "round_of_64" and seed_gap <= 4:
            threshold = lower_threshold
        else:
            threshold = std_threshold

    if upset_score > threshold:
        return True, threshold, f"Score {upset_score} > threshold {threshold}"
    else:
        return False, threshold, f"Score {upset_score} <= threshold {threshold}"


# ---------------------------------------------------------------------------
# Game formatting
# ---------------------------------------------------------------------------


def format_reasoning(
    is_upset, upset_score, threshold,
    higher_seed, lower_seed, higher_seed_name, lower_seed_name,
    breakdown, matchup_key, upset_rate,
):
    """Build the reasoning string for a game entry."""
    if is_upset:
        parts = [f"UPSET ALERT! Score: {upset_score}/100 (threshold: {threshold} for {matchup_key})."]
        details = []
        if breakdown["adjEM_gap"]["gap"] < 10:
            details.append(f"tight AdjEM gap ({breakdown['adjEM_gap']['gap']:.1f})")
        if breakdown["ft_pressure"]["ft_pct"] and breakdown["ft_pressure"]["ft_pct"] < 0.72:
            details.append(f"poor FT shooting ({breakdown['ft_pressure']['ft_pct']:.0%})")
        if breakdown["three_pt_variance"]["higher_seed_3pt_pct"] and breakdown["three_pt_variance"]["higher_seed_3pt_pct"] < 0.35:
            details.append(f"3pt variance risk ({breakdown['three_pt_variance']['higher_seed_3pt_pct']:.1%})")
        if breakdown["momentum"]["lower_seed_barthag"] and breakdown["momentum"]["lower_seed_barthag"] > 0.7:
            details.append(f"strong underdog (barthag {breakdown['momentum']['lower_seed_barthag']:.3f})")
        if upset_rate > 0.25:
            details.append(f"historical {lower_seed}-seed upset rate {upset_rate:.1%}")
        if details:
            parts.append("Key factors: " + ", ".join(details) + ".")
        return " ".join(parts)
    else:
        rate_str = f"{higher_seed}-seeds win {(1 - upset_rate):.1%} historically" if upset_rate > 0 else "chalk pick"
        return f"Upset score: {upset_score}/100. Below threshold ({threshold}). Chalk pick — {rate_str}."


def compute_confidence(is_upset, upset_score, higher_seed, lower_seed):
    """Compute confidence (50-99) for a pick."""
    if is_upset:
        # Higher upset score = more confident in the upset (but cap at 80)
        return min(80, max(52, int(50 + (upset_score - 45) * 0.6)))
    else:
        # Higher seed = more confident chalk
        seed_gap = lower_seed - higher_seed
        base = min(95, 60 + seed_gap * 3)
        # Reduce confidence if upset score is high but below threshold
        penalty = max(0, (upset_score - 30) * 0.3)
        return max(55, min(99, int(base - penalty)))


# ---------------------------------------------------------------------------
# Bracket generation — later rounds
# ---------------------------------------------------------------------------

REGION_ORDER_DEFAULT = ["South", "East", "Midwest", "West"]


def detect_region_order(r64_games):
    """Detect region ordering from R64 game IDs."""
    regions_seen = []
    for g in r64_games:
        r = g["region"]
        if r not in regions_seen:
            regions_seen.append(r)
    return regions_seen if len(regions_seen) == 4 else REGION_ORDER_DEFAULT


def pair_winners_for_next_round(prev_round_games, round_name, region_order):
    """
    Given the picks from a round, generate matchups for the next round.
    Returns list of matchup dicts with team1/seed1/team2/seed2/region/gameId.
    """
    if round_name == "round_of_32":
        # Pair consecutive R64 winners within each region
        matchups = []
        for region in region_order:
            region_games = [g for g in prev_round_games if g["region"] == region]
            # Sort by gameId to preserve bracket order
            region_games.sort(key=lambda g: g["gameId"])
            for i in range(0, len(region_games), 2):
                if i + 1 >= len(region_games):
                    break
                g1 = region_games[i]
                g2 = region_games[i + 1]
                w1_team, w1_seed = _get_winner(g1)
                w2_team, w2_seed = _get_winner(g2)
                n = (i // 2) + 1
                matchups.append({
                    "gameId": f"r32-{region.lower()}-{n}",
                    "round": "round_of_32",
                    "region": region,
                    "team1": w1_team, "seed1": w1_seed,
                    "team2": w2_team, "seed2": w2_seed,
                })
        return matchups

    elif round_name == "sweet_16":
        matchups = []
        for region in region_order:
            region_games = [g for g in prev_round_games if g["region"] == region]
            region_games.sort(key=lambda g: g["gameId"])
            for i in range(0, len(region_games), 2):
                if i + 1 >= len(region_games):
                    break
                g1 = region_games[i]
                g2 = region_games[i + 1]
                w1_team, w1_seed = _get_winner(g1)
                w2_team, w2_seed = _get_winner(g2)
                n = (i // 2) + 1
                matchups.append({
                    "gameId": f"s16-{region.lower()}-{n}",
                    "round": "sweet_16",
                    "region": region,
                    "team1": w1_team, "seed1": w1_seed,
                    "team2": w2_team, "seed2": w2_seed,
                })
        return matchups

    elif round_name == "elite_8":
        matchups = []
        for region in region_order:
            region_games = [g for g in prev_round_games if g["region"] == region]
            region_games.sort(key=lambda g: g["gameId"])
            if len(region_games) >= 2:
                g1, g2 = region_games[0], region_games[1]
                w1_team, w1_seed = _get_winner(g1)
                w2_team, w2_seed = _get_winner(g2)
                matchups.append({
                    "gameId": f"e8-{region.lower()}-1",
                    "round": "elite_8",
                    "region": region,
                    "team1": w1_team, "seed1": w1_seed,
                    "team2": w2_team, "seed2": w2_seed,
                })
        return matchups

    elif round_name == "final_four":
        # First two regions play each other, last two play each other
        region_winners = []
        for region in region_order:
            region_games = [g for g in prev_round_games if g["region"] == region]
            if region_games:
                w_team, w_seed = _get_winner(region_games[0])
                region_winners.append({
                    "team": w_team, "seed": w_seed, "region": region,
                })
        matchups = []
        if len(region_winners) >= 4:
            rw = region_winners
            matchups.append({
                "gameId": "f4-1",
                "round": "final_four",
                "region": f"{rw[0]['region']} / {rw[1]['region']}",
                "team1": rw[0]["team"], "seed1": rw[0]["seed"],
                "team2": rw[1]["team"], "seed2": rw[1]["seed"],
            })
            matchups.append({
                "gameId": "f4-2",
                "round": "final_four",
                "region": f"{rw[2]['region']} / {rw[3]['region']}",
                "team1": rw[2]["team"], "seed1": rw[2]["seed"],
                "team2": rw[3]["team"], "seed2": rw[3]["seed"],
            })
        return matchups

    elif round_name == "championship":
        if len(prev_round_games) >= 2:
            g1, g2 = prev_round_games[0], prev_round_games[1]
            w1_team, w1_seed = _get_winner(g1)
            w2_team, w2_seed = _get_winner(g2)
            return [{
                "gameId": "championship-1",
                "round": "championship",
                "region": "National",
                "team1": w1_team, "seed1": w1_seed,
                "team2": w2_team, "seed2": w2_seed,
            }]
        return []

    return []


def _get_winner(game):
    """Extract the picked winner and their seed from a game dict."""
    if game["pick"] == game["team1"]:
        return game["team1"], game["seed1"]
    else:
        return game["team2"], game["seed2"]


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------


def generate_bracket(year, bt_data, seed_history, upset_factors):
    """
    Generate a full Chaos Agent bracket for the given year.
    Returns the complete bracket dict.
    """
    print(f"\n{'='*60}")
    print(f"  THE CHAOS AGENT — BRACKET GENERATION ({year})")
    print(f"{'='*60}")

    # Step 1: Load R64 matchups
    print(f"\n1. Loading R64 matchups...")
    matchups, _ = get_r64_matchups(year)
    if not matchups:
        print(f"   ERROR: No R64 matchups found for {year}")
        return None
    print(f"   Found {len(matchups)} R64 matchups")

    # Detect region order
    region_order = detect_region_order(matchups)
    print(f"   Region order: {', '.join(region_order)}")

    # Track all rounds
    all_rounds = {}
    upset_summary = {}  # round -> list of upset picks

    # Process R64
    print(f"\n2. Processing Round of 64...")
    r64_games = process_round(
        matchups, "round_of_64", bt_data, seed_history, upset_factors
    )
    all_rounds["round_of_64"] = r64_games
    upset_summary["round_of_64"] = [g for g in r64_games if _is_upset_pick(g)]

    # Process subsequent rounds
    prev_games = r64_games
    round_sequence = [
        ("round_of_32", "round_of_32"),
        ("sweet_16", "sweet_16"),
        ("elite_8", "elite_8"),
        ("final_four", "final_four"),
        ("championship", "championship"),
    ]

    for round_name, next_round_name in round_sequence:
        print(f"\n   Processing {ROUND_LABELS[round_name]}...")
        next_matchups = pair_winners_for_next_round(
            prev_games, round_name, region_order
        )

        # Convert matchups to the format process_round expects
        matchup_dicts = []
        for m in next_matchups:
            matchup_dicts.append({
                "gameId": m["gameId"],
                "region": m["region"],
                "team1": m["team1"],
                "seed1": m["seed1"],
                "team2": m["team2"],
                "seed2": m["seed2"],
            })

        round_games = process_round(
            matchup_dicts, round_name, bt_data, seed_history, upset_factors
        )
        all_rounds[round_name] = round_games
        upset_summary[round_name] = [g for g in round_games if _is_upset_pick(g)]
        prev_games = round_games

    # Determine champion and Final Four
    champ_game = all_rounds["championship"][0] if all_rounds.get("championship") else None
    champion = champ_game["pick"] if champ_game else "TBD"

    final_four_teams = []
    for g in all_rounds.get("final_four", []):
        final_four_teams.append(g["team1"])
        final_four_teams.append(g["team2"])

    # Build output
    bracket = {
        "model": "the-chaos-agent",
        "displayName": "The Chaos Agent",
        "tagline": "Your bracket is too safe. This one isn't.",
        "color": "#ef4444",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "locked": True,
        "espnBracketUrl": None,
        "champion": champion,
        "championEliminated": False,
        "finalFour": final_four_teams,
        "rounds": all_rounds,
    }

    # Print upset summary
    print_upset_summary(upset_summary)

    return bracket


def _is_upset_pick(game):
    """Check if a game pick is an upset (lower seed picked)."""
    pick = game["pick"]
    if pick == game["team1"]:
        pick_seed = game["seed1"]
    else:
        pick_seed = game["seed2"]
    fav_seed = min(game["seed1"], game["seed2"])
    return pick_seed > fav_seed


def process_round(matchups, round_name, bt_data, seed_history, upset_factors):
    """
    Process all matchups in a round, computing upset scores and making picks.
    Returns list of game dicts with picks.
    """
    games = []
    for m in matchups:
        team1 = m["team1"]
        team2 = m["team2"]
        seed1 = m["seed1"]
        seed2 = m["seed2"]
        region = m["region"]
        game_id = m["gameId"]

        # Determine higher seed (favorite) and lower seed (underdog)
        if seed1 <= seed2:
            higher_seed, higher_name = seed1, team1
            lower_seed, lower_name = seed2, team2
        else:
            higher_seed, higher_name = seed2, team2
            lower_seed, lower_name = seed1, team1

        # Compute upset vulnerability score
        upset_score, breakdown = compute_upset_score(
            higher_seed, lower_seed,
            higher_name, lower_name,
            bt_data, seed_history, upset_factors,
            round_name,
        )

        # Decide whether to pick the upset
        pick_upset, threshold, reason = should_pick_upset(
            higher_seed, lower_seed, upset_score, round_name,
        )

        matchup_key = get_seed_matchup_key(higher_seed, lower_seed)
        upset_rate = lookup_seed_upset_rate(matchup_key, seed_history)

        if pick_upset:
            pick = lower_name
        else:
            pick = higher_name

        confidence = compute_confidence(pick_upset, upset_score, higher_seed, lower_seed)
        reasoning = format_reasoning(
            pick_upset, upset_score, threshold,
            higher_seed, lower_seed, higher_name, lower_name,
            breakdown, matchup_key, upset_rate,
        )

        # Print to stdout
        upset_marker = " *** UPSET ***" if pick_upset else ""
        print(f"   [{game_id}] ({seed1}) {team1} vs ({seed2}) {team2}"
              f"  |  Score: {upset_score}/100 (thr: {threshold})"
              f"  |  Pick: {pick}{upset_marker}")

        game = {
            "gameId": game_id,
            "round": round_name,
            "region": region,
            "seed1": seed1,
            "team1": team1,
            "seed2": seed2,
            "team2": team2,
            "pick": pick,
            "confidence": confidence,
            "reasoning": reasoning,
        }
        games.append(game)

    return games


def print_upset_summary(upset_summary):
    """Print a summary of all upset picks."""
    print(f"\n{'='*60}")
    print(f"  UPSET SUMMARY")
    print(f"{'='*60}")

    total_upsets = 0
    for round_name in ROUND_NAMES:
        upsets = upset_summary.get(round_name, [])
        total_upsets += len(upsets)
        if upsets:
            print(f"\n  {ROUND_LABELS[round_name]} ({len(upsets)} upset(s)):")
            for g in upsets:
                pick = g["pick"]
                if pick == g["team1"]:
                    pick_seed = g["seed1"]
                    opp = g["team2"]
                    opp_seed = g["seed2"]
                else:
                    pick_seed = g["seed2"]
                    opp = g["team1"]
                    opp_seed = g["seed1"]
                print(f"    ({pick_seed}) {pick} over ({opp_seed}) {opp}")
        else:
            print(f"\n  {ROUND_LABELS[round_name]}: No upsets")

    print(f"\n  Total upsets picked: {total_upsets}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="The Chaos Agent — Upset Detector Bracket Generator"
    )
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    args = parser.parse_args()
    year = args.year

    # Load data
    print(f"\nLoading data for {year}...")

    # BartTorvik stats
    bt_data = load_barttorvik(year)
    if bt_data:
        print(f"  Loaded BartTorvik stats for {len(bt_data)} teams")
    else:
        print(f"  WARNING: No BartTorvik data — defaulting to chalk for missing stats")

    # Seed history
    seed_history_path = os.path.join(DATA_DIR, "research", "seed-history.json")
    seed_history = load_json(seed_history_path)
    print(f"  Loaded seed history ({len(seed_history.get('round_of_64_matchups', []))} matchup types)")

    # Upset factors
    upset_factors_path = os.path.join(DATA_DIR, "research", "upset-factors.json")
    upset_factors = load_json(upset_factors_path)
    print(f"  Loaded upset factors ({len(upset_factors.get('factors', {}))} factors)")

    # Generate bracket
    bracket = generate_bracket(year, bt_data, seed_history, upset_factors)
    if not bracket:
        print("ERROR: Failed to generate bracket")
        sys.exit(1)

    # Determine output path
    if year >= 2026:
        output_path = os.path.join(DATA_DIR, "models", "the-chaos-agent.json")
    else:
        output_path = os.path.join(
            DATA_DIR, "archive", str(year), "models", "the-chaos-agent.json"
        )

    save_json(bracket, output_path)
    print(f"\n  Champion: {bracket['champion']}")
    print(f"  Final Four: {', '.join(bracket['finalFour'])}")

    # Score against actual results
    print(f"\n  Scoring against actual results...")
    espn_result, espn_pct = score_bracket(bracket["rounds"], year)
    if espn_result:
        results_by_year = {year: (espn_result, espn_pct)}
        print_results("The Chaos Agent", results_by_year)
    else:
        print(f"  No actual results available for {year} — skipping scoring")


if __name__ == "__main__":
    main()
