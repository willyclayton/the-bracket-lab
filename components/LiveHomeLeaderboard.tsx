'use client';

import Link from 'next/link';
import { VISIBLE_MODELS, ROUND_POINTS, Model } from '@/lib/models';
import { BracketData } from '@/lib/types';
import { calculateScore, rankModels } from '@/lib/scoring';
import { useLiveResults } from '@/lib/use-live-results';
import { useEspnPercentiles } from '@/lib/use-espn-percentiles';

import scoutData from '@/data/models/the-scout.json';
import quantData from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData from '@/data/models/the-chaos-agent.json';
import agentData from '@/data/models/the-agent.json';
import optimizerData from '@/data/models/the-optimizer.json';
import autoResearcherData from '@/data/models/the-auto-researcher.json';
import superAgentData from '@/data/models/the-super-agent.json';
import scoutPrimeData from '@/data/models/the-scout-prime.json';

const BRACKETS: Record<string, BracketData> = {
  'the-scout': scoutData as unknown as BracketData,
  'the-quant': quantData as unknown as BracketData,
  'the-historian': historianData as unknown as BracketData,
  'the-chaos-agent': chaosData as unknown as BracketData,
  'the-agent': agentData as unknown as BracketData,
  'the-optimizer': optimizerData as unknown as BracketData,
  'the-auto-researcher': autoResearcherData as unknown as BracketData,
  'the-super-agent': superAgentData as unknown as BracketData,
  'the-scout-prime': scoutPrimeData as unknown as BracketData,
};

export default function LiveHomeLeaderboard() {
  const { results, isLive } = useLiveResults();

  const hasCompletedGames = results.games.some((g) => g.completed);

  // Calculate scores for all visible models
  const scores = VISIBLE_MODELS.map((model) => {
    const bracket = BRACKETS[model.id];
    if (!bracket || !hasCompletedGames) return null;
    return calculateScore(bracket, results);
  });

  const ranked = hasCompletedGames
    ? rankModels(scores.filter((s): s is NonNullable<typeof s> => s !== null))
    : [];

  // Build entries: ranked if we have data, otherwise static order
  const entries = hasCompletedGames
    ? ranked.map((score, i) => {
        const model = VISIBLE_MODELS.find((m) => m.id === score.modelId)!;
        return { model, score: score.total, accuracy: score.accuracy, champion: BRACKETS[model.id]?.champion || 'TBD', rank: i + 1 };
      })
    : VISIBLE_MODELS.map((model, i) => ({
        model, score: undefined as number | undefined, accuracy: undefined as number | undefined,
        champion: BRACKETS[model.id]?.champion || 'TBD', rank: i + 1,
      }));

  const hasData = entries.some((e) => e.score !== undefined && e.score > 0);

  // Build model scores map for percentile hook
  const modelScoresMap: Record<string, number> = {};
  for (const e of entries) {
    if (e.score !== undefined) modelScoresMap[e.model.id] = e.score;
  }
  const { percentiles } = useEspnPercentiles(modelScoresMap);

  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-lab-muted">
          Leaderboard
        </h3>
        {isLive && hasCompletedGames && (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="font-mono text-[10px] text-green-400 uppercase">Live</span>
          </span>
        )}
      </div>
      <div className="rounded-xl border border-lab-border bg-lab-surface overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.model.id}
                className="border-b border-[#2a2a2a] last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-4 w-10 text-center">
                  <span className="font-mono text-xs text-[#666]">
                    #{entry.rank}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <Link
                    href={`/brackets?model=${entry.model.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <span
                      className="w-[3px] h-[22px] rounded-sm flex-shrink-0"
                      style={{ background: entry.model.color }}
                    />
                    <span className="font-semibold text-lab-white text-sm group-hover:underline underline-offset-2">
                      {entry.model.name}
                    </span>
                  </Link>
                </td>
                <td className="py-4 px-4 text-right hidden sm:table-cell">
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: hasData ? entry.model.color : '#888' }}
                  >
                    {hasData && entry.score !== undefined ? entry.score : '\u2014'}
                  </span>
                </td>
                <td className="py-4 px-4 text-right hidden md:table-cell">
                  <span className="font-mono text-xs text-lab-muted">
                    {hasData && entry.accuracy !== undefined ? `${entry.accuracy}%` : '\u2014'}
                  </span>
                </td>
                <td className="py-4 px-4 text-right hidden md:table-cell">
                  <span className="font-mono text-xs text-lab-muted">
                    {(() => {
                      if (!hasData) return '\u2014';
                      const pct = percentiles[entry.model.id];
                      if (!pct) return '\u2014';
                      return `${pct.percentile.toFixed(1)}%${pct.isEstimate ? ' (est.)' : ''}`;
                    })()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
