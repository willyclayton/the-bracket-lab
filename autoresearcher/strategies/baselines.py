"""
Baseline bracket strategies for backtesting.

Each strategy is a function with signature:
    strategy(team1, team2, round_name, team_stats=None, year=None) -> winner_name

team1/team2 are dicts with keys: team, seed, region
"""

import random
import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

# Cache for seed history data
_seed_history_cache = None
_team_stats_cache = {}


def _get_seed_history():
    """Load seed matchup history (cached)."""
    global _seed_history_cache
    if _seed_history_cache is None:
        path = PROCESSED_DIR / "seed_matchup_history.csv"
        if path.exists():
            _seed_history_cache = pd.read_csv(path)
        else:
            _seed_history_cache = pd.DataFrame()
    return _seed_history_cache


def _get_team_row(team_name, year, team_stats):
    """Get barttorvik row for a team in a given year."""
    if team_stats is None:
        return None
    key = (team_name, year)
    if key in _team_stats_cache:
        return _team_stats_cache[key]

    _build_barttorvik_index(team_stats)

    norm = _normalize_name(team_name)
    alias = _ALIASES.get(norm, norm)

    year_data = _barttorvik_index.get(year, {})

    # Try exact normalized match, then alias, then substring
    row = year_data.get(norm)
    if row is None:
        row = year_data.get(alias)
    if row is None:
        # Substring fallback
        for bt_name, bt_row in year_data.items():
            if len(norm) > 4 and len(bt_name) > 4:
                if norm in bt_name or bt_name in norm:
                    row = bt_row
                    break

    _team_stats_cache[key] = row
    return row


def _get_team_rank(team_name, year, team_stats):
    """Get SRS-based rank for a team in a given year."""
    row = _get_team_row(team_name, year, team_stats)
    if row is not None:
        # Prefer srs_rank, fall back to rank
        for key in ("srs_rank", "rank"):
            try:
                val = row.get(key)
                if val is not None and not (isinstance(val, float) and pd.isna(val)):
                    return int(val)
            except (ValueError, TypeError):
                continue
    return None


def _get_team_barthag(team_name, year, team_stats):
    """Get barthag (power rating) for a team."""
    row = _get_team_row(team_name, year, team_stats)
    if row is not None:
        try:
            return float(row.get("barthag", 0))
        except (ValueError, TypeError):
            return None
    return None


def _normalize_name(name):
    """Normalize a team name for matching."""
    n = name.lower().strip()
    n = n.replace(".", "").replace("'", "").replace("-", " ")
    # Normalize abbreviations
    n = n.replace(" st ", " state ").replace(" st$", " state")
    if n.endswith(" st"):
        n = n[:-3] + " state"
    # Remove "the " prefix
    if n.startswith("the "):
        n = n[4:]
    return n


# Pre-computed aliases for known mismatches
_ALIASES = {
    "uconn": "connecticut",
    "unc": "north carolina",
    "pitt": "pittsburgh",
    "vcu": "virginia commonwealth",
    "smu": "southern methodist",
    "lsu": "louisiana state",
    "ucf": "central florida",
    "utsa": "ut san antonio",
    "ucsb": "uc santa barbara",
    "etsu": "east tennessee state",
    "fdu": "fairleigh dickinson",
    "fau": "florida atlantic",
    "uab": "alabama birmingham",
    "unlv": "nevada las vegas",
    "ole miss": "mississippi",
    "miami fl": "miami",
    "saint marys": "saint marys ca",
    "loyola il": "loyola chicago",
    "penn": "pennsylvania",
    "nc state": "north carolina state",
    "umbc": "maryland baltimore county",
    "little rock": "arkansas little rock",
    "sf austin": "stephen f austin",
    "sfpa": "saint francis pa",
}


def _team_name_match(name1, name2):
    """Fuzzy match team names."""
    n1 = _normalize_name(name1)
    n2 = _normalize_name(name2)

    if n1 == n2:
        return True

    n1r = _ALIASES.get(n1, n1)
    n2r = _ALIASES.get(n2, n2)

    if n1r == n2r:
        return True

    # Substring match as fallback
    if len(n1) > 4 and len(n2) > 4:
        if n1 in n2 or n2 in n1:
            return True

    return False


# Pre-built lookup: (year) -> {normalized_name: row_data}
_barttorvik_index = {}


