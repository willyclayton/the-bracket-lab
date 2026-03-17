"""
The Historian — Archetype Matching Bracket Generator.
Finds the closest historical twin for each tournament team and predicts
based on that twin's actual tournament result.

"Every team has a twin. History already played this game."

Usage:
    python scripts/historian.py --year 2024
    python scripts/historian.py --year 2025
    python scripts/historian.py --year 2026
"""

import os
import sys
import math
import argparse
from datetime import datetime, timezone

# Set up paths
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

HISTORICAL_PATH = os.path.join(DATA_DIR, "research", "historical-teams.json")

# Fields used for the 10-dimension similarity vector, in order
VECTOR_FIELDS = [
    "adjO", "adjD", "adjEM", "tempo", "barthag",
    "sos", "three_pt_rate", "three_pt_pct", "ft_pct",
    "conference_strength_score",
]

# BartTorvik CSV column name -> historical-teams.json field name
BT_FIELD_MAP = {
    "adj_o":        "adjO",
    "adj_d":        "adjD",
    "adj_em":       "adjEM",
    "tempo":        "tempo",
    "barthag":      "barthag",
    "elite_sos":    "sos",
    "threep_rate":  "three_pt_rate",
    "threep_pct":   "three_pt_pct",
    "ft_pct":       "ft_pct",
}

# Conference strength scores (rough tiers)
CONFERENCE_STRENGTH = {
    # Power conferences (85-95)
    "Big 12":  95,
    "SEC":     93,
    "Big Ten": 92,
    "ACC":     88,
    "Big East": 87,
    "Pac-12":  86,
    "Pac 12":  86,
    # Upper mid-majors (70-84)
    "AAC":        75,
    "Mountain West": 73,
    "MWC":        73,
    "WCC":        72,
    "A-10":       70,
    "Atlantic 10": 70,
    "Missouri Valley": 68,
    "MVC":        68,
    # Mid-majors (50-69)
    "C-USA":      62,
    "Conference USA": 62,
    "Sun Belt":   60,
    "MAC":        58,
    "WAC":        55,
    "Ivy":        55,
    "Ivy League": 55,
    "CAA":        57,
    "Colonial":   57,
    "Southern":   54,
    "SoCon":      54,
    "Horizon":    53,
    "Horizon League": 53,
    "Summit":     50,
    "Summit League": 50,
    "OVC":        50,
    "Ohio Valley": 50,
    "Patriot":    50,
    "Patriot League": 50,
    "Big West":   52,
    "MAAC":       51,
    "America East": 48,
    "AEC":        48,
    "Atlantic Sun": 48,
    "ASUN":       55,
    "Big Sky":    48,
    "Big South":  46,
    "Southland":  45,
    "NEC":        44,
    "Northeast":  44,
    # Small conferences (30-49)
    "SWAC":       38,
    "MEAC":       36,
    "WAC":        55,
    "Independents": 50,
}
# Default for unknown conferences
DEFAULT_CONFERENCE_STRENGTH = 50

# Round display labels
ROUND_LABELS = {
    "round_of_64": "Round of 64",
    "round_of_32": "Round of 32",
    "sweet_16":    "Sweet 16",
    "elite_8":     "Elite 8",
    "final_four":  "Final Four",
    "championship": "Championship",
}

# Region order for Final Four pairing — 2026 NCAA bracket pairs South vs East, West vs Midwest
# (regions[0] vs regions[1], regions[2] vs regions[3])
STANDARD_REGION_ORDER = ["South", "East", "West", "Midwest"]


# ---------------------------------------------------------------------------
# Similarity Engine
# ---------------------------------------------------------------------------

def extract_team_vector(hist_team):
    """Extract the raw (un-normalized) 10-field vector from a historical team entry."""
    vec = []
    for field in VECTOR_FIELDS:
        if field in ("adjO", "adjD", "adjEM", "tempo", "barthag", "sos"):
            val = hist_team.get("efficiency", {}).get(field)
        elif field in ("three_pt_rate", "three_pt_pct", "ft_pct"):
            val = hist_team.get("shooting", {}).get(field)
        elif field == "conference_strength_score":
            val = hist_team.get("conference_strength_score")
        else:
            val = None
        vec.append(val)
    return vec


