'use client';

import useSWR from 'swr';
import { Results } from './types';
import staticResults from '@/data/results/actual-results.json';

const STATIC_RESULTS = staticResults as unknown as Results;

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`Scores API ${res.status}`);
  return res.json();
});

interface LiveResultsReturn {
  results: Results;
  isLive: boolean;
  lastUpdated: string | null;
}

export function useLiveResults(): LiveResultsReturn {
  const { data, error } = useSWR<Results>('/api/scores', fetcher, {
    refreshInterval: 30_000,       // poll every 30s
    revalidateOnFocus: true,
    dedupingInterval: 10_000,      // dedup within 10s
    errorRetryCount: 3,
    fallbackData: STATIC_RESULTS,  // use static JSON until first fetch
  });

  // If API is down or errored, fall back to static data
  const results = error ? STATIC_RESULTS : (data ?? STATIC_RESULTS);
  const isLive = !error && !!data && data !== STATIC_RESULTS;

  return {
    results,
    isLive,
    lastUpdated: results.lastUpdated,
  };
}
