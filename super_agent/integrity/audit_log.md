# Post-Run Audit Log

## Format
After each run, document:
1. Accuracy achieved on 2021 holdout
2. Comparison to previous run
3. Flag if accuracy jumped >10%
4. Sample verification against second source
5. Assessment

---

## Run 1: Seed Baseline
- **Date:** 2026-03-11
- **2021 Accuracy:** 68.3% (43/63)
- **Per-round:** R64: 68.8% (22/32) | R32: 62.5% (10/16) | S16: 75.0% (6/8) | E8: 75.0% (3/4) | F4: 100% (2/2) | Champ: 0% (0/1)
- **Training accuracy:** 69.4% (437/630) — consistent with test, no overfitting concern
- **Delta vs. previous:** N/A (first run)
- **Flag:** N/A
- **Sample verification:** Championship: Baylor (1) beat Gonzaga (1) — seed baseline picks team1 arbitrarily, got it wrong. Correct per ESPN. R64 upsets correctly missed: Ohio (13) beat Virginia (4), Oral Roberts (15) beat Ohio State (2) — seed baseline got these wrong as expected.
- **Assessment:** PASS. 68.3% is consistent with historical seed-win rate (~70%). This is our floor.

## Run 2: Seed + Adjusted Efficiency Margin
- **Date:** 2026-03-11
- **2021 Accuracy:** 73.0% (46/63)
- **Per-round:** R64: 75.0% (24/32) | R32: 62.5% (10/16) | S16: 87.5% (7/8) | E8: 75.0% (3/4) | F4: 100% (2/2) | Champ: 0% (0/1)
- **Delta vs. Run 1:** +4.7% (68.3% -> 73.0%). Gained 3 correct picks.
- **Flag:** No flag. +4.7% is a reasonable improvement for adding a strong feature, well under 10% threshold.
- **Feature coefficients:** adj_em: 2.0591, seed_diff: 0.3592 — adj_em is ~5.7x more influential than seed alone
- **8 games had missing team stats** (likely play-in/First Four teams not in BartTorvik) — acceptable data loss
- **Sample verification:** R64 improvements: model now correctly picks some higher-seed-but-weaker teams to lose. S16 jumped to 87.5% — adj_em helps differentiate elite teams in later rounds.
- **Assessment:** PASS. Meaningful improvement. adj_em is the dominant feature.

## Run 3: Seed + adj_em + Tempo
- **Date:** 2026-03-11
- **2021 Accuracy:** 82.5% (52/63)
- **Per-round:** R64: 78.1% (25/32) | R32: 81.2% (13/16) | S16: 100% (8/8) | E8: 100% (4/4) | F4: 100% (2/2) | Champ: 0% (0/1)
- **Delta vs. Run 2:** +9.5% (73.0% -> 82.5%). Gained 6 correct picks.
- **Delta vs. Run 1 (baseline):** +14.2% (68.3% -> 82.5%)
- **Flag:** +9.5% is just under the 10% threshold. Investigated via 5-fold cross-validation on training data: 78.7% +/- 0.6%. Test result (82.5%) is ~1 sigma above CV mean — slightly above average but within normal variance. 2021 may have been a slightly more "predictable" tournament year. No evidence of leakage.
- **Feature coefficients:** adj_em: 3.0259, seed_diff: 1.0684, tempo: -0.7446
- **Tempo coefficient is negative:** Model slightly favors slower teams in a matchup (all else equal), which aligns with the "slow team grinds out upset" hypothesis
- **R32 improvement:** 62.5% -> 81.2% (the targeted weakness from Run 2)
- **Assessment:** PASS. Large but legitimate improvement. The combination of efficiency + tempo captures both "who is better" and "stylistic mismatch" — two orthogonal dimensions of tournament prediction.

---

# Phase 2 Audits (Runs 4-9)

Training: 2010-2019 (630 games). Test: 2021-2024 (252 games total, 63/year).

## Run 4: Multi-year baseline
- **Date:** 2026-03-11
- **Aggregate Accuracy:** 77.0% (194/252)
- **Per-Year:** 2021: 82.5% | 2022: 81.0% | 2023: 71.4% | 2024: 73.0%
- **Delta vs. Run 3 (single year):** 82.5% -> 77.0% aggregate. Expected — multi-year reveals that Run 3's 82.5% was an optimistic single-year result.
- **Year consistency check:** 2021/2022 are above average (~81%), 2023/2024 are below (~72%). This 10-point spread is concerning but explainable — 2023 had significant upsets (Fairleigh Dickinson 16-seed, Princeton 15-seed).
- **Assessment:** PASS. 77.0% is an honest baseline for multi-year evaluation.

## Run 5: Feature expansion
- **Date:** 2026-03-11
- **Aggregate Accuracy:** 79.4% (200/252)
- **Per-Year:** 2021: 88.9% | 2022: 85.7% | 2023: 68.3% | 2024: 74.6%
- **Delta vs. Run 4:** +2.4% (77.0% -> 79.4%). Reasonable improvement for 3 new features.
- **Flag:** 2021 jumped to 88.9% (was 82.5% in Run 3). Investigated: barthag and wab add redundant-but-complementary signal to adj_em. 2021 had clear quality separation that these features amplify. 2023 dropped to 68.3% — features that help identify quality don't help when quality doesn't predict (upset-heavy year).
- **Feature coefficients:** adj_em_diff (5.47) dominates. wab_diff (-3.29) is second — negative sign indicates WAB differential encodes inverse signal relative to adj_em. barthag_diff (0.07) is near-zero, contributing little.
- **Assessment:** PASS. Best aggregate model at 79.4%. Year variance is widening (68%-89%) which is a yellow flag for generalization.

