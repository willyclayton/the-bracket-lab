# The Super Agent — Learnings

Key insights from each iteration. Updated after each run.

---

## Run 1: Seed Baseline

**Result:** 68.3% overall (43/63 on 2021 test set)

**Key observations:**
1. Seed-only picks hit ~68-70% across both training and test sets — stable and unsurprising
2. R64 (68.8%) and R32 (62.5%) are the weakest rounds — this is where upsets hurt most
3. R32 accuracy (62.5%) is notably low: once a strong lower-seed survives R64, they're dangerous
4. 2021 had significant upsets (Oral Roberts 15-seed to S16, UCLA 11-seed to F4) that a seed-only model can't capture
5. Championship was a 1v1 matchup — seed provides zero signal, model defaults to arbitrary tiebreak
6. Training accuracy (69.4%) is very close to test (68.3%) — no overfitting/underfitting concern

**Implication for Run 2:** Need a feature that captures team quality beyond seed. Adjusted efficiency margin (adj_em) is the strongest candidate — it captures how much a team outscores opponents per 100 possessions, adjusted for opponent strength. This should help differentiate between strong and weak teams within the same seed line (e.g., a 1-seed Gonzaga with +35 adj_em vs. a 1-seed Illinois with +22).

## Run 2: Seed + Adjusted Efficiency Margin

**Result:** 73.0% overall (46/63 on 2021 test set) — +4.7% vs baseline

**Key observations:**
1. adj_em coefficient (2.06) is ~5.7x stronger than seed_diff (0.36) — efficiency margin is a far better predictor than seed alone
2. R64 improved from 68.8% to 75.0% — adj_em helps pick correct winners when seeds are close
3. S16 jumped from 75.0% to 87.5% — the model excels at later rounds where remaining teams' quality differences matter more
4. R32 stayed flat at 62.5% — this round remains the hardest to predict (upset survivors are dangerous)
5. Championship still 0/1 — both Baylor and Gonzaga were 1-seeds with elite adj_em, hard to separate
6. 8 games had missing team stats (likely First Four/play-in teams) — not a concern for main bracket

**Implication for Run 3:** R32 is the weakest link. Options:
- Add tempo differential — pace mismatch might explain R32 upsets (slow teams frustrating fast favorites)
- Add SOS (strength of schedule) — might help distinguish teams that earned their stats against weak vs strong opponents
- Tempo is more interesting because it captures a tactical dimension that adj_em misses

## Run 3: Seed + adj_em + Tempo

**Result:** 82.5% overall (52/63 on 2021 test set) — +9.5% vs Run 2, +14.2% vs baseline

**Key observations:**
1. Massive R32 improvement: 62.5% -> 81.2% — tempo captures exactly what we hypothesized
2. S16 and E8 hit 100% — in later rounds, quality + style matchup is highly predictive
3. Tempo coefficient is negative (-0.74): model slightly prefers slower teams, supporting the "slow grinder upsets fast favorite" pattern
4. adj_em remains dominant (coefficient 3.03 vs seed_diff 1.07 vs tempo -0.74)
5. Championship still 0/1 — when two equally elite teams meet, our 3-feature model can't distinguish. Would need matchup-specific features.
6. 5-fold CV on training: 78.7% +/- 0.6% — test result (82.5%) is slightly above average but within normal variance

**Feature importance ranking (by coefficient magnitude):**
1. adj_em (3.03) — team quality beyond seed
2. seed_diff (1.07) — traditional seeding signal
3. tempo (-0.74) — stylistic mismatch indicator

**Convergence assessment:** Still improving significantly (+9.5%), suggesting more features could help. But diminishing returns likely with additional features beyond this point. The model captures the two most important dimensions: quality (adj_em) and style (tempo).

**Where the model still fails:**
- Championship games between elite teams (need deeper matchup analysis)
- Individual R64/R32 upsets driven by unique factors (injuries, hot shooting, coaching matchups)
- These are inherently hard to predict with season-long aggregate stats

---

# Phase 2 Learnings (Runs 4-9)

## Run 4: Multi-year baseline

**Result:** 77.0% aggregate (194/252) across 2021-2024

**Key observations:**
1. Run 3's 82.5% was an optimistic single-year result. Multi-year validation reveals the honest accuracy: ~77%.
2. 10-point variance between best year (2021: 82.5%) and worst year (2023: 71.4%).
3. 2023 was the hardest year — Fairleigh Dickinson (16-seed) beat Purdue, Princeton went to S16. These are the kinds of upsets no stat-based model can predict.
4. R32 remained strong at 84.4% aggregate — tempo feature still working as designed.
5. S16 dropped to 65.6% aggregate (was 100% on 2021 alone) — single-year S16 performance was overly optimistic.

**Critical lesson:** Always validate on multiple years. Single-year holdout results can be misleading by 5+ percentage points.

## Run 5: Feature expansion

**Result:** 79.4% aggregate (200/252) — best model overall

**Key observations:**
1. Adding barthag + wab + elite_sos improved aggregate by +2.4% over Run 4.
2. wab_diff (-3.29) was the second strongest feature after adj_em_diff (5.47). WAB captures "wins above what a bubble team would get" — measures team strength on a different axis than pure efficiency.
3. barthag_diff (0.07) contributed essentially nothing — it's too correlated with adj_em.
4. elite_sos_diff (-0.76) had mild negative signal — suggests playing tough opponents doesn't help predict tournament success beyond what adj_em captures.
5. R64 improved to 81.2% (from 75.8%) — new features help distinguish first-round matchups.
6. Championship hit 100% (4/4) — wab and elite_sos help distinguish among elite teams.
7. Year variance widened: 2021/2022 above 85%, 2023 at 68%. The model is best on "normal" tournaments and struggles with upset-heavy years.

