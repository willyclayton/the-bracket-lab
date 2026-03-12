# Research Data Manifest — The Optimizer

## Data Sources (copied from super_agent/research/)

All data files are identical to those used by The Super Agent. The Optimizer uses the same underlying data — the difference is purely in the optimization objective (ESPN points vs accuracy).

### tournament_games.csv
- **Source:** ESPN tournament results, verified against NCAA.com
- **Years:** 2010-2025 (excluding 2020/COVID)
- **Columns:** year, round, game_id, team1, seed1, team2, seed2, winner, score1, score2
- **Games:** ~945 total (63 per year x 15 years)

### team_stats.csv
- **Source:** BartTorvik.com pre-tournament ratings
- **Years:** 2010-2025
- **Columns:** year, team, adj_em, adj_o, adj_d, tempo, sos, barthag, wab, elite_sos, ncsos, conf_winpct

### barttorvik_{year}.csv
- **Source:** BartTorvik.com
- **Years:** 2010-2025 (excluding 2020)
- **Content:** Full team ratings for each season, used for bracket generation

## Train/Test Split
- **Training:** 2010-2021 (excluding 2020) — 693 games
- **Internal test:** 2022-2023 — 126 games
- **Clean holdout:** 2024, 2025 — 126 games (never seen during iteration)
- **Live:** 2026
