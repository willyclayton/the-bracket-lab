# Scout Prime Pipeline Runbook

Complete step-by-step guide for running the Scout Prime bracket generation pipeline.

## Prerequisites

- Python 3.9+ with `pandas`, `numpy`, `scipy`
- BartTorvik CSV at `optimizer_agent/research/barttorvik_YYYY.csv`
- Bracket structure in `data/results/actual-results.json` (at minimum R64 matchups with teams/seeds/regions)
- Team metadata in `data/meta/teams.json`

## Pipeline Steps

### Step 0: Gather Intangibles (Optional but Recommended)

Export team contexts for Claude Code to research:
```bash
python scout_prime_agent/src/gather_intangibles.py --year 2026 --export-context
```

Outputs:
- `scout_prime_agent/research/research_context_intangibles_2026.json`
- `scout_prime_agent/research/REVIEW_intangibles_2026.md`

Have Claude Code research each team and write results. Then import:
```bash
python scout_prime_agent/src/gather_intangibles.py --year 2026 --import-results <path>
```

Output: `data/research/intangibles_2026.json`

For backtesting past years, add `--reconstructed`:
```bash
python scout_prime_agent/src/gather_intangibles.py --year 2024 --export-context --reconstructed
```

### Step 1: Enrich Team Profiles

```bash
python scout_prime_agent/src/enrich_teams.py --year 2026
```

Output: `scout_prime_agent/research/teams_enriched_2026.json`

**Verification checkpoint:** The script prints coverage stats. For 2026 with full teams.json data, expect:
- Efficiency: 64/64 (from BartTorvik)
- Coaching: 64/64
- Close Games: 64/64
- Momentum: 64/64
- Roster: 64/64
- Ball Control: 64/64
- Style: 64/64
- Avg fields per team: 30+

Spot-check a team (e.g., Duke) in the output JSON — it should have `coach`, `close_game_record`, `returning_minutes_pct`, `style`, `turnover_margin`, etc.

### Step 2: Build Historical Archetypes

```bash
python scout_prime_agent/src/build_archetypes.py --year 2026
```

Output: `scout_prime_agent/research/archetypes_2026.json`

Uses BartTorvik efficiency stats for cosine similarity matching against `data/research/historical-teams.json`.

### Step 3: Generate Bracket (Round by Round)

For each round, export matchup contexts, have Claude Code analyze, then import picks:

**Round of 64:**
```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --export-round round_of_64
```
- Review `scout_prime_agent/research/REVIEW_scout_prime_round_of_64_2026.md`
- Claude Code reads matchup prompts and writes picks
```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks round_of_64 --export-round round_of_32
```

**Round of 32:**
```bash
# (picks from R64 import above already exported R32 matchups)
# Claude Code analyzes R32 matchups
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks round_of_32 --export-round sweet_16
```

**Sweet 16:**
```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks sweet_16 --export-round elite_8
```

**Elite 8:**
```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks elite_8 --export-round final_four
```

**Final Four:**
```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks final_four --export-round championship
```

**Championship:**
```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks championship
```

### Step 4: Compile Final Bracket

```bash
python scout_prime_agent/src/generate_bracket.py --year 2026 --compile-bracket
```

Output: `data/models/the-scout-prime.json`

### Step 5: Update Website (if needed)

If the champion or Final Four picks changed, update hardcoded championship strings in `app/models/page.tsx`.

## Common Pitfalls

### Bug 1: teams.json `{"teams": [...]}` wrapper
`data/meta/teams.json` wraps the team list in a `{"teams": [...]}` object. Both `utils.py:load_teams_json()` and `gather_intangibles.py` must unwrap this before indexing by team name. Fixed March 2026.

### Bug 2: Nested field structure in teams.json
teams.json uses nested objects (`coaching.*`, `close_games.*`, `momentum.*`, `roster.*`, `shooting.*`, `ball_control.*`, `scout_profile.*`). The `enrich_team()` function must extract from nested paths, not look for flat keys. Fixed March 2026.

### Bug 3: Intangibles file must exist before enrichment
`data/research/intangibles_YYYY.json` is created by Step 0. If skipped, the pipeline works but prompts will lack field intelligence. Run Step 0 before Step 1 for best results.

### Final Four gameIds
2026 FF pairings: South vs East (`f4-south-east`), West vs Midwest (`f4-west-midwest`). These vary by year — always verify from ESPN/NCAA.com.

### BartTorvik name mismatches
Tournament team names don't always match BartTorvik names. Check `utils.py:TOURNAMENT_TO_BARTTORVIK` mapping. If enrichment shows "WARNING: No stats found for X", add a mapping entry.

## Verification Checklist

Before bracket generation:
- [ ] `teams_enriched_2026.json` has 64 teams
- [ ] Spot-check 3 teams: each has efficiency + coaching + close games + momentum + roster + style fields
- [ ] Avg fields per team is 30+
- [ ] Coverage stats show >0 for all categories
- [ ] REVIEW docs show full team profiles (not just efficiency)

After bracket generation:
- [ ] `the-scout-prime.json` has all 63 games with picks + confidence + reasoning
- [ ] Final Four gameIds match 2026 pairings (`f4-south-east`, `f4-west-midwest`)
- [ ] Compare against old bracket — expect meaningful differences from richer data
