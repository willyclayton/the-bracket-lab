# March Madness ESPN Points Optimizer — Auto-Research Program

## CRITICAL CONSTRAINTS
- **Working directory**: All work MUST happen inside this project folder. NEVER cd out of it.
- **Do NOT modify, read, or reference any files outside this directory.**
- **Do NOT touch any sibling folders, parent directories, or other projects.**
- **All pip installs use `--target=./deps` or virtual env within this folder.**
- **If a command would affect anything outside this folder, STOP and ask.**

## Objective
Build an autonomous research loop that discovers the optimal bracket prediction strategy to **maximize ESPN Tournament Challenge points** by backtesting against the last 15 years of March Madness data (2010–2024).

## ESPN Scoring System
| Round | Points Per Correct Pick |
|-------|------------------------|
| Round of 64 | 10 |
| Round of 32 | 20 |
| Sweet 16 | 40 |
| Elite 8 | 80 |
| Final Four | 160 |
| Championship | 320 |

**Max possible score: 1920 points.**
Later rounds are disproportionately valuable. A correct championship pick = 32 correct Round of 64 picks.

## Phase 1: Data Collection & Setup

### Step 1 — Create project structure
```
march-madness-research/
├── data/
│   ├── raw/           # scraped/downloaded historical data
│   ├── processed/     # cleaned CSVs ready for modeling
│   └── results/       # backtest outputs
├── models/            # saved model artifacts
├── strategies/        # strategy config files (JSON)
├── experiments/       # experiment logs and results
│   └── scoreboard.csv # running leaderboard of all strategies tested
├── analysis/          # notebooks/scripts for analysis
├── utils/             # shared helper functions
└── logs/              # run logs
```

### Step 2 — Collect historical tournament data (2010–2024)
For each tournament year, gather:
- **Full bracket results** (every game, score, seed matchups, round)
- **Team season stats** (KenPom ratings, NET rankings, AdjO, AdjD, AdjT, strength of schedule, conference)
- **Seed performance** (historical seed-vs-seed win rates)
- **AP/Coaches poll rankings** entering the tournament
- **Conference tournament results**
- **Key team metrics**: PPG, opponent PPG, turnover rate, FT%, 3P%, rebounding margin, experience (minutes returned)

**Data sources to scrape/fetch:**
- `https://www.sports-reference.com/cbb/postseason/` (bracket results)
- `https://kenpom.com` (advanced stats — may need to reconstruct from archives)
- `https://www.ncaa.com/brackets` (official brackets)
- `https://barttorvik.com` (free KenPom-like data)
- Wikipedia March Madness bracket pages (easy structured data)

Save all raw data, then create a unified `processed/tournaments.csv` with columns:
```
year, round, region, seed_1, team_1, score_1, seed_2, team_2, score_2, winner, [all available stats for both teams]
```

And a `processed/team_seasons.csv`:
```
year, team, seed, kenpom_rank, adj_o, adj_d, adj_t, sos, conference, wins, losses, ppg, opp_ppg, ...
```

### Step 3 — Build the backtesting engine
Create `utils/backtest.py`:
- Input: a strategy function that takes a matchup and returns a predicted winner
- Simulates an entire bracket for a given year
- Scores it using ESPN points
- Returns: total ESPN points, round-by-round breakdown, upset calls made, upset accuracy

Create `utils/scoring.py`:
- ESPN point calculator
- Expected value calculator (given win probabilities per round)
- Comparison tools (strategy A vs B)

## Phase 2: Baseline Strategies

Test these baselines first. Log every result to `experiments/scoreboard.csv`:

| Strategy | Description |
|----------|-------------|
| `always_higher_seed` | Always pick the higher (lower number) seed |
| `kenpom_rank` | Always pick the team with better KenPom ranking |
| `seed_history` | Use historical seed-vs-seed win rates as probabilities, pick the favorite |
| `chalk_with_upsets` | Pick higher seed but force 1-2 upsets per round based on historical upset frequency by seed matchup |
| `composite_rank` | Average of KenPom + AP + NET rankings |
| `random_weighted` | Random picks weighted by seed-based win probability (run 10,000 sims, take the bracket with highest expected value) |

**For each strategy, record:**
```csv
experiment_id, strategy_name, year, total_espn_points, r64_correct, r32_correct, s16_correct, e8_correct, f4_correct, champ_correct, upsets_called, upsets_hit, timestamp
```

## Phase 3: Feature Engineering & Advanced Models