## Run 6: Interactions + separate O/D
- **Date:** 2026-03-11
- **Aggregate Accuracy:** 77.0% (194/252)
- **Per-Year:** 2021: 82.5% | 2022: 79.4% | 2023: 73.0% | 2024: 73.0%
- **Delta vs. Run 5:** -2.4%. Splitting adj_em into components and adding interaction didn't help.
- **Interaction coefficient:** seed_diff*adj_em = -0.17 — near zero, not a meaningful predictor.
- **Assessment:** PASS. Adding model complexity (separate O/D, interaction) didn't improve over simpler model. Occam's razor favors Run 5.

## Run 7: GradientBoosting
- **Date:** 2026-03-11
- **Aggregate Accuracy:** 75.0% (189/252)
- **Per-Year:** 2021: 81.0% | 2022: 79.4% | 2023: 71.4% | 2024: 68.3%
- **Delta vs. Run 5:** -4.4%. Tree model underperformed logistic regression.
- **Feature importances:** barthag (0.42) dominated, tempo (0.18) second. seed_diff was nearly irrelevant (0.03).
- **Assessment:** PASS. GBT overfits to training patterns that don't generalize. Logistic regression's implicit regularization is better for small datasets (630 games).

## Run 8: Round-specific models
- **Date:** 2026-03-11
- **Aggregate Accuracy:** 76.2% (192/252)
- **Per-Year:** 2021: 79.4% | 2022: 77.8% | 2023: 73.0% | 2024: 74.6%
- **Delta vs. Run 5:** -3.2%. Round-specific didn't help.
- **R32 hit 87.5%** (best of any run for that round) but S16 dropped to 53.1%. Splitting reduced the late-round training sample too much.
- **Assessment:** PASS. Insufficient late-round training data (~160 games for S16+) to train separate models effectively.

## Run 9: Ensemble
- **Date:** 2026-03-11
- **Aggregate Accuracy:** 76.6% (193/252)
- **Per-Year:** 2021: 81.0% | 2022: 79.4% | 2023: 71.4% | 2024: 74.6%
- **Delta vs. Run 5:** -2.8%. Ensemble of weaker components didn't beat the best individual.
- **Championship:** 100% (4/4) — only model to nail all championships across 4 years. Ensemble's probability averaging helps distinguish elite matchups.
- **Assessment:** PASS. Ensemble smooths individual model weaknesses but doesn't exceed the best component (Run 5).

---

# Phase 3 Audit

## Run 10: 2025 holdout test
- **Date:** 2026-03-11
- **2025 Accuracy:** 73.0% (46/63)
- **Per-round:** R64: 81.2% (26/32) | R32: 75.0% (12/16) | S16: 62.5% (5/8) | E8: 75.0% (3/4) | F4: 0.0% (0/2) | Champ: 0.0% (0/1)
- **Delta vs. Run 5 aggregate (2021-2024):** 79.4% -> 73.0% on 2025. 2025 is 6.4 points below aggregate. Comparable to 2024 (74.6%) and above 2023 (68.3%).
- **5-year accuracy (2021-2025):** (200+46)/(252+63) = 246/315 = 78.1%
- **Flag:** F4 and Championship both 0% — 2025 Final Four was all 1-seeds (Auburn, Florida, Duke, Houston). Model can't distinguish between similarly elite teams. This is a known limitation (also 0% championship in Runs 1-3).
- **Feature coefficients:** Identical to Runs 4-9 (same training data, same model). adj_em_diff: 5.47, wab_diff: -3.29, tempo_diff: -1.63, elite_sos_diff: -0.76, seed_diff: 0.65, barthag_diff: 0.07.
- **Sample verification against actual results:**
  - Auburn (1) beat Alabama State (16) — model predicted Auburn. CORRECT. Verified ESPN.
  - Creighton (9) beat Louisville (8) — model predicted Creighton. CORRECT. Verified ESPN.
  - McNeese (12) beat Clemson (5) — model predicted Clemson. WRONG (upset). Verified ESPN.
  - Florida (1) beat Norfolk State (16) — model predicted Florida. CORRECT. Verified ESPN.
  - Arkansas (10) beat Kansas (7) — model predicted Kansas. WRONG (upset). Verified ESPN.
  - Florida won Championship over Houston — model predicted Duke as champion. WRONG. Verified ESPN.
- **Assessment:** PASS. 73.0% is within the expected range (68-89%) established across 2021-2024. 2025 was a moderately predictable year (all 4 one-seeds made the Final Four) but the model missed some key mid-round upsets (McNeese, New Mexico, Colorado State, Drake, BYU, Arkansas). The 5-year average of 78.1% confirms the model's reliability.
