# Model Specifications

## Presentation Order

The models are presented in this exact order everywhere on the site. This is a deliberate content sequencing decision — the arc is **familiar → technical → creative → chaotic → unhinged**. Each model escalates in concept so the reader never bounces. Do not reorder.

---

## Model 1: The Scout — LLM Matchup Analyst

**Tagline:** "Film room intelligence at machine speed."
**Color:** Navy blue `#3b82f6`
**Icon:** 🎬
**Slug:** `/models/the-scout`
**CSS classes:** `text-scout`, `model-scout-bg`, `glow-scout`, `model-scout`

### Why it's first
The most relatable model. Everyone understands "I studied the teams and made picks." It's the entry point that makes casual fans comfortable.

### Methodology
Evaluates every tournament matchup like a head scout, using a structured LLM prompt that considers:

1. **Coaching Tournament Experience** — Head coach's NCAA tournament record, Final Four appearances, years at current program
2. **Roster Composition** — Freshman-heavy vs. senior-led, total minutes of tournament experience on roster
3. **Injury Reports** — Key player availability, recent injuries, minutes restrictions
4. **Clutch Performance** — Record in games decided by 5 points or fewer, late-game execution stats
5. **Travel & Rest** — Distance from campus to game site, days between games, timezone changes
6. **Conference Tournament Momentum** — How the team performed in their conference tournament, recent form (last 10 games)

