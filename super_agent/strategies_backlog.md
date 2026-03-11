# The Super Agent — Strategies Backlog

Ideas for future iterations (Run 4+). Not to be explored until checkpoint report is reviewed.

---

## Feature Ideas
- Adjusted efficiency margin (AdjO - AdjD) — likely the strongest single predictor
- Tempo differential — does pace mismatch predict upsets?
- Experience (returning minutes %) — do experienced teams survive March?
- Free throw rate — tournament games get physical, FT shooting matters more
- 3-point variance — high-variance 3PT teams are upset-prone
- Coach tournament experience — does coaching matter in single-elimination?
- Conference strength — do mid-major teams underperform their stats?
- Late-season momentum (last 10 games record)
- Strength of schedule components (non-conference SOS vs. conference SOS)

## Model Ideas
- Interaction terms (seed x efficiency)
- Round-specific models (different factors matter in R64 vs. Elite 8)
- Ensemble of round-specific logistic regressions
- Random forest for feature importance ranking
- Calibration analysis (are predicted probabilities well-calibrated?)

## Evaluation Ideas
- Cross-validation across multiple holdout years instead of just 2021
- Bootstrap confidence intervals on accuracy estimates
- Per-seed accuracy breakdown (does the model do well on 1-seeds but poorly on 5-12 matchups?)
