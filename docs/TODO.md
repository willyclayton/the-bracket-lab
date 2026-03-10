# TODO — Prioritized Task List

## Priority Legend
- 🔴 **MUST** — Ship breaks without this
- 🟡 **SHOULD** — Significantly better with it
- 🟢 **NICE** — Polish, can add during tournament

---

## Phase 0: Scaffold & Deploy (DONE — March 9)

- [x] Next.js project scaffold
- [x] Tailwind config with model colors
- [x] Global CSS (dark theme, model colors, glows, eliminated state, noise texture)
- [x] Model config (`lib/models.ts`)
- [x] TypeScript types (`lib/types.ts`)
- [x] Scoring engine (`lib/scoring.ts`)
- [x] ModelCard component
- [x] Leaderboard component
- [x] Landing page
- [x] Models overview page
- [x] Dynamic model detail pages (`/models/[slug]`)
- [x] Dashboard page
- [x] Blog page (placeholder posts)
- [x] About page
- [x] Data folder structure with placeholder JSONs
- [x] README
- [x] CLAUDE.md and docs/

---

## Phase 1: Ship by March 14 (before Selection Sunday)

### Site Polish
- [ ] 🔴 `npm install` and verify site runs locally with no errors
- [ ] 🔴 Deploy to Vercel, confirm bracketlabs.vercel.app works
- [ ] 🔴 Fix any TypeScript errors in scaffold
- [ ] 🟡 Polish landing page hero — make it visually striking (not generic)
- [ ] 🟡 Add page transitions / loading states
- [ ] 🟡 Mobile responsive pass on all pages (especially model cards grid)
- [ ] 🟡 OG image for social sharing (Vercel OG or static image)
- [ ] 🟢 Favicon + apple-touch-icon
- [ ] 🟢 Custom 404 page

### Blog Infrastructure
- [ ] 🔴 Wire up MDX rendering for blog posts (load from `content/blog/`)
- [ ] 🔴 Blog post list page that reads frontmatter and lists posts
- [ ] 🔴 Individual blog post page (`/blog/[slug]`)
- [ ] 🟡 Blog post template with model tag badges
- [ ] 🟢 RSS feed

### Voting Widget
- [ ] 🟡 Implement vote submission (Vercel KV, Supabase, or simple API route)
- [ ] 🟡 Display vote results as bar chart
- [ ] 🟡 One vote per visitor (cookie-based)
- [ ] 🟢 Show vote counts updating in real-time

### Model Prep (can happen in parallel with site build)
- [ ] 🔴 **The Quant:** Write Python Monte Carlo simulation script, test with 2025 data
- [ ] 🔴 **The Historian:** Build historical team database (2010-2025), write similarity matching script
- [ ] 🔴 **The Chaos Agent:** Define upset vulnerability scoring formula, test with historical upsets
- [ ] 🟡 **The Scout:** Design the structured LLM prompt template for matchup evaluation
- [ ] 🟡 **The Agent:** Write the mega-prompt for Claude Code's autonomous session
- [ ] 🟡 Source data: Get BartTorvik team ratings for current season (or KenPom if paying)

---

## Phase 2: Ship by March 19 (Picks Lock Day)

### Run Models
- [ ] 🔴 Wait for First Four results (Mar 17-18) to have final 64-team field
- [ ] 🔴 Populate `data/meta/teams.json` with all 64 teams, seeds, regions
- [ ] 🔴 Run The Quant (Python script → output JSON)
- [ ] 🔴 Run The Historian (Python script → output JSON)
- [ ] 🔴 Run The Chaos Agent (Python script → output JSON)
- [ ] 🔴 Run The Scout (LLM evaluation → output JSON)
- [ ] 🔴 Run The Agent (Claude Code autonomous session → output JSON)
- [ ] 🔴 Screen-record The Agent's Claude Code session
- [ ] 🔴 Fill out 5 ESPN Tournament Challenge brackets
- [ ] 🔴 Add ESPN bracket URLs to each model's JSON (`espnBracketUrl` field)
- [ ] 🔴 Push all bracket data to site

