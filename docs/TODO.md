# TODO — Prioritized Task List

## Priority Legend
- 🔴 **MUST** — Ship breaks without this
- 🟡 **SHOULD** — Significantly better with it
- 🟢 **NICE** — Polish, can add during tournament

---

## Phase 0: Scaffold & Deploy (DONE — March 9, 2025)

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

## Phase 1: Full Redesign & Site Polish (DONE — March 10, 2025)

- [x] Full dark theme redesign (bg: `#141414`, surface: `#1e1e1e`)
- [x] Landing page: hero + stats bar + leaderboard + 5 model sections + vote widget
- [x] `/brackets` page with model tabs + BracketTree + summary card
- [x] BracketTree component (round pills, horizontal scroll desktop, single-round mobile)
- [x] VoteWidget component (localStorage, seeded counts, bar chart reveal)
- [x] NavLinks with Home (exact match) / Brackets / Blog
- [x] MDX blog rendering with `next-mdx-remote` + `gray-matter`
- [x] Individual blog post pages (`/blog/[slug]`)
- [x] Model detail pages redesigned with CTA to /brackets
- [x] Year toggle (2025/2026) for archived tournament data
- [x] 2025 tournament data archived to `data/archive/2025/`
- [x] 2025 data integrity fix: verified all 63 game scores from ESPN, corrected 4 team assignments

---

## Phase 2: Pre-Tournament Prep (Ship by March 19, 2026)

### Model Scripts
- [ ] 🔴 **The Quant:** Python Monte Carlo simulation script
- [ ] 🔴 **The Historian:** Historical team database (2010-2026), similarity matching script
- [ ] 🔴 **The Chaos Agent:** Upset vulnerability scoring formula
- [ ] 🟡 **The Scout:** Structured LLM prompt template for matchup evaluation
- [ ] 🟡 **The Agent:** Mega-prompt for Claude Code autonomous session
- [ ] 🟡 Source data: BartTorvik/KenPom team ratings for current season

### Run Models (after First Four, March 17-18)
- [ ] 🔴 Populate `data/meta/teams.json` with all 64 teams, seeds, regions
- [ ] 🔴 Run all 5 model scripts → output to `data/models/*.json`
- [ ] 🔴 Screen-record The Agent's Claude Code session
- [ ] 🔴 Fill out 5 ESPN Tournament Challenge brackets
- [ ] 🔴 Add ESPN bracket URLs to each model's JSON (`espnBracketUrl` field)
- [ ] 🔴 Push all bracket data to site

### Content
- [ ] 🔴 Write methodology blog post for each model (5 posts)
- [ ] 🔴 Write The Agent process narrative blog post
- [ ] 🟡 Model comparison / consensus analysis for `/models` page

### Launch
- [ ] 🔴 LinkedIn Post: "Picks are locked"
- [ ] 🟡 Twitter/X thread
- [ ] 🟡 Reddit post (r/CollegeBasketball)
- [ ] 🟢 Edit Agent screen recording into timelapse video

---

## Phase 3: Tournament Live (March 20 – April 6, 2026)

### Game Updates
- [ ] 🔴 Update `data/results/actual-results.json` after each game session (verified from ESPN)
- [ ] 🔴 Set `championEliminated: true` when applicable
- [ ] 🔴 `git push` after updates
- [ ] 🟡 GitHub Actions cron job for auto-fetching scores (optional)

### Content
- [ ] 🔴 Round of 64 recap blog post
- [ ] 🔴 First model obituary (when first champion is eliminated)
- [ ] 🟡 Round recaps (R32, S16, E8)
- [ ] 🟡 Additional obituaries as needed
- [ ] 🟡 LinkedIn posts after each round

### Dashboard Enhancements
- [ ] 🟡 Consensus vs. divergence view
- [ ] 🟢 "Model of the round" highlight card
- [ ] 🟢 Interactive bracket with model toggle and click-for-reasoning

---

## Phase 4: Post-Tournament (April 7+)

- [ ] 🔴 Final results blog post — which model won
- [ ] 🔴 Final ESPN percentile screenshots for each model
- [ ] 🟡 "What I learned" portfolio piece for LinkedIn
- [ ] 🟡 Update README with final results
- [ ] 🟢 Archive 2026 data to `data/archive/2026/`
- [ ] 🟢 Retrospective: what worked, what didn't

---

## Remaining Polish Items

| Item | Priority | Notes |
|------|----------|-------|
| OG image for social sharing | 🟡 | Vercel OG or static image |
| Custom 404 page | 🟢 | |
| Favicon + apple-touch-icon | 🟢 | |
| ConsensusView component | 🟡 | Where 4+ models agree |
| DivergenceView component | 🟡 | Where models disagree most |
| ConfidenceChart component | 🟢 | Per-model confidence distribution |
| MatchupPopover enhancements | 🟢 | Already exists, may need polish |

---

## Model Scripts to Build

| Script | Language | Input | Output | Status |
|--------|----------|-------|--------|--------|
| `scripts/quant.py` | Python | BartTorvik/KenPom data | `the-quant.json` | Not started |
| `scripts/historian.py` | Python | Historical DB + team profiles | `the-historian.json` | Not started |
| `scripts/chaos.py` | Python | Team stats + upset factors | `the-chaos-agent.json` | Not started |
| `scripts/scout_prompt.md` | Prompt | Matchup profiles | `the-scout.json` | Not started |
| `scripts/agent_prompt.md` | Prompt | Minimal instruction | `the-agent.json` | Not started |
