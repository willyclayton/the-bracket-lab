# Scoring & Live Data Learnings

Hard-won lessons from building the live scoring pipeline for The Bracket Lab (2026 NCAA Tournament).

## ESPN Scoreboard API Gotchas

### Single-date queries drop completed games
- `?dates=20260319` only returns ~6 recent/active games. Completed games from earlier in the day disappear after a few hours.
- **Fix:** Use a date-range query spanning the full tournament: `?dates=20260318-20260320`. This reliably returns all completed games.
- A single-date query for today should ALSO be made separately, because date-range queries may not include currently in-progress games.
- Pattern: range query for completeness + today query for liveness.

### The `groups=100` parameter is essential
- Without `groups=100`, the API returns all college basketball games, not just tournament games.
- `limit=200` is needed for date-range queries that span multiple days of tournament action.

### Team name normalization is critical
- ESPN uses `shortDisplayName` which doesn't always match our bracket data (e.g., "Hawai'i" vs "Hawaii").
- The `normalizeTeamName()` function in `lib/espn-team-map.ts` handles these mismatches. Add new mappings as they surface.

### Round detection has multiple fallback paths
- `competition.tournamentRound.number` is the most reliable source.
- Falls back to parsing the season slug, then inferring from game date.
- First Four games (round 0) are intentionally filtered out — they're play-in games, not part of the 63-game bracket.

## Static Fallback File (`actual-results.json`)

### Never commit in-progress game snapshots
- The static JSON is the last-resort fallback when both Redis and ESPN fail.
- If you commit a frozen mid-game score (e.g., "49-45, 2H 13:33"), that stale score persists as the fallback indefinitely.
- **Rule:** Only commit verified final scores to this file. For games not yet completed, leave scores as `null` and `completed: false`.
- Source all final scores from ESPN.com or NCAA.com. Include source in commit messages.

### The fallback file shapes the template
- `mergeWithTemplate()` uses the static JSON as the structural template for all 63 games.
- ESPN live data is merged INTO this template by matching team names + seeds.
- If a game isn't returned by ESPN (API dropout), the template values show through — which is why stale in-progress data is dangerous.

## Redis Caching Layer

### Serverless background refresh doesn't work
- Initial approach: return stale cache immediately, refresh in background.
- **Problem:** Vercel serverless functions terminate after the response is sent. Background `fetchAndCacheScores()` calls get killed mid-execution.
- **Fix:** Synchronous refresh — when cache is stale (>15s), fetch from ESPN synchronously before responding. Adds ~200-500ms latency but guarantees fresh data.

### Flush Redis after deploying API changes
- After changing the ESPN fetch logic, old cached data in Redis will be served until it expires or is flushed.
- Always flush after deploying scoring-related changes: `curl -X DELETE .../api/scores -H "Authorization: Bearer $CRON_SECRET"`

### Cache TTL tradeoffs
- `STALE_SECONDS = 15` — aggressive, but necessary during live games for near-real-time scores.
- Vercel edge cache (`s-maxage=10, stale-while-revalidate=30`) adds another layer. During non-game hours, these could be relaxed to reduce ESPN API calls.

## Scoring Engine (`lib/scoring.ts`)

### Client-side calculation depends entirely on `/api/scores`
- `calculateScore()` runs in the browser using results from the scores API.
- The ESPN percentiles endpoint (`/api/espn-percentiles`) is a separate pipeline — it pulls from ESPN's Gambit API and shows bracket percentile rankings.
- If `/api/scores` returns stale data, the leaderboard freezes even if the percentiles widget is updating fine. These are independent data flows.

### ESPN-style scoring (10-20-40-80-160-320)
- Max possible: 1,920 points across 63 games.
- Points double each round, so later-round accuracy matters exponentially more.
- A wrong Elite 8 pick costs 80 points; a wrong R64 pick costs 10. Late-round picks are 8-32x more valuable.

## Debugging Checklist (When Scores Look Stale)

1. **Check the API directly:** `curl https://the-bracket-lab.vercel.app/api/scores | python3 -m json.tool`
2. **Check the `X-Scores-Source` header** — tells you where data came from (espn-refreshed, redis, static-fallback, etc.)
3. **Check `X-Scores-Age`** — seconds since last ESPN fetch
4. **If stale:** Flush Redis, hit the endpoint again, check if ESPN's API is actually returning the games you expect
5. **Test ESPN directly:** `curl "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=20260318-20260320&groups=100&limit=200" | python3 -m json.tool | grep shortDisplayName`
6. **If ESPN drops games:** You're probably using a single-date query. Switch to date-range.
7. **If scores are wrong but games show:** Check team name normalization in `lib/espn-team-map.ts`
