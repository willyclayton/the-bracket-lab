import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { MODELS } from '@/lib/models';

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const REDIS_KEY = 'percentiles:2026';
const CACHE_TTL_SECONDS = 60;

interface EspnEntryResponse {
  score?: {
    overallScore?: number;
    percentile?: number;  // 0-1 decimal (e.g. 0.856 = 85.6%)
  };
}

export interface PercentileData {
  score: number;
  percentile: number;  // 0-100 (e.g. 85.6)
}

/**
 * Extract ESPN entry ID from a bracket URL like:
 * https://fantasy.espn.com/games/tournament-challenge-bracket-2026/bracket?entryID=xxx
 * or a gambit API URL with the entry ID directly.
 */
function extractEntryId(url: string): string | null {
  // Try URL param: ?entryID=xxx or ?id=xxx
  try {
    const parsed = new URL(url);
    const entryId = parsed.searchParams.get('entryID') ?? parsed.searchParams.get('id');
    if (entryId) return entryId;
  } catch {
    // not a valid URL
  }

  // Try extracting UUID-like pattern from the URL path
  const uuidMatch = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch) return uuidMatch[1];

  return null;
}

async function fetchPercentileFromEspn(entryId: string): Promise<PercentileData | null> {
  try {
    const url = `https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026/entries/${entryId}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`ESPN Gambit API ${res.status} for entry ${entryId}`);
      return null;
    }
    const data: EspnEntryResponse = await res.json();
    const scoreObj = data.score;
    if (!scoreObj || scoreObj.overallScore == null || scoreObj.percentile == null) return null;
    // ESPN returns percentile as 0-1 decimal; convert to 0-100
    return {
      score: scoreObj.overallScore,
      percentile: Math.round(scoreObj.percentile * 1000) / 10,
    };
  } catch (err) {
    console.error(`ESPN Gambit API error for entry ${entryId}:`, err);
    return null;
  }
}

/**
 * GET /api/espn-percentiles
 * Returns live ESPN percentiles for each model that has an espnBracketUrl.
 * Caches in Redis with 60s TTL.
 */
export async function GET() {
  const redis = getRedis();

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await redis.get<Record<string, PercentileData>>(REDIS_KEY);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Percentiles-Source': 'redis' },
        });
      }
    } catch {
      // Redis error, continue to fetch
    }
  }

  // Collect entry IDs from model data files
  const modelEntries: { modelId: string; entryId: string }[] = [];

  for (const model of MODELS) {
    // Dynamic import of model JSON to get espnBracketUrl
    try {
      const modelData = await import(`@/data/models/${model.id}.json`);
      const url = modelData.espnBracketUrl;
      if (!url) continue;
      const entryId = extractEntryId(url);
      if (entryId) {
        modelEntries.push({ modelId: model.id, entryId });
      }
    } catch {
      // Model file not found, skip
    }
  }

  if (modelEntries.length === 0) {
    return NextResponse.json({}, {
      headers: { 'X-Percentiles-Source': 'no-entries' },
    });
  }

  // Fetch all percentiles in parallel
  const results: Record<string, PercentileData> = {};
  const fetches = modelEntries.map(async ({ modelId, entryId }) => {
    const data = await fetchPercentileFromEspn(entryId);
    if (data) {
      results[modelId] = data;
    }
  });

  await Promise.all(fetches);

  // Cache in Redis
  if (redis && Object.keys(results).length > 0) {
    try {
      await redis.set(REDIS_KEY, results, { ex: CACHE_TTL_SECONDS });
    } catch {
      // Redis write error, non-fatal
    }
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      'X-Percentiles-Source': Object.keys(results).length > 0 ? 'espn-live' : 'empty',
    },
  });
}
