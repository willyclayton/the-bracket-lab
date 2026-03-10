# March Madness Multi-Model Prediction Platform
# 5 AI Models. 1 Tournament. Real-Time Tracking.

## Project Status: PLANNING PHASE
**Last updated:** March 9, 2026

### Decisions Locked
- [x] 5 models, men's tournament only
- [x] Next.js + Vercel + GitHub
- [x] Persona branding with technical subtitles
- [x] Vibe: fun but credible (between sports podcast and FiveThirtyEight)
- [x] Presentation order: familiar → technical → creative → chaotic → unhinged
- [x] Two-phase launch (writeups Mar 15-16, picks lock Mar 19)
- [x] ESPN Tournament Challenge brackets per model (timestamp proof)
- [x] Visitor voting ("pick a model to root for")
- [x] Model obituaries when champion picks get eliminated
- [x] LinkedIn as primary distribution, expand to all platforms
- [x] Round recaps + ongoing content during tournament

### Decisions Needed
- [ ] Project name / brand
- [ ] Domain (subdomain of willyclayton.com vs. custom)
- [ ] LinkedIn content calendar / post strategy
- [ ] Whether to screen-record The Agent's autonomous run (video content)
- [ ] OG image / social share card design

---

## Site Architecture

**Repo:** TBD (pending project name)
**Hosting:** Vercel (free tier)
**Framework:** Next.js (App Router)
**Domain:** TBD

---

## The Models (Presentation Order)

The arc: **familiar → technical → creative → chaotic → unhinged**

### Model 1: "The Scout" — LLM Matchup Analyst
**Tagline:** *"Film room intelligence at machine speed."*
**Color:** Navy blue · **Slug:** `/models/the-scout`

The entry point. Evaluates matchups the way a real basketball analyst would — coaching experience, roster age, injury reports, clutch performance, travel distance, conference tournament momentum.

- **Data sources:** Scouting reports, injury updates, coaching records, clutch stats, conference tournament results
- **Method:** Structured LLM evaluation of every matchup across 6+ factors
- **LLM(s):** Claude / GPT / Gemini (document which and why)
- **Output:** Full bracket + scouting report card per matchup
- **Distinct because:** Qualitative. Picks up what numbers miss.

### Model 2: "The Quant" — Monte Carlo Simulation
**Tagline:** *"10,000 simulations. Zero feelings."*
**Color:** Green (Bloomberg terminal) · **Slug:** `/models/the-quant`

The counterpoint to The Scout. Ingests efficiency ratings, assigns win probabilities, simulates the tournament 10,000+ times. Bracket = most frequent outcome.

- **Data sources:** KenPom AdjO/AdjD, BartTorvik, tempo, strength of schedule
- **Method:** Python script — efficiency differentials → matchup probabilities → 10K sims
- **Output:** Full bracket + probability distributions, confidence % per pick
- **Distinct because:** Pure math. The baseline. Rarely picks upsets.

### Model 3: "The Historian" — Archetype Matching
**Tagline:** *"Every team has a twin. History already played this game."*
**Color:** Warm amber / sepia · **Slug:** `/models/the-historian`

For every 2026 team, finds their closest statistical twin from 2010–2025 tournaments. Uses what actually happened to that twin as the prediction.

- **Data sources:** 15 years of tournament team profiles (efficiency, tempo, experience, SOS, seed, conference)
- **Method:** Cosine similarity across 8-10 metrics. Best match's actual result = prediction.
- **Output:** Full bracket + archetype mapping table ("2026 Team X ≈ 2018 Team Y → Sweet 16 exit")
- **Distinct because:** Storytelling model. Every pick has a historical parallel to argue about.

### Model 4: "The Chaos Agent" — Upset Detector
**Tagline:** *"Your bracket is too safe. This one isn't."*
**Color:** Red / danger · **Slug:** `/models/the-chaos-agent`

Doesn't ask "who's better?" — asks "what could go wrong for the favorite?" Contrarian foil to The Quant.

- **Data sources:** 3PT variance, FT% in close games, turnover rate, tempo differentials, coach tournament record, close-game history
- **Method:** Upset vulnerability score per favored team. Above threshold = flip.
- **Output:** Full bracket + upset confidence scores, "spiciest picks" highlighted
- **Distinct because:** The screenshot bracket. Gets crushed or goes viral.

