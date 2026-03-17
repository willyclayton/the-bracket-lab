"""
Generate Bracket Predictions for The Super Agent.

Trains the Run 5 logistic regression model on 2010-2019 data,
then predicts all 63 games of the NCAA tournament bracket.

Uses:
- super_agent/research/tournament_games.csv + team_stats.csv for training
- data/results/actual-results.json (or archive) for bracket structure (R64 matchups)
- super_agent/research/barttorvik_YYYY.csv for team stats

Usage:
  python super_agent/src/generate_bracket.py --year 2026
  python super_agent/src/generate_bracket.py --year 2025

Outputs: data/models/the-super-agent.json (BracketData format)
"""

import os
import sys
import json
import csv
import argparse
import numpy as np
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import load_tournament_games, merge_team_stats, RESEARCH_DIR
from model_runner import build_features, build_model

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_barttorvik_year(year):
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
    "Oklahoma": "Oklahoma",
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
    # Direct match
    if team_name in bt_data:
        return bt_data[team_name]
    # Alias match
    alias = TOURNAMENT_TO_BARTTORVIK.get(team_name)
    if alias and alias in bt_data:
        return bt_data[alias]
    # Fuzzy: try adding/removing "St."
    for bt_name in bt_data:
        if team_name.lower().replace("state", "st.") == bt_name.lower():
            return bt_data[bt_name]
        if bt_name.lower().replace("st.", "state") == team_name.lower():
            return bt_data[bt_name]
    print(f"  WARNING: No stats found for {team_name}")
    return None


def predict_game(model, scaler, team1_stats, team2_stats, seed1, seed2, features):
    """Predict a single game. Returns (predicted_team_index, confidence, feature_diffs)."""
    feature_vals = [seed1 - seed2]  # seed_diff always first
    diffs = {}
    for feat in features:
        v1 = team1_stats.get(feat, 0)
        v2 = team2_stats.get(feat, 0)
        diff = v1 - v2
        feature_vals.append(diff)
        diffs[feat] = diff

    X = np.array([feature_vals])
    X_scaled = scaler.transform(X)
    proba = model.predict_proba(X_scaled)[0, 1]  # P(team1 wins)
    pred = 1 if proba >= 0.5 else 0
    confidence = max(proba, 1 - proba)

    return pred, confidence, diffs


def generate_reasoning(team1, team2, seed1, seed2, diffs, pick, confidence):
    """Generate reasoning text based on feature analysis."""
    pick_name = team1 if pick == 1 else team2
    loser_name = team2 if pick == 1 else team1

    # Identify top drivers
    drivers = []
    feat_labels = {
        "adj_em": "adjusted efficiency margin",
        "tempo": "tempo",
        "barthag": "power rating",
        "wab": "Wins Above Bubble",
        "elite_sos": "strength of schedule vs elite teams",
    }

    # Sort features by absolute contribution
    sorted_feats = sorted(diffs.items(), key=lambda x: abs(x[1]), reverse=True)

    for feat, diff in sorted_feats[:3]:
        label = feat_labels.get(feat, feat)
        if abs(diff) < 0.01:
            continue
        if (pick == 1 and diff > 0) or (pick == 0 and diff < 0):
            advantage = pick_name
        else:
            advantage = loser_name

        if advantage == pick_name:
            if abs(diff) > 10:
                drivers.append(f"dominant {label} advantage")
            elif abs(diff) > 3:
                drivers.append(f"clear {label} edge")
            else:
                drivers.append(f"slight {label} advantage")

    if not drivers:
        drivers = ["marginal statistical edge across all metrics"]

    seed_note = ""
    if seed1 != seed2:
        higher_seed_team = team1 if seed1 < seed2 else team2
        if pick_name != higher_seed_team:
            seed_note = f" Model picks the upset despite {higher_seed_team}'s higher seed."

    conf_pct = int(confidence * 100)
    driver_text = ", ".join(drivers)

    return f"{pick_name} advances with {driver_text} ({conf_pct}% model confidence).{seed_note}"


def get_r64_matchups(year):
    """Extract R64 matchups from actual-results.json (post-play-in bracket structure)."""
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
    return matchups