**Signal quality ranking:** adj_em > wab > tempo > seed > elite_sos > barthag (near-zero)

## Run 6: Interactions + separate O/D

**Result:** 77.0% aggregate (194/252) — no improvement over baseline

**Key observations:**
1. Splitting adj_em into adj_o/adj_d didn't help. The composite (adj_em = adj_o - adj_d) already captures offensive/defensive balance.
2. Interaction term (seed_diff * adj_em_diff) had coefficient -0.17 — essentially zero. The relationship between seed and efficiency is already linear enough that a multiplicative term adds noise.
3. More features != better when training set is only 630 games.

**Lesson:** Simplicity wins with small datasets. Don't decompose features that already work well as composites.

## Run 7: GradientBoosting

**Result:** 75.0% aggregate (189/252) — worst of Phase 2

**Key observations:**
1. GBT underperformed logistic regression by 4.4 percentage points.
2. barthag dominated feature importances (0.42) while seed was nearly ignored (0.03). The tree model found patterns in barthag that don't generalize.
3. 2024 was particularly bad (68.3%) — the tree model's overfitting hurts most on years that deviate from training patterns.

**Lesson:** With 630 training games, logistic regression's implicit regularization (linear decision boundary) prevents overfitting. Tree-based models need more data to generalize.

## Run 8: Round-specific models

**Result:** 76.2% aggregate (192/252)

**Key observations:**
1. R32 hit 87.5% (best of any model) — early-round model with focused training data works well.
2. S16 collapsed to 53.1% — only ~80 S16+ games in training is insufficient for a separate model.
3. The idea is sound but the data volume doesn't support it. Would need 20+ years of data for round-specific models to outperform a single model.

**Lesson:** Round-specific models need much larger training sets. The data efficiency of a single model outweighs the theoretical benefit of round specialization.

## Run 9: Ensemble

**Result:** 76.6% aggregate (193/252)

**Key observations:**
1. Ensembling didn't help because the component models (Runs 6-8) were all weaker than Run 5.
2. Championship accuracy was 100% (4/4) — the one area where averaging probabilities across diverse models helps. Elite matchups benefit from multiple perspectives.
3. Year consistency was decent (71-81%) — ensembles reduce variance even when they don't increase mean accuracy.

**Lesson:** Ensemble quality is bounded by component quality. Ensembling three weaker models doesn't beat one better model.

## Phase 2 Summary

**Best model: Run 5** — Logistic regression with seed_diff + adj_em + tempo + barthag + wab + elite_sos = 79.4% aggregate.

**Key Phase 2 insights:**
1. Multi-year validation is essential. Run 3's 82.5% was honest for 2021 but misleading as a general accuracy estimate. True accuracy is ~77-79%.
2. Logistic regression outperforms tree models on small datasets (630 games).
3. Feature expansion (Run 5) was the only approach that improved over the Phase 1 baseline.
4. More complex models (interactions, round-specific, GBT) all degraded performance.
5. Tournament prediction has a natural ceiling around 75-80% with pre-tournament stats alone. The remaining 20-25% is driven by in-game factors (injuries, hot shooting, coaching) that no pre-season model can capture.
6. Year-to-year variance is ~10-15 points. Upset-heavy years (2023) will always drag accuracy down.

---

# Phase 3: 2025 Holdout + Bracket Generation

## Run 10: 2025 holdout test

**Result:** 73.0% (46/63) on 2025 — 5-year aggregate: 78.1% (246/315)

**Key observations:**
1. 73.0% is within the expected range, comparable to 2024 (74.6%) and well above 2023 (68.3%).
2. R64 (81.2%) and R32 (75.0%) remain the model's strongest rounds — where seed + efficiency differences are largest.
3. S16 at 62.5% continues to be the weak spot — mid-round games have narrower quality gaps.
4. Final Four 0% and Championship 0% — all four 1-seeds made the F4 in 2025. When seeds and stats are near-identical, the model has no signal to differentiate.
5. Key upsets missed: McNeese (12) over Clemson (5), New Mexico (10) over Marquette (7), Colorado State (12) over Memphis (5), Drake (11) over Missouri (6), BYU (6) over Wisconsin (3), Arkansas (10) over Kansas (7). These are exactly the game-day factors the model can't capture.

**5-year validated accuracy breakdown:**

| Year | Accuracy | Notes |
|------|----------|-------|
| 2021 | 88.9% | Most predictable |
| 2022 | 85.7% | Predictable |
| 2023 | 68.3% | Upset-heavy (FDU 16-seed) |
| 2024 | 74.6% | Average |
| 2025 | 73.0% | Slightly below average |
| **Aggregate** | **78.1%** | **246/315** |

**Bracket generation notes:**
- The model's bracket output for 2025 predicted Duke as champion with a Final Four of Auburn, Duke, Houston, Texas Tech.
- Actual champion was Florida (1-seed). The model correctly identified 3 of 4 Final Four teams (Auburn, Duke, Houston) but picked Texas Tech (3-seed) over Florida (1-seed) from the West.
- This is consistent with the model's limitation: it can identify elite teams well but struggles to pick among them in late rounds.
