# Research Data Manifest

## Status: Phase 3 Collection Complete (2025 added)

This document tracks all data collected for The Super Agent's ML pipeline.

## Collected Files

| File | Description | Source | Date Collected | Rows |
|------|-------------|--------|----------------|------|
| `tournament_games.csv` | All NCAA tournament game results 2010-2019 + 2021-2025 | github.com/shoenot/march-madness-games-csv + verified archive | 2026-03-11 | 945 |
| `team_stats.csv` | Pre-tournament team stats for all tournament teams | barttorvik.com | 2026-03-11 | 960 |
| `raw_YYYY.csv` (x15) | Raw source files per year (2025 from verified actual-results.json) | github.com/shoenot/march-madness-games-csv | 2026-03-11 | 64 each |
| `barttorvik_YYYY.csv` (x15) | Raw BartTorvik team stats per year | barttorvik.com | 2026-03-11 | ~350 each |

## Data Processing

### tournament_games.csv
- **Schema:** year, round, game_id, team1, seed1, team2, seed2, winner, score1, score2
- **Years:** 2010-2019, 2021-2025 (15 years, no 2020 due to COVID)
- **Processing:** Raw source has winner/loser format. Converted to team1/team2/winner format with randomized team assignment (seed 42) to prevent positional bias.
- **Data fix:** 2013 Louisville games were blank in source (title vacated by NCAA). Filled in with actual game results for ML purposes.

### team_stats.csv
- **Schema:** year, team, seed, adj_em, adj_o, adj_d, tempo, sos, barthag, wab, elite_sos, ncsos, conf_winpct
- **Processing:** Extracted from full BartTorvik season data. Only tournament teams included. Team names matched via alias dictionary (896/896 matched).
- **Key metrics:**
  - adj_em: Adjusted efficiency margin (AdjOE - AdjDE) — points per 100 possessions above average, adjusted for opponent
  - adj_o: Adjusted offensive efficiency
  - adj_d: Adjusted defensive efficiency
  - tempo: Adjusted tempo (possessions per 40 minutes)
  - sos: Strength of schedule
  - barthag: BartTorvik power rating (0-1 scale)
  - wab: Wins Above Bubble
  - elite_sos: Strength of schedule against top-tier opponents
  - ncsos: Non-conference strength of schedule
  - conf_winpct: Conference win percentage

## Phase 2 Additions (vs. Phase 1)
- Added 3 new years: 2022, 2023, 2024 (189 games, 192 team-year stats)
- Added 5 new BartTorvik columns: barthag, wab, elite_sos, ncsos, conf_winpct
- BartTorvik 2023/2024 CSVs have slightly different column layout (`adjt` is separate vs. combined with `Fun Rk` in earlier years) — handled in `build_team_stats.py`

## Phase 3 Additions (2025 holdout + bracket generation)
- Added 2025: 63 games, 64 team-year stats
- raw_2025.csv: Generated from verified data/archive/2025/results/actual-results.json (ESPN-verified scores), since GitHub source does not yet have 2025
- barttorvik_2025.csv: Downloaded directly from barttorvik.com (364 teams, end-of-season stats)
- New name aliases added: Alabama State -> Alabama St., SIU Edwardsville, UC San Diego, High Point, Omaha -> Nebraska Omaha, Mount St. Mary's
- All 960/960 team-year combinations matched successfully (0 unmatched)

## Temporal Integrity
- All team stats are from regular season data, available before Selection Sunday
- See `DATA_AVAILABILITY_TIMELINE.md` for detailed temporal constraints
- No tournament outcome data used as features

## Notes
- All data from publicly available sources
- Louisville 2013 data corrected from public record (games actually happened, title was vacated afterward)
- 8 games in tournament_games.csv could not be matched to team_stats.csv (likely First Four/play-in teams not in main BartTorvik rankings)
