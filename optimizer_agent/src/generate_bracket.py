"""
Generate Archive Bracket Predictions for The Optimizer.
Phase 3: Runs 9-10 — clean holdout bracket generation.

Trains the logistic regression model on 2010-2021 data (excl 2020),
then generates ESPN-optimized brackets for 2024 and 2025 (unseen years).

Usage:
    python optimizer_agent/src/generate_bracket.py --year 2024  # Run 9
    python optimizer_agent/src/generate_bracket.py --year 2025  # Run 10
"""

import os
import sys
import json
import csv
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    load_tournament_games, merge_team_stats,
    simulate_bracket_espn, get_espn_percentile,
    print_espn_results, append_espn_to_run_log,
    ESPN_ROUND_POINTS, ROUND_ORDER, RESEARCH_DIR, PROJECT_ROOT,
)
from optimizer_v1 import build_features, train_model, FEATURES

TRAIN_YEARS = [y for y in range(2010, 2022) if y != 2020]


def load_barttorvik(year):
    """Load BartTorvik stats for a given year, keyed by team name."""
    filepath = os.path.join(RESEARCH_DIR, f"barttorvik_{year}.csv")
    teams = {}
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        col_map = {h.strip().lower(): i for i, h in enumerate(header)}

        for row in reader:
            if len(row) < 5:
                continue
            team = row[col_map.get("team", 1)].strip()
            try:
                adjoe = float(row[col_map["adjoe"]])
                adjde = float(row[col_map["adjde"]])
                tempo = float(row[col_map["adjt"]])
                barthag = float(row[col_map["barthag"]])
                wab = float(row[col_map["wab"]])
                elite_sos = float(row[col_map["elite sos"]])
            except (ValueError, IndexError, KeyError):
                continue

            teams[team] = {
                "adj_em": round(adjoe - adjde, 2),
                "tempo": round(tempo, 2),
                "barthag": round(barthag, 6),
                "wab": round(wab, 2),
                "elite_sos": round(elite_sos, 4),
            }
    return teams


# Name mapping: tournament names -> BartTorvik names
TOURNAMENT_TO_BARTTORVIK = {
    "UConn": "Connecticut",
    "Ole Miss": "Mississippi",
    "BYU": "Brigham Young",
    "Saint Mary's": "Saint Mary's",
    "St. John's": "St. John's",
    "Iowa State": "Iowa St.",
    "Michigan State": "Michigan St.",
    "Mississippi State": "Mississippi St.",
    "Colorado State": "Colorado St.",
    "Utah State": "Utah St.",
    "Alabama State": "Alabama St.",
    "Norfolk State": "Norfolk St.",
    "McNeese": "McNeese St.",
    "UC San Diego": "UC San Diego",
    "SIU Edwardsville": "SIU Edwardsville",
    "Mount St. Mary's": "Mount St. Mary's",
    "Omaha": "Nebraska Omaha",
    "UNC Wilmington": "UNC Wilmington",
    "VCU": "Virginia Commonwealth",
    "New Mexico State": "New Mexico St.",
    "NC State": "N.C. State",
    "North Carolina": "North Carolina",
    # Added for 2026
    "UCF": "Central Florida",
    "South Florida": "South Florida",
    "SMU": "Southern Methodist",
    "Miami": "Miami FL",
    "Miami (OH)": "Miami OH",
    "LIU": "Long Island University",
    "Cal Baptist": "Cal Baptist",
    "Northern Iowa": "Northern Iowa",
    "North Dakota State": "North Dakota St.",
    "Tennessee State": "Tennessee St.",
    "Kennesaw State": "Kennesaw St.",
    "Wright State": "Wright St.",
    "Saint Louis": "Saint Louis",
    "Ohio State": "Ohio St.",
    "Prairie View A&M": "Prairie View A&M",
    "UMBC": "UMBC",
    "High Point": "High Point",
}