def main():
    from sklearn.preprocessing import StandardScaler

    parser = argparse.ArgumentParser(description="The Super Agent — ML Bracket Generator")
    parser.add_argument("--year", type=int, default=2026, help="Tournament year")
    args = parser.parse_args()
    year = args.year

    print("=" * 60)
    print(f"  GENERATING BRACKET PREDICTIONS ({year})")
    print("=" * 60)

    # Step 1: Train the Run 5 model on 2010-2019
    print("\n1. Training Run 5 model on 2010-2019 data...")
    features = ["adj_em", "tempo", "barthag", "wab", "elite_sos"]

    games = load_tournament_games(os.path.join(RESEARCH_DIR, "tournament_games.csv"))
    games = merge_team_stats(games, stat_columns=features)
    train = [g for g in games if g["year"] in list(range(2010, 2020))]

    X_train, y_train, _ = build_features(train, features)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    model = build_model("logistic")
    model.fit(X_train_s, y_train)

    print(f"   Trained on {len(train)} games")
    print(f"   Features: seed_diff + {', '.join(features)}")

    # Step 2: Load BartTorvik stats
    print(f"\n2. Loading {year} team stats from BartTorvik...")
    bt_data = load_barttorvik_year(year)
    print(f"   Loaded stats for {len(bt_data)} teams")

    # Step 3: Get R64 bracket structure
    print("\n3. Loading bracket structure...")
    r64_matchups = get_r64_matchups(year)
    print(f"   {len(r64_matchups)} R64 matchups loaded")

    # Verify all teams have stats
    all_teams = set()
    for m in r64_matchups:
        all_teams.add(m["team1"])
        all_teams.add(m["team2"])
    for team in sorted(all_teams):
        stats = get_team_stats(team, bt_data)
        if not stats:
            print(f"   MISSING: {team}")

    # Step 4: Predict all 63 games
    print("\n4. Predicting all 63 games...")

    rounds = {
        "round_of_64": [],
        "round_of_32": [],
        "sweet_16": [],
        "elite_8": [],
        "final_four": [],
        "championship": [],
    }

    # Track winners per region for advancing — derive from actual matchups
    region_order = []
    for m in r64_matchups:
        if m["region"] not in region_order:
            region_order.append(m["region"])
    print(f"   Region order: {region_order}")

    # ---- ROUND OF 64 ----
    r64_winners = {}  # gameId -> winner info
    for m in r64_matchups:
        stats1 = get_team_stats(m["team1"], bt_data)
        stats2 = get_team_stats(m["team2"], bt_data)

        if stats1 and stats2:
            pred, conf, diffs = predict_game(model, scaler, stats1, stats2, m["seed1"], m["seed2"], features)
        else:
            # Fallback: pick lower seed
            pred = 1 if m["seed1"] <= m["seed2"] else 0
            conf = 0.6
            diffs = {}

        pick_name = m["team1"] if pred == 1 else m["team2"]
        pick_seed = m["seed1"] if pred == 1 else m["seed2"]
        reasoning = generate_reasoning(m["team1"], m["team2"], m["seed1"], m["seed2"], diffs, pred, conf)

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

    print(f"   R64: {len(rounds['round_of_64'])} games predicted")

    # ---- ROUND OF 32 ----
    # Pair R64 winners: game 1 winner vs game 2 winner, etc.
    # R64 gameIds follow pattern: r64-{region}-{1-8}
    # R32 matchups: 1v2, 3v4, 5v6, 7v8 (pairing adjacent R64 winners)
    r32_winners = {}
    for region in region_order:
        region_lower = region.lower()
        for pair_idx in range(4):
            g1_id = f"r64-{region_lower}-{pair_idx*2+1}"
            g2_id = f"r64-{region_lower}-{pair_idx*2+2}"
            w1 = r64_winners[g1_id]
            w2 = r64_winners[g2_id]

            r32_id = f"r32-{region_lower}-{pair_idx+1}"
            stats1 = get_team_stats(w1["team"], bt_data)
            stats2 = get_team_stats(w2["team"], bt_data)

            if stats1 and stats2:
                pred, conf, diffs = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], features)
            else:
                pred = 1 if w1["seed"] <= w2["seed"] else 0
                conf = 0.55
                diffs = {}

            pick_name = w1["team"] if pred == 1 else w2["team"]
            pick_seed = w1["seed"] if pred == 1 else w2["seed"]
            reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], diffs, pred, conf)

            game = {
                "gameId": r32_id,
                "round": "round_of_32",
                "region": region,
                "seed1": w1["seed"],
                "team1": w1["team"],
                "seed2": w2["seed"],
                "team2": w2["team"],
                "pick": pick_name,
                "confidence": int(conf * 100),
                "reasoning": reasoning,
            }
            rounds["round_of_32"].append(game)
            r32_winners[r32_id] = {"team": pick_name, "seed": pick_seed}

    print(f"   R32: {len(rounds['round_of_32'])} games predicted")

    # ---- SWEET 16 ----
    s16_winners = {}
    for region in region_order:
        region_lower = region.lower()
        for pair_idx in range(2):
            g1_id = f"r32-{region_lower}-{pair_idx*2+1}"
            g2_id = f"r32-{region_lower}-{pair_idx*2+2}"
            w1 = r32_winners[g1_id]
            w2 = r32_winners[g2_id]

            s16_id = f"s16-{region_lower}-{pair_idx+1}"
            stats1 = get_team_stats(w1["team"], bt_data)
            stats2 = get_team_stats(w2["team"], bt_data)

            if stats1 and stats2:
                pred, conf, diffs = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], features)
            else:
                pred = 1 if w1["seed"] <= w2["seed"] else 0
                conf = 0.55
                diffs = {}

            pick_name = w1["team"] if pred == 1 else w2["team"]
            pick_seed = w1["seed"] if pred == 1 else w2["seed"]
            reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], diffs, pred, conf)

            game = {
                "gameId": s16_id,
                "round": "sweet_16",
                "region": region,
                "seed1": w1["seed"],
                "team1": w1["team"],
                "seed2": w2["seed"],
                "team2": w2["team"],
                "pick": pick_name,
                "confidence": int(conf * 100),
                "reasoning": reasoning,
            }
            rounds["sweet_16"].append(game)
            s16_winners[s16_id] = {"team": pick_name, "seed": pick_seed}

    print(f"   S16: {len(rounds['sweet_16'])} games predicted")

    # ---- ELITE 8 ----
    e8_winners = {}
    for region in region_order:
        region_lower = region.lower()
        g1_id = f"s16-{region_lower}-1"
        g2_id = f"s16-{region_lower}-2"
        w1 = s16_winners[g1_id]
        w2 = s16_winners[g2_id]

        e8_id = f"e8-{region_lower}"
        stats1 = get_team_stats(w1["team"], bt_data)
        stats2 = get_team_stats(w2["team"], bt_data)

        if stats1 and stats2:
            pred, conf, diffs = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], features)
        else:
            pred = 1 if w1["seed"] <= w2["seed"] else 0
            conf = 0.55
            diffs = {}

        pick_name = w1["team"] if pred == 1 else w2["team"]
        pick_seed = w1["seed"] if pred == 1 else w2["seed"]
        reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], diffs, pred, conf)

        game = {
            "gameId": e8_id,
            "round": "elite_8",
            "region": region,
            "seed1": w1["seed"],
            "team1": w1["team"],
            "seed2": w2["seed"],
            "team2": w2["team"],
            "pick": pick_name,
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        }
        rounds["elite_8"].append(game)
        e8_winners[region] = {"team": pick_name, "seed": pick_seed}

    print(f"   E8: {len(rounds['elite_8'])} games predicted")

    # ---- FINAL FOUR ----
    # South vs East, West vs Midwest (2026 NCAA bracket pairing)
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
            pred, conf, diffs = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], features)
        else:
            pred = 1 if w1["seed"] <= w2["seed"] else 0
            conf = 0.55
            diffs = {}

        pick_name = w1["team"] if pred == 1 else w2["team"]
        pick_seed = w1["seed"] if pred == 1 else w2["seed"]
        reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], diffs, pred, conf)

        game = {
            "gameId": f4_id,
            "round": "final_four",
            "region": "National",
            "seed1": w1["seed"],
            "team1": w1["team"],
            "seed2": w2["seed"],
            "team2": w2["team"],
            "pick": pick_name,
            "confidence": int(conf * 100),
            "reasoning": reasoning,
        }
        rounds["final_four"].append(game)
        f4_winners[f4_id] = {"team": pick_name, "seed": pick_seed}

    print(f"   F4: {len(rounds['final_four'])} games predicted")

    # ---- CHAMPIONSHIP ----
    w1 = f4_winners["f4-south-east"]
    w2 = f4_winners["f4-west-midwest"]

    stats1 = get_team_stats(w1["team"], bt_data)
    stats2 = get_team_stats(w2["team"], bt_data)

    if stats1 and stats2:
        pred, conf, diffs = predict_game(model, scaler, stats1, stats2, w1["seed"], w2["seed"], features)
    else:
        pred = 1
        conf = 0.55
        diffs = {}

    pick_name = w1["team"] if pred == 1 else w2["team"]
    reasoning = generate_reasoning(w1["team"], w2["team"], w1["seed"], w2["seed"], diffs, pred, conf)

    game = {
        "gameId": "championship",
        "round": "championship",
        "region": "National",
        "seed1": w1["seed"],
        "team1": w1["team"],
        "seed2": w2["seed"],
        "team2": w2["team"],
        "pick": pick_name,
        "confidence": int(conf * 100),
        "reasoning": reasoning,
    }
    rounds["championship"].append(game)

    print(f"   Championship: {pick_name}")

    # Step 5: Build final JSON
    total_games = sum(len(r) for r in rounds.values())
    assert total_games == 63, f"Expected 63 games, got {total_games}"

    # Get Final Four teams
    final_four = [e8_winners[r]["team"] for r in region_order]
    champion = pick_name

    bracket_data = {
        "model": "the-super-agent",
        "displayName": "The Super Agent",
        "tagline": "The Agent improvised. This one trained.",
        "color": "#a855f7",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "locked": True,
        "espnBracketUrl": None,
        "champion": champion,
        "championEliminated": False,
        "finalFour": final_four,
        "rounds": rounds,
    }

    # Write output
    if year >= 2026:
        output_path = os.path.join(PROJECT_ROOT, "data/models/the-super-agent.json")
    else:
        output_path = os.path.join(PROJECT_ROOT, f"data/archive/{year}/models/the-super-agent.json")
    with open(output_path, "w") as f:
        json.dump(bracket_data, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  BRACKET WRITTEN: {output_path}")
    print(f"  Champion: {champion}")
    print(f"  Final Four: {', '.join(final_four)}")
    print(f"  Total games: {total_games}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