def compute_normalization_ranges(historical_teams):
    """Compute min/max for each of the 10 fields from the historical database."""
    mins = [float("inf")] * len(VECTOR_FIELDS)
    maxs = [float("-inf")] * len(VECTOR_FIELDS)

    for team in historical_teams:
        vec = extract_team_vector(team)
        for i, val in enumerate(vec):
            if val is not None:
                mins[i] = min(mins[i], val)
                maxs[i] = max(maxs[i], val)

    return mins, maxs


def normalize_vector(raw_vec, mins, maxs):
    """Min-max normalize a raw vector using precomputed ranges."""
    normed = []
    for i, val in enumerate(raw_vec):
        if val is None:
            normed.append(0.5)  # neutral default for missing data
        elif maxs[i] == mins[i]:
            normed.append(0.5)
        else:
            normed.append((val - mins[i]) / (maxs[i] - mins[i]))
    return normed


def cosine_similarity(vec_a, vec_b):
    """Compute cosine similarity between two vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def build_team_vector_from_barttorvik(bt_stats, conference):
    """Build a raw 10-field vector from BartTorvik stats + conference name."""
    raw = []
    for field in VECTOR_FIELDS:
        if field == "conference_strength_score":
            raw.append(CONFERENCE_STRENGTH.get(conference, DEFAULT_CONFERENCE_STRENGTH))
        else:
            bt_key = None
            for bk, hf in BT_FIELD_MAP.items():
                if hf == field:
                    bt_key = bk
                    break
            if bt_key and bt_key in bt_stats:
                raw.append(bt_stats[bt_key])
            else:
                raw.append(None)
    return raw


def find_top_twins(team_norm_vec, historical_teams, prediction_year, n=3):
    """
    Find the top N historical twins for a team, excluding teams from the
    prediction year. Returns list of (similarity, historical_team_entry).
    """
    candidates = []
    for ht in historical_teams:
        if ht["year"] == prediction_year:
            continue
        hist_vec = []
        sv = ht.get("similarity_vector", {})
        for field in VECTOR_FIELDS:
            norm_key = field + "_norm"
            # conference_strength uses conference_strength_norm
            if field == "conference_strength_score":
                norm_key = "conference_strength_norm"
            hist_vec.append(sv.get(norm_key, 0.5))

        sim = cosine_similarity(team_norm_vec, hist_vec)
        candidates.append((sim, ht))

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[:n]


# ---------------------------------------------------------------------------
# Bracket Logic
# ---------------------------------------------------------------------------

def get_conference_for_team(team_name, teams_meta):
    """Look up a team's conference from teams.json metadata."""
    meta = teams_meta.get(team_name, {})
    return meta.get("conference", "Unknown")


def pick_winner(team_a, team_b):
    """
    Pick a winner between two teams based on their historical twin data.
    team_a and team_b are dicts with keys: name, seed, twins, adj_em, region.
    Returns (winner_dict, loser_dict, confidence, reasoning).
    """
    a_best_rw = max(t[1]["rounds_won"] for t in team_a["twins"]) if team_a["twins"] else 0
    b_best_rw = max(t[1]["rounds_won"] for t in team_b["twins"]) if team_b["twins"] else 0

    a_best_sim = team_a["twins"][0][0] if team_a["twins"] else 0
    b_best_sim = team_b["twins"][0][0] if team_b["twins"] else 0

    # Primary: best twin's rounds_won
    if a_best_rw > b_best_rw:
        winner, loser = team_a, team_b
    elif b_best_rw > a_best_rw:
        winner, loser = team_b, team_a
    else:
        # Tiebreak: AdjEM (higher is better), then seed (lower is better)
        a_em = team_a.get("adj_em", 0) or 0
        b_em = team_b.get("adj_em", 0) or 0
        if a_em > b_em:
            winner, loser = team_a, team_b
        elif b_em > a_em:
            winner, loser = team_b, team_a
        else:
            # Final tiebreak: lower seed wins
            winner, loser = (team_a, team_b) if team_a["seed"] <= team_b["seed"] else (team_b, team_a)

    # Build confidence (50-99 scale)
    rw_diff = abs(a_best_rw - b_best_rw)
    if rw_diff >= 4:
        confidence = 92
    elif rw_diff >= 3:
        confidence = 85
    elif rw_diff >= 2:
        confidence = 78
    elif rw_diff >= 1:
        confidence = 68
    else:
        # Tiebreaker was used
        em_diff = abs((team_a.get("adj_em", 0) or 0) - (team_b.get("adj_em", 0) or 0))
        confidence = min(65, 50 + int(em_diff))

    confidence = max(50, min(99, confidence))

    # Build reasoning
    w_twin = winner["twins"][0] if winner["twins"] else None
    l_twin = loser["twins"][0] if loser["twins"] else None

    w_twin_desc = ""
    if w_twin:
        ht = w_twin[1]
        w_twin_desc = (
            f"{winner['name']} profiles like {ht['year']} {ht['team']} "
            f"(similarity: {w_twin[0]:.2f}, {ht['tournament_result']})"
        )

    l_twin_desc = ""
    if l_twin:
        ht = l_twin[1]
        l_twin_desc = (
            f"{loser['name']} profiles like {ht['year']} {ht['team']} "
            f"(similarity: {l_twin[0]:.2f}, {ht['tournament_result']})"
        )

    parts = [p for p in [w_twin_desc, l_twin_desc] if p]
    reasoning = ". ".join(parts) + "." if parts else "Picked by seed/efficiency tiebreak."

    return winner, loser, confidence, reasoning


