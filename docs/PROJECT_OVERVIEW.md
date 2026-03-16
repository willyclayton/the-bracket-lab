# The Bracket Lab — Project Overview

## What It Is

The Bracket Lab is a March Madness prediction platform where 6 AI models compete against each other — and against every human filling out a bracket. Each model uses a fundamentally different methodology to generate a complete 64-team NCAA tournament bracket. The site tracks their accuracy in real time as games are played, scores them using ESPN's official bracket challenge point system, and publishes recaps, analysis, and dramatic "obituaries" when a model's championship pick gets eliminated.

**Live at:** https://the-bracket-lab.vercel.app
**Built by:** Will Clayton (Data & AI Consultant, Chicago)
**Built with:** Claude Code as development co-pilot
**Stack:** Next.js 14 (App Router), Tailwind CSS, MDX, TypeScript, Vercel

## The Concept

The premise is simple: give different AI approaches the same task — predict every game of the NCAA tournament — and see which methodology actually works. Each model represents a fundamentally different philosophy about prediction:

- Can an LLM synthesize qualitative scouting factors better than raw stats?
- Does brute-force Monte Carlo simulation beat historical pattern matching?
- Can a model designed specifically to find upsets outperform one that plays it safe?
- What if you optimize for ESPN bracket pool points instead of per-game accuracy?
- What happens when an autonomous ML pipeline tests 21 strategies across 15 years of data?

The site is both a content platform (methodology writeups, round recaps, model obituaries) and a live dashboard during the tournament. The vibe sits between a fun sports podcast and FiveThirtyEight — credible enough to take seriously, fun enough to share.

## The 6 Models

These are the 6 models visible on the site. Each has a dedicated color, bracket data, methodology page, and leaderboard entry. They are defined in `lib/models.ts` and filtered via `VISIBLE_MODELS` (any model without `hidden: true`).

| # | Model | Approach | Tagline | Color |
|---|-------|----------|---------|-------|
| 1 | **The Scout** | LLM Matchup Analyst | "Film room intelligence at machine speed." | Navy `#3b82f6` |
| 2 | **The Quant** | Monte Carlo Simulation | "10,000 simulations. Zero feelings." | Green `#22c55e` |
| 3 | **The Historian** | Archetype Matching | "Every team has a twin. History already played this game." | Amber `#f59e0b` |
| 4 | **The Chaos Agent** | Upset Detector | "Your bracket is too safe. This one isn't." | Red `#ef4444` |
| 5 | **The Optimizer** | ESPN Points Maximizer | "Every other model predicts games. This one plays the scoring system." | Cyan `#06b6d4` |
| 6 | **The Auto Researcher** | Autonomous Strategy Optimizer | "21 strategies tested. 14 years backtested. One bracket." | Orange `#f97316` |

### Model Details

**The Scout** — Evaluates every matchup using 6 qualitative factors: coaching tournament experience, roster composition, injury reports, clutch performance, travel/rest logistics, and conference tournament momentum. Uses Claude to synthesize these into picks with reasoning. The most human-like model — it thinks the way a sports analyst does, just faster. Pipeline: `scripts/scout_export_context.py`.

**The Quant** — Pure statistical simulation. Ingests team efficiency ratings (AdjO, AdjD, tempo, SOS), calculates win probabilities via efficiency differentials, then simulates the entire tournament 10,000 times. The bracket is the most common outcome across all simulations. Rarely picks upsets because the math rarely supports them. The baseline everyone else is measured against. Pipeline: `scripts/quant.py`.

**The Historian** — For every 2026 team, finds the closest statistical twin from past tournaments (2010-2025) using cosine similarity across 10 metrics. Uses what actually happened to that historical twin as the prediction. Every pick comes with a narrative: "2026 Gonzaga profiles like 2017 Gonzaga." The storytelling model — people argue with the comparisons, which is the point. Pipeline: `scripts/historian.py`.

**The Chaos Agent** — Doesn't ask "who's better?" — asks "what could go wrong for the favorite?" Builds upset vulnerability scores based on 3-point variance, free throw shooting under pressure, turnover rates, tempo mismatches, coaching records, and historical seed upset rates. Designed to have 15-20 upsets vs. The Quant's 5-8. The bracket everyone screenshots. Pipeline: `scripts/chaos.py`.

**The Optimizer** — The only model that doesn't optimize for per-game accuracy. Instead, it maximizes expected ESPN bracket points. A correct champion pick (320 pts) is worth 32 correct first-round picks (10 pts each), so it explicitly accounts for the exponentially back-loaded scoring system. Trains logistic regression on 2010-2021 tournament games, computes path probabilities, and optimizes the complete bracket for maximum expected value. Pipeline: `optimizer_agent/src/`.

