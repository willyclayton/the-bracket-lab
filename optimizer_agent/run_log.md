# Run Log — The Optimizer (ESPN Points Maximizer)

Append-only results log. Each run records ESPN points, percentile, and accuracy.

---

## Run 1: Seed Baseline (ESPN Points)
- **Date:** 2026-03-11 17:52:41
- **2022:** 1380/1920 ESPN pts
  - Accuracy: 66.7% (42/63)
  - round_of_64: 22/32 correct (220/320 pts)
  - round_of_32: 10/16 correct (200/320 pts)
  - sweet_16: 4/8 correct (160/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 1/2 correct (160/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Notes:** Lower seed always wins. This is the ESPN points floor. All subsequent models must beat this on ESPN points (not just accuracy).

---

## Run 2: Game-Level LR (ESPN Points)
- **Date:** 2026-03-11 17:52:57
- **2022:** 1750/1920 ESPN pts
  - Accuracy: 87.3% (55/63)
  - round_of_64: 29/32 correct (290/320 pts)
  - round_of_32: 13/16 correct (260/320 pts)
  - sweet_16: 6/8 correct (240/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Notes:** Same logistic regression as super_agent Run 5 (seed_diff + adj_em + tempo + barthag + wab + elite_sos). Picks per-game favorite. Scored by ESPN points instead of accuracy.

---

## Run 3: Expected Value Optimization (ESPN Points)
- **Date:** 2026-03-11 17:52:57
- **2022:** 1750/1920 ESPN pts
  - Accuracy: 87.3% (55/63)
  - round_of_64: 29/32 correct (290/320 pts)
  - round_of_32: 13/16 correct (260/320 pts)
  - sweet_16: 6/8 correct (240/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Notes:** Same model probabilities as Run 2, but picks optimize expected ESPN points using path probability (P(team reaches game) * P(team wins) * points_for_round). May differ from Run 2 in later rounds where path probability matters more.

---

## Run 4: Multi-year Game-Level LR
- **Date:** 2026-03-11 17:54:05
- **2022:** 1750/1920 ESPN pts
  - Accuracy: 87.3% (55/63)
  - round_of_64: 29/32 correct (290/320 pts)
  - round_of_32: 13/16 correct (260/320 pts)
  - sweet_16: 6/8 correct (240/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **2023:** 1320/1920 ESPN pts
  - Accuracy: 68.3% (43/63)
  - round_of_64: 24/32 correct (240/320 pts)
  - round_of_32: 12/16 correct (240/320 pts)
  - sweet_16: 3/8 correct (120/320 pts)
  - elite_8: 1/4 correct (80/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Average ESPN Points:** 1535
- **Notes:** Game-level LR across 2022-2023. Per-game favorite picks. ESPN scored.

---

## Run 5: Multi-year EV Optimization
- **Date:** 2026-03-11 17:54:06
- **2022:** 1750/1920 ESPN pts
  - Accuracy: 87.3% (55/63)
  - round_of_64: 29/32 correct (290/320 pts)
  - round_of_32: 13/16 correct (260/320 pts)
  - sweet_16: 6/8 correct (240/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **2023:** 1400/1920 ESPN pts
  - Accuracy: 69.8% (44/63)
  - round_of_64: 24/32 correct (240/320 pts)
  - round_of_32: 12/16 correct (240/320 pts)
  - sweet_16: 3/8 correct (120/320 pts)
  - elite_8: 2/4 correct (160/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Average ESPN Points:** 1575
- **Notes:** Expected value optimization across 2022-2023. Path probability weighting.

---

## Run 6: Champion-First Strategy
- **Date:** 2026-03-11 17:54:06
- **2022:** 1750/1920 ESPN pts
  - Accuracy: 87.3% (55/63)
  - round_of_64: 29/32 correct (290/320 pts)
  - round_of_32: 13/16 correct (260/320 pts)
  - sweet_16: 6/8 correct (240/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **2023:** 1400/1920 ESPN pts
  - Accuracy: 69.8% (44/63)
  - round_of_64: 24/32 correct (240/320 pts)
  - round_of_32: 12/16 correct (240/320 pts)
  - sweet_16: 3/8 correct (120/320 pts)
  - elite_8: 2/4 correct (160/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Average ESPN Points:** 1575
- **Notes:** EV optimization for early rounds (R64-E8). Champion-first weighting for F4+Championship. Championship pick (320 pts) dominates total score.

---

## Run 7: Monte Carlo Bracket Sampling
- **Date:** 2026-03-11 17:54:08
- **2022:** 1700/1920 ESPN pts
  - Accuracy: 82.5% (52/63)
  - round_of_64: 26/32 correct (260/320 pts)
  - round_of_32: 14/16 correct (280/320 pts)
  - sweet_16: 5/8 correct (200/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **2023:** 1310/1920 ESPN pts
  - Accuracy: 66.7% (42/63)
  - round_of_64: 23/32 correct (230/320 pts)
  - round_of_32: 12/16 correct (240/320 pts)
  - sweet_16: 3/8 correct (120/320 pts)
  - elite_8: 1/4 correct (80/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Average ESPN Points:** 1505
- **Notes:** Sampled 10000 complete brackets using game probabilities. Selected bracket with highest expected ESPN points.

---

## Run 8: Hybrid Strategy
- **Date:** 2026-03-11 17:54:08
- **2022:** 1750/1920 ESPN pts
  - Accuracy: 87.3% (55/63)
  - round_of_64: 29/32 correct (290/320 pts)
  - round_of_32: 13/16 correct (260/320 pts)
  - sweet_16: 6/8 correct (240/320 pts)
  - elite_8: 4/4 correct (320/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **2023:** 1400/1920 ESPN pts
  - Accuracy: 69.8% (44/63)
  - round_of_64: 24/32 correct (240/320 pts)
  - round_of_32: 12/16 correct (240/320 pts)
  - sweet_16: 3/8 correct (120/320 pts)
  - elite_8: 2/4 correct (160/320 pts)
  - final_four: 2/2 correct (320/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Average ESPN Points:** 1575
- **Notes:** R64-R32: per-game favorites. S16+: EV optimization with path probability. Combines accuracy in early rounds with EV maximization in later rounds.

---

## Run 9: 2024 Holdout Bracket
- **Date:** 2026-03-11 17:54:52
- **2024:** 920/1920 ESPN pts, ESPN Percentile: 72.0%
  - Accuracy: 63.9% (39/61)
  - round_of_64: 24/32 correct (240/320 pts)
  - round_of_32: 12/16 correct (240/320 pts)
  - sweet_16: 1/8 correct (40/320 pts)
  - elite_8: 1/4 correct (80/320 pts)
  - championship: 1/1 correct (320/320 pts)
- **Notes:** Clean holdout — model never saw 2024 results during development. Train: 2010-2021. EV-optimized bracket.

---

## Run 10: 2025 Holdout Bracket
- **Date:** 2026-03-11 17:55:01
- **2025:** 900/1920 ESPN pts, ESPN Percentile: 51.0%
  - Accuracy: 69.8% (44/63)
  - round_of_64: 26/32 correct (260/320 pts)
  - round_of_32: 10/16 correct (200/320 pts)
  - sweet_16: 5/8 correct (200/320 pts)
  - elite_8: 3/4 correct (240/320 pts)
  - final_four: 0/2 correct (0/320 pts)
  - championship: 0/1 correct (0/320 pts)
- **Notes:** Clean holdout — model never saw 2025 results during development. Train: 2010-2021. EV-optimized bracket.

---
