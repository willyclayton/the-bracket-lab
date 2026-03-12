# Learnings — The Optimizer

## Phase 1 (Runs 1-3, test year: 2022)

### Run 1: Seed Baseline — 1380 ESPN pts
- 2022 was extremely chalk (Kansas 1-seed champion), so seed-only baseline scored very high
- 66.7% accuracy but 1380/1920 pts — getting the champion right (320 pts) is massive
- This is a high floor to beat

### Run 2: Game-Level LR — 1750 ESPN pts
- Same logistic regression as super_agent Run 5 (seed_diff + adj_em + tempo + barthag + wab + elite_sos)
- 87.3% accuracy, +370 pts over baseline
- Got champion (Kansas), F4, and E8 all correct on 2022
- On a chalk year, game-level accuracy and ESPN points align well

### Run 3: Expected Value Optimization — 1750 ESPN pts
- Identical to Run 2 on 2022 — model was confident enough that EV optimization didn't diverge
- When the model strongly favors the correct picks, path probability weighting doesn't change anything
- Key insight: **EV optimization only diverges from game-level when model confidence is moderate**

## Phase 2 (Runs 4-8, test years: 2022-2023)

### Run 4: Multi-year Game-Level — avg 1535 pts
- 2022: 1750, 2023: 1320
- 2023 was chaotic (FDU 16-seed upset) — model got only 1/4 E8 correct
- But still got F4 and Championship right (480 pts from those 3 games alone)
- Massive variance between chalk years and chaos years

### Run 5: Multi-year EV Optimization — avg 1575 pts (+40 over Run 4)
- 2022: 1750, 2023: 1400 (+80 over Run 4 on the chaos year)
- **The EV optimization picked up an extra Elite 8 correct pick on 2023**
- On 2023, path probability helped: the model picked a team with better path odds for E8 even though it wasn't the per-game favorite
- Confirms the thesis: EV optimization matters most in chaotic years with uncertain late rounds

### Run 6: Champion-First Strategy — avg 1575 pts (same as Run 5)
- Converged with Run 5 — the champion-first weighting didn't change picks vs EV optimization
- The model's highest-EV champion was already the EV-optimal champion

### Run 7: Monte Carlo Sampling — avg 1505 pts (worst)
- Random sampling introduced noise that hurt overall performance
- The deterministic EV optimization is strictly better than sampling
- MC is useful for uncertainty quantification but not for pick optimization

### Run 8: Hybrid — avg 1575 pts (same as Run 5)
- Game-level for R64-R32, EV for S16+ converges with full EV optimization
- Makes sense: in early rounds, the per-game favorite IS the EV-optimal pick (low stakes)
- EV only diverges from game-level in later rounds where it matters

## Phase 3 (Runs 9-10, clean holdouts)

### Run 9: 2024 Holdout — 920 pts, 72.0 ESPN percentile
- Champion: UConn (CORRECT — 320 pts)
- Final Four: Houston, UConn, Gonzaga, Arizona (mixed results)
- Sweet 16: 1/8 correct — the model's bracket got significantly disrupted in the middle rounds
- But getting the champion right salvaged 320 pts
- 63.9% accuracy (39/61 scored games)
- **72nd percentile despite only 63.9% accuracy — this is the ESPN optimization thesis in action**

### Run 10: 2025 Holdout — 900 pts, 51.0 ESPN percentile
- Champion: Duke (WRONG — Florida won)
- Final Four: Auburn, Duke, Houston, Texas Tech — got 0/2 F4 games right
- Strong early rounds: 26/32 R64, 5/8 S16, 3/4 E8
- But missing champion + F4 = 0/480 possible from those 3 games
- **When the champion pick is wrong, ESPN optimization hurts — you've optimized the path for the wrong team**

## Key Takeaways

1. **EV optimization beats game-level by ~40-80 pts on chaotic years** (Run 5 vs Run 4)
2. **On chalk years, they converge** — the per-game favorite IS the EV-optimal pick
3. **Getting the champion right dominates everything** — 320 pts is 16.7% of total possible
4. **Monte Carlo sampling adds noise, doesn't help** — deterministic EV optimization is strictly better
5. **Champion-first and hybrid strategies converge with EV optimization** — the EV framework already weights later rounds appropriately
6. **The best approach is the simplest: EV optimization (Run 5)** — it naturally handles the point weighting