**The Auto Researcher** — Fully autonomous research loop. Tested 21 bracket strategies against 15 years of tournament data, trained an ML ensemble on 827 games, then used Monte Carlo optimization to find the single bracket that maximizes expected ESPN points. No human picks — just data, models, and math. The most methodologically ambitious model in the lineup. Pipeline: `autoresearcher/`.

### Hidden Models (3)

These models exist in the codebase with full bracket data and pipelines but are not displayed on the site (`hidden: true` in `lib/models.ts`). They were built as methodology experiments and backtesting baselines during development.

| Model | Approach | Why Hidden |
|-------|----------|------------|
| **The Agent** (Neon Green `#00ff88`) | Autonomous AI Researcher — Claude Code with zero instructions | Experimental; concept folded into other models |
| **The Super Agent** (Purple `#a855f7`) | Iterative ML Predictor — logistic regression, 3-iteration discipline | Backtesting baseline; methodology superseded |
| **The Scout Prime** (Slate `#64748b`) | Data-Saturated LLM Analyst — ~30 data points per team vs. Scout's 6 | Research experiment; methodology tested |

## Site Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + globals.css |
| Content | MDX via `next-mdx-remote` + `gray-matter` |
| Hosting | Vercel (auto-deploy on push) |
| Data Store | JSON files (brackets, results) + Upstash Redis (votes, scores cache) |
| Payments | Stripe (bracket unlock paywall) |
| Analytics | Vercel Analytics |
| Charts | Recharts |
| Data Fetching | SWR (client-side revalidation) |

### Pages

| Route | Purpose | Type |
|-------|---------|------|
| `/` | Landing page — hero, stats bar, leaderboard, 6 model sections, vote widget | Server component |
| `/brackets` | Bracket explorer — model tabs, BracketTree visualization, summary card, year toggle | Client component (Suspense-wrapped) |
| `/models` | Model overview — side-by-side comparison of all 6 models | Server component |
| `/models/[slug]` | Individual model deep dives — methodology, bracket summary, CTA to /brackets | Dynamic route |
| `/dashboard` | Live tournament dashboard — leaderboard, bracket view, recaps | Client component |
| `/blog` | Blog index — all posts from MDX | Server component |
| `/blog/[slug]` | Individual blog post | Dynamic route |
| `/cheat-sheet` | Tournament cheat sheet | Page |
| `/about` | About page, tech stack, ESPN bracket links (footer link, not in nav) | Server component |

### Navigation

Three tabs: **Home | Brackets | Blog**. The about page is accessible from the footer only.

### API Routes

| Endpoint | Purpose |
|----------|---------|
| `/api/votes` | Vote persistence (Upstash Redis) |
| `/api/scores` | Scoring cache (Redis) with DELETE endpoint to flush |
| `/api/create-checkout` | Stripe checkout session creation |
| `/api/unlock` | Bracket unlock after payment |
| `/api/unlock-check` | Check unlock status |

### Components

| Component | Purpose |
|-----------|---------|
| `BracketGridPanel` | Grid-based bracket visualization with region panels |
| `BracketCardsPanel` | Card-based bracket layout |
| `GameTicker` | Live game score ticker |
| `HomeLeaderboard` | Landing page leaderboard widget |
| `LiveHomeLeaderboard` | Real-time updating leaderboard |
| `LiveResultsProvider` | SWR-based real-time results context provider |
| `Leaderboard` | Full leaderboard with per-round score breakdown |
| `HomeModelCard` | Model cards on the landing page |
| `HomeModelStrip` | Compact model strip display |
| `MatchupPopover` | Click-to-reveal matchup details and reasoning |
| `ModelCard` | Reusable model card component |
| `ModelDetailTabs` | Tab navigation on model detail pages |
| `ModelNavStrip` | Model navigation strip |
| `NavLinks` | Site navigation with active route highlighting |
| `StatsBar` | Tournament statistics summary bar |
| `VoteWidget` | "Pick your model" voting — localStorage single vote + seeded counts + bar chart |
| `PaywallOverlay` | Stripe paywall overlay for bracket access |
| `BlogClient` | Client-side blog rendering |

## Data Architecture

### Directory Structure

