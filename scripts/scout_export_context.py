"""
The Scout — Context Export Script.
Loads R64 matchups + team metadata, formats each matchup using The Scout's
6-factor analysis framework, and exports contexts for Claude Code to analyze.

No API calls. Claude Code reads the exported contexts and writes picks directly.

Usage:
    python scripts/scout_export_context.py --year 2026
    python scripts/scout_export_context.py --year 2024
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

# Set up paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Import shared utilities from scout_prime_agent for data loading
SCOUT_PRIME_SRC = os.path.join(PROJECT_ROOT, "scout_prime_agent", "src")
sys.path.insert(0, SCOUT_PRIME_SRC)
from utils import (
    get_r64_matchups, load_json, save_json, load_barttorvik,
    resolve_team_name, ROUND_ORDER,
)

# The Scout's 6-factor evaluation framework (from scout_prompt.md)
SCOUT_SYSTEM_PROMPT = """You are a veteran NCAA basketball scout evaluating a March Madness tournament matchup. Analyze this game and pick a winner based on your assessment of the following factors.

## Evaluation Criteria
Assess this matchup across these 6 factors. For each, briefly note which team has the edge:

1. **Coaching Experience** — Tournament wins, poise under pressure, tactical adjustments
2. **Roster Composition** — Age, experience, depth, star power
3. **Injury Impact** — Who's missing, who's limited, how much does it matter
4. **Clutch Performance** — How do these teams perform when it's tight
5. **Travel & Rest** — Distance to game site, days since last game
6. **Momentum** — Recent form, conference tournament performance, confidence level

Be honest. Don't default to the higher seed. If the lower seed has legitimate edges in 3+ factors, pick the upset. This is a scouting assessment, not a seed-ranking exercise."""

SCOUT_MATCHUP_TEMPLATE = """## Matchup
- **Game:** ({seed1}) {team1} vs. ({seed2}) {team2}
- **Round:** {round_label}
- **Region:** {region}

## Team 1: ({seed1}) {team1}
{team1_profile}

## Team 2: ({seed2}) {team2}
{team2_profile}

## Output Format
Respond with ONLY valid JSON:
{{
  "pick": "Team Name",
  "confidence": 75,
  "reasoning": "2-3 sentence scouting assessment explaining the pick",
  "factor_edges": {{
    "coaching": "Team Name",
    "roster": "Team Name",
    "injuries": "Team Name",
    "clutch": "Team Name",
    "travel_rest": "Team Name",
    "momentum": "Team Name"
  }}
}}

The "pick" field must be exactly one of: "{team1}" or "{team2}".
The "confidence" field must be an integer from 50 to 99."""

ROUND_LABELS = {
    "round_of_64": "Round of 64",
    "round_of_32": "Round of 32",
    "sweet_16": "Sweet 16",
    "elite_8": "Elite 8",
    "final_four": "Final Four",
    "championship": "Championship",
}


def format_scout_team_profile(team_name, seed, bt_stats, teams_meta):
    """Format a team profile using data available to The Scout."""
    meta = teams_meta.get(team_name, {})
    lines = []

    # Basic info
    conference = meta.get("conference", "Unknown")
    lines.append(f"- Conference: {conference}")

    if bt_stats:
        # KenPom / efficiency
        if "adj_em" in bt_stats:
            lines.append(f"- KenPom AdjEM: {bt_stats['adj_em']:.1f}")
        if "adj_o" in bt_stats:
            lines.append(f"- Key stats: AdjO {bt_stats['adj_o']:.1f}, AdjD {bt_stats.get('adj_d', 'N/A')}, Tempo {bt_stats.get('tempo', 'N/A')}")

    # Metadata fields (from teams.json)
    if meta.get("record"):
        lines.append(f"- Record: {meta['record']}")
    if meta.get("coach"):
        coach_line = f"- Coach: {meta['coach']}"
        if meta.get("coach_tournament_record"):
            coach_line += f" (tournament record: {meta['coach_tournament_record']})"
        lines.append(coach_line)
    if meta.get("roster_summary"):
        lines.append(f"- Roster: {meta['roster_summary']}")
    if meta.get("injuries"):
        lines.append(f"- Injuries: {meta['injuries']}")
    else:
        lines.append(f"- Injuries: None reported")
    if meta.get("last_10"):
        lines.append(f"- Last 10 games: {meta['last_10']}")
    if meta.get("conf_tourney_result"):
        lines.append(f"- Conference tournament result: {meta['conf_tourney_result']}")
    if meta.get("close_game_record"):
        lines.append(f"- Close game record (decided by 5 or fewer): {meta['close_game_record']}")

    return "\n".join(lines) if lines else f"- {seed}-seed, limited data available"


