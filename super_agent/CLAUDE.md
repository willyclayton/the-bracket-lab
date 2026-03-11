# The Super Agent — ML Pipeline Instructions

## Mission
Build a March Madness prediction model through iterative ML research.

**Phase 1 (Complete):** 3 runs, train on 2010-2019, test on 2021. Best: 82.5% (single year).
**Phase 2 (Complete):** 6 more runs (4-9), multi-year test on 2021-2024. Best: 79.4% (4-year aggregate).
**Best model:** Run 5 — Logistic regression with seed_diff + adj_em + tempo + barthag + wab + elite_sos.

## Critical Constraints

### Data Isolation
- All data lives in `super_agent/research/` — NO imports from `data/research/` or other model directories
- This directory is entirely self-contained
- No cherrypicking signals from other models' research

### Temporal Integrity
- Training data: 2010-2019 tournament seasons (630 games)
- Test data: 2021-2024 tournaments (252 games, 63/year)
- No features that encode outcomes (e.g., "tournament wins" as a feature to predict tournament wins)
- All features must be knowable BEFORE the tournament starts (pre-March of that year)
- Document temporal availability of every data source in `research/DATA_AVAILABILITY_TIMELINE.md`

## Directory Structure
```
super_agent/
├── CLAUDE.md                  ← You are here
├── research/
│   ├── MANIFEST.md            ← What data was collected
│   ├── DATA_AVAILABILITY_TIMELINE.md ← When each data source becomes available
│   └── [data files]           ← Tournament data, team stats, etc.
├── integrity/
│   ├── pre_check.md           ← Pre-run integrity verification
│   ├── audit_log.md           ← Post-run accuracy verification
│   └── verified_results.md    ← Second-source accuracy checks
├── src/
│   ├── baseline.py            ← Run 1: seed-only baseline
│   ├── model_v1.py            ← Run 2: seed + adj_em
│   ├── model_v2.py            ← Run 3: seed + adj_em + tempo
│   ├── model_runner.py        ← Runs 4-9: configurable multi-year runner
│   └── utils.py               ← Shared data loading, scoring, evaluation
├── learnings.md               ← What we learned from each run
├── run_log.md                 ← Append-only results log (9 entries)
├── strategies_backlog.md      ← Ideas for future iterations
└── checkpoint_report.md       ← Phase 2 deliverable (updated)
```

## Integrity Protocol

### Before Every Run
1. List all features being used
2. For each feature, confirm it is knowable before the tournament starts
3. Confirm no feature encodes the outcome being predicted
4. Log to `integrity/pre_check.md`

### After Every Run
1. Record accuracy on test years
2. Compare to previous run
3. If accuracy jumped >10%, investigate — this likely indicates data leakage
4. Independently verify a sample of predictions against a second source
5. Log to `integrity/audit_log.md`

## Scoring
Accuracy is measured as: correct game predictions / total games in the round.
Also track per-round accuracy (R64, R32, S16, E8, F4, Championship).
Phase 2 also tracks per-year accuracy and aggregate.

## Python Environment
- Use standard ML libraries: pandas, numpy, scikit-learn, scipy
- Keep models simple — logistic regression preferred over complex ensembles
- All scripts should be runnable standalone: `python super_agent/src/model_runner.py`
- Print results to stdout AND append to `run_log.md`