```
data/
  models/              # 2026 bracket predictions (one JSON per model, all 9)
    the-scout.json
    the-quant.json
    the-historian.json
    the-chaos-agent.json
    the-optimizer.json
    the-auto-researcher.json
    the-agent.json          # hidden model
    the-super-agent.json    # hidden model
    the-scout-prime.json    # hidden model
  results/
    actual-results.json  # Real 2026 game outcomes (updated during tournament)
  archive/
    2024/              # 2024 tournament archive (backtesting)
    2025/              # 2025 tournament archive (ESPN-verified, all 63 games)
  meta/
    teams.json         # Team metadata (seeds, regions, conferences)
  research/
    historical-teams.json  # Historical team profiles for Historian model
    seed-history.json      # Seed matchup history for Chaos Agent
    upset-factors.json     # Upset factor data for Chaos Agent
```

### Data Types (defined in `lib/types.ts`)

**BracketData** — A model's complete 63-game bracket:
- `model`, `displayName`, `tagline`, `color` — identity
- `champion`, `finalFour` — headline picks
- `championEliminated` — triggers obituary/eliminated state
- `espnBracketUrl` — ESPN bracket link as timestamp proof
- `locked` — whether picks are finalized
- `rounds` — object with 6 round keys, each containing an array of `Game` objects

**Game** — A single pick:
- `gameId` — unique identifier matching results data
- `round`, `region` — bracket position
- `seed1`, `team1`, `seed2`, `team2` — matchup
- `pick` — the model's predicted winner
- `confidence` — 0-1 score
- `reasoning` — text explanation

**Results** — Actual tournament outcomes:
- `currentRound` — which round is in progress
- `games[]` — array of `ResultGame` objects with scores, winners, and completion status

**ModelScore** — Calculated scoring output:
- Per-round point totals + overall total
- `correctPicks`, `totalPicks`, `accuracy`

### Scoring System

ESPN Tournament Challenge scoring (exponentially back-loaded):

| Round | Points per Correct Pick |
|-------|------------------------|
| Round of 64 | 10 |
| Round of 32 | 20 |
| Sweet 16 | 40 |
| Elite 8 | 80 |
| Final Four | 160 |
| Championship | 320 |
| **Maximum possible** | **1,920** |

Scoring is calculated client-side in `lib/scoring.ts`. Each model's bracket is compared game-by-game against `actual-results.json`. Only completed games count. The leaderboard ranks all 6 visible models by total points.

## Content System

### Blog (MDX)

Posts live in `content/blog/*.mdx` with frontmatter metadata. Rendered via `next-mdx-remote`. The `lib/blog.ts` utility provides `getAllPosts()` and `getPostBySlug()`. Future-dated posts are filtered out automatically.

Published content:
- `why-i-built-this.mdx` — Origin story
- `selection-sunday-2026.mdx` — Selection Sunday coverage
- `the-bracket-is-set.mdx` — Bracket announcement
- `meet-the-scout.mdx` — Scout methodology deep dive
- `meet-the-quant.mdx` — Quant methodology deep dive
- `meet-the-historian.mdx` — Historian methodology deep dive
- `meet-the-chaos-agent.mdx` — Chaos Agent methodology deep dive
- `round-of-64-recap.mdx` — R64 tournament recap
- `round-of-32-recap.mdx` — R32 tournament recap
- `sweet-16-recap.mdx` — Sweet 16 recap
- `elite-8-recap.mdx` — Elite 8 recap

### Model Methodology Pages

Individual model pages (`/models/[slug]`) pull from `content/models/*.mdx` for detailed methodology writeups plus bracket summary data from the model's JSON file. Each of the 6 visible models has a dedicated page.

### Model Obituaries

When a model's predicted champion is eliminated:
1. `championEliminated` is set to `true` in the model's JSON
2. The model card gets grayed out with an "ELIMINATED" stamp (CSS: `.eliminated` in globals.css — `opacity: 0.5`, `grayscale(60%)`, rotated red text overlay)
3. A dramatic eulogy blog post is published
4. The model still competes on the leaderboard for remaining picks

## Model Pipelines

Each of the 6 visible models (plus the 3 hidden ones) has its own generation pipeline:

