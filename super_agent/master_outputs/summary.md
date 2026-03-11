# Super Agent — Master Backtest Results

**Model:** Run 5 — Logistic Regression
**Features:** seed_diff + adj_em, tempo, barthag, wab, elite_sos
**Training:** 2010-2019 (630 games)

## Summary

| Year | Cascade Accuracy | ESPN Score | Independent Accuracy |
|------|-----------------|------------|---------------------|
| 2023 | 60.3% (38/63) | 1060/1920 | 68.3% (43/63) |
| 2024 | 65.1% (41/63) | 1090/1920 | 74.6% (47/63) |
| **Aggregate** | **62.7%** (79/126) | **2150**/3840 | **71.4%** (90/126) |

## Per-Round Breakdown

| Round | 2023  |  2024 |
|-------|--------|--------|
| round_of_64 | 24/32 (75%)| 25/32 (78%)|
| round_of_32 | 9/16 (56%)| 12/16 (75%)|
| sweet_16 | 2/8 (25%)| 1/8 (12%)|
| elite_8 | 1/4 (25%)| 1/4 (25%)|
| final_four | 1/2 (50%)| 1/2 (50%)|
| championship | 1/1 (100%)| 1/1 (100%)|

---
*Cascade accuracy: model builds its own bracket (errors compound).*
*Independent accuracy: model predicts each actual matchup (no cascade).*