### Step 1 — Identify predictive features
Analyze which features most correlate with tournament success (advancing rounds):
- Seed (obvious but quantify)
- KenPom AdjEM (adjusted efficiency margin)
- Experience / minutes continuity
- 3-point shooting variance
- Free throw % (matters in close games)
- Defensive turnover rate
- Conference strength
- Tournament experience (coaches with multiple appearances)
- Late-season momentum (last 10 games record)
- Rest days between games

### Step 2 — Train models
Try these approaches, all backtested with **leave-one-year-out cross-validation** (train on 14 years, test on the held-out year, rotate):

1. **Logistic Regression** — P(team A beats team B) given feature differences
2. **Random Forest** — same framing, capture nonlinear interactions
3. **XGBoost / LightGBM** — gradient boosted version
4. **Ensemble** — average probabilities from all models
5. **Neural Net (simple MLP)** — if enough data supports it

### Step 3 — Probability-to-bracket optimization
Key insight: **the bracket that maximizes expected ESPN points ≠ the bracket that picks every individual game correctly.**

Because later rounds are worth exponentially more:
- You need your champion pick to be right → optimize for this FIRST
- Then Final Four, then Elite 8, etc.
- A correct champion pick (320 pts) is worth more than getting 31 first-round games right (310 pts)

Implement a **bracket optimizer** that:
1. Takes game-by-game win probabilities from any model
2. Runs Monte Carlo simulations (100K+) of the full bracket
3. For each simulated bracket, calculates expected ESPN points
4. Uses dynamic programming or simulation to find the single bracket that maximizes expected total points
5. Accounts for path dependency (your Sweet 16 pick must have won in R64 and R32)

## Phase 4: Iteration & Optimization

### The Experiment Loop
```
FOR each new strategy idea:
    1. Define the strategy (document in strategies/ as JSON config)
    2. Backtest against all 15 years
    3. Record results to scoreboard.csv
    4. Compare against current best strategy
    5. Analyze: WHERE does it gain/lose points vs the best?
    6. Generate hypotheses for improvement
    7. Repeat
```

### Specific things to investigate through iteration:
- **Upset optimization**: What's the optimal NUMBER of upsets to pick per round? (Too few = ceiling capped, too many = floor drops)
- **Champion selection**: Which features best predict the champion? (Historically: 1-seeds win ~60%, 2-3 seeds ~30%)
- **Cinderella detection**: Can we identify which 11-14 seeds are likeliest to make runs? (Look at: tempo-free stats being undervalued by committee, mid-major dominance, experienced rosters)
- **Region difficulty**: Does region assignment matter? Model region-specific paths.
- **Matchup-specific edges**: Some playstyle matchups (e.g., slow vs fast, big vs small) may be predictable beyond rankings
- **Recency weighting**: Do stats from the last 5 games matter more than full season?
- **Conference tournament impact**: Does winning/losing the conference tournament affect NCAA performance?

### Meta-analysis after each batch of experiments:
- What's the theoretical max ESPN score achievable with perfect hindsight each year?
- What's the average top-1% ESPN bracket score each year? (benchmark)
- How close are we to the "smart human" ceiling?
- Which years are "predictable" vs "chaotic"? Why?

## Phase 5: Final Output

### Deliverables
1. **`experiments/scoreboard.csv`** — Full leaderboard of every strategy tested with ESPN scores per year
2. **`experiments/best_strategy.json`** — Config for the winning strategy with all parameters
3. **`experiments/final_report.md`** — Summary report:
   - Best strategy name and description
   - Average ESPN score across 15 years
   - Best/worst year performance
   - Round-by-round accuracy breakdown
   - Key findings (what matters most, what doesn't)
   - Recommended approach for 2026 bracket
4. **`models/`** — Trained model artifacts ready to run on 2026 data
5. **`analysis/year_by_year.csv`** — Detailed picks vs actuals for each year under best strategy

### Success Criteria
- Beat the `always_higher_seed` baseline by **15%+ average ESPN points**
- Achieve **average ESPN score > 1000** across 15 years (out of 1920 max)
- Correctly predict the champion in **at least 5 of 15 years**
- Document at least **10 distinct strategy experiments** with clear comparisons

## Execution Notes
- Use Python with pandas, scikit-learn, xgboost, requests, beautifulsoup4
- Install what you need: `pip install pandas scikit-learn xgboost lightgbm requests beautifulsoup4 numpy`
- Be aggressive about caching scraped data — don't re-scrape on every iteration
- Print progress to stdout so the logs capture everything
- If a data source is blocked or unavailable, try alternatives or construct the data from what's available
- When scraping fails, try building datasets manually from Wikipedia bracket pages which are reliably structured
- **Prioritize getting the backtest loop working with simple strategies first**, then layer in complexity
- Each experiment should be self-contained and logged — never overwrite previous results
