'use client';

import useSWR from 'swr';
import { getEspnPercentile } from './espn-percentile';
import type { PercentileData } from '@/app/api/espn-percentiles/route';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`ESPN Percentiles API ${res.status}`);
  return res.json();
});

export interface PercentileEntry {
  percentile: number;
  isEstimate: boolean;
}

interface UseEspnPercentilesReturn {
  percentiles: Record<string, PercentileEntry>;
  isLive: boolean;
}

/**
 * SWR hook that polls /api/espn-percentiles every 60s.
 * Falls back to proxy table (2025 data) when live data unavailable.
 */
export function useEspnPercentiles(
  modelScores: Record<string, number>,
  year: string = '2026',
): UseEspnPercentilesReturn {
  const { data, error } = useSWR<Record<string, PercentileData>>(
    '/api/espn-percentiles',
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
      errorRetryCount: 2,
    },
  );

  const percentiles: Record<string, PercentileEntry> = {};
  const isLive = !error && !!data && Object.keys(data).length > 0;

  for (const [modelId, score] of Object.entries(modelScores)) {
    // Try live ESPN data first
    if (isLive && data[modelId] && data[modelId].percentile >= 0) {
      percentiles[modelId] = {
        percentile: data[modelId].percentile,
        isEstimate: false,
      };
    } else {
      // Fall back to proxy table
      const fallback = getEspnPercentile(score, year);
      if (fallback) {
        percentiles[modelId] = {
          percentile: fallback.percentile,
          isEstimate: fallback.isEstimate,
        };
      }
    }
  }

  return { percentiles, isLive };
}
