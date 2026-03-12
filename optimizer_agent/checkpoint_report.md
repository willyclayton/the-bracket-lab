# Checkpoint Report — The Optimizer

## Phase 1: Complete
| Run | Strategy | 2022 ESPN Pts | Notes |
|-----|----------|--------------|-------|
| 1 | Seed baseline | 1380 | Floor — lower seed always wins |
| 2 | Game-level LR | 1750 | Same model as super_agent Run 5 |
| 3 | EV optimization | 1750 | Identical to Run 2 on chalk year |

## Phase 2: Complete
| Run | Strategy | 2022 | 2023 | Average | vs Run 4 |
|-----|----------|------|------|---------|----------|
| 4 | Game-level LR | 1750 | 1320 | 1535 | baseline |
| 5 | EV optimization | 1750 | 1400 | 1575 | +40 |
| 6 | Champion-first | 1750 | 1400 | 1575 | +40 |
| 7 | Monte Carlo | 1700 | 1310 | 1505 | -30 |
| 8 | Hybrid | 1750 | 1400 | 1575 | +40 |

**Best approach: Run 5 (EV optimization)** — simplest strategy that captures all the gains.

## Phase 3: Complete
| Run | Year | ESPN Pts | Percentile | Champion | Correct? |
|-----|------|----------|------------|----------|----------|
| 9 | 2024 | 920 | 72.0% | UConn | Yes |
| 10 | 2025 | 900 | 51.0% | Duke | No (Florida won) |

## Key Result
The Optimizer's EV optimization earned **+80 ESPN pts on chaotic 2023** vs game-level picks. On the clean holdouts, getting the champion right (2024: UConn) pushed the bracket to 72nd percentile despite mediocre accuracy, while missing the champion (2025: Duke instead of Florida) dropped it to 51st percentile. This validates the core thesis: ESPN scoring is dominated by the championship pick.
