"""
Bracket optimizer: find the single bracket that maximizes expected ESPN points.

Uses Monte Carlo simulation with pre-computed probability matrix for speed.
"""

import numpy as np
from utils.scoring import ROUND_POINTS, ROUND_ORDER


def optimize_bracket(predictor, r64_matchups, year, n_sims=5000, seed=42):
    """
    Find the bracket that maximizes expected ESPN points.

    1. Pre-compute all pairwise win probabilities
    2. Run Monte Carlo simulations using the probability matrix
    3. Count how often each team advances to each round
    4. Build bracket greedily using expected value per team
    """
    rng = np.random.RandomState(seed)

    # Build team info
    team_seeds = {}
    for m in r64_matchups:
        team_seeds[m["team_1"]] = m["seed_1"]
        team_seeds[m["team_2"]] = m["seed_2"]

    # Pre-compute probability matrix for all possible pairs
    prob_matrix = predictor.precompute_all_matchups(team_seeds, year)

    # Pre-compute R64 probabilities
    r64_probs = []
    r64_teams = []
    for m in r64_matchups:
        t1, t2 = m["team_1"], m["team_2"]
        prob = prob_matrix.get((t1, t2), 0.5)
        r64_probs.append(prob)
        r64_teams.append((t1, t2))

    # Monte Carlo simulation — now fast since we use pre-computed probs
    advance_counts = {}  # (team, round_name) -> count

    for _ in range(n_sims):
        # R64
        r64_winners = []
        for i, (t1, t2) in enumerate(r64_teams):
            if rng.random() < r64_probs[i]:
                r64_winners.append(t1)
            else:
                r64_winners.append(t2)

        # Track R64 winners
        for t in r64_winners:
            advance_counts[(t, "R64")] = advance_counts.get((t, "R64"), 0) + 1

        # Advance through rounds
        prev_winners = r64_winners
        for round_name in ROUND_ORDER[1:]:
            round_winners = []
            for i in range(0, len(prev_winners), 2):
                if i + 1 >= len(prev_winners):
                    round_winners.append(prev_winners[i])
                    continue
                t1, t2 = prev_winners[i], prev_winners[i + 1]
                prob = prob_matrix.get((t1, t2), 0.5)
                if rng.random() < prob:
                    round_winners.append(t1)
                else:
                    round_winners.append(t2)

            for t in round_winners:
                advance_counts[(t, round_name)] = advance_counts.get((t, round_name), 0) + 1

            prev_winners = round_winners

    # Convert to probabilities
    advance_probs = {k: v / n_sims for k, v in advance_counts.items()}

    # Build optimal bracket using expected value
    return _build_ev_bracket(r64_matchups, advance_probs, prob_matrix)


def _build_ev_bracket(r64_matchups, advance_probs, prob_matrix):
    """
    Build bracket by picking the team with higher expected ESPN point value
    at each decision point.
    """
    predictions = {}

    # R64
    r64_winners = []
    for m in r64_matchups:
        t1, t2 = m["team_1"], m["team_2"]
        ev1 = _team_ev(t1, advance_probs)
        ev2 = _team_ev(t2, advance_probs)
        r64_winners.append(t1 if ev1 >= ev2 else t2)
    predictions["R64"] = r64_winners

    # Later rounds
    prev_winners = r64_winners
    for round_name in ROUND_ORDER[1:]:
        round_winners = []
        for i in range(0, len(prev_winners), 2):
            if i + 1 >= len(prev_winners):
                round_winners.append(prev_winners[i])
                continue
            t1, t2 = prev_winners[i], prev_winners[i + 1]
            ev1 = _team_ev(t1, advance_probs, from_round=round_name)
            ev2 = _team_ev(t2, advance_probs, from_round=round_name)
            round_winners.append(t1 if ev1 >= ev2 else t2)
        predictions[round_name] = round_winners
        prev_winners = round_winners

    return predictions


def _team_ev(team, advance_probs, from_round=None):
    """Expected ESPN point contribution from this round onward."""
    total = 0
    started = (from_round is None)
    for round_name in ROUND_ORDER:
        if round_name == from_round:
            started = True
        if not started:
            continue
        prob = advance_probs.get((team, round_name), 0)
        total += prob * ROUND_POINTS[round_name]
    return total


def pick_all_favorites(predictor, r64_matchups, year, team_seeds):
    """Just pick the model's favorite in every game (no optimization)."""
    predictions = {}

    r64_winners = []
    for m in r64_matchups:
        prob = predictor.predict(
            m["team_1"], m["team_2"], m["seed_1"], m["seed_2"],
            year, round_num=0,
        )
        r64_winners.append(m["team_1"] if prob >= 0.5 else m["team_2"])
    predictions["R64"] = r64_winners

    prev_winners = r64_winners
    for ri, round_name in enumerate(ROUND_ORDER[1:], 1):
        round_winners = []
        for i in range(0, len(prev_winners), 2):
            if i + 1 >= len(prev_winners):
                round_winners.append(prev_winners[i])
                continue
            t1, t2 = prev_winners[i], prev_winners[i + 1]
            s1 = team_seeds.get(t1, 8)
            s2 = team_seeds.get(t2, 8)
            prob = predictor.predict(t1, t2, s1, s2, year, round_num=ri)
            round_winners.append(t1 if prob >= 0.5 else t2)
        predictions[round_name] = round_winners
        prev_winners = round_winners

    return predictions
