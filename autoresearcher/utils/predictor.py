"""
Matchup predictor: given any two teams in any year, predict P(team_1 wins).
Trained on historical tournament data with leave-one-year-out CV.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler

from utils.features import _normalize_name, _ALIASES

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

# Feature columns used by the model
FEATURE_COLS = [
    "seed_diff", "srs_diff", "mov_diff", "sos_diff",
    "ppg_diff", "opp_ppg_diff", "win_pct_diff", "srs_rank_diff",
    "round_num", "seed_product", "seed_sum",
]


class MatchupPredictor:
    """
    Predicts P(team_1 wins) for arbitrary matchups.
    Uses an ensemble of models trained with leave-one-year-out.
    """

    def __init__(self):
        self.models = {}  # year -> list of (model, scaler) tuples
        self.team_stats = {}  # year -> {normalized_name: stats_dict}
        self._pred_cache = {}  # (t1, t2, year, round) -> probability

    def build_team_index(self, df_teams):
        """Build a fast lookup for team stats by year."""
        for _, row in df_teams.iterrows():
            year = row["year"]
            name = _normalize_name(str(row["team"]))
            name = _ALIASES.get(name, name)
            if year not in self.team_stats:
                self.team_stats[year] = {}
            self.team_stats[year][name] = row.to_dict()

    def get_team_stats(self, team_name, year):
        """Look up a team's stats."""
        norm = _normalize_name(team_name)
        norm = _ALIASES.get(norm, norm)
        year_data = self.team_stats.get(year, {})

        stats = year_data.get(norm)
        if stats:
            return stats

        # Substring fallback
        for bt_name, bt_row in year_data.items():
            if len(norm) > 4 and len(bt_name) > 4:
                if norm in bt_name or bt_name in norm:
                    return bt_row
        return None

    def compute_features(self, team1_name, team2_name, seed1, seed2, year, round_num=0):
        """Compute feature vector for a matchup."""
        s1 = self.get_team_stats(team1_name, year)
        s2 = self.get_team_stats(team2_name, year)

        if s1 is None or s2 is None:
            return None

        def _f(stats, key):
            try:
                return float(stats.get(key, 0) or 0)
            except (ValueError, TypeError):
                return 0.0

        w1, l1 = _f(s1, "wins"), _f(s1, "losses")
        w2, l2 = _f(s2, "wins"), _f(s2, "losses")
        wp1 = w1 / (w1 + l1) if (w1 + l1) > 0 else 0.5
        wp2 = w2 / (w2 + l2) if (w2 + l2) > 0 else 0.5

        features = {
            "seed_diff": seed1 - seed2,
            "srs_diff": _f(s1, "srs") - _f(s2, "srs"),
            "mov_diff": _f(s1, "mov") - _f(s2, "mov"),
            "sos_diff": _f(s1, "sos") - _f(s2, "sos"),
            "ppg_diff": _f(s1, "ppg") - _f(s2, "ppg"),
            "opp_ppg_diff": _f(s1, "opp_ppg") - _f(s2, "opp_ppg"),
            "win_pct_diff": wp1 - wp2,
            "srs_rank_diff": _f(s1, "srs_rank") - _f(s2, "srs_rank"),
            "round_num": round_num,
            "seed_product": seed1 * seed2,
            "seed_sum": seed1 + seed2,
        }

        return np.array([features[c] for c in FEATURE_COLS])

    def train(self, X, y, meta):
        """Train models with leave-one-year-out for each test year."""
        years = sorted(meta["year"].unique())

        for test_year in years:
            train_mask = meta["year"].values != test_year
            X_train, y_train = X[train_mask], y[train_mask]

            scaler = StandardScaler()
            X_train_s = scaler.fit_transform(X_train)

            # Train ensemble of models
            lr = LogisticRegression(max_iter=1000, C=1.0)
            lr.fit(X_train_s, y_train)

            rf = RandomForestClassifier(
                n_estimators=300, max_depth=6, min_samples_leaf=5, random_state=42,
            )
            rf.fit(X_train_s, y_train)

            gb = GradientBoostingClassifier(
                n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42,
            )
            gb.fit(X_train_s, y_train)

            self.models[test_year] = {
                "scaler": scaler,
                "models": [lr, rf, gb],
                "weights": [0.4, 0.25, 0.35],  # Weight LR and GB higher
            }

    def predict(self, team1_name, team2_name, seed1, seed2, year, round_num=0):
        """Predict P(team_1 wins) for an arbitrary matchup."""
        # Check cache
        cache_key = (team1_name, team2_name, year, round_num)
        if cache_key in self._pred_cache:
            return self._pred_cache[cache_key]

        features = self.compute_features(
            team1_name, team2_name, seed1, seed2, year, round_num
        )
        if features is None:
            if seed1 < seed2:
                result = 0.65
            elif seed1 > seed2:
                result = 0.35
            else:
                result = 0.5
            self._pred_cache[cache_key] = result
            return result

        model_data = self.models.get(year)
        if model_data is None:
            available = sorted(self.models.keys())
            if not available:
                return 0.5
            closest = min(available, key=lambda y: abs(y - year))
            model_data = self.models[closest]

        X_scaled = model_data["scaler"].transform(features.reshape(1, -1))

        # Ensemble prediction
        probs = []
        for model, weight in zip(model_data["models"], model_data["weights"]):
            p = model.predict_proba(X_scaled)[0, 1]
            probs.append(p * weight)

        result = sum(probs)
        self._pred_cache[cache_key] = result
        return result

    def precompute_all_matchups(self, teams_with_seeds, year):
        """
        Pre-compute win probabilities for ALL possible team pairings.
        Returns: dict of (team1, team2) -> P(team1 wins)
        """
        prob_matrix = {}
        team_list = list(teams_with_seeds.keys())

        for i, t1 in enumerate(team_list):
            for j, t2 in enumerate(team_list):
                if i == j:
                    continue
                s1 = teams_with_seeds[t1]
                s2 = teams_with_seeds[t2]
                # Use round_num=2 as a middle-round estimate
                prob = self.predict(t1, t2, s1, s2, year, round_num=2)
                prob_matrix[(t1, t2)] = prob

        return prob_matrix
