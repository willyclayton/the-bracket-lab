# The Optimizer — ESPN Points Maximizer Pipeline

## Mission
Build a March Madness prediction model that maximizes **ESPN Tournament Challenge points**, not game-level accuracy.

ESPN bracket scoring is exponentially back-loaded:
| Round | Points per correct pick |
|-------|------------------------|
| Round of 64 | 10 |
| Round of 32 | 20 |
| Sweet 16 | 40 |
| Elite 8 | 80 |
| Final Four | 160 |
| Championship | 320 |
| **Max possible** | **1,920** |

A correct champion pick is worth **32 first-round picks**. The Optimizer exploits this by optimizing the complete bracket for expected ESPN points, not per-game accuracy.

## Key Concept: Path Probability
- P(Team reaches R32) = P(wins R64 game)
- P(Team reaches S16) = P(wins R64) * P(wins R32 matchup)
- P(Team wins Championship) = product of P(wins) across all 6 rounds
- Expected points from picking Team as champion = P(wins all 6 games) * 320

This means: instead of always picking the per-game favorite, The Optimizer considers the full path. If Team A has a 60% per-game win rate but Team B has an 80% per-game rate of reaching the Final Four, picking Team B for the Final Four earns more expected points.

## Critical Constraints

### Data Isolation
- All data lives in `optimizer_agent/research/` — NO imports from `data/research/` or other model directories
- This directory is entirely self-contained
- No cherrypicking signals from other models' research

### Temporal Integrity
- **Training:** 2010-2021, excluding 2020/COVID (693 games, 11 years)
- **Internal iteration/testing:** 2022-2023 (126 games, 2 years)
- **Clean holdouts for bracket generation:** 2024 and 2025 (model never sees these during development)
- **Live:** 2026
- No features that encode outcomes (e.g., "tournament wins" as a feature)
- All features must be knowable BEFORE the tournament starts
- Document temporal availability of every data source

### Why This Train/Test Split
- 10% more training data than super_agent (693 vs 630 games)
- 2 internal test years: 2022 was predictable (Kansas), 2023 was chaotic (FDU 16-seed upset)
- 2021 in training adds COVID bubble tournament diversity
- 2024+2025 brackets on the site are fully legitimate — genuinely unseen predictions

## Directory Structure
```
optimizer_agent/
├── CLAUDE.md                  ← You are here
├── research/
│   ├── MANIFEST.md            ← Data sources
│   ├── tournament_games.csv   ← Copied from super_agent
│   ├── team_stats.csv         ← Copied from super_agent
│   └── barttorvik_*.csv       ← Copied from super_agent
├── integrity/
│   ├── pre_check.md           ← Pre-run integrity verification
│   └── audit_log.md           ← Post-run verification
├── src/
│   ├── utils.py               ← Data loading, ESPN scoring evaluation, run logging
│   ├── baseline.py            ← Run 1: Seed baseline scored by ESPN points
│   ├── optimizer_v1.py        ← Run 2: Expected value optimization
│   ├── model_runner.py        ← Multi-year configurable runner (ESPN-scored)
│   └── generate_bracket.py    ← Final bracket generator for 2026
├── learnings.md               ← Insights from each iteration
├── run_log.md                 ← Append-only results log
├── strategies_backlog.md      ← Ideas for future iterations
└── checkpoint_report.md       ← Deliverable after each phase
```

## Integrity Protocol

### Before Every Run
1. List all features being used
2. For each feature, confirm it is knowable before the tournament starts
3. Confirm no feature encodes the outcome being predicted
4. Log to `integrity/pre_check.md`

### After Every Run
1. Record ESPN points + percentile on test years
2. Compare to previous run
3. If ESPN points jumped >200, investigate — this likely indicates data leakage
4. Independently verify a sample of predictions against a second source
5. Log to `integrity/audit_log.md`

## Scoring & Evaluation
Primary metric: **ESPN bracket points** (not accuracy).

For each test year, simulate the bracket cascade:
1. Start with R64 matchups from actual bracket structure
2. Model picks winners (which advance to next round)
3. Compare model's bracket against actual results
4. Score using ESPN points: R64=10, R32=20, S16=40, E8=80, F4=160, Championship=320
5. Report: total ESPN points, ESPN percentile (from `data/espn-percentiles.json`), accuracy breakdown

## Iteration Plan (10 runs, 3 phases)

**Phase 1: Foundation (Runs 1-3, single test year 2022)**
- Run 1: Seed baseline — lower seed always wins, scored by ESPN points
- Run 2: Game-level logistic regression (same features as super_agent Run 5) scored by ESPN points
- Run 3: Expected value optimization — optimize bracket for max expected ESPN points using path probabilities

**Phase 2: Multi-year validation (Runs 4-8, test on 2022-2023)**
- Run 4: Multi-year baseline — Run 2 across 2 test years
- Run 5: Multi-year expected value optimization
- Run 6: Champion-first strategy — lock highest EV champion, optimize path backward
- Run 7: Monte Carlo bracket sampling — 10K brackets, pick highest expected ESPN points
- Run 8: Hybrid — champion-first + EV for late rounds + game-level for early rounds

**Phase 3: Clean holdout brackets (Runs 9-10)**
- Run 9: Generate 2024 bracket (unseen)
- Run 10: Generate 2025 bracket (unseen)

## Python Environment
- Use standard ML libraries: pandas, numpy, scikit-learn, scipy
- Keep models simple — logistic regression preferred
- All scripts runnable standalone: `python optimizer_agent/src/baseline.py`
- Print results to stdout AND append to `run_log.md`
