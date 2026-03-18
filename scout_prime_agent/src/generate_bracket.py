"""
Step 4: Generate bracket predictions — Export/Import workflow.
No API calls. Scripts prepare matchup contexts; Claude Code makes picks.

Modes:
    --export-round <round>    Export matchup context packets for a round
    --import-picks <round>    Import Claude Code's picks, advance winners
    --compile-bracket         Assemble all round picks into final bracket JSON

Usage:
    python scout_prime_agent/src/generate_bracket.py --year 2024 --export-round round_of_64
    python scout_prime_agent/src/generate_bracket.py --year 2024 --import-picks round_of_64 --export-round round_of_32
    python scout_prime_agent/src/generate_bracket.py --year 2024 --compile-bracket
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    get_r64_matchups, load_json, save_json, score_bracket,
    print_results, append_to_run_log,
    RESEARCH_DIR, PROJECT_ROOT, ROUND_ORDER, ESPN_ROUND_POINTS,
)
from prompts import (
    SYSTEM_PROMPT, ROUND_CONTEXT_TEMPLATE, ROUND_GUIDANCE,
    build_full_prompt,
)
from build_matchup_contexts import (
    build_r64_contexts, build_later_round_contexts,
    load_seed_history, load_upset_factors,
)

ROUND_LABELS = {
    "round_of_64": "Round of 64",
    "round_of_32": "Round of 32",
    "sweet_16": "Sweet 16",
    "elite_8": "Elite 8",
    "final_four": "Final Four",
    "championship": "Championship",
}

ROUND_GAME_COUNTS = {
    "round_of_64": 32,
    "round_of_32": 16,
    "sweet_16": 8,
    "elite_8": 4,
    "final_four": 2,
    "championship": 1,
}

ROUND_PREFIXES = {
    "round_of_64": "r64",
    "round_of_32": "r32",
    "sweet_16": "s16",
    "elite_8": "e8",
    "final_four": "f4",
    "championship": "champ",
}


def format_matchup_prompt(context, round_name):
    """
    Build the full formatted prompt for a single matchup.
    Returns the combined system + user prompt text for Claude Code to analyze.
    """
    pts = ESPN_ROUND_POINTS[round_name]
    num_games = ROUND_GAME_COUNTS[round_name]
    round_context = ROUND_CONTEXT_TEMPLATE.format(
        round_name=ROUND_LABELS[round_name],
        points_per_game=pts,
        num_games=num_games,
        total_points=pts * num_games,
        round_guidance=ROUND_GUIDANCE.get(round_name, ""),
    )

    # Build "how they got here" text
    how_they_got_here_text = None
    if context.get("how_they_got_here"):
        parts = []
        for team, victories in context["how_they_got_here"].items():
            if victories:
                vic_lines = []
                for v in victories:
                    vic_lines.append(f"  - {v['round']}: defeated {v['opponent_seed']}-seed {v['opponent']}")
                parts.append(f"**{team}:**\n" + "\n".join(vic_lines))
        if parts:
            how_they_got_here_text = "\n\n".join(parts)

    # Build full prompt
    user_prompt = round_context + "\n\n" + build_full_prompt(
        round_name=round_name,
        region=context["region"],
        team1=context["team1"],
        team2=context["team2"],
        seed1=context["seed1"],
        seed2=context["seed2"],
        stats1=context["team1_stats"],
        stats2=context["team2_stats"],
        archetypes1=context.get("team1_archetypes"),
        archetypes2=context.get("team2_archetypes"),
        seed_history=context.get("seed_matchup_history"),
        upset_score=context.get("upset_vulnerability"),
        how_they_got_here=how_they_got_here_text,
    )

    return user_prompt


def export_round(year, round_name):
    """
    Export matchup context packets for a round.
    Writes:
      - matchup_prompts/<prefix>_<year>.json (machine-readable)
      - REVIEW_scout_prime_<prefix>_<year>.md (human-readable)
    """
    prefix = ROUND_PREFIXES[round_name]
    round_label = ROUND_LABELS[round_name]

    # Load research data
    enriched_path = os.path.join(RESEARCH_DIR, f"teams_enriched_{year}.json")
    archetypes_path = os.path.join(RESEARCH_DIR, f"historical_archetypes_{year}.json")

    if not os.path.exists(enriched_path):
        print(f"\n  ERROR: Run data pipeline first:")
        print(f"    python scout_prime_agent/src/enrich_teams.py --year {year}")
        print(f"    python scout_prime_agent/src/build_archetypes.py --year {year}")
        return

    enriched = load_json(enriched_path)
    archetypes = load_json(archetypes_path) if os.path.exists(archetypes_path) else {}
    seed_history = load_seed_history()
    upset_factors = load_upset_factors()

    # Build contexts
    if round_name == "round_of_64":
        contexts = build_r64_contexts(year)
    else:
        # Load previous round picks to determine matchups
        all_games = _load_all_previous_picks(year, round_name)
        if not all_games:
            print(f"\n  ERROR: No previous round picks found. Import picks for earlier rounds first.")
            return

        contexts = build_later_round_contexts(
            year, round_name, None,
            enriched, archetypes, seed_history, upset_factors,
            all_games
        )

    if not contexts:
        print(f"\n  ERROR: No matchup contexts built for {round_label}")
        return

    print(f"\n  Built {len(contexts)} matchup contexts for {round_label}")

    # Format prompts for each matchup
    matchup_packets = []
    for ctx in contexts:
        formatted_prompt = format_matchup_prompt(ctx, round_name)
        matchup_packets.append({
            "gameId": ctx["gameId"],
            "round": round_name,
            "region": ctx["region"],
            "team1": ctx["team1"],
            "seed1": ctx["seed1"],
            "team2": ctx["team2"],
            "seed2": ctx["seed2"],
            "formatted_prompt": formatted_prompt,
        })

    # Write machine-readable JSON
    prompts_dir = os.path.join(RESEARCH_DIR, "matchup_prompts")
    os.makedirs(prompts_dir, exist_ok=True)
    prompts_path = os.path.join(prompts_dir, f"{prefix}_{year}.json")

    export_data = {
        "year": year,
        "round": round_name,
        "round_label": round_label,
        "system_prompt": SYSTEM_PROMPT,
        "num_games": len(matchup_packets),
        "pick_format": {
            "gameId": "string — must match the gameId in each matchup",
            "pick": "string — must be exactly one of team1 or team2",
            "confidence": "integer 50-99",
            "reasoning": "string — 2-3 sentence explanation",
        },
        "matchups": matchup_packets,
    }
    save_json(export_data, prompts_path)

    # Write human-readable review doc
    review_path = os.path.join(RESEARCH_DIR, f"REVIEW_scout_prime_{prefix}_{year}.md")
    md_lines = [
        f"# Scout Prime — {round_label} Matchups ({year})",
        f"",
        f"**Games:** {len(matchup_packets)}",
        f"**Points per correct pick:** {ESPN_ROUND_POINTS[round_name]}",
        f"",
        f"## System Prompt",
        f"```",
        SYSTEM_PROMPT,
        f"```",
        f"",
        f"---",
        f"",
    ]

    for i, mp in enumerate(matchup_packets, 1):
        md_lines.extend([
            f"## Game {i}: {mp['seed1']}-seed {mp['team1']} vs {mp['seed2']}-seed {mp['team2']}",
            f"**Region:** {mp['region']} | **Game ID:** {mp['gameId']}",
            f"",
            f"<details>",
            f"<summary>Full matchup context (click to expand)</summary>",
            f"",
            f"```",
            mp["formatted_prompt"],
            f"```",
            f"</details>",
            f"",
            f"---",
            f"",
        ])

    with open(review_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"  Saved: {review_path}")

    # Write expected picks path
    picks_dir = os.path.join(RESEARCH_DIR, "matchup_picks")
    os.makedirs(picks_dir, exist_ok=True)
    picks_path = os.path.join(picks_dir, f"{prefix}_{year}.json")

    print(f"\n{'='*60}")
    print(f"  EXPORT COMPLETE — {round_label}")
    print(f"  Games: {len(matchup_packets)}")
    print(f"  Prompts: {prompts_path}")
    print(f"  Review: {review_path}")
    print(f"")
    print(f"  Next steps:")
    print(f"    1. Review {os.path.basename(review_path)} to verify matchup data")
    print(f"    2. Have Claude Code read {os.path.basename(prompts_path)}")
    print(f"    3. Claude Code writes picks to: {picks_path}")
    print(f"    4. Run: python generate_bracket.py --year {year} --import-picks {round_name}")
    print(f"{'='*60}")


def import_picks(year, round_name):
    """
    Import Claude Code's picks for a round, validate them, and save.
    Returns the list of game dicts for this round.
    """
    prefix = ROUND_PREFIXES[round_name]
    round_label = ROUND_LABELS[round_name]

    # Load picks
    picks_path = os.path.join(RESEARCH_DIR, "matchup_picks", f"{prefix}_{year}.json")
    if not os.path.exists(picks_path):
        print(f"\n  ERROR: Picks file not found: {picks_path}")
        print(f"  Have Claude Code write picks to this path first.")
        return None

    picks = load_json(picks_path)
    if not isinstance(picks, list):
        print(f"  ERROR: Picks file must be a JSON array")
        return None

    # Load the exported prompts to validate picks against
    prompts_path = os.path.join(RESEARCH_DIR, "matchup_prompts", f"{prefix}_{year}.json")
    if not os.path.exists(prompts_path):
        print(f"  WARNING: Prompts file not found for validation: {prompts_path}")
        expected_games = {}
    else:
        prompts_data = load_json(prompts_path)
        expected_games = {m["gameId"]: m for m in prompts_data["matchups"]}

    # Validate and build game records
    print(f"\n  Validating {len(picks)} picks for {round_label}...")
    games = []
    errors = 0

    for pick in picks:
        game_id = pick.get("gameId")
        if not game_id:
            print(f"    ERROR: Pick missing gameId: {pick}")
            errors += 1
            continue

        picked_team = pick.get("pick")
        confidence = pick.get("confidence", 70)
        reasoning = pick.get("reasoning", "")

        # Validate against expected matchup
        if expected_games and game_id in expected_games:
            expected = expected_games[game_id]
            if picked_team not in [expected["team1"], expected["team2"]]:
                # Try case-insensitive match
                if picked_team and picked_team.lower() == expected["team1"].lower():
                    picked_team = expected["team1"]
                elif picked_team and picked_team.lower() == expected["team2"].lower():
                    picked_team = expected["team2"]
                else:
                    print(f"    ERROR: Invalid pick '{picked_team}' for {game_id}. "
                          f"Must be '{expected['team1']}' or '{expected['team2']}'")
                    errors += 1
                    continue

            game = {
                "gameId": game_id,
                "round": round_name,
                "region": expected["region"],
                "seed1": expected["seed1"],
                "team1": expected["team1"],
                "seed2": expected["seed2"],
                "team2": expected["team2"],
                "pick": picked_team,
                "confidence": max(50, min(99, int(confidence))),
                "reasoning": reasoning,
            }
        else:
            # No validation data — trust the pick
            game = {
                "gameId": game_id,
                "round": round_name,
                "region": pick.get("region", "Unknown"),
                "seed1": pick.get("seed1", 0),
                "team1": pick.get("team1", ""),
                "seed2": pick.get("seed2", 0),
                "team2": pick.get("team2", ""),
                "pick": picked_team,
                "confidence": max(50, min(99, int(confidence))),
                "reasoning": reasoning,
            }

        games.append(game)

        pick_seed = game["seed1"] if game["pick"] == game["team1"] else game["seed2"]
        upset = "UPSET" if pick_seed > min(game["seed1"], game["seed2"]) else ""
        print(f"    {game['seed1']}-{game['team1']:20s} vs {game['seed2']}-{game['team2']:20s} "
              f"-> {game['pick']:20s} ({game['confidence']}%) {upset}")

    if errors > 0:
        print(f"\n  WARNING: {errors} picks had errors")

    expected_count = ROUND_GAME_COUNTS[round_name]
    if len(games) != expected_count:
        print(f"\n  WARNING: Expected {expected_count} games, got {len(games)}")

    # Save validated picks as game records
    validated_path = os.path.join(RESEARCH_DIR, "matchup_picks", f"{prefix}_{year}_validated.json")
    save_json(games, validated_path)

    print(f"\n  {round_label}: {len(games)} picks imported successfully")
    return games


def _load_all_previous_picks(year, current_round):
    """Load all validated picks from rounds before current_round."""
    all_games = []
    for rnd in ROUND_ORDER:
        if rnd == current_round:
            break
        prefix = ROUND_PREFIXES[rnd]
        validated_path = os.path.join(RESEARCH_DIR, "matchup_picks", f"{prefix}_{year}_validated.json")
        if os.path.exists(validated_path):
            games = load_json(validated_path)
            all_games.extend(games)
        else:
            print(f"  WARNING: No validated picks for {rnd}")
    return all_games


def compile_bracket(year):
    """
    Assemble all round picks into the final bracket JSON.
    Scores against actual results if available.
    """
    print(f"\n  Compiling bracket from all round picks...")

    rounds = {}
    total_games = 0

    for rnd in ROUND_ORDER:
        prefix = ROUND_PREFIXES[rnd]
        validated_path = os.path.join(RESEARCH_DIR, "matchup_picks", f"{prefix}_{year}_validated.json")
        if not os.path.exists(validated_path):
            print(f"  ERROR: Missing picks for {ROUND_LABELS[rnd]}")
            print(f"    Expected: {validated_path}")
            return

        games = load_json(validated_path)
        rounds[rnd] = games
        total_games += len(games)

    if total_games != 63:
        print(f"  WARNING: Expected 63 games, got {total_games}")

    champion = rounds["championship"][0]["pick"]
    final_four = [g["pick"] for g in rounds["elite_8"]]

    bracket_data = {
        "model": "the-scout-prime",
        "displayName": "The Scout Prime",
        "tagline": "Same instincts. Ten times the intel.",
        "color": "#64748b",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "locked": True,
        "espnBracketUrl": None,
        "champion": champion,
        "championEliminated": False,
        "finalFour": final_four,
        "rounds": rounds,
    }

    # Save bracket
    if year >= 2026:
        output_path = os.path.join(PROJECT_ROOT, "data", "models", "the-scout-prime.json")
    else:
        output_path = os.path.join(PROJECT_ROOT, "data", "archive", str(year), "models", "the-scout-prime.json")

    save_json(bracket_data, output_path)

    print(f"\n{'='*60}")
    print(f"  BRACKET COMPLETE")
    print(f"  Champion: {champion}")
    print(f"  Final Four: {', '.join(final_four)}")
    print(f"  Output: {output_path}")
    print(f"{'='*60}")

    # Score against actual results
    espn_result, espn_pct = score_bracket(rounds, year)
    if espn_result:
        run_name = f"Scout Prime (Claude Code) — {year}"
        results_by_year = {year: (espn_result, espn_pct)}
        print_results(run_name, results_by_year)
        append_to_run_log(
            run_name, results_by_year,
            notes=f"Generated via Claude Code (no API). Total games: {total_games}.",
        )
    else:
        print(f"\n  No actual results available for {year} — scoring skipped")


def main():
    parser = argparse.ArgumentParser(description="Generate Scout Prime bracket (export/import workflow)")
    parser.add_argument("--year", type=int, required=True, help="Tournament year (2024, 2025, 2026)")
    parser.add_argument("--export-round", type=str, default=None,
                        choices=list(ROUND_LABELS.keys()),
                        help="Export matchup contexts for a round")
    parser.add_argument("--import-picks", type=str, default=None,
                        choices=list(ROUND_LABELS.keys()),
                        help="Import Claude Code's picks for a round")
    parser.add_argument("--compile-bracket", action="store_true",
                        help="Assemble all round picks into final bracket JSON")
    args = parser.parse_args()

    year = args.year

    print("=" * 60)
    print(f"  SCOUT PRIME BRACKET GENERATION — {year}")
    print("=" * 60)

    # Import picks first (if specified), then export next round
    if args.import_picks:
        games = import_picks(year, args.import_picks)
        if games is None:
            return

    if args.export_round:
        export_round(year, args.export_round)

    if args.compile_bracket:
        compile_bracket(year)

    if not args.export_round and not args.import_picks and not args.compile_bracket:
        print("\n  ERROR: Specify a mode:")
        print("    --export-round <round>    Export matchup contexts for Claude Code")
        print("    --import-picks <round>    Import and validate Claude Code's picks")
        print("    --compile-bracket         Assemble final bracket JSON")
        print("\n  Workflow:")
        print(f"    1. python generate_bracket.py --year {year} --export-round round_of_64")
        print(f"    2. Claude Code reads matchups and writes picks")
        print(f"    3. python generate_bracket.py --year {year} --import-picks round_of_64 --export-round round_of_32")
        print(f"    4. Repeat for each round through championship")
        print(f"    5. python generate_bracket.py --year {year} --compile-bracket")


if __name__ == "__main__":
    main()
