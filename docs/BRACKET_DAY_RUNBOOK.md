# Bracket Day Runbook — March 15-19, 2026

Step-by-step guide for generating all 8 model brackets from Selection Sunday through picks lock.

---

## Prerequisites (before March 15)

- [ ] Download `barttorvik_2026.csv` → `optimizer_agent/research/`
- [ ] Verify all scripts run: `python scripts/quant.py --help`, `python scripts/historian.py --help`, `python scripts/chaos.py --help`
- [ ] Verify `data/results/actual-results.json` has R64 structure ready (or template from 2025)
- [ ] Confirm Python environment has required packages: `pandas`, `numpy`, `scipy`, `scikit-learn`
- [ ] Review `scout_prime_agent/CLAUDE.md` generation flow for Scout Prime steps

---

## Selection Sunday (March 15)

1. **Watch the bracket reveal** — note all 68 teams, seeds, regions, and play-in matchups
2. **Populate `data/meta/teams.json`** with all 68 teams:
   - name, seed, region, conference
   - Coach info, record, last 10, injuries (for Scout context)
3. **Create `data/results/actual-results.json`** with R64 bracket structure:
   - All 32 R64 games with team1/seed1/team2/seed2/region
   - Winner fields left as `null`
   - Include First Four play-in games if tracking those
4. **Download fresh BartTorvik data**: `barttorvik_2026.csv` → `optimizer_agent/research/`
5. **Commit**: `git commit -m "Selection Sunday: populate 2026 bracket structure"`

---

## After First Four (March 17-18)

1. **Update `data/results/actual-results.json`**: replace play-in spots with actual First Four winners
2. **Update `data/meta/teams.json`**: confirm 64-team field (play-in winners replace play-in matchups)
3. **Verify**: 32 R64 games in actual-results.json, all with real team names (no TBD/play-in placeholders)
4. **Commit**: `git commit -m "First Four complete: finalize 64-team field"`

---

## Run Models (March 18-19) — Order of Operations

### Batch 1: Pure Computation (run in parallel, ~5 min total)

These scripts are deterministic or simulation-based. Run them all at once.

```bash
# Terminal 1
python scripts/quant.py --year 2026

# Terminal 2
python scripts/historian.py --year 2026

# Terminal 3
python scripts/chaos.py --year 2026

# Terminal 4
python optimizer_agent/src/generate_bracket.py --year 2026

# Terminal 5
python super_agent/src/generate_bracket.py --year 2026
```

**Verify each output:**
- Check `data/models/the-quant.json` — 63 games, `locked: true`
- Check `data/models/the-historian.json` — 63 games, `locked: true`
- Check `data/models/the-chaos-agent.json` — 63 games, `locked: true`, 12+ upsets
- Check `data/models/the-optimizer.json` — 63 games, `locked: true`
- Check `data/models/the-super-agent.json` — 63 games, `locked: true`

### Batch 2: Claude Code Models (sequential, ~2-3 hours total)

These models require Claude Code to analyze matchups interactively.

#### 6. The Scout

```bash
# Step 1: Export matchup contexts
python scripts/scout_export_context.py --year 2026

# Step 2: Review the generated contexts
# Open scripts/REVIEW_scout_2026.md — verify all 32 matchup profiles look correct

# Step 3: Claude Code session
# Start Claude Code, have it read scripts/scout_contexts_2026.json
# Claude Code analyzes all 63 matchups round-by-round (R64 → R32 → S16 → E8 → F4 → Championship)
# Claude Code writes data/models/the-scout.json
```

#### 7. The Scout Prime

