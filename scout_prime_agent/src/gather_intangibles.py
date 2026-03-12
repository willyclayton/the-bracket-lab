"""
Intangibles Intelligence Gathering — Context Export Script.
Prepares research context for each tournament team so Claude Code can
analyze intangibles directly (no API calls needed).

Modes:
    --export-context   Export team list + prompt template for Claude Code
    --import-results   Validate and compile Claude Code's output into final intangibles JSON

Usage:
    python scout_prime_agent/src/gather_intangibles.py --year 2026 --export-context
    python scout_prime_agent/src/gather_intangibles.py --year 2024 --export-context --reconstructed
    python scout_prime_agent/src/gather_intangibles.py --year 2024 --import-results path/to/results.json
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils import (
    get_r64_matchups, load_json, save_json,
    DATA_DIR, PROJECT_ROOT, RESEARCH_DIR,
)

# Intel categories
INTEL_CATEGORIES = [
    "social_media",   # Late-night activity, transfer portal flirtation, team chemistry signals
    "motivation",     # Playing for someone, revenge games, legacy narratives
    "logistics",      # Travel distance, hotel quality, equipment issues, bus problems
    "chemistry",      # Locker room vibes, coaching staff tension, player conflicts
    "health",         # Under-the-radar injuries, fatigue, illness going around team
    "local_buzz",     # Beat reporter sentiment, local blog mood, fan confidence
    "preparation",    # Practice reports, shoot-around energy, scout film availability
    "wildcards",      # Anything else (catered food, campus distractions, eligibility scares)
]

RESEARCH_PROMPT_LIVE = """You are an obsessive sports intelligence analyst — a glorified stalker scout — investigating everything that could impact {team_name}'s ({seed}-seed, {conference}) March Madness tournament performance beyond the box score.

Dig deep into qualitative and circumstantial factors. I need SPECIFIC, sourced intel items — not generic observations. Think like an investigative reporter crossed with a degenerate gambler.

Research the following dimensions for {team_name} heading into the {year} NCAA Tournament:

1. **Social Media Activity** — Any key players posting late at night? Transfer portal flirtation? Cryptic Instagram stories? Team chemistry signals from social media?
2. **Motivation / Narrative** — Is the team playing for someone (memorial, tribute, retiring coach)? Any revenge game storylines? Legacy narratives for seniors?
3. **Logistics** — How far do they travel to their tournament site? Any known issues with accommodations, equipment, or scheduling?
4. **Team Chemistry** — Locker room vibes, coaching staff tension, player conflicts, recent suspensions or benchings?
5. **Health / Fatigue** — Under-the-radar injuries beyond official designations? Conference tournament fatigue? Illness going through the team?
6. **Local Buzz** — What are local beat reporters saying? Fan confidence level? Any concerning trends from people who watch every game?
7. **Preparation** — Practice reports, shoot-around energy, game plan whispers?
8. **Wildcards** — Anything else unusual: academic eligibility concerns, off-court distractions, coaching carousel rumors, campus events?

For each intel item, classify:
- **category**: one of: social_media, motivation, logistics, chemistry, health, local_buzz, preparation, wildcards
- **signal**: "positive" (tailwind), "negative" (red flag), or "neutral" (notable but unclear)
- **impact**: "high" (could swing a game), "moderate" (worth noting), or "low" (color/flavor)
- **detail**: Specific, concrete information (not vague generalities)
- **source**: Where this intel comes from (beat reporter name, social media platform, etc.)

Also provide:
- **summary**: 1-2 sentence overall read on this team's intangible profile
- **red_flags**: List of specific concerns (strings)
- **tailwinds**: List of specific advantages (strings)
- **overall_vibe_score**: 1-10 scale (10 = everything is perfect, 1 = dumpster fire)

Respond with ONLY valid JSON:
```json
{{
  "intel": [
    {{
      "category": "motivation",
      "signal": "positive",
      "detail": "Specific detail here",
      "impact": "high",
      "source": "Source here"
    }}
  ],
  "summary": "Overall assessment here",
  "red_flags": ["flag1", "flag2"],
  "tailwinds": ["wind1", "wind2"],
  "overall_vibe_score": 7.5
}}
```

Provide at least 3 intel items. Be specific and honest — if you can't find real intel on a dimension, skip it rather than making something up. For dimensions where you have genuine intel, be detailed.
"""

RESEARCH_PROMPT_RECONSTRUCTED = """You are an obsessive sports intelligence analyst reconstructing the intangible factors for {team_name} ({seed}-seed, {conference}) heading into the {year} NCAA Tournament.