| Model | Pipeline Location | Technology |
|-------|------------------|------------|
| The Scout | `scripts/scout_export_context.py` | Python context export + Claude Code analysis |
| The Quant | `scripts/quant.py` | Python (Monte Carlo simulation, shared utils) |
| The Historian | `scripts/historian.py` | Python (cosine similarity against historical-teams.json) |
| The Chaos Agent | `scripts/chaos.py` | Python (upset scoring formula using upset-factors.json + seed-history.json) |
| The Optimizer | `optimizer_agent/src/` | Python ML pipeline (logistic regression + expected value optimization) |
| The Auto Researcher | `autoresearcher/` | Python ML ensemble + Monte Carlo optimizer (21 strategies, 15 years) |
| The Agent *(hidden)* | `scripts/agent_prompt.md` | Claude Code autonomous prompt |
| The Super Agent *(hidden)* | `super_agent/src/` | Python ML pipeline (logistic regression, 3-iteration discipline) |
| The Scout Prime *(hidden)* | `scout_prime_agent/src/` | Python enrichment + Claude Code round-by-round analysis |

All Python scripts accept a `--year` argument for backtesting against historical data.

## Key Features

### ESPN Tournament Challenge Integration
Each model has its own ESPN bracket entry, linked via `espnBracketUrl` in the model JSON. This serves as timestamp proof that picks were locked before games started. Displayed on model pages and the about page.

### Visitor Voting
"Pick a model to root for" — a single-vote widget for the 6 visible models. Uses localStorage for client-side state and Upstash Redis for persistence. Seeds initial vote counts so the chart isn't empty for new visitors. Displayed as a horizontal bar chart on the landing page.

### Real-Time Score Tracking
During the tournament, results are updated in `actual-results.json`, pushed to Git, and Vercel auto-redeploys in ~30 seconds. The scoring engine recalculates client-side on page load. SWR provides client-side data revalidation. Redis caches computed scores via the `/api/scores` endpoint.

### Year Toggle
The brackets page supports toggling between 2025 (archived) and 2026 (current) tournament data. The 2025 archive contains ESPN-verified results for all 63 games.

### Bracket Visualization
`BracketGridPanel` renders the full bracket as a grid with region panels. `BracketCardsPanel` provides a card-based alternative. `MatchupPopover` reveals per-game reasoning on click. Desktop uses horizontal scroll; mobile shows a single-round view with round pills for navigation.

### Live Game Ticker
`GameTicker` displays in-progress game scores. `LiveResultsProvider` wraps the app with SWR-based real-time polling.

### Paywall
Stripe integration gates detailed bracket access behind a checkout flow. `/api/create-checkout` creates sessions, `/api/unlock` processes payments, `/api/unlock-check` verifies status. `PaywallOverlay` component handles the UI.

## Design System

### Theme
Dark mode with a lab/experiment aesthetic. Subtle SVG noise texture overlay on the entire page.

```
Background:  #141414  (lab-bg)
Surface:     #1e1e1e  (lab-surface) — cards, panels
Border:      #333333  (lab-border)
Muted text:  #888888  (lab-muted)
Body text:   #efefef  (lab-text)
```

### Typography
Three tiers:
- **Display/Body:** Space Grotesk — headings, UI text, buttons
- **Serif accent:** Instrument Serif (italic) — taglines and pull quotes
- **Monospace:** IBM Plex Mono — data, scores, labels, technical metadata

### Model Colors
Each of the 6 visible models has a sacred color used consistently across the entire site — text accents, card borders (20% opacity), background tints (8% opacity), hover glows, chart lines, and badges. Colors are defined in `lib/models.ts` and extended in `tailwind.config.js` as `lab.*` tokens. Components must read from `lib/models.ts` — never hardcode hex values.

| Model | Color | Hex |
|-------|-------|-----|
| The Scout | Navy | `#3b82f6` |
| The Quant | Green | `#22c55e` |
| The Historian | Amber | `#f59e0b` |
| The Chaos Agent | Red | `#ef4444` |
| The Optimizer | Cyan | `#06b6d4` |
| The Auto Researcher | Orange | `#f97316` |

### Visual Effects
- **Hero animations:** Staggered fade-in/fade-up on load (`.hero-fade-*`, `.hero-glow`)
- **Card glows:** Colored box-shadow in model color on hover
- **Eliminated state:** Grayscale + opacity reduction + rotated "ELIMINATED" text overlay
- **Live indicator:** Pulsing green dot (Tailwind `animate-ping`)

### Responsive Breakpoints
- `sm` (640px): 2-column model card grid
- `md` (768px): Navigation expands
- `lg` (1024px): 3-column grid, bracket horizontal scroll
- `xl` (1280px): Max content width

## Data Integrity Policy

This is the most critical policy in the project. The entire concept is built around integrity and reliable data.

**What must be real (never AI-generated):**
- Game scores and results — verified from ESPN or NCAA.com
- Tournament bracket structure (teams, seeds, regions)
- Team metadata (conferences, records)