def get_team_stats(team_name, bt_data):
    """Look up team stats from BartTorvik data."""
    if team_name in bt_data:
        return bt_data[team_name]
    alias = TOURNAMENT_TO_BARTTORVIK.get(team_name)
    if alias and alias in bt_data:
        return bt_data[alias]
    for bt_name in bt_data:
        if team_name.lower().replace("state", "st.") == bt_name.lower():
            return bt_data[bt_name]
        if bt_name.lower().replace("st.", "state") == team_name.lower():
            return bt_data[bt_name]
    print(f"  WARNING: No stats found for {team_name}")
    return None


def predict_game(model, scaler, team1_stats, team2_stats, seed1, seed2, features):
    """Predict a single game. Returns (predicted_team_index, confidence, p_team1)."""
    feature_vals = [seed1 - seed2]
    for feat in features:
        v1 = team1_stats.get(feat, 0)
        v2 = team2_stats.get(feat, 0)
        feature_vals.append(v1 - v2)

    X = np.array([feature_vals])
    X_scaled = scaler.transform(X)
    p_team1 = model.predict_proba(X_scaled)[0, 1]
    pred = 1 if p_team1 >= 0.5 else 0
    confidence = max(p_team1, 1 - p_team1)

    return pred, confidence, p_team1


def generate_reasoning(team1, team2, seed1, seed2, p_team1, pick, confidence, strategy="ev"):
    """Generate reasoning text."""
    pick_name = team1 if pick == 1 else team2
    conf_pct = int(confidence * 100)

    if strategy == "ev":
        return f"{pick_name} advances via expected value optimization ({conf_pct}% model confidence). ESPN points maximization favors path probability over per-game accuracy."
    else:
        return f"{pick_name} advances ({conf_pct}% model confidence)."


def get_r64_matchups(year):
    """Extract R64 matchups from actual-results.json."""
    if year >= 2026:
        results_path = os.path.join(PROJECT_ROOT, "data/results/actual-results.json")
    else:
        results_path = os.path.join(PROJECT_ROOT, f"data/archive/{year}/results/actual-results.json")
    with open(results_path) as f:
        results = json.load(f)

    matchups = []
    for game in results["games"]:
        if game["round"] == "round_of_64":
            matchups.append({
                "gameId": game["gameId"],
                "region": game["region"],
                "team1": game["team1"],
                "seed1": game["seed1"],
                "team2": game["team2"],
                "seed2": game["seed2"],
            })
    return matchups, results


