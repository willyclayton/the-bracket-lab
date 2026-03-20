import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { Results, ResultGame } from '@/lib/types';
import { normalizeTeamName } from '@/lib/espn-team-map';
import staticResults from '@/data/results/actual-results.json';

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const REDIS_KEY = 'results:2026';
const STALE_SECONDS = 15;

// Map our round names to ESPN round numbers
// ESPN uses: 1=R64, 2=R32, 3=S16, 4=E8, 5=F4, 6=Championship
const ESPN_ROUND_MAP: Record<number, string> = {
  1: 'round_of_64',
  2: 'round_of_32',
  3: 'sweet_16',
  4: 'elite_8',
  5: 'final_four',
  6: 'championship',
};

const ROUND_LABELS: Record<string, string> = {
  'round_of_64': 'Round of 64',
  'round_of_32': 'Round of 32',
  'sweet_16': 'Sweet 16',
  'elite_8': 'Elite Eight',
  'final_four': 'Final Four',
  'championship': 'Championship',
};

// Region mapping from ESPN grouping
const REGION_MAP: Record<string, string> = {
  'East': 'East',
  'West': 'West',
  'South': 'South',
  'Midwest': 'Midwest',
  'Final Four': 'National',
  'Championship': 'National',
};

interface CachedResults {
  data: Results;
  fetchedAt: number; // unix ms
}

/**
 * GET /api/scores
 * Returns cached results from Redis (stale-while-revalidate).
 * Falls back to static JSON if Redis is empty.
 */
export async function GET() {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json(staticResults, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Scores-Source': 'static-no-redis',
      },
    });
  }

  try {
    const cached = await redis.get<CachedResults>(REDIS_KEY);

    if (cached) {
      const ageSeconds = (Date.now() - cached.fetchedAt) / 1000;

      if (ageSeconds > STALE_SECONDS) {
        // Refresh synchronously — background fetch dies in serverless
        const fresh = await fetchFromEspn();
        if (fresh) {
          await redis.set(REDIS_KEY, { data: fresh, fetchedAt: Date.now() } satisfies CachedResults);
          return NextResponse.json(fresh, {
            headers: {
              'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
              'X-Scores-Source': 'espn-refreshed',
              'X-Scores-Age': '0',
            },
          });
        }
        // ESPN failed — fall through to serve stale cache
        console.warn(`[scores] ESPN refresh failed, serving ${Math.round(ageSeconds)}s stale cache`);
      }

      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          'X-Scores-Source': 'redis',
          'X-Scores-Age': String(Math.round(ageSeconds)),
        },
      });
    }

    // Redis empty — try a fresh ESPN fetch
    const freshResults = await fetchFromEspn();
    if (freshResults) {
      // Cache it
      await redis.set(REDIS_KEY, { data: freshResults, fetchedAt: Date.now() } satisfies CachedResults);
      return NextResponse.json(freshResults, {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          'X-Scores-Source': 'espn-fresh',
        },
      });
    }

    // ESPN also failed — serve static JSON
    return NextResponse.json(staticResults, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Scores-Source': 'static-fallback',
      },
    });
  } catch {
    // Redis connection error — serve static
    return NextResponse.json(staticResults, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Scores-Source': 'static-error-fallback',
      },
    });
  }
}

/**
 * POST /api/scores
 * Protected endpoint to force a fresh ESPN fetch + Redis write.
 * Used by GitHub Actions cron or manual trigger.
 */
