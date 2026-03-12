# The Scout Prime — Data-Saturated LLM Analyst Pipeline

## Mission
Build a March Madness prediction model that feeds Claude **maximum structured context** per matchup and asks it to synthesize a pick. Unlike The Scout (6 curated factors), Scout Prime dumps everything: efficiency ratings, shooting splits, rebounding, turnovers, close-game resilience, momentum, coaching records, historical archetypes, seed matchup history, and upset vulnerability scores.

The hypothesis: more data → better LLM picks. The Scout proved LLM contextual synthesis works. Scout Prime tests whether saturating it with data produces better brackets than curating a few dimensions.

## Key Concept: Data Saturation
- Every matchup gets a **context packet** with ~30 data points per team + computed matchup dynamics
- Historical twins provide base rates (what happened to similar teams in past tournaments)
- Seed matchup history adds priors (how often does this seed pairing produce upsets?)
- Pre-computed upset vulnerability scores flag risky games before the LLM sees them

## Critical Constraints

### Data Isolation
- All data lives in `scout_prime_agent/research/` — NO imports from other model directories
- Exception: may import scoring utilities from `optimizer_agent/src/utils.py` for ESPN evaluation
- This directory is entirely self-contained for research data

### Temporal Integrity
- **Historical twins:** 2010-2023 for 2024 backtest, 2010-2024 for 2025 backtest, 2010-2025 for 2026
- **Team stats:** BartTorvik data from the season being predicted (pre-tournament)
- **Results:** NEVER included in prompts. Used ONLY for post-prediction scoring
- **No features that encode outcomes** (e.g., "how far they went last year" is fine for archetype matching, but actual game results from the prediction year are forbidden)
- All features must be knowable BEFORE the tournament starts
- Document temporal availability of every data source

### Why This Approach
- The Scout uses 6 factors → LLM picks with limited context
- Scout Prime uses ~30 factors → LLM picks with saturated context
- Same underlying method (LLM matchup analysis), different data density
- Backtestable on 2024 and 2025 to compare against The Optimizer's scores

## Directory Structure
```
scout_prime_agent/
├── CLAUDE.md                          ← You are here
├── research/
│   ├── MANIFEST.md                    ← Data sources
│   ├── teams_enriched.json            ← Compiled per-team mega-profiles
│   ├── historical_archetypes.json     ← Top 3 historical twins per team
│   ├── seed_matchup_summary.json      ← Condensed seed history per matchup type
│   ├── coaching_matchups.json         ← Coach-vs-coach comparison data
│   ├── upset_vulnerability.json       ← Pre-computed upset scores for R64
│   ├── matchup_contexts/              ← Per-game data packets (built round by round)
│   ├── matchup_prompts/               ← Exported context packets per round (for Claude Code)
│   └── matchup_picks/                 ← Claude Code's picks per round (raw + validated)
├── integrity/
│   ├── pre_check.md                   ← Pre-run integrity verification
│   └── audit_log.md                   ← Post-run verification
├── src/
│   ├── utils.py                       ← JSON I/O, API helpers, scoring bridge
│   ├── gather_intangibles.py          ← Step 0: Gather qualitative intel per team
│   ├── enrich_teams.py                ← Step 1: Compile enriched team profiles
│   ├── build_archetypes.py            ← Step 2: Find historical twins
│   ├── build_matchup_contexts.py      ← Step 3: Build per-game data packets
│   ├── generate_bracket.py            ← Step 4: Call Claude API round-by-round
│   ├── validate.py                    ← Step 5: Backtest on 2024/2025
│   └── prompts.py                     ← All prompt templates
├── prompts/
│   ├── system.md                      ← System prompt (readable reference)
│   ├── matchup.md                     ← Per-game template
│   └── round_context.md               ← Round-level guidance
├── run_log.md                         ← Append-only results log
├── learnings.md                       ← Insights from each phase
└── checkpoint_report.md               ← Phase completion summary
```

## Data Per Matchup

### Per-Team Profile
- **Efficiency:** AdjO, AdjD, AdjEM, tempo, Barthag, SOS, KenPom rank, WAB, elite SOS
- **Shooting:** 3pt rate, 3pt%, FT%, FT pressure delta
- **Ball control:** TO rate, forced TO rate, TO margin
- **Rebounding:** offensive/defensive rebounding rates
- **Close games:** record in <=5pt games, win%
- **Momentum:** last 10 record, hot/cold flag, AdjEM delta, conf tourney result
- **Roster:** experience, returning minutes %, freshman/senior-led, tournament experience count
- **Coaching:** tournament record, Final Fours, championships, first-tournament flag
- **Style:** playing style, tempo bucket, injury notes
- **Conference:** conference strength score
- **Intangibles:** field intelligence from `gather_intangibles.py` (see below)