### Content
- [ ] 🔴 Write methodology blog post for each model (5 posts)
- [ ] 🔴 Write The Agent process narrative blog post
- [ ] 🟡 Create model comparison / consensus analysis content for `/models` page
- [ ] 🟡 Identify consensus picks (4+ models agree) and biggest divergences

### Launch
- [ ] 🔴 LinkedIn Post #2 ("Picks are locked")
- [ ] 🟡 Twitter/X thread
- [ ] 🟡 Reddit post (r/CollegeBasketball)
- [ ] 🟢 Edit Agent screen recording into timelapse video

---

## Phase 3: Tournament Live (March 20 – April 6)

### Game Updates
- [ ] 🔴 Update `actual-results.json` after each game session
- [ ] 🔴 Set `championEliminated: true` when applicable
- [ ] 🔴 `git push` after updates
- [ ] 🟡 Set up GitHub Actions cron job for auto-fetching scores (optional)

### Content
- [ ] 🔴 Round of 64 recap blog post
- [ ] 🔴 First model obituary (when first champion is eliminated)
- [ ] 🟡 Round of 32 recap
- [ ] 🟡 Sweet 16 recap
- [ ] 🟡 Elite 8 recap
- [ ] 🟡 Additional obituaries as needed
- [ ] 🟡 LinkedIn posts after each round

### Dashboard
- [ ] 🟡 Bracket visualization component (can ship as table first, upgrade to visual bracket)
- [ ] 🟡 Consensus vs. divergence view (which games do models agree/disagree on)
- [ ] 🟢 "Model of the round" highlight card
- [ ] 🟢 Interactive bracket with model toggle and click-for-reasoning

---

## Phase 4: Post-Tournament (April 7+)

- [ ] 🔴 Final results blog post — which model won
- [ ] 🔴 Final ESPN percentile screenshots for each model
- [ ] 🟡 "What I learned" portfolio piece for LinkedIn
- [ ] 🟡 Update README with final results
- [ ] 🟢 Archive the project with final state
- [ ] 🟢 Retrospective: what worked, what didn't, what to do differently

---

## Components Still Needed

| Component | Priority | Description |
|-----------|----------|-------------|
| `BracketView.tsx` | 🟡 | Interactive bracket visualization — hardest component. MVP: table view |
| `VotingWidget.tsx` | 🟡 | Model vote buttons + results bar chart |
| `ConsensusView.tsx` | 🟡 | Show where 4+ models agree |
| `DivergenceView.tsx` | 🟡 | Show where models disagree most |
| `RoundRecap.tsx` | 🟢 | Card component for round-by-round summaries |
| `ObituaryCard.tsx` | 🟢 | Styled card for model champion eliminations |
| `OGImage` | 🟡 | Dynamic social share image via Vercel OG |
| `ConfidenceChart.tsx` | 🟢 | Per-model confidence distribution (Recharts) |
| `ArchetypeTable.tsx` | 🟢 | Historical twin comparison table for The Historian |
| `ScoutCard.tsx` | 🟢 | Scouting report card for individual matchups (The Scout) |

---

## Model Scripts to Build

| Script | Language | Input | Output | Can test now? |
|--------|----------|-------|--------|---------------|
| `scripts/quant.py` | Python | BartTorvik/KenPom data | `the-quant.json` | Yes (use 2025 data) |
| `scripts/historian.py` | Python | Historical DB + 2026 profiles | `the-historian.json` | Partial (build DB now) |
| `scripts/chaos.py` | Python | Team stats | `the-chaos-agent.json` | Yes (use 2025 data) |
| `scripts/scout_prompt.md` | Prompt | Matchup profiles | LLM output → `the-scout.json` | Prompt design only |
| `scripts/agent_prompt.md` | Prompt | Minimal instruction | Claude Code → `the-agent.json` | Prompt design only |