export async function POST(req: NextRequest) {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured (missing KV_REST_API_URL or KV_REST_API_TOKEN)' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await fetchFromEspn();
    if (!results) {
      return NextResponse.json({ error: 'ESPN fetch failed' }, { status: 502 });
    }

    await redis.set(REDIS_KEY, { data: results, fetchedAt: Date.now() } satisfies CachedResults);

    return NextResponse.json({
      ok: true,
      gamesCompleted: results.games.filter((g) => g.completed).length,
      lastUpdated: results.lastUpdated,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/scores
 * Flush the Redis cache. Protected by CRON_SECRET.
 * Usage: curl -X DELETE https://the-bracket-lab.vercel.app/api/scores -H "Authorization: Bearer $CRON_SECRET"
 */
export async function DELETE(req: NextRequest) {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await redis.del(REDIS_KEY);
    return NextResponse.json({ ok: true, message: 'Cache flushed' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ---- Internal helpers ----

async function fetchAndCacheScores(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const results = await fetchFromEspn();
  if (results) {
    await redis.set(REDIS_KEY, { data: results, fetchedAt: Date.now() } satisfies CachedResults);
    console.log(`[scores] Redis updated: ${results.games.filter(g => g.completed).length} completed games`);
  } else {
    console.warn('[scores] Background refresh failed — ESPN returned null');
  }
}

async function fetchFromEspn(): Promise<Results | null> {
  try {
    const today = new Date();
    const tournamentStart = '20260318'; // First Four
    const endDate = formatDate(today);

    const allGames: ResultGame[] = [];
    const seenGameIds = new Set<string>();

    // 1) Date-range query: returns ALL completed games across the tournament
    //    Single-date queries drop completed games after a few hours.
    const rangeUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${tournamentStart}-${endDate}&groups=100&limit=200`;
    const rangeRes = await fetch(rangeUrl, { next: { revalidate: 0 } });
    if (rangeRes.ok) {
      const rangeData = await rangeRes.json();
      for (const event of rangeData.events ?? []) {
        const game = transformEspnEvent(event);
        if (game && !seenGameIds.has(game.gameId)) {
          seenGameIds.add(game.gameId);
          allGames.push(game);
        }
      }
    } else {
      console.error(`[scores] ESPN range query ${rangeRes.status}`);
    }

    // 2) Today's single-date query: ensures we get currently in-progress games
    //    (date-range queries may not include live games)
    const todayUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${endDate}&groups=100&limit=50`;
    const todayRes = await fetch(todayUrl, { next: { revalidate: 0 } });
    if (todayRes.ok) {
      const todayData = await todayRes.json();
      for (const event of todayData.events ?? []) {
        const game = transformEspnEvent(event);
        if (game && !seenGameIds.has(game.gameId)) {
          seenGameIds.add(game.gameId);
          allGames.push(game);
        }
      }
    } else {
      console.error(`[scores] ESPN today query ${todayRes.status}`);
    }

    console.log(`[scores] ESPN returned ${allGames.length} valid tournament games`);
    const merged = mergeWithTemplate(allGames);
    return merged;
  } catch (err) {
    console.error('[scores] ESPN fetch failed:', err);
    return null;
  }
}

/**
 * Transform a single ESPN event into our ResultGame format.
 * Returns null if the event isn't an NCAA tournament game.
 */
function transformEspnEvent(event: any): ResultGame | null {
  try {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const competitors = competition.competitors ?? [];
    if (competitors.length !== 2) return null;

    // Find seeds — tournament games have seeds
    const home = competitors.find((c: any) => c.homeAway === 'home');
    const away = competitors.find((c: any) => c.homeAway === 'away');
    if (!home || !away) return null;

    const homeSeed = parseInt(home.seed ?? home.curatedRank?.current ?? '0', 10);
    const awaySeed = parseInt(away.seed ?? away.curatedRank?.current ?? '0', 10);

    // If no seeds, probably not a tournament game
    if (!homeSeed && !awaySeed) return null;

    const homeTeam = normalizeTeamName(
      home.team?.shortDisplayName ?? home.team?.displayName ?? 'Unknown'
    );
    const awayTeam = normalizeTeamName(
      away.team?.shortDisplayName ?? away.team?.displayName ?? 'Unknown'
    );

    const homeScore = parseInt(home.score ?? '0', 10);
    const awayScore = parseInt(away.score ?? '0', 10);

    const status = event.status?.type?.name ?? '';
    const completed = status === 'STATUS_FINAL';

    let gameClock: string | undefined;
    if (status === 'STATUS_IN_PROGRESS') {
      const clock = event.status?.displayClock ?? '';
      const period = event.status?.period ?? 0;
      if (period === 1) gameClock = `1H ${clock}`;
      else if (period === 2) gameClock = `2H ${clock}`;
      else gameClock = `OT ${clock}`;
    } else if (status === 'STATUS_HALFTIME') {
      gameClock = 'HT';
    }

    const winner = completed
      ? (homeScore > awayScore ? homeTeam : awayTeam)
      : null;

    // Determine round from event metadata
    const roundNumber = competition.tournamentRound?.number
      ?? parseRoundFromSlug(event.season?.slug ?? '')
      ?? inferRoundFromDate(event.date ?? '');

    // Skip games with no identifiable round (First Four, pre-tournament, etc.)
    if (!roundNumber || roundNumber <= 0) return null;

    const round = ESPN_ROUND_MAP[roundNumber] ?? 'round_of_64';

    // Region from event group or bracket info
    const region = extractRegion(event);

    // Build gameId to match our template
    const gameId = matchGameId(homeTeam, awayTeam, homeSeed, awaySeed, round, region);

    const gameTime = event.date ?? null;

    return {
      gameId,
      round,
      region,
      team1: awayTeam,  // convention: lower-seed (higher number) is team2
      seed1: awaySeed,
      team2: homeTeam,
      seed2: homeSeed,
      score1: awayScore,
      score2: homeScore,
      winner: winner ?? '',
      completed,
      gameTime,
      gameClock,
    };
  } catch {
    return null;
  }
}

/**
 * Merge ESPN live games with our static template.
 * The template has all 63 games with correct gameIds.
 * We match ESPN games to template games by team names + seeds.
 */
function mergeWithTemplate(espnGames: ResultGame[]): Results {
  const template = staticResults as unknown as Results;
  const merged: Results = {
    lastUpdated: new Date().toISOString(),
    currentRound: template.currentRound,
    games: template.games.map((templateGame) => ({ ...templateGame })),
  };

  // Build lookup from team pairs to ESPN data
  const espnByTeams = new Map<string, ResultGame>();
  for (const g of espnGames) {
    // Key by sorted team names for order-independent matching
    const key = [g.team1, g.team2].sort().join('|');
    espnByTeams.set(key, g);
    // Also try with just one team + seed for partial matching
    espnByTeams.set(`${g.team1}:${g.seed1}`, g);
    espnByTeams.set(`${g.team2}:${g.seed2}`, g);
  }

  let latestRound = 'pre-tournament';
  const roundOrder = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'];

  for (const game of merged.games) {
    const key = [game.team1, game.team2].sort().join('|');
    const espn = espnByTeams.get(key)
      ?? espnByTeams.get(`${game.team1}:${game.seed1}`)
      ?? espnByTeams.get(`${game.team2}:${game.seed2}`);

    if (espn) {
      // Map ESPN scores to template team order by matching team names
      const sameOrder = espn.team1 === game.team1 || espn.team2 === game.team2;
      game.score1 = sameOrder ? espn.score1 : espn.score2;
      game.score2 = sameOrder ? espn.score2 : espn.score1;
      game.winner = espn.completed ? (espn.winner === game.team1 || espn.winner === game.team2 ? espn.winner : game.winner) : game.winner;
      game.completed = espn.completed;
      game.gameTime = espn.gameTime ?? game.gameTime;
      game.gameClock = espn.gameClock;

      if (espn.completed && roundOrder.indexOf(game.round) > roundOrder.indexOf(latestRound)) {
        latestRound = game.round;
      }
    }
  }

  if (latestRound !== 'pre-tournament') {
    merged.currentRound = latestRound;
  }

  return merged;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function parseRoundFromSlug(slug: string): number | null {
  if (slug.includes('first-four') || slug.includes('play-in')) return null;
  if (slug.includes('first-round') || slug.includes('round-of-64')) return 1;
  if (slug.includes('second-round') || slug.includes('round-of-32')) return 2;
  if (slug.includes('sweet-16') || slug.includes('regional-semifinal')) return 3;
  if (slug.includes('elite-8') || slug.includes('regional-final')) return 4;
  if (slug.includes('final-four') || slug.includes('national-semifinal')) return 5;
  if (slug.includes('championship') || slug.includes('national-championship')) return 6;
  return null;
}

function inferRoundFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (month === 3 && day <= 18) return 0; // First Four — filter out
  if (month === 3 && day <= 21) return 1; // R64 (Mar 20-21)
  if (month === 3 && day <= 23) return 2; // R32
  if (month === 3 && day <= 28) return 3; // S16
  if (month === 3 && day <= 30) return 4; // E8
  if (month === 4 && day <= 5) return 5;  // F4
  if (month === 4 && day <= 7) return 6;  // Championship
  return 0;
}

function extractRegion(event: any): string {
  // Try various ESPN fields for region info
  const bracket = event.competitions?.[0]?.bracketRegion;
  if (bracket) return REGION_MAP[bracket] ?? bracket;

  const group = event.competitions?.[0]?.groups?.name;
  if (group) return REGION_MAP[group] ?? group;

  return 'Unknown';
}

function matchGameId(
  team1: string, team2: string,
  seed1: number, seed2: number,
  round: string, region: string
): string {
  // Build a gameId matching our template pattern: r64-east-1, r32-west-3, etc.
  // For now, return a placeholder; mergeWithTemplate matches by team names anyway
  const roundPrefix = {
    'round_of_64': 'r64',
    'round_of_32': 'r32',
    'sweet_16': 's16',
    'elite_8': 'e8',
    'final_four': 'f4',
    'championship': 'champ',
  }[round] ?? 'r64';

  const regionSlug = region.toLowerCase().replace(/\s+/g, '-');
  return `${roundPrefix}-${regionSlug}-${Math.min(seed1, seed2)}`;
}