def simulate_round(matchups, round_name, round_prefix, region_game_counters=None):
    """
    Simulate a round of the tournament.
    matchups: list of (team_a_dict, team_b_dict) tuples
    round_name: e.g. "round_of_64"
    round_prefix: e.g. "r64"
    region_game_counters: dict tracking game number per region (for gameId construction)

    Returns (games_list, winners_list)
    """
    if region_game_counters is None:
        region_game_counters = {}

    games = []
    winners = []

    for team_a, team_b in matchups:
        winner, loser, confidence, reasoning = pick_winner(team_a, team_b)

        # Determine gameId
        if round_name == "final_four":
            # Use region pairing style: f4-{regionA}-{regionB} (lowercased)
            r1 = team_a["region"].lower()
            r2 = team_b["region"].lower()
            game_id = f"f4-{r1}-{r2}"
            region_display = "National"
        elif round_name == "championship":
            game_id = "championship"
            region_display = "National"
        elif round_name == "elite_8":
            # e8-{region}
            region = team_a["region"]
            game_id = f"e8-{region.lower()}"
            region_display = region
        else:
            # r64, r32, s16: {prefix}-{region}-{n}
            region = team_a["region"]
            key = region.lower()
            if key not in region_game_counters:
                region_game_counters[key] = 0
            region_game_counters[key] += 1
            n = region_game_counters[key]
            game_id = f"{round_prefix}-{key}-{n}"
            region_display = region

        game = {
            "gameId": game_id,
            "round": round_name,
            "region": region_display,
            "seed1": team_a["seed"],
            "team1": team_a["name"],
            "seed2": team_b["seed"],
            "team2": team_b["name"],
            "pick": winner["name"],
            "confidence": confidence,
            "reasoning": reasoning,
        }
        games.append(game)

        # Winner inherits region for bracket tracking
        winner_copy = dict(winner)
        winners.append(winner_copy)

    return games, winners


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="The Historian — Archetype Matching Bracket Generator"
    )
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    args = parser.parse_args()

    year = args.year
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    print("=" * 60)
    print(f"  THE HISTORIAN — ARCHETYPE MATCHING ({year})")
    print("=" * 60)

    # -----------------------------------------------------------------------
    # 1. Load R64 matchups
    # -----------------------------------------------------------------------
    print(f"\n1. Loading R64 matchups...")
    matchups, _ = get_r64_matchups(year)
    if not matchups:
        print(f"   ERROR: No R64 matchups found for {year}")
        sys.exit(1)
    print(f"   Found {len(matchups)} R64 matchups")

    # -----------------------------------------------------------------------
    # 2. Load BartTorvik stats
    # -----------------------------------------------------------------------
    print(f"\n2. Loading BartTorvik stats for {year}...")
    bt_data = load_barttorvik(year)
    if bt_data:
        print(f"   Loaded stats for {len(bt_data)} teams")
    else:
        print(f"   WARNING: No BartTorvik data — will use seed-based fallbacks")

    # -----------------------------------------------------------------------
    # 3. Load historical teams
    # -----------------------------------------------------------------------
    print(f"\n3. Loading historical teams database...")
    if not os.path.exists(HISTORICAL_PATH):
        print(f"   ERROR: historical-teams.json not found at {HISTORICAL_PATH}")
        sys.exit(1)

    hist_data = load_json(HISTORICAL_PATH)
    hist_teams = hist_data.get("teams", [])
    print(f"   Loaded {len(hist_teams)} historical team entries")

    # Compute normalization ranges from historical database
    mins, maxs = compute_normalization_ranges(hist_teams)

    # -----------------------------------------------------------------------
    # 4. Load team metadata (for conference info)
    # -----------------------------------------------------------------------
    teams_meta_path = os.path.join(DATA_DIR, "meta", "teams.json")
    teams_meta = {}
    if os.path.exists(teams_meta_path):
        raw = load_json(teams_meta_path)
        if isinstance(raw, list):
            teams_meta = {t["name"]: t for t in raw if "name" in t}
        elif isinstance(raw, dict):
            teams_meta = raw

    # -----------------------------------------------------------------------
    # 5. Build team profiles + find twins
    # -----------------------------------------------------------------------
    print(f"\n4. Building team profiles and finding historical twins...")

    # Collect all unique team names from matchups
    all_team_names = set()
    for m in matchups:
        all_team_names.add(m["team1"])
        all_team_names.add(m["team2"])

    team_profiles = {}  # team_name -> profile dict
    skipped = []

    for team_name in sorted(all_team_names):
        # Resolve BartTorvik name
        bt_name = resolve_team_name(team_name, bt_data) if bt_data else None
        bt_stats = bt_data.get(bt_name, {}) if bt_name else {}

        if not bt_stats:
            skipped.append(team_name)

        # Get conference
        conference = get_conference_for_team(team_name, teams_meta)

        # Build raw vector from BartTorvik stats
        raw_vec = build_team_vector_from_barttorvik(bt_stats, conference)

        # Normalize using historical ranges
        norm_vec = normalize_vector(raw_vec, mins, maxs)

        # Find top 3 twins
        twins = find_top_twins(norm_vec, hist_teams, year, n=3)

        # Get AdjEM for tiebreaking
        adj_em = bt_stats.get("adj_em", 0) if bt_stats else 0

        team_profiles[team_name] = {
            "norm_vec": norm_vec,
            "twins": twins,
            "adj_em": adj_em,
            "conference": conference,
        }

    if skipped:
        print(f"   WARNING: No BartTorvik data for {len(skipped)} teams: {', '.join(skipped[:10])}")
        if len(skipped) > 10:
            print(f"            ... and {len(skipped) - 10} more")
    print(f"   Built profiles for {len(team_profiles)} teams")

    # Print a few sample twins
    sample_count = 0
    for team_name in sorted(all_team_names):
        prof = team_profiles[team_name]
        if prof["twins"]:
            best = prof["twins"][0]
            print(f"   {team_name} -> {best[1]['year']} {best[1]['team']} "
                  f"(sim: {best[0]:.3f}, {best[1]['tournament_result']})")
            sample_count += 1
            if sample_count >= 5:
                print(f"   ... ({len(all_team_names) - 5} more)")
                break

    # -----------------------------------------------------------------------
    # 6. Determine region order from R64 data
    # -----------------------------------------------------------------------
    # Always use the FF-correct pairing order: South vs West, East vs Midwest
    # The R64 data may list regions in a different order, but the FF pairing
    # must follow the NCAA bracket structure.
    region_order = list(STANDARD_REGION_ORDER)  # ["South", "West", "East", "Midwest"]
    print(f"\n5. Region order: {region_order}")

    # -----------------------------------------------------------------------
    # 7. Build matchup pairs for R64 and simulate round by round
    # -----------------------------------------------------------------------
    print(f"\n6. Simulating tournament...\n")

    def make_team_dict(name, seed, region):
        prof = team_profiles.get(name, {})
        return {
            "name": name,
            "seed": seed,
            "region": region,
            "twins": prof.get("twins", []),
            "adj_em": prof.get("adj_em", 0),
        }

    # Group R64 matchups by region, maintaining gameId sort order
    r64_by_region = {r: [] for r in region_order}
    for m in matchups:
        r64_by_region[m["region"]].append(m)

    # Sort each region's matchups by gameId to ensure correct bracket pairing
    for region in region_order:
        r64_by_region[region].sort(key=lambda m: m["gameId"])

    # Build R64 matchup pairs
    r64_pairs = []
    for region in region_order:
        for m in r64_by_region[region]:
            team_a = make_team_dict(m["team1"], m["seed1"], m["region"])
            team_b = make_team_dict(m["team2"], m["seed2"], m["region"])
            r64_pairs.append((team_a, team_b))

    # R64 uses gameIds from actual-results data
    r64_games = []
    r64_winners = []
    for i, (team_a, team_b) in enumerate(r64_pairs):
        winner, loser, confidence, reasoning = pick_winner(team_a, team_b)

        # Use the actual gameId from the matchup data
        flat_matchups = []
        for region in region_order:
            flat_matchups.extend(r64_by_region[region])
        game_id = flat_matchups[i]["gameId"]

        game = {
            "gameId": game_id,
            "round": "round_of_64",
            "region": team_a["region"],
            "seed1": team_a["seed"],
            "team1": team_a["name"],
            "seed2": team_b["seed"],
            "team2": team_b["name"],
            "pick": winner["name"],
            "confidence": confidence,
            "reasoning": reasoning,
        }
        r64_games.append(game)
        r64_winners.append(dict(winner))

    print(f"   Round of 64: {len(r64_games)} games")

    # R32: pair consecutive R64 winners (within each region)
    # Winners are already in region order (8 per region)
    r32_pairs = []
    for i in range(0, len(r64_winners), 2):
        r32_pairs.append((r64_winners[i], r64_winners[i + 1]))

    counters = {}
    r32_games, r32_winners = simulate_round(r32_pairs, "round_of_32", "r32", counters)
    print(f"   Round of 32: {len(r32_games)} games")

    # S16: pair consecutive R32 winners
    s16_pairs = []
    for i in range(0, len(r32_winners), 2):
        s16_pairs.append((r32_winners[i], r32_winners[i + 1]))

    counters = {}
    s16_games, s16_winners = simulate_round(s16_pairs, "sweet_16", "s16", counters)
    print(f"   Sweet 16:    {len(s16_games)} games")

    # E8: pair consecutive S16 winners (one game per region)
    e8_pairs = []
    for i in range(0, len(s16_winners), 2):
        e8_pairs.append((s16_winners[i], s16_winners[i + 1]))

    counters = {}
    e8_games, e8_winners = simulate_round(e8_pairs, "elite_8", "e8", counters)
    print(f"   Elite 8:     {len(e8_games)} games")

    # F4: pair E8 winners by region bracket position
    # regions[0] vs regions[1], regions[2] vs regions[3]
    f4_pairs = [(e8_winners[0], e8_winners[1]), (e8_winners[2], e8_winners[3])]
    counters = {}
    f4_games, f4_winners = simulate_round(f4_pairs, "final_four", "f4", counters)
    print(f"   Final Four:  {len(f4_games)} games")

    # Championship
    champ_pairs = [(f4_winners[0], f4_winners[1])]
    counters = {}
    champ_games, champ_winners = simulate_round(champ_pairs, "championship", "champ", counters)
    print(f"   Championship: {len(champ_games)} games")

    champion = champ_winners[0]["name"]
    final_four = [w["name"] for w in e8_winners]

    print(f"\n   Champion: {champion}")
    print(f"   Final Four: {final_four}")

    # -----------------------------------------------------------------------
    # 8. Assemble bracket JSON
    # -----------------------------------------------------------------------
    rounds = {
        "round_of_64": r64_games,
        "round_of_32": r32_games,
        "sweet_16": s16_games,
        "elite_8": e8_games,
        "final_four": f4_games,
        "championship": champ_games,
    }

    bracket = {
        "model": "the-historian",
        "displayName": "The Historian",
        "tagline": "Every team has a twin. History already played this game.",
        "color": "#f59e0b",
        "generated": today,
        "locked": True,
        "espnBracketUrl": None,
        "champion": champion,
        "championEliminated": False,
        "finalFour": final_four,
        "rounds": rounds,
    }

    # -----------------------------------------------------------------------
    # 9. Write output
    # -----------------------------------------------------------------------
    if year >= 2026:
        output_path = os.path.join(DATA_DIR, "models", "the-historian.json")
    else:
        output_path = os.path.join(
            DATA_DIR, "archive", str(year), "models", "the-historian.json"
        )

    print(f"\n7. Writing bracket...")
    save_json(bracket, output_path)

    # -----------------------------------------------------------------------
    # 10. Score against actual results if available
    # -----------------------------------------------------------------------
    print(f"\n8. Scoring against actual results...")
    espn_result, espn_pct = score_bracket(rounds, year)

    if espn_result:
        results_by_year = {year: (espn_result, espn_pct)}
        print_results("THE HISTORIAN — RESULTS", results_by_year)
    else:
        print(f"   No actual results available for {year} — skipping scoring")

    print(f"\n{'='*60}")
    print(f"  THE HISTORIAN — COMPLETE")
    print(f"  Champion: {champion}")
    print(f"  Final Four: {', '.join(final_four)}")
    print(f"  Output: {output_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