### Model 5: "The Agent" — Autonomous AI Researcher
**Tagline:** *"No rules. No prompts. Just: build me a bracket."*
**Color:** Neon green on black (terminal) · **Slug:** `/models/the-agent`

Point Claude Code at the repo. One instruction: "Research the tournament. Build a bracket. Go." No methodology defined — the agent decides what matters.

- **Data sources:** Whatever it decides to find
- **Method:** Claude Code with web search + subagents, full autonomy
- **Output:** Full bracket + documented log of research process
- **Distinct because:** The story is the process, not just the picks. The viral finale.

---

## Launch Strategy: Two-Phase Rollout

### Phase 1: "The Models" — March 15–16 (post-Selection Sunday)
**What goes live:**
- Full site with all 5 methodology writeups
- Model overview / comparison page
- Dashboard scaffolding (bracket area shows "Picks lock March 19")
- Visitor voting ("Which model are you riding with?")
- Email signup

**LinkedIn Post #1:** "I built 5 AI models to compete against each other in March Madness. Here's how each one thinks. Picks lock Wednesday." (Link to site)

**Goal:** Build anticipation. Give people a reason to come back.

### Phase 2: "The Picks" — March 19 (after First Four, before R64)
First Four wraps March 18. Full 64-team field is set.
- Run all 5 models
- Populate bracket JSONs
- Fill out 5 ESPN Tournament Challenge brackets (timestamp proof)
- Push update — site now shows all picks, locked and final

**LinkedIn Post #2:** "The models have made their picks. 5 brackets. 5 completely different champions. Follow along starting tomorrow — every game tracked in real time." (Link to dashboard)

**Goal:** Drive traffic for Day 1 of the real tournament.

### Phase 3: Live Tournament — March 20 – April 6
- Update results after each game session (or automate via GitHub Actions)
- Round recaps in `/blog`
- Model obituaries when a model's champion is eliminated
- Leaderboard updates
- LinkedIn posts after each round highlighting the leader + biggest misses

### Phase 4: Post-Mortem — April 7+
- Final results + which model won
- Lessons learned writeup
- "What I'd do differently" post
- Final ESPN percentile screenshots for each model

---

## ESPN Tournament Challenge Integration

Each model gets its own ESPN bracket entry:
- **Bracket names:** "The Scout," "The Quant," "The Historian," "The Chaos Agent," "The Agent"
- All filled out and locked before first R64 game tips off
- Site displays ESPN entry links so anyone can verify picks were pre-locked
- After each round, screenshot ESPN percentile rankings per model → content for recaps
- Final ESPN percentiles become a key metric in the post-mortem

---

## Visitor Voting System

