# CLAUDE.md — The Bracket Lab

## Project Overview

**The Bracket Lab** is a March Madness 2026 prediction platform where 5 AI models compete against each other with real-time accuracy tracking. The site serves as both a content platform (methodology writeups, round recaps, model "obituaries") and a live dashboard during the tournament.

**Live URL:** bracketlabs.vercel.app
**Repo:** the-bracket-lab
**Owner:** Will Clayton (Data & AI Consultant, Chicago)
**Stack:** Next.js 14 (App Router) · Tailwind CSS · MDX · TypeScript · Vercel

## Critical Context

- **Selection Sunday is March 15** — the NCAA bracket is announced. The site must be live with methodology writeups by this date (Phase 1 launch).
- **Picks lock March 19** — after the First Four play-in games (Mar 17-18), we run all 5 models on the final 64-team field and publish all brackets. ESPN Tournament Challenge brackets are filled out for each model as timestamp proof.
- **Tournament starts March 20** — Round of 64. Dashboard goes fully live. Real-time score tracking begins.
- **Final Four: April 4-6** — Championship game April 6.
- Build capacity: A few hours per day. Scope ruthlessly. Ship MVP, iterate.

## The 5 Models (Presentation Order)

The models are presented in this specific order on the site. This is intentional — the arc is **familiar → technical → creative → chaotic → unhinged**. Each one escalates in concept to keep the reader engaged. Do not reorder.

1. **The Scout** (🎬 Navy `#3b82f6`) — LLM Matchup Analyst. "Film room intelligence at machine speed."
2. **The Quant** (📊 Green `#22c55e`) — Monte Carlo Simulation. "10,000 simulations. Zero feelings."
3. **The Historian** (📜 Amber `#f59e0b`) — Archetype Matching. "Every team has a twin. History already played this game."
4. **The Chaos Agent** (🔥 Red `#ef4444`) — Upset Detector. "Your bracket is too safe. This one isn't."
5. **The Agent** (🤖 Neon Green `#00ff88`) — Autonomous AI Researcher. "No rules. No prompts. Just: build me a bracket."

See `docs/MODELS.md` for full specifications on each model.

## Design Direction

- **Vibe:** Between a fun sports podcast and FiveThirtyEight. Credible enough to take seriously, fun enough to share. Not corporate, not meme-y.
- **Theme:** Dark mode. Lab/experiment aesthetic. Subtle noise texture overlay.
- **Typography:** Display font + serif accent font for taglines + monospace for data. Avoid generic AI aesthetics (no Inter, no purple gradients).
- **Model colors are sacred.** Each model has a specific color used consistently everywhere — cards, borders, glows, charts, text accents. These are defined in `lib/models.ts` and `tailwind.config.js`.
- See `docs/DESIGN.md` for full visual spec.

## Architecture

### Pages
- `/` — Landing page (hero + stats bar + leaderboard + 5 model sections + vote widget)
- `/brackets` — Bracket explorer (model tabs, BracketTree, summary card, year toggle)
- `/models` — Model overview (side-by-side comparison)
- `/models/[slug]` — Individual model deep dives (methodology, CTA to /brackets)
- `/dashboard` — Live tournament dashboard (leaderboard, bracket view, recaps)
- `/blog` — Writeups and recaps (MDX-driven via `next-mdx-remote`)
- `/about` — About, tech stack, ESPN bracket links (linked from footer, not nav)

### Data
- `data/models/*.json` — 2026 bracket data per model (picks, confidence, reasoning)
- `data/results/actual-results.json` — 2026 real game outcomes, updated during tournament
- `data/archive/2025/` — Archived 2025 tournament data (models + verified results)
- `data/meta/teams.json` — Team metadata (seeds, regions, conferences)
- `data/research/` — Research data (historical teams, seed history, upset factors)
- `lib/models.ts` — Single source of truth for model metadata
- `lib/types.ts` — TypeScript interfaces for all data
- `lib/scoring.ts` — Client-side scoring engine (ESPN-style points)
- `lib/blog.ts` — MDX reader utility (getAllPosts, getPostBySlug)