### How to build it
- Choose LLM(s): Claude, GPT, Gemini, or compare all three
- For each matchup, build a structured prompt with team profiles covering all 6 factors
- Ask the LLM to evaluate the matchup, pick a winner, assign a confidence score (0-1), and provide 2-3 sentences of reasoning
- Run sequentially through the bracket: R64 → R32 → S16 → E8 → F4 → Championship (each round uses previous round's winners)
- Output: `data/models/the-scout.json`

### Data sources needed
- Coaching records: sports-reference.com, NCAA.com
- Injury reports: ESPN, CBS Sports, team beat reporters
- Clutch stats: KenPom (close games), BartTorvik
- Conference tournament results: Live results from March 10-16
- Game site locations: NCAA tournament bracket (announced Selection Sunday)

### What makes it distinct
Qualitative where The Quant is quantitative. Picks up things numbers miss — chemistry, pressure situations, narrative momentum. It might say "yeah Duke is better statistically, but their freshman guard has never played a tournament game and their coach historically struggles in the first weekend."

---

## Model 2: The Quant — Monte Carlo Simulation

**Tagline:** "10,000 simulations. Zero feelings."
**Color:** Green `#22c55e`
**Icon:** 📊
**Slug:** `/models/the-quant`
**CSS classes:** `text-quant`, `model-quant-bg`, `glow-quant`, `model-quant`

### Why it's second
The counterpoint to The Scout. Creates immediate tension: "Cool, but what if we ignore all that and just trust the math?" People start comparing the two and picking sides.

### Methodology
Pure statistical simulation. No narratives, no eye test.

1. Ingest team efficiency data (adjusted offensive efficiency, adjusted defensive efficiency, tempo, strength of schedule)
2. For any matchup between Team A and Team B, calculate win probability using efficiency differentials (log5 method or similar)
3. Simulate each game by drawing a random number against the win probability
4. Run the entire 64-team tournament 10,000 times
5. The bracket = the most common outcome for each game across all simulations
6. Confidence = percentage of simulations where that pick won

### How to build it
- Python script
- Data: Pull from KenPom (paid, ~$20) or BartTorvik (free) — both have AdjO, AdjD, tempo, SOS
- Matchup probability function: `P(A wins) = (A_eff - B_eff) → logistic function → probability`
- Tournament simulation: Bracket tree structure, simulate each game, advance winners
- Run 10,000 iterations, count outcomes per game
- The pick for each game = team that won that game most often across sims
- Output: `data/models/the-quant.json` with confidence as the simulation frequency

### Key implementation detail
This can be tested RIGHT NOW with 2025 tournament data as a dry run. The script doesn't depend on the 2026 bracket — only the probability function and simulation logic. Build and validate the script now, plug in 2026 data on March 19.

### Data sources needed
- BartTorvik.com (free): Team ratings, AdjO, AdjD, tempo, SOS
- OR KenPom.com (~$20/yr): Same metrics, considered gold standard
- Historical accuracy of efficiency-based models: ~70% per game in R64

### What makes it distinct
The baseline. The "expected" bracket. It rarely picks upsets because the math rarely supports them. It's the one you measure everything else against. When The Quant's champion gets upset, that's the screenshot moment.

---

## Model 3: The Historian — Archetype Matching

**Tagline:** "Every team has a twin. History already played this game."
**Color:** Warm amber `#f59e0b`
**Icon:** 📜
**Slug:** `/models/the-historian`
**CSS classes:** `text-historian`, `model-historian-bg`, `glow-historian`, `model-historian`

### Why it's third
The "oh that's actually clever" moment. Nobody has done this well before. It's the most original angle and the content is inherently shareable — every pick comes with a historical parallel people can debate.

### Methodology
For every 2026 tournament team, find their closest statistical twin from past tournaments (2010–2025). Use what actually happened to that historical twin as the prediction.

1. Build a database of every tournament team from 2010–2025 with 8-10 key metrics
2. For each 2026 team, calculate similarity score (cosine similarity or Euclidean distance) against every historical team
3. Find the top 1-3 most similar historical teams
4. Use the best match's actual tournament result as the prediction
5. If a matchup's two teams have conflicting archetype predictions (both predicted to advance), use the team whose archetype went furthest

### Metrics for similarity scoring
- Adjusted offensive efficiency (AdjO)
- Adjusted defensive efficiency (AdjD)
- Tempo (possessions per game)
- Strength of schedule (SOS)
- Tournament seed
- Conference strength (multi-bid conference or not)
- Experience (returning minutes %)
- 3-point shooting rate and percentage
- Free throw percentage
- Turnover rate

### How to build it
- Python script or Claude-assisted analysis
- Historical data: BartTorvik has archives back to 2008
- Build team profile vectors (normalize each metric to 0-1 scale)
- Use `scipy.spatial.distance.cosine` or `sklearn.metrics.pairwise.cosine_similarity`
- For each 2026 team, output: "2026 Duke ≈ 2015 Duke (similarity: 0.94) → Elite Eight"
- The archetype mapping table IS the content — this practically writes itself

### Key implementation detail
The historical database can be built RIGHT NOW. All data from 2010-2025 is available. Build the similarity engine now, plug in 2026 team profiles after Selection Sunday.

### Data sources needed
- BartTorvik archives (free): Historical team ratings 2010-2025
- Tournament results: Sports-reference.com, NCAA.com (how far each team went)

### What makes it distinct
The storytelling model. Every pick has a historical narrative. "2026 Gonzaga profiles like 2017 Gonzaga — dominant efficiency, weak conference, made the title game but couldn't finish." People will argue with the comparisons, which is exactly what drives engagement.

---

## Model 4: The Chaos Agent — Upset Detector

**Tagline:** "Your bracket is too safe. This one isn't."
**Color:** Red `#ef4444`
**Icon:** 🔥
**Slug:** `/models/the-chaos-agent`
**CSS classes:** `text-chaos`, `model-chaos-bg`, `glow-chaos`, `model-chaos`

### Why it's fourth
By this point the reader trusts you're legit, so the upset-heavy bracket hits harder. It's the contrarian foil to The Quant — they should disagree on almost everything in the early rounds.

### Methodology
Doesn't ask "who's better?" — asks "what could go wrong for the favorite?" Builds an "upset vulnerability score" for every favored team.

Upset vulnerability factors:
1. **3-Point Dependency + Variance** — Teams that live by the three die by the three. High 3PA rate + high game-to-game variance in 3P% = upset risk.
2. **Free Throw Shooting Under Pressure** — Poor FT% in close games. Tournament games get tight.
3. **Turnover Rate** — High-turnover teams against low-turnover opponents create chaos.
4. **Tempo Mismatch** — Fast-paced favorites vs. slow-grind underdogs. The underdog controls the tempo and shortens the game.
5. **Coach Tournament Record** — First-time tournament coaches, coaches with historically bad early-round records.
6. **Close Game Record** — Teams that haven't been tested in close games all year are vulnerable when it gets tight.
7. **Historical Seed Upset Rates** — 12-over-5 happens ~35% of the time. 11-over-6 is ~37%. Baked-in baseline upset probabilities by seed matchup.

### How to build it
- For each favored team in each matchup, calculate an upset vulnerability score (0-100)
- Weight each factor based on historical upset correlation
- Set a threshold (e.g., score > 55 = flip the pick to the underdog)
- For seed matchups with historically high upset rates (12v5, 11v6, 10v7), lower the threshold
- The bracket should have significantly more upsets than any other model — probably 15-20 upsets vs. The Quant's 5-8
- Output: `data/models/the-chaos-agent.json` with upset confidence scores highlighted

### Data sources needed
- 3PT rate and variance: BartTorvik game logs
- FT%: KenPom/BartTorvik
- Turnover rate: Standard box score stats
- Tempo data: BartTorvik
- Coach records: Sports-reference.com
- Historical upset rates by seed: NCAA.com, readily available

### What makes it distinct
The screenshot bracket. Will probably get crushed in total points because most upsets don't happen. But when it hits a 13-over-4 or correctly calls a Sweet 16 Cinderella, that's the viral moment. It's specifically designed to be the bracket people love to hate — until it's right.

---

## Model 5: The Agent — Autonomous AI Researcher

**Tagline:** "No rules. No prompts. Just: build me a bracket."
**Color:** Neon green `#00ff88`
**Icon:** 🤖
**Slug:** `/models/the-agent`
**CSS classes:** `text-agent`, `model-agent-bg`, `glow-agent`, `model-agent`

### Why it's last
The mic drop. The finale. It only works BECAUSE the other 4 models proved you know what you're doing. Without that credibility, it reads as a gimmick. With it, it reads as an experiment.

### Methodology
There is no predefined methodology. That's the point.

Point Claude Code at the repo with one mega-prompt:
> "You have access to web search and this project directory. Research the 2026 NCAA tournament. Analyze every team however you see fit — you decide what data matters, what factors to weigh, and how to make your picks. Build a complete 64-team bracket with reasoning for every pick. Output it to `data/models/the-agent.json` following the schema in `lib/types.ts`. Go."

Then step back and let it run autonomously.

### How to build it
- Claude Code in the repo directory
- One prompt, minimal constraints
- Screen-record the entire session (for LinkedIn video content)
- Also capture a written log of what it researched, what tools it used, what rabbit holes it went down
- The output is the bracket JSON, but the CONTENT is the story of the process

### Content deliverables
- Screen recording → timelapse video for LinkedIn
- Written log → blog post: "I Gave an AI Zero Instructions and Let It Build a March Madness Bracket. Here's What Happened."
- The research log shows what the agent decided mattered — did it focus on defense? Free throws? Coaching? Something nobody expected?

### What makes it distinct
Every other model has a human-defined methodology. This one doesn't. The story isn't just the bracket — it's the process of an AI deciding for itself how to approach the problem. That process narrative is the most viral-worthy piece of the entire project.

---

## Model 6: The Super Agent — Iterative ML Predictor

**Tagline:** "The Agent improvised. This one trained."
**Color:** Purple `#a855f7`
**Icon:** 🧠
**Slug:** `/models/the-super-agent`
**CSS classes:** `text-superagent`, `model-superagent-bg`, `glow-superagent`, `model-superagent`
**Pipeline:** `super_agent/src/` — fully built with actual run results in `super_agent/run_log.md`

### Why it's sixth
The logical evolution of The Agent. Where Model 5 improvised from scratch, Model 6 actually trains — building measurable ML predictions through iterative research. It's the most methodologically rigorous model in the lineup, and it earns its position by proving its approach works on historical data before touching 2026.

### Methodology
Iterative ML pipeline with three disciplined research cycles:

1. **Research phase** — Gather all training data (2010-2020 tournament results, team stats, advanced metrics) into isolated `super_agent/` directory
2. **Run 1: Seed baseline** — Lower seed always wins. Establishes the accuracy floor.
3. **Run 2: First signal** — Add the single most promising feature. Simple logistic regression. Must beat baseline.
4. **Run 3: Iteration** — One more signal or approach change. This is the final model.
5. **Checkpoint** — Stop. Write report. Human reviews before any 2026 predictions.

### Data isolation
All ML code and data lives in `super_agent/` at the project root. No imports from `data/research/` or other model directories. This prevents any accidental cherrypicking from other models' research.

### What makes it distinct
The only model that proves its methodology works before applying it. Every other model has a methodology that sounds good — this one has accuracy numbers on holdout data. The constraint of exactly 3 iterations prevents overfitting and forces honest assessment of what signals actually matter.

---

## Model 7: The Optimizer — ESPN Points Maximizer

**Tagline:** "Optimized for what actually matters: your bracket pool."
**Color:** Cyan `#06b6d4`
**Icon:** 📈
**Slug:** `/models/the-optimizer`
**Pipeline:** `optimizer_agent/src/` — logistic regression + expected value optimization, backtested on 2024-2025

### Why it exists
Every other model optimizes for per-game accuracy. The Optimizer exploits ESPN's exponentially back-loaded scoring (a correct champion = 32 first-round picks) by maximizing *expected points*, not prediction accuracy. It asks: "Which bracket earns the most ESPN points in expectation?"

### Methodology
1. Train logistic regression on 2010-2021 tournament games (693 games, excluding 2020/COVID)
2. For each team, compute path probability through the bracket (product of per-game win probabilities)
3. Expected points = path probability * round points for each possible pick
4. Optimize the complete bracket for maximum total expected ESPN points
5. Champion-first strategy: lock the highest-EV champion, then optimize the path backward

### Key results
- Backtested on unseen 2024 and 2025 tournaments
- Baseline (seed-only): ~920 ESPN pts on 2024
- Expected value optimization consistently beats naive game-level accuracy models

### What makes it distinct
It's the only model that explicitly optimizes for the scoring system you're actually competing in. A 12-seed Cinderella that makes the Sweet 16 is worth more expected points to pick than a 4-seed that gets bounced in the Round of 32 — The Optimizer understands this.

---

## Model 8: The Scout Prime — Data-Saturated LLM Analyst

**Tagline:** "Everything The Scout sees — times five."
**Color:** Slate `#64748b`
**Icon:** 🔬
**Slug:** `/models/the-scout-prime`
**Pipeline:** `scout_prime_agent/src/` — multi-step enrichment + Claude Code round-by-round analysis

### Why it exists
The Scout proved LLM contextual synthesis works with 6 curated factors. Scout Prime tests whether *saturating* the LLM with ~30 data points per team produces better brackets than curating a few dimensions.

### Methodology
1. **Enrich teams:** Compile mega-profiles with efficiency ratings, shooting splits, rebounding, turnovers, close-game resilience, momentum, coaching records, and field intelligence (intangibles)
2. **Build archetypes:** Find top 3 historical twins per team using normalized similarity vectors
3. **Generate round-by-round:** For each round, export rich matchup context packets. Claude Code reads each packet, analyzes the matchup, and writes a pick with reasoning.
4. **Compile bracket:** Assemble all round picks into a single bracket JSON

### Data per matchup
- ~30 statistical dimensions per team (vs. Scout's 6 factors)
- Historical twins with tournament outcomes
- Seed matchup history with upset rates
- Pre-computed upset vulnerability scores
- Field intelligence: injury updates, momentum, chemistry, logistics

### Export/import workflow
Scripts prepare all data and export structured context files. Claude Code (the CLI) does all LLM analysis directly in conversation — no API calls. This lets the model leverage Claude's full reasoning capabilities without token-limit constraints.

### What makes it distinct
The maximum-context experiment. If The Scout is a film room, Scout Prime is the entire scouting department's database. The hypothesis: more structured data → better LLM picks. Backtestable on 2024 and 2025 to compare against The Optimizer's scores.

---

## Model Comparison Matrix

| Attribute | The Scout | The Quant | The Historian | The Chaos Agent | The Agent | The Super Agent | The Optimizer | The Scout Prime |
|-----------|-----------|-----------|---------------|-----------------|-----------|----------------|---------------|-----------------|
| Approach | Qualitative | Quantitative | Historical | Contrarian | Autonomous | Iterative ML | ESPN EV optimization | Data-saturated LLM |
| Built with | Claude Code | Python script | Python script | Python script | Claude Code | Python ML pipeline | Python ML pipeline | Python + Claude Code |
| Pipeline | `scripts/scout_export_context.py` | `scripts/quant.py` | `scripts/historian.py` | `scripts/chaos.py` | `scripts/agent_prompt.md` | `super_agent/src/` | `optimizer_agent/src/` | `scout_prime_agent/src/` |
| Upset tendency | Moderate | Low | Varies | Very High | Unknown | Data-driven | Low (EV-driven) | Moderate |
| Key strength | Matchup nuance | Statistical rigor | Narrative depth | Contrarian edge | Unpredictability | Proven accuracy | Points optimization | Maximum context |
| Content value | Scouting reports | Probability charts | Historical parallels | Spicy picks | Process story | Research log | Strategy analysis | Data density test |
| Status | Script done | Script done | Script done | Script done | Prompt done | Pipeline done | Pipeline done | Pipeline done |
