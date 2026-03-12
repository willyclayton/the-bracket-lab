"""
Feature engineering for March Madness matchup prediction.

Builds matchup-level feature vectors by joining tournament games
with team season stats.
"""

import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"


def _normalize_name(name):
    """Normalize team name for joining."""
    n = name.lower().strip()
    n = n.replace(".", "").replace("'", "").replace("-", " ")
    if n.endswith(" st"):
        n = n[:-3] + " state"
    n = n.replace(" st ", " state ")
    if n.startswith("the "):
        n = n[4:]
    return n


# Sports-ref uses same naming in both datasets, so this should be simpler
_ALIASES = {
    "uconn": "connecticut",
    "unc": "north carolina",
    "pitt": "pittsburgh",
    "lsu": "louisiana state",
    "ucf": "central florida",
    "smu": "southern methodist",
    "vcu": "virginia commonwealth",
    "etsu": "east tennessee state",
    "fdu": "fairleigh dickinson",
    "fau": "florida atlantic",
    "uab": "uab",
    "unlv": "unlv",
    "ole miss": "mississippi",
    "nc state": "north carolina state",
    "umbc": "umbc",
}


def load_and_merge():
    """
    Load tournament games and team stats, merge into matchup features.
    Returns a DataFrame with one row per game, including features for both teams.
    """
    games = pd.read_csv(PROCESSED_DIR / "tournaments.csv")
    teams = pd.read_csv(PROCESSED_DIR / "team_seasons.csv")

    # Normalize team names for joining
    games["team_1_norm"] = games["team_1"].apply(_normalize_name)
    games["team_2_norm"] = games["team_2"].apply(_normalize_name)
    teams["team_norm"] = teams["team"].apply(_normalize_name)

    # Apply aliases
    for df_col in ["team_1_norm", "team_2_norm"]:
        games[df_col] = games[df_col].map(lambda x: _ALIASES.get(x, x))
    teams["team_norm"] = teams["team_norm"].map(lambda x: _ALIASES.get(x, x))

    # Merge team 1 stats
    t1_stats = teams.rename(columns={
        c: f"t1_{c}" for c in teams.columns if c not in ("year", "team_norm")
    })
    merged = games.merge(
        t1_stats, left_on=["year", "team_1_norm"], right_on=["year", "team_norm"],
        how="left"
    )

    # Merge team 2 stats
    t2_stats = teams.rename(columns={
        c: f"t2_{c}" for c in teams.columns if c not in ("year", "team_norm")
    })
    merged = merged.merge(
        t2_stats, left_on=["year", "team_2_norm"], right_on=["year", "team_norm"],
        how="left", suffixes=("_t1", "_t2")
    )

    return merged


def build_features(merged_df):
    """
    Build matchup feature vectors from merged game+stats data.

    Features are all DIFFERENCES (team_1 - team_2) so the model learns
    which direction predicts a team_1 win.

    Returns: (X, y, metadata) where X is feature matrix, y is binary (1 = team_1 wins),
    metadata has year, team names, etc.
    """
    df = merged_df.copy()

    # Target: did team_1 win?
    df["team_1_won"] = (df["winner"] == df["team_1"]).astype(int)

    # Seed difference (negative = team_1 has better seed)
    df["seed_diff"] = df["seed_1"] - df["seed_2"]

    # SRS difference
    df["srs_diff"] = df["t1_srs"].astype(float, errors="ignore") - df["t2_srs"].astype(float, errors="ignore")

    # MOV difference (margin of victory)
    df["mov_diff"] = df["t1_mov"].astype(float, errors="ignore") - df["t2_mov"].astype(float, errors="ignore")

    # SOS difference (strength of schedule)
    df["sos_diff"] = df["t1_sos"].astype(float, errors="ignore") - df["t2_sos"].astype(float, errors="ignore")

    # PPG difference
    df["ppg_diff"] = df["t1_ppg"].astype(float, errors="ignore") - df["t2_ppg"].astype(float, errors="ignore")

    # Opponent PPG difference (lower is better for defense)
    df["opp_ppg_diff"] = df["t1_opp_ppg"].astype(float, errors="ignore") - df["t2_opp_ppg"].astype(float, errors="ignore")

    # Win percentage difference
    df["t1_win_pct"] = df["t1_wins"] / (df["t1_wins"] + df["t1_losses"])
    df["t2_win_pct"] = df["t2_wins"] / (df["t2_wins"] + df["t2_losses"])
    df["win_pct_diff"] = df["t1_win_pct"] - df["t2_win_pct"]

    # SRS rank difference (lower rank = better)
    df["srs_rank_diff"] = df["t1_srs_rank"].astype(float, errors="ignore") - df["t2_srs_rank"].astype(float, errors="ignore")

    # Encode round as ordinal (later rounds may have different dynamics)
    round_ord = {"R64": 0, "R32": 1, "S16": 2, "E8": 3, "F4": 4, "Championship": 5}
    df["round_num"] = df["round"].map(round_ord)

    # Seed-based features
    df["seed_product"] = df["seed_1"] * df["seed_2"]
    df["seed_sum"] = df["seed_1"] + df["seed_2"]
    df["higher_seed"] = df[["seed_1", "seed_2"]].min(axis=1)
    df["lower_seed"] = df[["seed_1", "seed_2"]].max(axis=1)

    # Feature columns
    feature_cols = [
        "seed_diff", "srs_diff", "mov_diff", "sos_diff",
        "ppg_diff", "opp_ppg_diff", "win_pct_diff", "srs_rank_diff",
        "round_num", "seed_product", "seed_sum",
    ]

    # Drop rows with missing features
    valid_mask = df[feature_cols].notna().all(axis=1)
    df_valid = df[valid_mask].copy()

    missing = len(df) - len(df_valid)
    if missing > 0:
        print(f"  Dropped {missing}/{len(df)} games with missing features")

    X = df_valid[feature_cols].values.astype(float)
    y = df_valid["team_1_won"].values.astype(int)

    metadata = df_valid[["year", "round", "team_1", "team_2", "seed_1", "seed_2",
                          "winner", "region"]].copy()

    return X, y, metadata, feature_cols


def build_training_data():
    """Full pipeline: load data, merge, build features."""
    print("Loading and merging data...")
    merged = load_and_merge()
    print(f"  {len(merged)} games after merge")

    # Check join quality
    t1_missing = merged["t1_srs"].isna().sum()
    t2_missing = merged["t2_srs"].isna().sum()
    print(f"  Team 1 SRS missing: {t1_missing}/{len(merged)}")
    print(f"  Team 2 SRS missing: {t2_missing}/{len(merged)}")

    print("Building features...")
    X, y, meta, feature_cols = build_features(merged)
    print(f"  Final dataset: {len(X)} games, {len(feature_cols)} features")
    print(f"  Team 1 win rate: {y.mean():.3f}")
    print(f"  Features: {feature_cols}")

    return X, y, meta, feature_cols


if __name__ == "__main__":
    X, y, meta, cols = build_training_data()
    print(f"\nReady for modeling: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"\nFeature stats:")
    df_feat = pd.DataFrame(X, columns=cols)
    print(df_feat.describe().round(2).to_string())