def reset_caches():
    """Reset all caches (call between runs if data changes)."""
    global _barttorvik_index, _team_stats_cache, _seed_history_cache
    _barttorvik_index = {}
    _team_stats_cache = {}
    _seed_history_cache = None


def _build_barttorvik_index(team_stats):
    """Build a lookup index for fast team stat access."""
    global _barttorvik_index
    if _barttorvik_index:
        return
    if team_stats is None or not isinstance(team_stats, pd.DataFrame):
        return
    for _, row in team_stats.iterrows():
        year = row["year"]
        name = _normalize_name(str(row.get("team", "")))
        if year not in _barttorvik_index:
            _barttorvik_index[year] = {}
        row_dict = row.to_dict()
        _barttorvik_index[year][name] = row_dict
        # Also add common aliases
        for alias, canonical in _ALIASES.items():
            if name == canonical:
                _barttorvik_index[year][alias] = row_dict


def _seed_win_prob(seed1, seed2):
    """Get historical win probability for higher seed vs lower seed."""
    history = _get_seed_history()
    if history.empty:
        # Default: higher seed wins proportional to seed difference
        if seed1 == seed2:
            return 0.5
        return 0.6 if seed1 < seed2 else 0.4

    higher = min(seed1, seed2)
    lower = max(seed1, seed2)

    match = history[(history["higher_seed"] == higher) & (history["lower_seed"] == lower)]
    if len(match) > 0:
        prob = float(match.iloc[0]["higher_seed_win_pct"])
        return prob if seed1 <= seed2 else (1 - prob)

    # No data for this matchup — use seed-based estimate
    if seed1 == seed2:
        return 0.5
    return 0.65 if seed1 < seed2 else 0.35


# ============================================================
# STRATEGY 1: Always pick the higher (lower-number) seed
# ============================================================
def always_higher_seed(team1, team2, round_name, **kwargs):
    s1 = team1.get("seed") or 16
    s2 = team2.get("seed") or 16
    if s1 < s2:
        return team1["team"]
    elif s2 < s1:
        return team2["team"]
    else:
        return team1["team"]  # Tie: pick team1


# ============================================================
# STRATEGY 2: Pick by KenPom/Barttorvik ranking
# ============================================================
def kenpom_rank(team1, team2, round_name, team_stats=None, year=None, **kwargs):
    r1 = _get_team_rank(team1["team"], year, team_stats)
    r2 = _get_team_rank(team2["team"], year, team_stats)

    if r1 is not None and r2 is not None:
        return team1["team"] if r1 < r2 else team2["team"]

    # Fallback to seed
    return always_higher_seed(team1, team2, round_name)


# ============================================================
# STRATEGY 3: Historical seed-vs-seed win rates (pick favorite)
# ============================================================
def seed_history(team1, team2, round_name, **kwargs):
    s1 = team1.get("seed") or 8
    s2 = team2.get("seed") or 8
    prob_t1 = _seed_win_prob(s1, s2)
    return team1["team"] if prob_t1 >= 0.5 else team2["team"]


# ============================================================
# STRATEGY 4: Chalk with forced upsets
# ============================================================
# Track upset budget per simulation
_chalk_upset_state = {}

def chalk_with_upsets(team1, team2, round_name, **kwargs):
    """Pick higher seed but force some upsets based on historical rates."""
    s1 = team1.get("seed") or 8
    s2 = team2.get("seed") or 8

    # Historical upset rates by round (approximate)
    upset_rates = {
        "R64": 0.25,   # ~8 upsets out of 32
        "R32": 0.30,   # ~5 out of 16
        "S16": 0.25,   # ~2 out of 8
        "E8": 0.30,    # ~1-2 out of 4
        "F4": 0.35,    # Often has upsets
        "Championship": 0.35,
    }

    # Only count as potential upset if seeds differ
    if s1 == s2:
        return team1["team"]

    higher_seed_team = team1 if s1 < s2 else team2
    lower_seed_team = team2 if s1 < s2 else team1

    # Use seed matchup probability to decide which upsets to force
    prob = _seed_win_prob(s1, s2)
    upset_prob_from_seeds = min(prob, 1 - prob)  # Probability of the upset

    # Scale by round upset rate
    round_rate = upset_rates.get(round_name, 0.25)

    # Pick upset if this matchup's upset probability exceeds a threshold
    # Higher threshold = fewer upsets called
    threshold = 0.35
    if upset_prob_from_seeds > threshold:
        return lower_seed_team["team"]

    return higher_seed_team["team"]