```bash
# Step 1: Gather intangibles (optional — enriches context)
python scout_prime_agent/src/gather_intangibles.py --year 2026 --export-context
# Claude Code reads the exported context, researches each team's intangibles
# Claude Code writes data/research/intangibles_2026.json

# Step 2: Enrich team profiles
python scout_prime_agent/src/enrich_teams.py --year 2026

# Step 3: Build historical archetypes
python scout_prime_agent/src/build_archetypes.py --year 2026

# Step 4: Generate bracket round by round
# For each round (R64 → R32 → S16 → E8 → F4 → Championship):
python scout_prime_agent/src/generate_bracket.py --year 2026 --export-round round_of_64
# Claude Code reads matchup prompts from research/matchup_prompts/
# Claude Code writes picks to research/matchup_picks/r64_2026.json
python scout_prime_agent/src/generate_bracket.py --year 2026 --import-picks round_of_64 --export-round round_of_32
# ... repeat for each subsequent round ...

# Step 5: Compile final bracket
python scout_prime_agent/src/generate_bracket.py --year 2026 --compile-bracket
```

#### 8. The Agent

```bash
# Step 1: Start screen recording (for LinkedIn content)
# Step 2: Open fresh Claude Code session in the repo directory
# Step 3: Paste the contents of scripts/agent_prompt.md
# Step 4: Let it run autonomously — do NOT intervene
# Step 5: When done, verify data/models/the-agent.json has 63 games
# Step 6: Stop screen recording
```

---

## Post-Generation Checklist

- [ ] **Verify all 8 bracket JSONs:**
  - Each has exactly 63 games
  - Each has `"locked": true`
  - Each has a `champion` field set
  - Each has `finalFour` array with 4 teams
  - All team names match `data/meta/teams.json`

- [ ] **Fill out ESPN Tournament Challenge brackets:**
  - Create 8 ESPN bracket entries (one per model)
  - Fill each bracket matching the model's JSON picks exactly
  - Save/lock each ESPN bracket before first game tips off

- [ ] **Add ESPN bracket URLs:**
  - Copy each ESPN bracket's share URL
  - Add `espnBracketUrl` to each model's JSON file

- [ ] **Deploy:**
  ```bash
  git add data/models/*.json
  git commit -m "2026 picks locked: all 8 model brackets generated"
  git push
  ```
  - Verify site updates on bracketlabs.vercel.app (~30 seconds)
  - Check `/brackets` page — all 8 model tabs should show populated brackets

- [ ] **Announce:**
  - LinkedIn post: "Picks are locked. 8 AI models. 504 predictions. Let's see who wins."
  - Include link to bracketlabs.vercel.app

---

## Quick Reference: Output Files

| Model | Script | Output |
|-------|--------|--------|
| The Scout | `scripts/scout_export_context.py` + Claude Code | `data/models/the-scout.json` |
| The Quant | `scripts/quant.py` | `data/models/the-quant.json` |
| The Historian | `scripts/historian.py` | `data/models/the-historian.json` |
| The Chaos Agent | `scripts/chaos.py` | `data/models/the-chaos-agent.json` |
| The Agent | `scripts/agent_prompt.md` + Claude Code | `data/models/the-agent.json` |
| The Super Agent | `super_agent/src/generate_bracket.py` | `data/models/the-super-agent.json` |
| The Optimizer | `optimizer_agent/src/generate_bracket.py` | `data/models/the-optimizer.json` |
| The Scout Prime | `scout_prime_agent/src/generate_bracket.py` | `data/models/the-scout-prime.json` |

---

## Troubleshooting

**"No BartTorvik data for YYYY"**
- Ensure `barttorvik_YYYY.csv` exists in `optimizer_agent/research/`
- Check column headers match expected: `team`, `adjoe`, `adjde`, `adjt`, `barthag`, `wab`, `elite sos`

**"No R64 matchups found for YYYY"**
- Ensure `data/results/actual-results.json` (or `data/archive/YYYY/results/actual-results.json`) exists
- Verify games have `round: "round_of_64"` entries

**Team name mismatches**
- Check `scout_prime_agent/src/utils.py` → `TOURNAMENT_TO_BARTTORVIK` mapping
- Add missing aliases as needed
- Common issues: "UConn" vs "Connecticut", "BYU" vs "Brigham Young", state abbreviations

**Script import errors**
- Ensure you're running from the project root: `cd the-bracket-lab && python scripts/quant.py --year 2026`
- Check that `scout_prime_agent/src/utils.py` and `optimizer_agent/src/utils.py` exist