def main():
    import argparse
    from sklearn.preprocessing import StandardScaler

    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True,
                        help="Year to generate bracket for")
    args = parser.parse_args()

    year = args.year
    run_num = {2024: 9, 2025: 10}.get(year, 11)

    print("=" * 60)
    print(f"  GENERATING OPTIMIZER BRACKET — {year} (Run {run_num})")
    print("=" * 60)

    # Step 1: Train model
    print(f"\n1. Training model on {min(TRAIN_YEARS)}-{max(TRAIN_YEARS)} data...")
    games = load_tournament_games()
    games = merge_team_stats(games, stat_columns=FEATURES)
    train = [g for g in games if g["year"] in TRAIN_YEARS]

    X_train, y_train, _ = build_features(train, FEATURES)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)

    from sklearn.linear_model import LogisticRegression
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train_s, y_train)
    print(f"   Trained on {len(train)} games")

    # Step 2: Load team stats
    print(f"\n2. Loading {year} team stats...")
    bt_data = load_barttorvik(year)
    print(f"   Loaded stats for {len(bt_data)} teams")

    # Step 3: Get bracket structure
    print(f"\n3. Loading {year} bracket structure...")
    r64_matchups, actual_results = get_r64_matchups(year)
    print(f"   {len(r64_matchups)} R64 matchups loaded")

    # Step 4: Generate EV-optimized bracket
    print(f"\n4. Generating EV-optimized bracket...")

    rounds = {rnd: [] for rnd in ROUND_ORDER}
    # Derive region order from actual matchups
    region_order = []
    for m in r64_matchups:
        if m["region"] not in region_order:
            region_order.append(m["region"])
    print(f"   Region order: {region_order}")

    # Compute all R64 probabilities and build bracket with EV optimization
    r64_winners = {}
    team_reach_prob = {}

    for m in r64_matchups:
        stats1 = get_team_stats(m["team1"], bt_data)
        stats2 = get_team_stats(m["team2"], bt_data)

        if stats1 and stats2:
            pred, conf, p_t1 = predict_game(model, scaler, stats1, stats2, m["seed1"], m["seed2"], FEATURES)
        else:
            pred = 1 if m["seed1"] <= m["seed2"] else 0
            conf = 0.6
            p_t1 = 0.6 if pred == 1 else 0.4

        # R64: pick per-game favorite (low stakes, 10 pts each)
        pick_name = m["team1"] if pred == 1 else m["team2"]
        pick_seed = m["seed1"] if pred == 1 else m["seed2"]

        reasoning = generate_reasoning(m["team1"], m["team2"], m["seed1"], m["seed2"], p_t1, pred, conf)

        game = {
            "gameId": m["gameId"],
            "round": "round_of_64",
            "region": m["region"],
            "seed1": m["seed1"],
            "team1": m["team1"],
            "seed2": m["seed2"],
            "team2": m["team2"],
            "pick": pick_name,
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        }
        rounds["round_of_64"].append(game)
        r64_winners[m["gameId"]] = {"team": pick_name, "seed": pick_seed}
        # Track reach prob
        if pred == 1:
            team_reach_prob[m["team1"]] = p_t1
        else:
            team_reach_prob[m["team2"]] = 1 - p_t1

    print(f"   R64: {len(rounds['round_of_64'])} games")

    # Helper to run subsequent rounds with EV optimization
    def run_round(round_name, prev_winners, prev_id_pattern, pair_count, region_list, id_prefix):
        winners = {}
        for region in region_list:
            region_lower = region.lower()
            for pair_idx in range(pair_count):
                g1_id = prev_id_pattern(region_lower, pair_idx, 1)
                g2_id = prev_id_pattern(region_lower, pair_idx, 2)
                w1 = prev_winners[g1_id]
                w2 = prev_winners[g2_id]

                stats1 = get_team_stats(w1["team"], bt_data)
                stats2 = get_team_stats(w2["team"], bt_data)

                if stats1 and stats2:
                    pred, conf, p_t1 = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], FEATURES)
                else:
                    pred = 1 if w1["seed"] <= w2["seed"] else 0
                    conf = 0.55
                    p_t1 = 0.55 if pred == 1 else 0.45

                pts = ESPN_ROUND_POINTS[round_name]
                reach_t1 = team_reach_prob.get(w1["team"], 1.0)
                reach_t2 = team_reach_prob.get(w2["team"], 1.0)

                # EV optimization for S16+, per-game for R32
                if round_name in ("sweet_16", "elite_8", "final_four", "championship"):
                    ev_t1 = reach_t1 * p_t1 * pts
                    ev_t2 = reach_t2 * (1 - p_t1) * pts
                    if ev_t1 >= ev_t2:
                        pick_idx = 1
                    else:
                        pick_idx = 0
                else:
                    pick_idx = 1 if p_t1 >= 0.5 else 0

                if pick_idx == 1:
                    pick_name = w1["team"]
                    pick_seed = w1["seed"]
                    team_reach_prob[w1["team"]] = reach_t1 * p_t1
                else:
                    pick_name = w2["team"]
                    pick_seed = w2["seed"]
                    team_reach_prob[w2["team"]] = reach_t2 * (1 - p_t1)

                game_id = f"{id_prefix}-{region_lower}-{pair_idx+1}" if pair_count > 1 else f"{id_prefix}-{region_lower}"
                reasoning = generate_reasoning(
                    w1["team"], w2["team"], w1["seed"], w2["seed"],
                    p_t1, pick_idx, conf,
                    strategy="ev" if round_name in ("sweet_16", "elite_8", "final_four", "championship") else "game"
                )

                game = {
                    "gameId": game_id,
                    "round": round_name,
                    "region": region,
                    "seed1": w1["seed"],
                    "team1": w1["team"],
                    "seed2": w2["seed"],
                    "team2": w2["team"],
                    "pick": pick_name,
                    "confidence": int(conf * 100),
                    "reasoning": reasoning,
                }
                rounds[round_name].append(game)
                winners[game_id] = {"team": pick_name, "seed": pick_seed}

        return winners

    # R32
    r32_winners = run_round(
        "round_of_32", r64_winners,
        lambda r, p, n: f"r64-{r}-{p*2+n}",
        4, region_order, "r32"
    )
    print(f"   R32: {len(rounds['round_of_32'])} games")

    # S16
    s16_winners = run_round(
        "sweet_16", r32_winners,
        lambda r, p, n: f"r32-{r}-{p*2+n}",
        2, region_order, "s16"
    )
    print(f"   S16: {len(rounds['sweet_16'])} games")

    # E8
    e8_winners = {}
    for region in region_order:
        region_lower = region.lower()
        g1_id = f"s16-{region_lower}-1"
        g2_id = f"s16-{region_lower}-2"
        w1 = s16_winners[g1_id]
        w2 = s16_winners[g2_id]

        stats1 = get_team_stats(w1["team"], bt_data)
        stats2 = get_team_stats(w2["team"], bt_data)

        if stats1 and stats2:
            pred, conf, p_t1 = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], FEATURES)
        else:
            pred = 1 if w1["seed"] <= w2["seed"] else 0
            conf = 0.55
            p_t1 = 0.55 if pred == 1 else 0.45

        pts = ESPN_ROUND_POINTS["elite_8"]
        reach_t1 = team_reach_prob.get(w1["team"], 1.0)
        reach_t2 = team_reach_prob.get(w2["team"], 1.0)
        ev_t1 = reach_t1 * p_t1 * pts
        ev_t2 = reach_t2 * (1 - p_t1) * pts

        if ev_t1 >= ev_t2:
            pick_name, pick_seed = w1["team"], w1["seed"]
            team_reach_prob[w1["team"]] = reach_t1 * p_t1
        else:
            pick_name, pick_seed = w2["team"], w2["seed"]
            team_reach_prob[w2["team"]] = reach_t2 * (1 - p_t1)

        e8_id = f"e8-{region_lower}"
        reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], p_t1, 1 if pick_name == w1["team"] else 0, conf, "ev")

        game = {
            "gameId": e8_id,
            "round": "elite_8",
            "region": region,
            "seed1": w1["seed"], "team1": w1["team"],
            "seed2": w2["seed"], "team2": w2["team"],
            "pick": pick_name,
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        }
        rounds["elite_8"].append(game)
        e8_winners[region] = {"team": pick_name, "seed": pick_seed}

    print(f"   E8: {len(rounds['elite_8'])} games")

    # F4 — 2026 NCAA bracket pairs South vs East, West vs Midwest
    f4_matchups = [
        ("f4-south-east", "South", "East"),
        ("f4-west-midwest", "West", "Midwest"),
    ]
    f4_winners = {}
    for f4_id, r1, r2 in f4_matchups:
        w1 = e8_winners[r1]
        w2 = e8_winners[r2]

        stats1 = get_team_stats(w1["team"], bt_data)
        stats2 = get_team_stats(w2["team"], bt_data)

        if stats1 and stats2:
            pred, conf, p_t1 = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], FEATURES)
        else:
            pred = 1 if w1["seed"] <= w2["seed"] else 0
            conf = 0.55
            p_t1 = 0.55 if pred == 1 else 0.45

        pts = ESPN_ROUND_POINTS["final_four"]
        reach_t1 = team_reach_prob.get(w1["team"], 1.0)
        reach_t2 = team_reach_prob.get(w2["team"], 1.0)
        ev_t1 = reach_t1 * p_t1 * pts
        ev_t2 = reach_t2 * (1 - p_t1) * pts

        if ev_t1 >= ev_t2:
            pick_name, pick_seed = w1["team"], w1["seed"]
            team_reach_prob[w1["team"]] = reach_t1 * p_t1
        else:
            pick_name, pick_seed = w2["team"], w2["seed"]
            team_reach_prob[w2["team"]] = reach_t2 * (1 - p_t1)

        reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], p_t1, 1 if pick_name == w1["team"] else 0, conf, "ev")

        game = {
            "gameId": f4_id,
            "round": "final_four",
            "region": "National",
            "seed1": w1["seed"], "team1": w1["team"],
            "seed2": w2["seed"], "team2": w2["team"],
            "pick": pick_name,
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        }
        rounds["final_four"].append(game)
        f4_winners[f4_id] = {"team": pick_name, "seed": pick_seed}

    print(f"   F4: {len(rounds['final_four'])} games")

    # Championship
    w1 = f4_winners["f4-south-east"]
    w2 = f4_winners["f4-west-midwest"]

    stats1 = get_team_stats(w1["team"], bt_data)
    stats2 = get_team_stats(w2["team"], bt_data)

    if stats1 and stats2:
        pred, conf, p_t1 = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], FEATURES)
    else:
        pred = 1
        conf = 0.55
        p_t1 = 0.55

    pts = ESPN_ROUND_POINTS["championship"]
    reach_t1 = team_reach_prob.get(w1["team"], 1.0)
    reach_t2 = team_reach_prob.get(w2["team"], 1.0)
    ev_t1 = reach_t1 * p_t1 * pts
    ev_t2 = reach_t2 * (1 - p_t1) * pts

    if ev_t1 >= ev_t2:
        pick_name = w1["team"]
    else:
        pick_name = w2["team"]

    reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], p_t1, 1 if pick_name == w1["team"] else 0, conf, "ev")

    game = {
        "gameId": "championship",
        "round": "championship",
        "region": "National",
        "seed1": w1["seed"], "team1": w1["team"],
        "seed2": w2["seed"], "team2": w2["team"],
        "pick": pick_name,
        "confidence": int(conf * 100),
        "reasoning": reasoning,
    }
    rounds["championship"].append(game)

    champion = pick_name
    final_four = [e8_winners[r]["team"] for r in region_order]

    total_games = sum(len(r) for r in rounds.values())
    assert total_games == 63, f"Expected 63 games, got {total_games}"

    print(f"   Championship: {champion}")

    # Build output JSON
    bracket_data = {
        "model": "the-optimizer",
        "displayName": "The Optimizer",
        "tagline": "Every other model predicts games. This one plays the scoring system.",
        "color": "#06b6d4",
        "generated": f"{year}-03-{'16' if year >= 2026 else '19'}",
        "locked": True,
        "espnBracketUrl": None,
        "champion": champion,
        "championEliminated": False,
        "finalFour": final_four,
        "rounds": rounds,
    }

    if year >= 2026:
        output_path = os.path.join(PROJECT_ROOT, "data/models/the-optimizer.json")
    else:
        output_path = os.path.join(PROJECT_ROOT, f"data/archive/{year}/models/the-optimizer.json")
    with open(output_path, "w") as f:
        json.dump(bracket_data, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  BRACKET WRITTEN: {output_path}")
    print(f"  Champion: {champion}")
    print(f"  Final Four: {', '.join(final_four)}")
    print(f"  Total games: {total_games}")
    print(f"{'=' * 60}")

    # Score against actual results (skip for pre-tournament years)
    if year >= 2026:
        actual_results_path = os.path.join(PROJECT_ROOT, "data/results/actual-results.json")
    else:
        actual_results_path = os.path.join(PROJECT_ROOT, f"data/archive/{year}/results/actual-results.json")

    with open(actual_results_path) as f:
        actual_data = json.load(f)

    actual_list = [
        {"game_id": g["gameId"], "round": g["round"], "winner": g.get("winner")}
        for g in actual_data["games"] if g.get("winner")
    ]

    if actual_list:
        bracket_picks = {}
        for rnd_games in rounds.values():
            for g in rnd_games:
                bracket_picks[g["gameId"]] = g["pick"]

        espn_result = simulate_bracket_espn(bracket_picks, actual_list)
        espn_pct = get_espn_percentile(espn_result["total_points"], year)

        results_by_year = {year: (espn_result, espn_pct)}
        print_espn_results(f"Run {run_num}: {year} Holdout Bracket", results_by_year)
        append_espn_to_run_log(
            f"Run {run_num}: {year} Holdout Bracket", results_by_year,
            notes=f"Clean holdout — model never saw {year} results during development. "
                  f"Train: {min(TRAIN_YEARS)}-{max(TRAIN_YEARS)}. EV-optimized bracket.",
        )
    else:
        print(f"\n  No actual results available for {year} — skipping scoring.")


if __name__ == "__main__":
    main()
