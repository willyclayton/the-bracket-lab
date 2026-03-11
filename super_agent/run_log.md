# The Super Agent — Run Log

Append-only log of all model runs. Each entry is added automatically by the Python scripts.

---

## Run 1: Seed-Only Baseline
- **Date:** 2026-03-11 12:03:49
- **Overall Accuracy:** 68.3% (43/63)
- **Per-Round Accuracy:**
  - championship: 0.0% (0/1)
  - elite_8: 75.0% (3/4)
  - final_four: 100.0% (2/2)
  - round_of_32: 62.5% (10/16)
  - round_of_64: 68.8% (22/32)
  - sweet_16: 75.0% (6/8)
- **Notes:** Lower seed always wins. Training accuracy: 69.4%. This is the floor — all subsequent models must beat 68.3% on the 2021 test set.

---

## Run 2: Seed + Best Feature (Logistic Regression)
- **Date:** 2026-03-11 12:06:39
- **Overall Accuracy:** 73.0% (46/63)
- **Per-Round Accuracy:**
  - championship: 0.0% (0/1)
  - elite_8: 75.0% (3/4)
  - final_four: 100.0% (2/2)
  - round_of_32: 62.5% (10/16)
  - round_of_64: 75.0% (24/32)
  - sweet_16: 87.5% (7/8)
- **Notes:** Features: ['seed_diff', 'adj_em']. Coefficients: {'seed_diff': '0.3592', 'adj_em': '2.0591'}.

---

## Run 3: Iteration on v1
- **Date:** 2026-03-11 12:08:06
- **Overall Accuracy:** 82.5% (52/63)
- **Per-Round Accuracy:**
  - championship: 0.0% (0/1)
  - elite_8: 100.0% (4/4)
  - final_four: 100.0% (2/2)
  - round_of_32: 81.2% (13/16)
  - round_of_64: 78.1% (25/32)
  - sweet_16: 100.0% (8/8)
- **Notes:** Features: ['seed_diff', 'adj_em', 'tempo']. FINAL RUN — write checkpoint_report.md after reviewing results.

---

## Run 4: Multi-year baseline
- **Date:** 2026-03-11 12:40:37
- **Aggregate Accuracy:** 77.0% (194/252)
- **Per-Year Accuracy:**
  - 2021: 82.5% (52/63)
  - 2022: 81.0% (51/63)
  - 2023: 71.4% (45/63)
  - 2024: 73.0% (46/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 75.0% (3/4)
  - elite_8: 75.0% (12/16)
  - final_four: 87.5% (7/8)
  - round_of_32: 84.4% (54/64)
  - round_of_64: 75.8% (97/128)
  - sweet_16: 65.6% (21/32)
- **Notes:** Same features as Run 3 (seed_diff + adj_em + tempo). Multi-year test: 2021-2024. Establishes honest 4-year baseline.

---

## Run 5: Feature expansion
- **Date:** 2026-03-11 12:40:37
- **Aggregate Accuracy:** 79.4% (200/252)
- **Per-Year Accuracy:**
  - 2021: 88.9% (56/63)
  - 2022: 85.7% (54/63)
  - 2023: 68.3% (43/63)
  - 2024: 74.6% (47/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 100.0% (4/4)
  - elite_8: 75.0% (12/16)
  - final_four: 100.0% (8/8)
  - round_of_32: 81.2% (52/64)
  - round_of_64: 81.2% (104/128)
  - sweet_16: 62.5% (20/32)
- **Notes:** Added barthag (power rating), wab (Wins Above Bubble), elite_sos (SOS vs top teams). All pre-tournament, no leakage.

---


## Run 6: Interactions + separate O/D
- **Date:** 2026-03-11 12:42:36
- **Aggregate Accuracy:** 77.0% (194/252)
- **Per-Year Accuracy:**
  - 2021: 82.5% (52/63)
  - 2022: 79.4% (50/63)
  - 2023: 73.0% (46/63)
  - 2024: 73.0% (46/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 50.0% (2/4)
  - elite_8: 62.5% (10/16)
  - final_four: 100.0% (8/8)
  - round_of_32: 85.9% (55/64)
  - round_of_64: 77.3% (99/128)
  - sweet_16: 62.5% (20/32)
- **Notes:** Split adj_em into adj_o/adj_d separately. Added seed_diff*adj_em_diff interaction. Captures non-linear matchup dynamics.

---

## Run 7: GradientBoosting
- **Date:** 2026-03-11 12:42:39
- **Aggregate Accuracy:** 75.0% (189/252)
- **Per-Year Accuracy:**
  - 2021: 81.0% (51/63)
  - 2022: 79.4% (50/63)
  - 2023: 71.4% (45/63)
  - 2024: 68.3% (43/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 75.0% (3/4)
  - elite_8: 56.2% (9/16)
  - final_four: 87.5% (7/8)
  - round_of_32: 82.8% (53/64)
  - round_of_64: 75.0% (96/128)
  - sweet_16: 65.6% (21/32)
- **Notes:** GradientBoostingClassifier with same features as Run 6. Tree-based models handle interactions natively.

---

## Run 8: Round-specific models
- **Date:** 2026-03-11 12:42:40
- **Aggregate Accuracy:** 76.2% (192/252)
- **Per-Year Accuracy:**
  - 2021: 79.4% (50/63)
  - 2022: 77.8% (49/63)
  - 2023: 73.0% (46/63)
  - 2024: 74.6% (47/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 75.0% (3/4)
  - elite_8: 62.5% (10/16)
  - final_four: 87.5% (7/8)
  - round_of_32: 87.5% (56/64)
  - round_of_64: 77.3% (99/128)
  - sweet_16: 53.1% (17/32)
- **Notes:** Separate logistic models for early (R64/R32) vs late (S16+) rounds. Different factors may drive early vs late upsets.

---

## Run 9: Ensemble
- **Date:** 2026-03-11 12:42:43
- **Aggregate Accuracy:** 76.6% (193/252)
- **Per-Year Accuracy:**
  - 2021: 81.0% (51/63)
  - 2022: 79.4% (50/63)
  - 2023: 71.4% (45/63)
  - 2024: 74.6% (47/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 100.0% (4/4)
  - elite_8: 56.2% (9/16)
  - final_four: 87.5% (7/8)
  - round_of_32: 85.9% (55/64)
  - round_of_64: 75.0% (96/128)
  - sweet_16: 68.8% (22/32)
- **Notes:** Ensemble of Run 6 (logistic) + Run 7 (GBT) + Run 8 (round-specific). Averaged probabilities.

---

## Run 10: 2025 holdout test
- **Date:** 2026-03-11 13:10:02
- **Aggregate Accuracy:** 73.0% (46/63)
- **Per-Year Accuracy:**
  - 2025: 73.0% (46/63)
- **Aggregate Per-Round Accuracy:**
  - championship: 0.0% (0/1)
  - elite_8: 75.0% (3/4)
  - final_four: 0.0% (0/2)
  - round_of_32: 75.0% (12/16)
  - round_of_64: 81.2% (26/32)
  - sweet_16: 62.5% (5/8)
- **Notes:** Run 5 model (best) tested on 2025 as final holdout year. Train: 2010-2019. Model has never seen 2025 data. Validates 5-year accuracy (2021-2025).

---
