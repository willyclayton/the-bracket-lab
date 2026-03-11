# Pre-Run Integrity Checks

## Format
Each run gets a section below. Before running the model, document:
1. Features used
2. Temporal verification (each feature available pre-tournament?)
3. Outcome leakage check (no feature encodes tournament results?)
4. Sign-off

---

## Run 1: Seed Baseline
- **Date:** 2026-03-11
- **Features:** Seed only (lower seed wins)
- **Temporal check:** Seed is assigned on Selection Sunday, before tournament play. PASS.
- **Outcome leakage check:** Seed does not encode tournament results. PASS.
- **Data source:** github.com/shoenot/march-madness-games-csv (verified NCAA results)
- **Training set:** 2010-2019 (630 games, 10 years, no 2020 due to COVID)
- **Test set:** 2021 (63 games)
- **Status:** APPROVED — proceeding to execution

## Run 2: Seed + Adjusted Efficiency Margin
- **Date:** 2026-03-11
- **Features:** seed_diff + adj_em_diff (team1 adj_em minus team2 adj_em)
- **Feature source:** BartTorvik.com pre-tournament team stats (adj_em = AdjOE - AdjDE)
- **Temporal check:** adj_em is computed from regular season data, finalized before Selection Sunday. PASS.
- **Outcome leakage check:** adj_em measures regular season efficiency, not tournament results. PASS.
- **Model:** Logistic regression (sklearn), StandardScaler, random_state=42
- **Status:** APPROVED — proceeding to execution

## Run 3: Seed + adj_em + Tempo
- **Date:** 2026-03-11
- **Features:** seed_diff + adj_em_diff + tempo_diff
- **Feature source:** BartTorvik.com pre-tournament team stats
- **Temporal check:** tempo is computed from regular season play-by-play data, finalized before Selection Sunday. PASS.
- **Outcome leakage check:** tempo measures regular season pace, not tournament results. PASS.
- **Model:** Logistic regression (sklearn), StandardScaler, random_state=42
- **Rationale:** R32 was weakest round in Run 2 (62.5%). Tempo differential may capture tactical mismatches (slow vs fast teams) that drive upsets.
- **Status:** APPROVED — proceeding to execution

---

# Phase 2 Pre-Checks (Runs 4-9)

All Phase 2 runs use the same temporal integrity guarantees as Phase 1.
Training set: 2010-2019 (630 games). Test set: 2021, 2022, 2023, 2024 (252 games total).
All features from BartTorvik.com regular season data, available before Selection Sunday.

## Run 4: Multi-year baseline
- **Date:** 2026-03-11
- **Features:** seed_diff + adj_em_diff + tempo_diff (same as Run 3)
- **Purpose:** Establish honest 4-year accuracy baseline. Run 3's 82.5% was on a single holdout year.
- **Temporal check:** PASS (same features as Run 3, all pre-tournament)
- **Outcome leakage check:** PASS (no new features)
- **Status:** APPROVED

## Run 5: Feature expansion
- **Date:** 2026-03-11
- **Features:** seed_diff + adj_em_diff + tempo_diff + barthag_diff + wab_diff + elite_sos_diff
- **New features:**
  - barthag: BartTorvik power rating (0-1 scale). Pre-tournament. PASS.
  - wab: Wins Above Bubble. Pre-tournament. PASS.
  - elite_sos: SOS against top-tier opponents. Pre-tournament. PASS.
- **Outcome leakage check:** All three are regular season aggregate stats. PASS.
- **Status:** APPROVED

## Run 6: Interactions + separate O/D
- **Date:** 2026-03-11
- **Features:** seed_diff + adj_o_diff + adj_d_diff + tempo_diff + barthag_diff + wab_diff + seed_diff*adj_em_diff interaction
- **New elements:**
  - Split adj_em into adj_o (offense) and adj_d (defense) separately
  - Interaction term: seed_diff * adj_em_diff (captures non-linear matchup dynamics)
- **Temporal check:** adj_o, adj_d are components of adj_em. Pre-tournament. PASS.
- **Outcome leakage check:** PASS — interaction term is a product of pre-tournament features.
- **Status:** APPROVED

## Run 7: GradientBoosting
- **Date:** 2026-03-11
- **Features:** Same as Run 6
- **Model change:** GradientBoostingClassifier (n_estimators=200, max_depth=3, lr=0.1)
- **Rationale:** Tree-based models handle interactions natively, may capture non-linear patterns.
- **Status:** APPROVED

## Run 8: Round-specific models
- **Date:** 2026-03-11
- **Features:** Same as Run 6
- **Model change:** Separate logistic regression for early (R64/R32) vs late (S16+) rounds.
- **Rationale:** Different factors may drive early-round upsets vs. late-round outcomes.
- **Status:** APPROVED

## Run 9: Ensemble
- **Date:** 2026-03-11
- **Components:** Run 6 logistic + Run 7 GBT + Run 8 round-specific logistic
- **Method:** Average predicted probabilities, then threshold at 0.5
- **Status:** APPROVED

---

# Phase 3: 2025 Holdout + Bracket Generation

## Run 10: 2025 holdout test
- **Date:** 2026-03-11
- **Features:** seed_diff + adj_em_diff + tempo_diff + barthag_diff + wab_diff + elite_sos_diff (same as Run 5)
- **Training set:** 2010-2019 (630 games) — unchanged from Phase 2
- **Test set:** 2025 (63 games) — model has never seen 2025 data
- **Data source:** raw_2025.csv generated from verified data/archive/2025/results/actual-results.json (ESPN-verified scores). barttorvik_2025.csv downloaded from barttorvik.com.
- **Temporal check:** All features from BartTorvik 2025 regular season data. Available before March 2025 tournament. PASS.
- **Outcome leakage check:** Model trained on 2010-2019 only. 2025 data used only as test set. No 2025 outcomes in training. PASS.
- **Status:** APPROVED

## Bracket Generation (not a run — production output)
- **Date:** 2026-03-11
- **Model:** Run 5 logistic regression trained on 2010-2019
- **Input:** 2025 bracket structure (from actual-results.json R64 matchups, post-play-in) + BartTorvik 2025 team stats
- **Output:** 63 game predictions in BracketData format -> data/models/the-super-agent.json
- **Temporal check:** Uses pre-tournament stats only. Bracket structure is public (Selection Sunday). PASS.
- **Outcome leakage check:** Model does not see actual 2025 results during prediction. PASS.
- **Status:** APPROVED
