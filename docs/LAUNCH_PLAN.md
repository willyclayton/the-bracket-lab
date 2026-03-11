# Launch Plan & Content Calendar

> **Note:** This plan was originally written for the 2025 launch. The 2025 tournament is complete and archived in `data/archive/2025/`. The same plan applies to the 2026 tournament with updated dates. Key 2026 dates: Selection Sunday March 15, First Four March 17-18, Picks lock March 19, Tournament starts March 20, Final Four April 4-6.

## Two-Phase Launch Strategy

### Phase 1: "The Models" — March 15-16 (post-Selection Sunday)

**What goes live:**
- Full site with all 5 methodology writeups
- Model overview / comparison page
- Dashboard scaffolding (bracket area shows "Picks lock March 19")
- Visitor voting ("Which model are you riding with?")
- Email signup
- Blog with 5 placeholder posts (methodology teasers)

**LinkedIn Post #1 (March 15 or 16):**
> Headline: "I built 5 AI models to compete against each other in March Madness"
> Body: Brief description of each model's approach. Link to site. Ask people which model they'd pick.
> Goal: Build anticipation. Give people a reason to come back.

### Phase 2: "The Picks" — March 19 (after First Four, before R64)

First Four wraps March 18. Full 64-team field is set.
- Run all 5 models on the final bracket
- Populate all bracket JSONs
- Fill out 5 ESPN Tournament Challenge brackets (timestamp proof)
- Update site — all picks visible and locked
- Screen-record The Agent's autonomous Claude Code session

**LinkedIn Post #2 (March 19):**
> Headline: "5 AI brackets. 5 different champions. All picks locked on ESPN. Follow along starting tomorrow."
> Body: Tease the champion picks, highlight the biggest disagreements. Link to dashboard.
> Goal: Drive traffic for Day 1 of the tournament.

### Phase 3: Live Tournament — March 20 – April 6

- Update `actual-results.json` after each game session
- Round recaps in blog
- Model obituaries when champions are eliminated
- Leaderboard updates
- LinkedIn posts after each round

### Phase 4: Post-Mortem — April 7+

- Final results + which model won
- "What I learned building 5 AI models for March Madness"
- Final ESPN percentile screenshots
- Portfolio piece writeup

---

## LinkedIn Content Calendar

| Date | Post | Angle |
|------|------|-------|
| Mar 15-16 | **Launch:** "I built 5 AI models to compete in March Madness" | Introduction, methodology, engagement |
| Mar 19 | **Picks locked:** "5 brackets. 5 different champions." | Anticipation, champion reveals |
| Mar 20-21 | **R64 Day 1-2:** Results update | "After 16 games, The [leader] is up. The Chaos Agent already called a 12-5 upset." |
| Mar 22-23 | **R64 wrap + first obituary** | First champion elimination, dramatic recap |
| Mar 27-28 | **Sweet 16:** "We're down to 16 teams. Here's where the models stand." | Leaderboard update, tension |
| Mar 29-30 | **Elite 8:** Obituaries, drama | "3 models have dead champions. Only 2 still alive." |
| Apr 4 | **Final Four:** "Only [X] models still have a living champion." | Maximum drama |
| Apr 6 | **Championship:** "The winner is..." | Final results reveal |
| Apr 7-8 | **Post-mortem:** "What I learned building 5 AI models for March Madness" | Portfolio/thought leadership piece |

### LinkedIn Post Format Tips
- Keep posts under 1300 characters for full visibility (no "see more" cutoff)
- First line = hook. Make it punchy.
- Use line breaks for readability
- Include a visual (screenshot of leaderboard, model card, bracket divergence)
- End with a question to drive comments
- Hashtags: #MarchMadness #AI #DataScience #MachineLearning

### Expansion to Other Platforms
LinkedIn is primary, but cross-post to:
- **Twitter/X:** Same content, more casual tone. Thread format for the launch post.
- **Reddit:** r/CollegeBasketball (bracket content), r/dataisbeautiful (if you make a good viz), r/MachineLearning (methodology)
- **The Agent video:** LinkedIn native video (timelapse of Claude Code session), possibly TikTok/YouTube Shorts

---

## ESPN Tournament Challenge Integration

### Setup (March 19)
1. Create ESPN account (or use existing)
2. Create 5 separate bracket entries, one per model
3. Name them: "The Scout", "The Quant", "The Historian", "The Chaos Agent", "The Agent"
4. Fill in each bracket exactly matching the model's JSON output
5. Lock all brackets before first R64 game tips off
6. Copy the shareable link for each bracket

### During Tournament
- After each round, screenshot each model's ESPN percentile ranking
- Include percentiles in round recaps ("The Chaos Agent dropped to 12th percentile after Round 1")
- Final percentiles become key metrics in the post-mortem

### Add to Site
- `espnBracketUrl` field in each model's JSON
- Display on individual model pages and about page
- "Verified on ESPN Tournament Challenge" badge

---

## Model Obituaries

When a model's predicted champion is eliminated:

### Blog Post Format
```
Title: "In Memoriam: The Quant's Bracket (2026–2026)"
Tags: [obituary, the-quant]
Tone: Dramatic eulogy. Funny but respectful.
```

**Structure:**
1. Opening: Announce the death. "The Quant's championship dreams died today at approximately 4:47 PM EST..."
2. What it predicted: Champion pick, path to the title
3. How it died: The game that killed it, final score, what went wrong
4. What it got right: Best picks before the death
5. Legacy: Current leaderboard standing, what it can still compete for
6. Closing: RIP graphic or quip

### Site Updates
- Set `championEliminated: true` in the model's JSON
- Model card gets the `.eliminated` CSS treatment (grayed out + stamp)
- Dashboard shows the model as still competing for leaderboard points

### Content Opportunity
LinkedIn post for each obituary. These are inherently shareable — "My AI prediction model's bracket just died. Here's the eulogy I wrote for it."

---

## Email Signup (Buttondown)

Free tier: up to 100 subscribers. Enough for this project.

### Setup
1. Create Buttondown account (buttondown.email)
2. Get embed form HTML
3. Replace the placeholder form in `app/page.tsx`
4. Send emails after each round with recap + leaderboard + link to blog post

### Email Schedule
- Mar 15: Welcome + "meet the models"
- Mar 19: "Picks are locked" + champion reveals
- Mar 21: Round of 64 Day 1 recap
- Mar 23: Round of 64 wrap + first obituary
- Mar 28: Sweet 16 recap
- Mar 30: Elite 8 recap
- Apr 4: Final Four preview
- Apr 6: Championship result
- Apr 8: Post-mortem