**What is AI-generated (by design):**
- Model predictions, confidence scores, and reasoning
- Blog content and writeups
- UI components and code

**Verification process:**
1. Verify scores from ESPN or NCAA.com before committing
2. Include source URLs in commit messages
3. Cross-reference against at least two sources
4. Ensure advancing teams match previous round winners

## Tournament Workflow

### Pre-Tournament (through March 19)
1. Selection Sunday (March 15) — NCAA bracket announced
2. First Four play-in games (March 17-18)
3. Run all 6 model pipelines on the final 64-team field
4. Fill out ESPN Tournament Challenge brackets for each model
5. Publish all bracket data + methodology blog posts
6. Picks lock March 19

### During Tournament (March 20 - April 6)
1. Game finishes — update `actual-results.json` with winner + score
2. `git push` — Vercel auto-redeploys (~30 seconds)
3. Scoring engine recalculates client-side
4. If a model's champion is eliminated — set `championEliminated: true`, publish obituary
5. Write round recap blog posts

### Scoring
ESPN-style points calculated client-side by comparing each model's picks against actual results. Only completed games count. Leaderboard ranks the 6 visible models by total points.

## Repository Structure

```
the-bracket-lab/
  app/                      # Next.js App Router pages
    about/                  # About page
    api/                    # API routes (votes, scores, payments)
    blog/                   # Blog index + [slug] pages
    brackets/               # Bracket explorer (Suspense + client component)
    cheat-sheet/            # Tournament cheat sheet
    dashboard/              # Live tournament dashboard
    models/                 # Model overview + [slug] deep dives
    globals.css             # All custom CSS (colors, glows, animations)
    layout.tsx              # Root layout
    page.tsx                # Landing page
  components/               # Reusable React components (18 files)
  content/
    blog/                   # MDX blog posts (11 posts)
    models/                 # MDX model methodology writeups
  data/
    models/                 # 2026 bracket JSON per model (9 files, 6 visible)
    results/                # Actual tournament results
    archive/                # Historical tournament data (2024, 2025)
    meta/                   # Team metadata
    research/               # Research data for model pipelines
  lib/
    models.ts               # Single source of truth — 9 models, VISIBLE_MODELS filter, scoring constants
    types.ts                # TypeScript interfaces (BracketData, Game, Results, ModelScore)
    scoring.ts              # Client-side scoring engine
    blog.ts                 # MDX reader utility (getAllPosts, getPostBySlug)
  scripts/                  # Model generation scripts (Python) for Scout, Quant, Historian, Chaos Agent
  autoresearcher/           # Auto Researcher ML pipeline
  optimizer_agent/          # Optimizer ML pipeline
  super_agent/              # Super Agent ML pipeline (hidden model)
  scout_prime_agent/        # Scout Prime analysis pipeline (hidden model)
  docs/                     # Project documentation
  public/                   # Static assets
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/models.ts` | Single source of truth — all 9 model definitions, `VISIBLE_MODELS` (6), `ROUND_POINTS`, `MAX_SCORE` |
| `lib/types.ts` | TypeScript interfaces for BracketData, Game, Results, ModelScore |
| `lib/scoring.ts` | Client-side scoring engine (calculateScore, rankModels) |
| `lib/blog.ts` | MDX reader utility (getAllPosts, getPostBySlug, filters future-dated posts) |
| `app/globals.css` | All custom CSS — model colors, glows, eliminated states, hero animations, noise texture |
| `tailwind.config.js` | Extended theme with model colors and lab.* design tokens |
| `app/brackets/BracketsClient.tsx` | Client-side bracket page — model tabs, year toggle, bracket rendering |
| `components/VoteWidget.tsx` | Voting widget — localStorage + Redis + seeded counts + bar chart |
| `data/results/actual-results.json` | Real 2026 tournament results (updated during tournament) |
| `data/README.md` | Data integrity and verification policy |

## Dependencies

### Runtime
- `next` ^14.2.0 — Framework
- `react` / `react-dom` ^18.3.0 — UI
- `next-mdx-remote` ^6.0.0 — MDX rendering
- `gray-matter` ^4.0.3 — Frontmatter parsing
- `recharts` ^2.12.0 — Charts and data visualization
- `@upstash/redis` ^1.37.0 — Redis for votes and score caching
- `stripe` ^20.4.1 — Payment processing
- `swr` ^2.4.1 — Client-side data fetching with revalidation
- `@vercel/analytics` ^2.0.1 — Analytics

### Dev
- `typescript` ^5.4.0
- `tailwindcss` ^3.4.0
- `postcss` / `autoprefixer`