Using your training data knowledge of the {year} college basketball season, reconstruct the qualitative and circumstantial factors that were relevant for this team BEFORE the tournament started. Think about what was being discussed by beat reporters, what the team chemistry looked like, any injury concerns, motivational narratives, etc.

IMPORTANT: Only include information that was known BEFORE the tournament. Do NOT include any tournament game results or how far the team actually went.

For each intel item, classify:
- **category**: one of: social_media, motivation, logistics, chemistry, health, local_buzz, preparation, wildcards
- **signal**: "positive" (tailwind), "negative" (red flag), or "neutral" (notable but unclear)
- **impact**: "high" (could swing a game), "moderate" (worth noting), or "low" (color/flavor)
- **detail**: Specific, concrete information
- **source**: Where this intel would have come from

Also provide:
- **summary**: 1-2 sentence overall read on this team's intangible profile
- **red_flags**: List of specific concerns
- **tailwinds**: List of specific advantages
- **overall_vibe_score**: 1-10 scale

Respond with ONLY valid JSON:
```json
{{
  "intel": [
    {{
      "category": "motivation",
      "signal": "positive",
      "detail": "Specific detail here",
      "impact": "high",
      "source": "Source here"
    }}
  ],
  "summary": "Overall assessment here",
  "red_flags": ["flag1", "flag2"],
  "tailwinds": ["wind1", "wind2"],
  "overall_vibe_score": 7.5
}}
```

