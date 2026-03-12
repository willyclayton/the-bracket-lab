"""
ESPN Tournament Challenge scoring utilities.
"""

ROUND_POINTS = {
    "R64": 10,
    "R32": 20,
    "S16": 40,
    "E8": 80,
    "F4": 160,
    "Championship": 320,
}

ROUND_ORDER = ["R64", "R32", "S16", "E8", "F4", "Championship"]
MAX_POINTS = 1920  # 32*10 + 16*20 + 8*40 + 4*80 + 2*160 + 1*320

GAMES_PER_ROUND = {
    "R64": 32,
    "R32": 16,
    "S16": 8,
    "E8": 4,
    "F4": 2,
    "Championship": 1,
}


def score_bracket(predictions, actuals):
    """
    Score a bracket prediction against actual results.

    Args:
        predictions: dict mapping (round, game_index) -> predicted_winner OR
                     dict mapping round -> list of predicted winners
        actuals: same format with actual winners

    Returns:
        dict with total_points, round_breakdown, correct_picks, total_picks
    """
    total = 0
    breakdown = {}
    correct = 0
    total_picks = 0

    for round_name in ROUND_ORDER:
        pts_per = ROUND_POINTS[round_name]
        pred_winners = predictions.get(round_name, [])
        actual_winners = actuals.get(round_name, [])

        round_correct = 0
        round_total = len(actual_winners)

        for pred in pred_winners:
            if pred in actual_winners:
                round_correct += 1

        round_points = round_correct * pts_per
        total += round_points
        correct += round_correct
        total_picks += round_total

        breakdown[round_name] = {
            "correct": round_correct,
            "total": round_total,
            "points": round_points,
        }

    return {
        "total_points": total,
        "round_breakdown": breakdown,
        "correct_picks": correct,
        "total_picks": total_picks,
    }


def expected_value(win_prob, round_name):
    """Expected ESPN points for a single pick given win probability."""
    return win_prob * ROUND_POINTS[round_name]


def compare_strategies(scores_a, scores_b, years):
    """Compare two strategies across multiple years."""
    results = []
    for year in years:
        sa = scores_a.get(year, 0)
        sb = scores_b.get(year, 0)
        results.append({
            "year": year,
            "strategy_a": sa,
            "strategy_b": sb,
            "diff": sa - sb,
        })
    return results