### Per-Matchup Context (computed)
- Efficiency gap (AdjEM difference)
- Tempo mismatch analysis
- Style clash narrative
- Coaching edge comparison
- Upset vulnerability score
- Rebounding margin comparison
- Turnover margin comparison

### Historical Context
- Top 3 historical twins per team (similarity matching on normalized efficiency vectors)
- Seed matchup history (win rates, decade trends, notable upsets)

### Field Intelligence (Intangibles)
Qualitative/circumstantial intel gathered via `gather_intangibles.py`:
- **Categories:** social_media, motivation, logistics, chemistry, health, local_buzz, preparation, wildcards
- **Per team:** overall vibe score (1-10), intel items with category/signal/impact, summary, red flags, tailwinds
- **Data source:** `data/research/intangibles_YYYY.json` (shared — any model can consume it)
- **Modes:** Live (web-search for 2026) or reconstructed (from training data for backtesting 2024/2025)
- **Pipeline integration:** Loaded by `enrich_teams.py`, merged into enriched profiles, formatted as "Field Intelligence" section in matchup prompts
- **Optional:** Pipeline works without intangibles file — graceful fallback

## Generation Flow — "Scripts Prepare, Claude Code Executes"

No API calls. Scripts handle data preparation and export; Claude Code (the CLI) does all LLM analysis directly in conversation.

### Phase 1: Data Pipeline (unchanged)
1. `gather_intangibles.py --export-context` → exports team list + prompt template
2. Claude Code reads the context file, researches each team, writes `data/research/intangibles_YYYY.json`
   - OR writes raw results and runs `gather_intangibles.py --import-results <path>` to validate
3. `enrich_teams.py` → compiles enriched team profiles (merges intangibles)
4. `build_archetypes.py` → finds historical twins

### Phase 2: Bracket Generation (round by round)
1. `generate_bracket.py --export-round round_of_64` → exports 32 matchup context packets (JSON + review doc)
2. User reviews the REVIEW doc to verify all team data and matchup contexts
3. Claude Code reads the matchup prompts, analyzes each game, writes picks to `research/matchup_picks/r64_YYYY.json`
4. `generate_bracket.py --import-picks round_of_64 --export-round round_of_32` → validates R64 picks, advances winners, exports R32 matchups
5. Repeat steps 2-4 for each round (R32 → S16 → E8 → F4 → Championship)
6. `generate_bracket.py --compile-bracket` → assembles all picks into `data/models/the-scout-prime.json`, scores against actual results

### Key Files
- `research/research_context_intangibles_YYYY.json` — team contexts for intangibles
- `research/REVIEW_intangibles_YYYY.md` — human-readable verification doc
- `research/matchup_prompts/<round>_YYYY.json` — matchup context packets per round
- `research/REVIEW_scout_prime_<round>_YYYY.md` — human-readable matchup review
- `research/matchup_picks/<round>_YYYY.json` — Claude Code's raw picks
- `research/matchup_picks/<round>_YYYY_validated.json` — validated game records

## Integrity Protocol

### Before Every Run
1. List all data sources being used
2. For each source, confirm it is knowable before the tournament starts
3. Confirm no actual game results appear in any prompt
4. Log to `integrity/pre_check.md`

### After Every Run
1. Record ESPN points + percentile on test years
2. Compare to Optimizer baseline (920 pts / 72nd %ile on 2024, 900 pts / 51st %ile on 2025)
3. If ESPN points jumped >200 vs baseline, investigate for data leakage
4. Independently verify a sample of predictions
5. Log to `integrity/audit_log.md`

## Scoring & Evaluation
Primary metric: **ESPN bracket points** (for comparability with The Optimizer).
Secondary: game-level accuracy, upset detection rate, champion accuracy.

## Backtesting Plan (4 runs)

**Run 1:** 2024 backtest with Claude Sonnet
**Run 2:** 2024 backtest with Claude Opus
**Run 3:** 2025 backtest with Claude Sonnet
**Run 4:** 2025 backtest with Claude Opus

Pick the better-performing model for 2026 live bracket.

## Python Environment
- Use `pandas`, `numpy`, `scipy` for data processing
- No external API dependencies — all LLM work done by Claude Code in conversation
- All scripts runnable standalone: `python scout_prime_agent/src/enrich_teams.py`
- Print results to stdout AND append to `run_log.md`
