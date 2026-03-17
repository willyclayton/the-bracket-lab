"""
Export Auto Researcher optimizer output as website BracketData JSON.

Uses an existing model JSON (e.g. the-scout.json) as a structural template
for gameIds, regions, and R64 matchups, then fills in the optimizer's picks.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import copy
from pathlib import Path
from datetime import datetime

from utils.features import build_training_data, _normalize_name, _ALIASES
from utils.backtest import load_tournament_data, load_team_stats, get_year_bracket
from utils.predictor import MatchupPredictor
from utils.optimizer import optimize_bracket

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

# Mapping from sports-reference names to website names
_SPORTSREF_TO_WEBSITE = {
    "mcneese state": "McNeese",
    "siu-edwardsville": "SIU Edwardsville",
    "uc-san diego": "UC San Diego",
    "st. john's (ny)": "St. John's",
    "unc": "North Carolina",
    "mount st. mary's": "Mount St. Mary's",
}

# Mapping from sports-reference Region_N to website region names
# Determined by matching 1-seeds: Region_1=Duke=East, Region_2=Houston=Midwest,
# Region_3=Auburn=South, Region_4=Florida=West (for 2025)
_REGION_MAP_2025 = {
    "Region_1": "East",
    "Region_2": "Midwest",
    "Region_3": "South",
    "Region_4": "West",
}


def sportsref_to_website_name(name):
    """Convert a sports-reference team name to the website version."""
    lower = name.lower().strip()
    if lower in _SPORTSREF_TO_WEBSITE:
        return _SPORTSREF_TO_WEBSITE[lower]
    return name


def load_template(year):
    """Load an existing model JSON as a structural template."""
    if year >= 2026:
        template_path = PROJECT_DIR / "data" / "models" / "the-scout.json"
    else:
        template_path = PROJECT_DIR / "data" / "archive" / str(year) / "models" / "the-scout.json"
    with open(template_path) as f:
        return json.load(f)


def build_template_team_map(template):
    """Build a map from normalized team name -> website team name from the template."""
    name_map = {}
    for round_key in template["rounds"]:
        for game in template["rounds"][round_key]:
            for team_field in ["team1", "team2"]:
                name = game[team_field]
                norm = _normalize_name(name)
                norm = _ALIASES.get(norm, norm)
                name_map[norm] = name
    return name_map


def map_team_name(sportsref_name, template_name_map):
    """Map a sports-reference team name to the website name, using the template as ground truth."""
    # First try explicit mapping
    website_name = sportsref_to_website_name(sportsref_name)
    if website_name != sportsref_name:
        return website_name

    # Try normalizing and matching against template
    norm = _normalize_name(sportsref_name)
    norm = _ALIASES.get(norm, norm)
    if norm in template_name_map:
        return template_name_map[norm]

    # Substring fallback
    for template_norm, template_display in template_name_map.items():
        if len(norm) > 4 and len(template_norm) > 4:
            if norm in template_norm or template_norm in norm:
                return template_display

    # Give up — return original
    return sportsref_name


def determine_region_map(df_games, year, template):
    """Determine the mapping from sports-ref Region_N to website region names
    by matching 1-seeds between the two data sources."""
    r64_games = df_games[(df_games["year"] == year) & (df_games["round"] == "R64")]

    # Find 1-seeds in each sports-ref region
    sportsref_regions = {}
    for _, g in r64_games.iterrows():
        if g["seed_1"] == 1:
            sportsref_regions[g["region"]] = g["team_1"]

    # Find 1-seeds in each website region
    website_regions = {}
    for game in template["rounds"]["round_of_64"]:
        if game["seed1"] == 1:
            website_regions[game["region"]] = game["team1"]

    # Build the mapping by matching 1-seed names
    template_name_map = build_template_team_map(template)
    region_map = {}
    for sr_region, sr_team in sportsref_regions.items():
        mapped_name = map_team_name(sr_team, template_name_map)
        for ws_region, ws_team in website_regions.items():
            if mapped_name == ws_team:
                region_map[sr_region] = ws_region
                break

    return region_map


def export_bracket(year, n_sims=5000):
    """Run optimizer for a year and export as website JSON."""
    print(f"Building Auto Researcher bracket for {year}...")

    # Load data and train
    X, y, meta, feature_cols = build_training_data()
    df_games = load_tournament_data()
    df_teams = load_team_stats()

    predictor = MatchupPredictor()
    predictor.build_team_index(df_teams)
    predictor.train(X, y, meta)

    # Get bracket structure
    bracket = get_year_bracket(df_games, int(year))
    r64_games = bracket["actual_games"]["R64"]

    # Build R64 matchups for optimizer
    r64_matchups = []
    for g in r64_games:
        r64_matchups.append({
            "team_1": g["team_1"],
            "seed_1": g["seed_1"] or 8,
            "team_2": g["team_2"],
            "seed_2": g["seed_2"] or 8,
            "region": g["region"],
        })

    # Build team seeds and prob matrix for confidence values
    team_seeds = {}
    for m in r64_matchups:
        team_seeds[m["team_1"]] = m["seed_1"]
        team_seeds[m["team_2"]] = m["seed_2"]

    prob_matrix = predictor.precompute_all_matchups(team_seeds, year)

    # Run optimizer
    opt_predictions = optimize_bracket(predictor, r64_matchups, year, n_sims=n_sims)

    # Load template
    template = load_template(year)
    template_name_map = build_template_team_map(template)
    region_map = determine_region_map(df_games, year, template)

    print(f"  Region mapping: {region_map}")

    # Build a lookup from (region, seed1, seed2) -> template game for R64
    r64_template_lookup = {}
    for game in template["rounds"]["round_of_64"]:
        key = (game["region"], game["seed1"], game["seed2"])
        r64_template_lookup[key] = game

    # Map optimizer predictions to website JSON
    output = {
        "model": "the-auto-researcher",
        "displayName": "The Auto Researcher",
        "tagline": "21 strategies tested. 14 years backtested. One bracket.",
        "color": "#10b981",
        "generated": datetime.now().strftime("%Y-%m-%d"),
        "locked": True,
        "espnBracketUrl": None,
        "champion": None,
        "championEliminated": False,
        "finalFour": [],
        "rounds": {
            "round_of_64": [],
            "round_of_32": [],
            "sweet_16": [],
            "elite_8": [],
            "final_four": [],
            "championship": [],
        }
    }

    # Round name mapping: optimizer -> website
    round_key_map = {
        "R64": "round_of_64",
        "R32": "round_of_32",
        "S16": "sweet_16",
        "E8": "elite_8",
        "F4": "final_four",
        "Championship": "championship",
    }

    # === R64 ===
    r64_winners = opt_predictions["R64"]
    for i, matchup in enumerate(r64_matchups):
        winner = r64_winners[i]
        loser = matchup["team_2"] if winner == matchup["team_1"] else matchup["team_1"]
        winner_seed = matchup["seed_1"] if winner == matchup["team_1"] else matchup["seed_2"]
        loser_seed = matchup["seed_2"] if winner == matchup["team_1"] else matchup["seed_1"]

        # Map names
        winner_ws = map_team_name(winner, template_name_map)
        loser_ws = map_team_name(loser, template_name_map)
        t1_ws = map_team_name(matchup["team_1"], template_name_map)
        t2_ws = map_team_name(matchup["team_2"], template_name_map)
        region_ws = region_map.get(matchup["region"], matchup["region"])

        # Get confidence from prob_matrix
        prob = prob_matrix.get((winner, loser), prob_matrix.get((matchup["team_1"], matchup["team_2"]), 0.5))
        if winner != matchup["team_1"]:
            prob = 1 - prob
        confidence = round(prob * 100)

        # Get gameId from template
        template_key = (region_ws, matchup["seed_1"], matchup["seed_2"])
        template_game = r64_template_lookup.get(template_key)
        game_id = template_game["gameId"] if template_game else f"r64-{region_ws.lower()}-{i+1}"

        output["rounds"]["round_of_64"].append({
            "gameId": game_id,
            "round": "round_of_64",
            "region": region_ws,
            "seed1": matchup["seed_1"],
            "team1": t1_ws,
            "seed2": matchup["seed_2"],
            "team2": t2_ws,
            "pick": winner_ws,
            "confidence": confidence,
            "reasoning": f"ML ensemble predicts {winner_ws} ({winner_seed}-seed) over {loser_ws} ({loser_seed}-seed) with {confidence}% confidence based on SRS, margin of victory, and strength of schedule differentials.",
        })

    # === R32 through Championship ===
    # Build advancing teams through each round, using the optimizer's picks
    # and the template's gameId structure

    # For R32+, we need to pair winners and build games
    prev_round_winners = [(map_team_name(w, template_name_map), r64_matchups[i]["region"])
                          for i, w in enumerate(r64_winners)]
    # Track seeds for each team
    all_team_seeds = {}
    for m in r64_matchups:
        all_team_seeds[map_team_name(m["team_1"], template_name_map)] = m["seed_1"]
        all_team_seeds[map_team_name(m["team_2"], template_name_map)] = m["seed_2"]

    round_sequence = [
        ("R32", "round_of_32", "r32"),
        ("S16", "sweet_16", "s16"),
        ("E8", "elite_8", "e8"),
        ("F4", "final_four", "f4"),
        ("Championship", "championship", "championship"),
    ]

    for opt_round, ws_round, game_prefix in round_sequence:
        round_winners = opt_predictions[opt_round]
        round_games = []

        for i in range(0, len(prev_round_winners), 2):
            if i + 1 >= len(prev_round_winners):
                break

            t1_ws, t1_region = prev_round_winners[i]
            t2_ws, t2_region = prev_round_winners[i + 1]
            s1 = all_team_seeds.get(t1_ws, 8)
            s2 = all_team_seeds.get(t2_ws, 8)

            # Map the optimizer's winner to website name
            opt_winner = map_team_name(round_winners[i // 2], template_name_map)

            # Get confidence
            prob = prob_matrix.get(
                (round_winners[i // 2],
                 r64_matchups[0]["team_1"]),  # placeholder — use direct lookup
                0.5
            )
            # Better approach: look up the two teams in the matchup
            sr_t1 = None
            sr_t2 = None
            for sr_name, ws_name_check in [(k, map_team_name(k, template_name_map))
                                            for k in team_seeds.keys()]:
                if ws_name_check == t1_ws:
                    sr_t1 = sr_name
                if ws_name_check == t2_ws:
                    sr_t2 = sr_name

            if sr_t1 and sr_t2:
                prob = prob_matrix.get((sr_t1, sr_t2), 0.5)
                if opt_winner == t2_ws:
                    prob = 1 - prob
            else:
                prob = 0.6  # fallback

            confidence = round(prob * 100)

            # Determine region
            if opt_round == "F4":
                region_ws = "Final Four"
            elif opt_round == "Championship":
                region_ws = "Championship"
            else:
                region_ws = region_map.get(t1_region, t1_region)

            # Build gameId
            if opt_round == "F4":
                # Critical: use f4-south-west and f4-east-midwest
                # Determine which FF game this is based on regions
                r1 = region_map.get(t1_region, t1_region)
                r2 = region_map.get(t2_region, t2_region)
                regions_set = {r1.lower(), r2.lower()}
                if regions_set == {"south", "east"}:
                    game_id = "f4-south-east"
                elif regions_set == {"west", "midwest"}:
                    game_id = "f4-west-midwest"
                else:
                    game_id = f"f4-{r1.lower()}-{r2.lower()}"
            elif opt_round == "Championship":
                game_id = "championship"
            else:
                region_slug = region_ws.lower()
                # Count how many games in this region we've already added
                region_game_num = sum(1 for g in round_games if g["region"] == region_ws) + 1
                # E8 has one game per region — no number suffix
                if opt_round == "E8":
                    game_id = f"{game_prefix}-{region_slug}"
                else:
                    game_id = f"{game_prefix}-{region_slug}-{region_game_num}"

            round_games.append({
                "gameId": game_id,
                "round": ws_round,
                "region": region_ws,
                "seed1": s1,
                "team1": t1_ws,
                "seed2": s2,
                "team2": t2_ws,
                "pick": opt_winner,
                "confidence": confidence,
                "reasoning": f"ML ensemble predicts {opt_winner} ({all_team_seeds.get(opt_winner, '?')}-seed) to advance with {confidence}% confidence.",
            })

        output["rounds"][ws_round] = round_games

        # Update prev_round_winners for next round
        new_prev = []
        for i in range(0, len(prev_round_winners), 2):
            if i + 1 >= len(prev_round_winners):
                break
            t1_ws, t1_region = prev_round_winners[i]
            t2_ws, t2_region = prev_round_winners[i + 1]
            opt_winner_ws = map_team_name(round_winners[i // 2], template_name_map)
            winner_region = t1_region if opt_winner_ws == t1_ws else t2_region
            new_prev.append((opt_winner_ws, winner_region))
        prev_round_winners = new_prev

    # Set champion and final four
    champ_game = output["rounds"]["championship"]
    if champ_game:
        output["champion"] = champ_game[0]["pick"]

    ff_teams = []
    for game in output["rounds"]["final_four"]:
        ff_teams.extend([game["team1"], game["team2"]])
    output["finalFour"] = ff_teams

    # Check if champion was eliminated (Florida won 2025)
    actual_champion = bracket["actual_winners"].get("Championship", [None])[0]
    if actual_champion and output["champion"]:
        champ_ws = map_team_name(actual_champion, template_name_map) if actual_champion else None
        output["championEliminated"] = output["champion"] != champ_ws

    return output, opt_predictions, bracket


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Export Auto Researcher bracket as website JSON")
    parser.add_argument("--year", type=int, default=2025)
    parser.add_argument("--sims", type=int, default=5000)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    output, predictions, bracket = export_bracket(args.year, n_sims=args.sims)

    # Determine output path
    if args.output:
        out_path = Path(args.output)
    else:
        out_path = PROJECT_DIR / "data" / "archive" / str(args.year) / "models" / "the-auto-researcher.json"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nExported to {out_path}")
    print(f"Champion: {output['champion']}")
    print(f"Final Four: {output['finalFour']}")
    print(f"Champion eliminated: {output['championEliminated']}")

    # Print round summaries
    for ws_round in ["round_of_64", "round_of_32", "sweet_16", "elite_8", "final_four", "championship"]:
        games = output["rounds"][ws_round]
        picks = [g["pick"] for g in games]
        print(f"  {ws_round}: {len(games)} games — {picks}")


if __name__ == "__main__":
    main()