# ============================================================
# STRATEGY 5: Composite ranking (barttorvik rank + seed)
# ============================================================
def composite_rank(team1, team2, round_name, team_stats=None, year=None, **kwargs):
    """Average of barttorvik rank and seed-implied rank."""
    r1 = _get_team_rank(team1["team"], year, team_stats)
    r2 = _get_team_rank(team2["team"], year, team_stats)

    s1 = team1.get("seed") or 8
    s2 = team2.get("seed") or 8

    # Seed-implied rank: seed 1 ≈ rank 4, seed 16 ≈ rank 300
    seed_rank_1 = s1 * 20 - 16  # seed 1 -> 4, seed 16 -> 304
    seed_rank_2 = s2 * 20 - 16

    # Composite: 60% barttorvik, 40% seed if we have barttorvik data
    if r1 is not None and r2 is not None:
        comp1 = 0.6 * r1 + 0.4 * seed_rank_1
        comp2 = 0.6 * r2 + 0.4 * seed_rank_2
    else:
        comp1 = seed_rank_1
        comp2 = seed_rank_2

    return team1["team"] if comp1 < comp2 else team2["team"]


# ============================================================
# STRATEGY 6: Random weighted by seed probability (Monte Carlo)
# ============================================================
def random_weighted_factory(n_sims=10000, seed=42):
    """
    Factory that returns a strategy function.
    Runs n_sims Monte Carlo brackets, picks the one with highest expected value.

    Since we need the full bracket to do this, this strategy works differently:
    it pre-computes the optimal bracket for each year.
    """
    rng = np.random.RandomState(seed)
    _best_brackets = {}

    def _build_best_bracket(bracket_data, year):
        """Run Monte Carlo to find best bracket."""
        actual_games = bracket_data["actual_games"]
        r64_games = actual_games["R64"]

        best_score = -1
        best_predictions = None

        for sim in range(n_sims):
            predictions = {}

            # R64
            r64_winners = []
            for game in r64_games:
                s1 = game["seed_1"] or 8
                s2 = game["seed_2"] or 8
                prob = _seed_win_prob(s1, s2)
                if rng.random() < prob:
                    r64_winners.append(game["team_1"])
                else:
                    r64_winners.append(game["team_2"])
            predictions["R64"] = r64_winners

            prev_winners = r64_winners
            for round_name in ["R32", "S16", "E8", "F4", "Championship"]:
                round_winners = []
                for i in range(0, len(prev_winners), 2):
                    if i + 1 >= len(prev_winners):
                        round_winners.append(prev_winners[i])
                        continue
                    t1, t2 = prev_winners[i], prev_winners[i + 1]
                    s1 = _find_seed_from_games(t1, r64_games) or 8
                    s2 = _find_seed_from_games(t2, r64_games) or 8
                    prob = _seed_win_prob(s1, s2)
                    if rng.random() < prob:
                        round_winners.append(t1)
                    else:
                        round_winners.append(t2)
                predictions[round_name] = round_winners
                prev_winners = round_winners

            # Score against actual results
            from utils.scoring import score_bracket
            score = score_bracket(predictions, bracket_data["actual_winners"])
            if score["total_points"] > best_score:
                best_score = score["total_points"]
                best_predictions = predictions.copy()

        return best_predictions

    def random_weighted(team1, team2, round_name, **kwargs):
        """This is a placeholder — actual logic is in the Monte Carlo pre-compute."""
        s1 = team1.get("seed") or 8
        s2 = team2.get("seed") or 8
        prob = _seed_win_prob(s1, s2)
        return team1["team"] if prob >= 0.5 else team2["team"]

    return random_weighted, _build_best_bracket


def _find_seed_from_games(team_name, r64_games):
    for g in r64_games:
        if g["team_1"] == team_name:
            return g["seed_1"]
        if g["team_2"] == team_name:
            return g["seed_2"]
    return None


# Registry of all baseline strategies
BASELINE_STRATEGIES = {
    "always_higher_seed": always_higher_seed,
    "kenpom_rank": kenpom_rank,
    "seed_history": seed_history,
    "chalk_with_upsets": chalk_with_upsets,
    "composite_rank": composite_rank,
}