Provide at least 3 intel items. Be specific — reconstruct what was actually known at the time, not generic observations.
"""


def validate_intangibles(data):
    """
    Validate a team's intangibles data structure.
    Returns (is_valid, errors).
    """
    errors = []

    if "intel" not in data:
        errors.append("Missing 'intel' field")
    elif not isinstance(data["intel"], list):
        errors.append("'intel' must be a list")
    else:
        for i, item in enumerate(data["intel"]):
            if item.get("category") not in INTEL_CATEGORIES:
                errors.append(f"intel[{i}]: invalid category '{item.get('category')}'")
            if item.get("signal") not in ("positive", "negative", "neutral"):
                errors.append(f"intel[{i}]: invalid signal '{item.get('signal')}'")
            if item.get("impact") not in ("high", "moderate", "low"):
                errors.append(f"intel[{i}]: invalid impact '{item.get('impact')}'")
            if not item.get("detail"):
                errors.append(f"intel[{i}]: missing 'detail'")

    if "overall_vibe_score" not in data:
        errors.append("Missing 'overall_vibe_score'")
    elif not isinstance(data["overall_vibe_score"], (int, float)):
        errors.append("'overall_vibe_score' must be a number")
    elif not (1.0 <= data["overall_vibe_score"] <= 10.0):
        errors.append(f"'overall_vibe_score' must be 1-10, got {data['overall_vibe_score']}")

    return len(errors) == 0, errors


def export_context(year, reconstructed, limit=0):
    """
    Export research context for Claude Code to analyze.
    Writes:
      - research_context_intangibles_YYYY.json (machine-readable)
      - REVIEW_intangibles_YYYY.md (human-readable verification doc)
    """
    print(f"\n1. Loading tournament teams...")
    matchups, _ = get_r64_matchups(year)
    if not matchups:
        print(f"   ERROR: No R64 matchups found for {year}")
        return

    # Collect unique teams with seeds and regions
    teams = {}
    for m in matchups:
        teams[m["team1"]] = {"seed": m["seed1"], "region": m["region"]}
        teams[m["team2"]] = {"seed": m["seed2"], "region": m["region"]}

    print(f"   Found {len(teams)} tournament teams")

    # Load team metadata for conference info
    teams_meta_path = os.path.join(DATA_DIR, "meta", "teams.json")
    teams_meta = {}
    if os.path.exists(teams_meta_path):
        teams_meta = load_json(teams_meta_path)
        if isinstance(teams_meta, list):
            teams_meta = {t["name"]: t for t in teams_meta if "name" in t}

    # Build team list
    team_list = sorted(teams.keys())
    if limit > 0:
        team_list = team_list[:limit]

    # Select prompt template
    prompt_template = RESEARCH_PROMPT_RECONSTRUCTED if reconstructed else RESEARCH_PROMPT_LIVE

    # Build context export
    team_contexts = []
    for team_name in team_list:
        info = teams[team_name]
        conference = teams_meta.get(team_name, {}).get("conference", "Unknown")
        team_contexts.append({
            "team_name": team_name,
            "seed": info["seed"],
            "region": info["region"],
            "conference": conference,
        })

    context_output = {
        "year": year,
        "reconstructed": reconstructed,
        "prompt_template": prompt_template,
        "intel_categories": INTEL_CATEGORIES,
        "teams": team_contexts,
        "output_schema": {
            "description": "For each team, produce a JSON object with: intel (list), summary (str), red_flags (list[str]), tailwinds (list[str]), overall_vibe_score (float 1-10)",
            "intel_item_schema": {
                "category": "one of: " + ", ".join(INTEL_CATEGORIES),
                "signal": "positive | negative | neutral",
                "impact": "high | moderate | low",
                "detail": "string — specific, concrete information",
                "source": "string — where this intel comes from",
            },
        },
        "instructions": (
            "Claude Code should analyze each team and write the results to "
            f"data/research/intangibles_{year}.json using the output schema above. "
            "Alternatively, write raw results to a file and run "
            f"gather_intangibles.py --year {year} --import-results <path> to validate and compile."
        ),
    }

    # Write machine-readable context
    context_path = os.path.join(RESEARCH_DIR, f"research_context_intangibles_{year}.json")
    save_json(context_output, context_path)

    # Write human-readable review doc
    review_path = os.path.join(RESEARCH_DIR, f"REVIEW_intangibles_{year}.md")
    mode_label = "Reconstructed" if reconstructed else "Live"

    md_lines = [
        f"# Intangibles Research Context — {year}",
        f"",
        f"**Mode:** {mode_label}",
        f"**Teams:** {len(team_contexts)}",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"",
        f"## Teams to Research",
        f"",
        f"| # | Team | Seed | Region | Conference |",
        f"|---|------|------|--------|------------|",
    ]

    for i, tc in enumerate(team_contexts, 1):
        md_lines.append(
            f"| {i} | {tc['team_name']} | {tc['seed']} | {tc['region']} | {tc['conference']} |"
        )

    md_lines.extend([
        f"",
        f"## Prompt Template",
        f"",
        f"```",
    ])

    # Show a filled example using the first team
    if team_contexts:
        ex = team_contexts[0]
        example_prompt = prompt_template.format(
            team_name=ex["team_name"],
            seed=ex["seed"],
            conference=ex["conference"],
            year=year,
        )
        md_lines.append(example_prompt)

    md_lines.extend([
        f"```",
        f"",
        f"## Output Schema",
        f"",
        f"Each team's intangibles should be a JSON object with:",
        f"- `intel`: list of intel items (category, signal, impact, detail, source)",
        f"- `summary`: 1-2 sentence overall assessment",
        f"- `red_flags`: list of specific concerns",
        f"- `tailwinds`: list of specific advantages",
        f"- `overall_vibe_score`: float 1-10",
        f"",
        f"Valid categories: {', '.join(INTEL_CATEGORIES)}",
        f"Valid signals: positive, negative, neutral",
        f"Valid impacts: high, moderate, low",
    ])

    with open(review_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"  Saved: {review_path}")

    print(f"\n{'='*60}")
    print(f"  CONTEXT EXPORT COMPLETE")
    print(f"  Teams: {len(team_contexts)}")
    print(f"  Mode: {mode_label}")
    print(f"  Context JSON: {context_path}")
    print(f"  Review doc: {review_path}")
    print(f"")
    print(f"  Next steps:")
    print(f"    1. Review {os.path.basename(review_path)} to verify team data")
    print(f"    2. Have Claude Code read the context file and research each team")
    print(f"    3. Claude Code writes results to data/research/intangibles_{year}.json")
    print(f"       OR write raw results and run:")
    print(f"       python gather_intangibles.py --year {year} --import-results <path>")
    print(f"{'='*60}")


def import_results(year, results_path, reconstructed=False):
    """
    Import and validate intangibles results from Claude Code.
    The results file should be a JSON dict keyed by team name -> intangibles data.
    Compiles into the final intangibles_YYYY.json with validation.
    """
    print(f"\n1. Loading results from {results_path}...")
    if not os.path.exists(results_path):
        print(f"   ERROR: File not found: {results_path}")
        return

    raw = load_json(results_path)

    # Handle both flat dict and wrapped format
    if isinstance(raw, dict) and "teams" in raw:
        teams_data = raw["teams"]
    elif isinstance(raw, dict):
        teams_data = raw
    else:
        print(f"   ERROR: Expected a JSON object keyed by team name")
        return

    print(f"   Found {len(teams_data)} teams")

    # Load tournament teams for seed info
    matchups, _ = get_r64_matchups(year)
    teams_info = {}
    if matchups:
        for m in matchups:
            teams_info[m["team1"]] = {"seed": m["seed1"], "region": m["region"]}
            teams_info[m["team2"]] = {"seed": m["seed2"], "region": m["region"]}

    # Validate and compile
    print(f"\n2. Validating intangibles...")
    intangibles = {}
    valid_count = 0
    error_count = 0

    for team_name, data in teams_data.items():
        is_valid, errors = validate_intangibles(data)

        if not is_valid:
            print(f"   WARNING: {team_name} has validation errors:")
            for err in errors:
                print(f"     - {err}")
            error_count += 1

        # Fix up data even if there are minor issues
        for item in data.get("intel", []):
            if item.get("category") not in INTEL_CATEGORIES:
                item["category"] = "wildcards"
            if item.get("signal") not in ("positive", "negative", "neutral"):
                item["signal"] = "neutral"
            if item.get("impact") not in ("high", "moderate", "low"):
                item["impact"] = "moderate"

        vibe = data.get("overall_vibe_score", 5.0)
        vibe = max(1.0, min(10.0, float(vibe)))

        seed = teams_info.get(team_name, {}).get("seed", 0)

        intangibles[team_name] = {
            "name": team_name,
            "seed": seed,
            "overall_vibe_score": vibe,
            "intel": data.get("intel", []),
            "summary": data.get("summary", ""),
            "red_flags": data.get("red_flags", []),
            "tailwinds": data.get("tailwinds", []),
        }
        valid_count += 1

    # Build output
    output = {
        "year": year,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "reconstructed": reconstructed,
        "model_used": "claude-code",
        "teams": intangibles,
    }

    output_path = os.path.join(DATA_DIR, "research", f"intangibles_{year}.json")
    save_json(output, output_path)

    # Summary
    print(f"\n{'='*60}")
    print(f"  IMPORT COMPLETE")
    print(f"  Teams compiled: {valid_count}")
    print(f"  Validation warnings: {error_count}")
    print(f"  Output: {output_path}")

    if intangibles:
        vibes = [t["overall_vibe_score"] for t in intangibles.values()]
        avg_vibe = sum(vibes) / len(vibes)
        print(f"\n  Avg vibe score: {avg_vibe:.1f}")

        sorted_teams = sorted(intangibles.values(), key=lambda t: t["overall_vibe_score"], reverse=True)
        print(f"\n  Highest vibes:")
        for t in sorted_teams[:5]:
            print(f"    {t['seed']}-seed {t['name']}: {t['overall_vibe_score']:.1f}")
        print(f"\n  Lowest vibes:")
        for t in sorted_teams[-5:]:
            print(f"    {t['seed']}-seed {t['name']}: {t['overall_vibe_score']:.1f}")

    print(f"\n{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Gather intangibles intel for tournament teams")
    parser.add_argument("--year", type=int, required=True, help="Tournament year")
    parser.add_argument("--reconstructed", action="store_true",
                        help="Use reconstructed mode (for backtesting past years)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Limit number of teams to process (0 = all)")
    parser.add_argument("--export-context", action="store_true",
                        help="Export research context for Claude Code to analyze")
    parser.add_argument("--import-results", type=str, default=None,
                        help="Import and validate results from Claude Code (path to JSON)")
    args = parser.parse_args()

    year = args.year
    reconstructed = args.reconstructed or year < 2026

    print("=" * 60)
    print(f"  INTANGIBLES INTELLIGENCE GATHERING — {year}")
    print(f"  Mode: {'Reconstructed' if reconstructed else 'Live'}")
    print("=" * 60)

    if args.export_context:
        export_context(year, reconstructed, args.limit)
    elif args.import_results:
        import_results(year, args.import_results, reconstructed)
    else:
        print("\n  ERROR: Specify a mode:")
        print("    --export-context    Export team contexts for Claude Code")
        print("    --import-results    Import and validate Claude Code's output")
        print("\n  Example:")
        print(f"    python gather_intangibles.py --year {year} --export-context")


if __name__ == "__main__":
    main()