def main():
    parser = argparse.ArgumentParser(description="Export Scout matchup contexts for Claude Code")
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    args = parser.parse_args()

    year = args.year

    print("=" * 60)
    print(f"  THE SCOUT — CONTEXT EXPORT ({year})")
    print("=" * 60)

    # Load R64 matchups
    print(f"\n1. Loading R64 matchups...")
    matchups, _ = get_r64_matchups(year)
    if not matchups:
        print(f"   ERROR: No R64 matchups found for {year}")
        return

    print(f"   Found {len(matchups)} R64 matchups")

    # Load team metadata
    teams_meta_path = os.path.join(DATA_DIR, "meta", "teams.json")
    teams_meta = {}
    if os.path.exists(teams_meta_path):
        raw = load_json(teams_meta_path)
        if isinstance(raw, list):
            teams_meta = {t["name"]: t for t in raw if "name" in t}
        elif isinstance(raw, dict):
            teams_meta = raw

    # Load BartTorvik stats
    bt_data = load_barttorvik(year)
    if bt_data:
        print(f"   Loaded BartTorvik stats for {len(bt_data)} teams")

    # Build matchup contexts for all 32 R64 games
    print(f"\n2. Building matchup contexts...")
    matchup_contexts = []
    for m in matchups:
        team1 = m["team1"]
        team2 = m["team2"]
        seed1 = m["seed1"]
        seed2 = m["seed2"]
        region = m["region"]

        # Get BartTorvik stats
        bt1_name = resolve_team_name(team1, bt_data) if bt_data else None
        bt2_name = resolve_team_name(team2, bt_data) if bt_data else None
        bt1 = bt_data.get(bt1_name, {}) if bt1_name else {}
        bt2 = bt_data.get(bt2_name, {}) if bt2_name else {}

        # Format team profiles
        profile1 = format_scout_team_profile(team1, seed1, bt1, teams_meta)
        profile2 = format_scout_team_profile(team2, seed2, bt2, teams_meta)

        # Format the full matchup prompt
        formatted_prompt = SCOUT_MATCHUP_TEMPLATE.format(
            seed1=seed1, team1=team1,
            seed2=seed2, team2=team2,
            round_label="Round of 64",
            region=region,
            team1_profile=profile1,
            team2_profile=profile2,
        )

        matchup_contexts.append({
            "gameId": m["gameId"],
            "round": "round_of_64",
            "region": region,
            "team1": team1,
            "seed1": seed1,
            "team2": team2,
            "seed2": seed2,
            "formatted_prompt": formatted_prompt,
        })

    # Write machine-readable JSON
    output_path = os.path.join(SCRIPT_DIR, f"scout_contexts_{year}.json")
    export_data = {
        "year": year,
        "model": "the-scout",
        "system_prompt": SCOUT_SYSTEM_PROMPT,
        "num_games": len(matchup_contexts),
        "round_order": list(ROUND_LABELS.keys()),
        "pick_format": {
            "gameId": "string — must match the gameId in each matchup",
            "pick": "string — must be exactly one of team1 or team2",
            "confidence": "integer 50-99",
            "reasoning": "string — 2-3 sentence scouting assessment",
            "factor_edges": {
                "coaching": "Team Name",
                "roster": "Team Name",
                "injuries": "Team Name",
                "clutch": "Team Name",
                "travel_rest": "Team Name",
                "momentum": "Team Name",
            },
        },
        "instructions": (
            "Claude Code should analyze all 32 R64 matchups using The Scout's 6-factor framework. "
            "Then use the R64 winners to build R32 matchups, and continue through the championship. "
            f"Write the final bracket to data/models/the-scout.json (or data/archive/{year}/models/the-scout.json for past years)."
        ),
        "matchups": matchup_contexts,
    }
    save_json(export_data, output_path)

    # Write human-readable review doc
    review_path = os.path.join(SCRIPT_DIR, f"REVIEW_scout_{year}.md")
    md_lines = [
        f"# The Scout — R64 Matchup Contexts ({year})",
        f"",
        f"**Games:** {len(matchup_contexts)}",
        f"**Model:** The Scout (6-factor LLM matchup analyst)",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"",
        f"## System Prompt",
        f"```",
        SCOUT_SYSTEM_PROMPT,
        f"```",
        f"",
        f"---",
        f"",
    ]

    for i, mc in enumerate(matchup_contexts, 1):
        md_lines.extend([
            f"## Game {i}: ({mc['seed1']}) {mc['team1']} vs ({mc['seed2']}) {mc['team2']}",
            f"**Region:** {mc['region']} | **Game ID:** {mc['gameId']}",
            f"",
            f"<details>",
            f"<summary>Full matchup context (click to expand)</summary>",
            f"",
            f"```",
            mc["formatted_prompt"],
            f"```",
            f"</details>",
            f"",
            f"---",
            f"",
        ])

    with open(review_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"  Saved: {review_path}")

    print(f"\n{'='*60}")
    print(f"  EXPORT COMPLETE")
    print(f"  Games: {len(matchup_contexts)}")
    print(f"  Contexts: {output_path}")
    print(f"  Review: {review_path}")
    print(f"")
    print(f"  Next steps:")
    print(f"    1. Review {os.path.basename(review_path)} to verify matchup data")
    print(f"    2. Have Claude Code read {os.path.basename(output_path)}")
    print(f"    3. Claude Code analyzes all 63 matchups round-by-round")
    print(f"    4. Claude Code writes data/models/the-scout.json")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