See `docs/DATA_SCHEMA.md` for complete schemas and `data/README.md` for data integrity policy.

### Content
- `content/models/*.mdx` — Methodology writeups per model
- `content/blog/*.mdx` — Blog posts (recaps, obituaries, analysis)

## Key Features

### ESPN Tournament Challenge Integration
Each model has its own ESPN bracket entry. The `espnBracketUrl` field in each model's JSON links to the ESPN bracket as timestamp proof that picks were locked before games started. This is displayed on model pages and the about page.

### Visitor Voting
Visitors can "pick a model to root for." Lightweight implementation — cookie/localStorage-based single vote, displayed as a bar chart. Consider Vercel KV or Supabase free tier for persistence.

### Model Obituaries
When a model's predicted champion is eliminated from the tournament, a blog post is published as a dramatic "eulogy." The model card on the dashboard gets grayed out with an "ELIMINATED" stamp overlay (CSS is already in `globals.css`). The model still competes on the leaderboard for remaining picks.

### Scoring System
ESPN-style bracket scoring (defined in `lib/models.ts`):
- Round of 64: 10 pts per correct pick
- Round of 32: 20 pts
- Sweet 16: 40 pts
- Elite 8: 80 pts
- Final Four: 160 pts
- Championship: 320 pts
- Max possible: 1,920 pts

## Data Integrity

- **Results data must NEVER be AI-generated or fabricated.** All game scores must come from verified sports data sources (ESPN, NCAA.com).
- **Bracket structure (teams, seeds, regions) must match the official NCAA bracket.** After play-in games, use actual winners, not the pre-play-in matchups.
- **When adding results, include the source URL in commit messages** for traceability.
- **Model predictions ARE AI-generated** — that's the entire premise. But the data they're scored against (actual results) must be real.
- See `data/README.md` for the full data verification policy.

## Code Conventions

- TypeScript throughout
- Tailwind for all styling, no separate CSS files beyond globals.css
- Components in `/components`, keep them focused and reusable
- Model-specific colors accessed via `lib/models.ts` — never hardcode hex values in components
- Data fetched from JSON files in `/data` — no external database
- Blog content in MDX with frontmatter for metadata
- All model-related constants (names, taglines, colors, scoring) live in `lib/models.ts`

## Current Status & TODO

See `docs/TODO.md` for the full prioritized task list.

**Built and deployed:** Landing page (redesigned), brackets page with BracketTree, model pages (redesigned), blog with MDX rendering, about page, voting widget, leaderboard, scoring engine, 2025 archive with verified data, year toggle.

**Still needs:** Model Python scripts (Quant, Historian, Chaos), 2026 bracket data (after Selection Sunday March 15), methodology blog posts, OG social card, consensus/divergence views.

## Update Workflow During Tournament

1. Game finishes → update `data/results/actual-results.json` with winner + score
2. If champion eliminated → set `championEliminated: true` in model JSON
3. `git push` → Vercel auto-redeploys (~30 seconds)
4. Scoring engine recalculates client-side on page load
5. Write recap/obituary blog post if applicable

Optional automation: GitHub Actions cron job every 15 min during game windows to auto-fetch scores from a sports API and commit results.

## Important Files

| File | Purpose |
|------|---------|
| `lib/models.ts` | Single source of truth for all model metadata + ROUND_POINTS |
| `lib/types.ts` | TypeScript interfaces for brackets, results, scores |
| `lib/scoring.ts` | Scoring engine |
| `lib/blog.ts` | MDX reader utility (getAllPosts, getPostBySlug) |
| `app/globals.css` | All custom CSS including model colors, glows, eliminated states, hero animations |
| `tailwind.config.js` | Extended theme with model colors and lab.* tokens |
| `data/models/*.json` | 2026 bracket data per model |
| `data/results/actual-results.json` | 2026 real tournament results |
| `data/archive/2025/` | Archived 2025 tournament data (verified) |
| `data/README.md` | Data integrity and verification policy |
| `app/brackets/BracketsClient.tsx` | Client-side bracket page with model tabs + year toggle |
| `components/VoteWidget.tsx` | Voting widget (localStorage + seeded counts) |
| `docs/` | All project documentation |