Simple, lightweight — don't overbuild this.
- On the landing page and `/models` overview: "Which model are you riding with?"
- Single vote per visitor (cookie or localStorage-based, doesn't need auth)
- Display vote counts / percentages per model as a bar chart
- Updates in real-time (Supabase free tier for a simple vote counter, or even a lightweight API route with Vercel KV)
- Secondary engagement: show how the "people's choice" model is performing vs. others

---

## Model Obituaries

When a model's predicted champion is eliminated from the tournament:
- Short blog post: "In Memoriam: The Quant's Bracket (2026–2026)"
- Tone: funny, dramatic eulogy style
- Include: what the model predicted, where it went wrong, what it got right before dying
- Visual: grayed-out model card on the dashboard, "ELIMINATED" stamp
- LinkedIn post: "The Quant's bracket died today. It picked Duke to win it all. Duke lost to VCU in the Sweet 16 by 3 points. RIP." (Screenshot of the eliminated model card)

**Note:** A model isn't "dead" when its champion loses — it can still score points on other picks. The obituary is for the champion pick specifically. The model keeps competing on the leaderboard.

---

## Pages

### `/` — Landing Page
- Hero: project name, pitch line, 5 model icons
- Model cards (ordered): persona name, tagline, champion pick, current score
- Mini leaderboard
- "Which model are you riding with?" voting widget
- Email signup
- Links to dashboard + latest blog post

### `/models` — Model Overview
- Side-by-side comparison of all 5
- Where they agree vs. diverge
- Each model's Final Four + Champion
- Consensus picks (4+ models agree)
- Biggest disagreements
- Voting widget (secondary placement)

### `/models/[slug]` — Individual Model Pages
- Blog-style methodology writeup
- Full bracket visualization
- Key picks + reasoning
- Model-specific viz (probability charts, scouting cards, twin tables, etc.)
- ESPN bracket link (proof of locked picks)

### `/dashboard` — Live Tournament Dashboard
- **Bracket view:** Interactive, all 5 models overlaid
  - Color-coded, toggleable per model
  - ✅ / ❌ as games complete
  - Click matchup → each model's pick + reasoning
- **Leaderboard:**
  - Model | R64 | R32 | S16 | E8 | F4 | Final | Champ | Total
  - ESPN-style scoring (10/20/40/80/160/320)
  - Running accuracy % and rank
  - Eliminated champion indicator (grayed out + stamp)
- **Round recaps:**
  - Best model per round, biggest misses, best calls
  - "Model of the round" highlight
- **Consensus vs. divergence:**
  - Games where 4+ agree (high confidence)
  - Games where models split (most interesting)
- **Vote tracker:**
  - Which model has the most fan support
  - Is the crowd-favorite model winning?

### `/blog` — Writeups & Recaps
MDX-driven:
- Pre-tournament: model intros (5 posts), methodology deep dives
- During: round recaps, model obituaries, accuracy updates
- Post-tournament: final results, lessons learned, which approach worked

### `/about` — About
- Who you are, why you built this
- Tech stack + how each model was built
- GitHub repo + ESPN bracket links
- Socials

---

## Data Architecture

```
/data
  /models
    the-scout.json
    the-quant.json
    the-historian.json
    the-chaos-agent.json
    the-agent.json
  /results
    actual-results.json
  /meta
    teams.json
    schedule.json
    votes.json              # or use Supabase/Vercel KV
    espn-links.json         # ESPN bracket URLs per model
```

### Bracket JSON Schema (per model)
```json
{
  "model": "the-scout",
  "displayName": "The Scout",
  "tagline": "Film room intelligence at machine speed.",
  "color": "#1e3a5f",
  "generated": "2026-03-19T12:00:00Z",
  "locked": true,
  "espnBracketUrl": "https://fantasy.espn.com/tournament-challenge-bracket/...",
  "champion": "Duke",
  "championEliminated": false,
  "finalFour": ["Duke", "Arizona", "Michigan", "Florida"],
  "rounds": {
    "round_of_64": [
      {
        "gameId": "R64_E1",
        "region": "East",
        "seed1": 1,
        "team1": "Duke",
        "seed2": 16,
        "team2": "Norfolk State",
        "pick": "Duke",
        "confidence": 0.97,
        "reasoning": "Elite coaching + 5-star talent depth vs. 16-seed with no tournament experience"
      }
    ],
    "round_of_32": [],
    "sweet_16": [],
    "elite_8": [],
    "final_four": [],
    "championship": []
  }
}
```

### Results JSON Schema
```json
{
  "lastUpdated": "2026-03-20T22:30:00Z",
  "currentRound": "round_of_64",
  "games": [
    {
      "gameId": "R64_E1",
      "round": "round_of_64",
      "region": "East",
      "team1": "Duke",
      "seed1": 1,
      "team2": "Norfolk State",
      "seed2": 16,
      "score1": 82,
      "score2": 56,
      "winner": "Duke",
      "completed": true,
      "gameTime": "2026-03-20T12:15:00Z"
    }
  ]
}
```

### Scoring Engine (client-side)
- Round of 64: 10 pts per correct pick
- Round of 32: 20 pts
- Sweet 16: 40 pts
- Elite 8: 80 pts
- Final Four: 160 pts
- Championship: 320 pts
- **Max possible: 1,920 pts**

---

## Tech Stack

| Layer          | Tool                        | Why                              |
|----------------|-----------------------------|----------------------------------|
| Framework      | Next.js (App Router)        | Already know it, SSG + SSR       |
| Hosting        | Vercel                      | Free, auto-deploy from GitHub    |
| Styling        | Tailwind CSS                | Fast, responsive, utility-first  |
| Blog/Content   | MDX                         | Markdown + React components      |
| Data           | JSON files in `/data`       | Simple, git-tracked, no DB       |
| Voting         | Vercel KV or Supabase       | Lightweight vote counter         |
| Email signup   | Buttondown (free tier)      | Simple, indie, embeddable        |
| Charts         | Recharts or Chart.js        | Lightweight, React-native        |
| Bracket viz    | Custom React component      | Nothing off-the-shelf fits       |
| Live updates   | Git push → Vercel redeploy  | ~30 sec from push to live        |
| Model scripts  | Python + Claude API         | For Quant, Historian, Chaos      |
| Agent model    | Claude Code                 | Autonomous research + output     |
| Social cards   | OG image via Vercel OG      | Dynamic social share images      |

---

## Update Workflow During Tournament

1. Game session finishes → update `actual-results.json`
2. Check if any model's champion was eliminated → update `championEliminated` field
3. `git push` → Vercel auto-redeploys (~30 seconds)
4. Scoring engine recalculates on page load
5. If champion eliminated → write obituary blog post
6. After each round → write recap, post to LinkedIn
7. Screenshot ESPN percentiles per model → include in recaps

### Optional: Automate with GitHub Actions
- Cron job every 15 min during game windows
- Fetch scores from a free sports API
- Auto-commit updated results JSON
- Vercel picks up the push and redeploys

---

## LinkedIn Content Calendar

| Date           | Post                                                         |
|----------------|--------------------------------------------------------------|
| Mar 15–16      | **Launch:** "I built 5 AI models to compete in March Madness. Here's how each one thinks." |
| Mar 19         | **Picks locked:** "5 brackets. 5 different champions. Picks are locked on ESPN. Follow along live." |
| Mar 20–21      | **R64 Day 1-2:** "Day 1 results: The [winner] is leading. The Chaos Agent already hit a 12-over-5 upset." |
| Mar 22–23      | **R64 wrap / R32:** Round recap + first obituary if applicable |
| Mar 27–28      | **Sweet 16:** "We're down to 16. Here's where the models stand." |
| Mar 29–30      | **Elite 8:** Obituaries, leaderboard update, drama recap      |
| Apr 4          | **Final Four:** "Only [X] models still have a living champion." |
| Apr 6          | **Championship:** "The winner is..." — final results post     |
| Apr 7–8        | **Post-mortem:** "What I learned building 5 AI models for March Madness." (Portfolio piece) |

---

## Pre-Tournament Checklist

### Week of March 9–14 (NOW)
- [ ] Lock project name + domain
- [ ] Scaffold Next.js app + deploy to Vercel
- [ ] Build landing page with 5 model cards
- [ ] Build model overview page
- [ ] Build individual model page template
- [ ] Build dashboard with bracket viz + leaderboard
- [ ] Build scoring engine (client-side JS)
- [ ] Build voting widget
- [ ] Set up MDX blog infrastructure
- [ ] Design OG social share card
- [ ] Prep model scripts (Quant Python, Historian data, Chaos scoring)

### Selection Sunday — March 15
- [ ] Bracket is announced
- [ ] Publish site with methodology writeups (Phase 1)
- [ ] LinkedIn Post #1

### March 16–18 (First Four)
- [ ] Watch First Four results to finalize 64-team field
- [ ] Prep model inputs

### March 19 (Picks Lock Day)
- [ ] Run all 5 models on final 64-team bracket
- [ ] Populate all bracket JSONs
- [ ] Fill out 5 ESPN Tournament Challenge brackets
- [ ] Push update to site — all picks visible + locked
- [ ] LinkedIn Post #2
- [ ] Test scoring engine with first fake results

### March 20 (Tournament starts)
- [ ] Begin live updates
- [ ] First round recap content

---

## Timeline

| Date           | Milestone                                    |
|----------------|----------------------------------------------|
| Mar 9–14       | Build site, design, model prep               |
| Mar 15         | Selection Sunday — site launches (Phase 1)   |
| Mar 16–18      | First Four — prep models                     |
| Mar 19         | Picks lock — all brackets published (Phase 2)|
| Mar 20–23      | Rounds 1 & 2 — live updates, recaps          |
| Mar 27–30      | Sweet 16 & Elite 8 — obituaries, drama       |
| Apr 4–6        | Final Four & Championship — final results    |
| Apr 7+         | Post-mortem — the portfolio piece             |
