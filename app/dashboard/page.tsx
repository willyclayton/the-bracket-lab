'use client';

import { VISIBLE_MODELS, ROUND_LABELS, MAX_SCORE } from '@/lib/models';
import { BracketData, ModelScore } from '@/lib/types';
import { calculateScore, rankModels } from '@/lib/scoring';
import { useLiveResults } from '@/lib/use-live-results';
import { useEspnPercentiles } from '@/lib/use-espn-percentiles';
import Link from 'next/link';

import scoutData from '@/data/models/the-scout.json';
import quantData from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData from '@/data/models/the-chaos-agent.json';
import optimizerData from '@/data/models/the-optimizer.json';
import autoResearcherData from '@/data/models/the-auto-researcher.json';

const BRACKETS: Record<string, BracketData> = {
  'the-scout': scoutData as unknown as BracketData,
  'the-quant': quantData as unknown as BracketData,
  'the-historian': historianData as unknown as BracketData,
  'the-chaos-agent': chaosData as unknown as BracketData,
  'the-optimizer': optimizerData as unknown as BracketData,
  'the-auto-researcher': autoResearcherData as unknown as BracketData,
};

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function DashboardPage() {
  const { results, isLive, lastUpdated } = useLiveResults();

  const completedGames = results.games.filter((g) => g.completed);
  const totalGames = results.games.length;
  const hasData = completedGames.length > 0;

  // Track which rounds have at least one completed game
  const activeRounds = new Set<string>();
  for (const game of completedGames) {
    activeRounds.add(game.round);
  }

  // Calculate scores for all models
  const scores: (ModelScore & { model: typeof VISIBLE_MODELS[number] })[] = VISIBLE_MODELS.map((model) => {
    const bracket = BRACKETS[model.id];
    const score = bracket ? calculateScore(bracket, results) : {
      modelId: model.id, round_of_64: 0, round_of_32: 0, sweet_16: 0,
      elite_8: 0, final_four: 0, championship: 0, total: 0,
      correctPicks: 0, totalPicks: 0, accuracy: 0,
    };
    return { ...score, model };
  });

  const ranked = rankModels(scores).map((s) => ({
    ...s,
    model: VISIBLE_MODELS.find((m) => m.id === s.modelId)!,
  }));

  // Build model scores map for percentile hook
  const modelScoresMap: Record<string, number> = {};
  for (const s of scores) {
    modelScoresMap[s.model.id] = s.total;
  }
  const { percentiles } = useEspnPercentiles(modelScoresMap);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xs text-lab-muted">LIVE</span>
          {isLive ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mb-2">
          Tournament Dashboard
        </h1>
        <p className="text-lab-muted">
          Real-time accuracy tracking across all 6 models.
        </p>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2 bg-lab-surface border border-lab-border rounded-lg px-4 py-2">
          <span className="font-mono text-xs text-lab-muted">Games</span>
          <span className="font-mono text-sm text-lab-white font-semibold">
            {completedGames.length} / {totalGames}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-lab-surface border border-lab-border rounded-lg px-4 py-2">
          <span className="font-mono text-xs text-lab-muted">Round</span>
          <span className="font-mono text-sm text-lab-white font-semibold capitalize">
            {results.currentRound === 'pre-tournament' ? 'Pre-tournament' : ROUND_LABELS[results.currentRound] ?? results.currentRound}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-lab-surface border border-lab-border rounded-lg px-4 py-2">
          <span className="font-mono text-xs text-lab-muted">Updated</span>
          <span className="font-mono text-sm text-lab-white font-semibold">
            {timeAgo(lastUpdated)}
          </span>
        </div>
      </div>

      {!hasData ? (
        /* Pre-tournament state */
        <div className="rounded-xl border border-dashed border-lab-border bg-lab-surface/50 p-12 text-center mb-12">
          <p className="text-4xl mb-4">&#127936;</p>
          <p className="text-lab-white font-semibold text-lg mb-2">Tournament hasn&apos;t started yet</p>
          <p className="text-sm text-lab-muted max-w-md mx-auto">
            Picks lock March 19. Round of 64 tips off March 20.
            The leaderboard and accuracy tracker will go live once games start.
          </p>
        </div>
      ) : (
        /* Leaderboard */
        <section className="mb-12">
          <h2 className="text-xl font-bold text-lab-white mb-4">Leaderboard</h2>
          <div className="rounded-xl border border-lab-border bg-lab-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-lab-border">
                    <th className="text-left px-4 py-3 text-lab-muted font-mono text-xs">#</th>
                    <th className="text-left px-4 py-3 text-lab-muted font-mono text-xs">Model</th>
                    {ROUND_ORDER.map((r) => (
                      <th key={r} className="text-center px-3 py-3 text-lab-muted font-mono text-xs">
                        {ROUND_LABELS[r]}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">Acc</th>
                    <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">ESPN %ile</th>
                    <th className="text-right px-4 py-3 text-lab-muted font-mono text-xs">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((entry, i) => (
                    <tr key={entry.modelId} className="border-b border-lab-border last:border-0">
                      <td className="px-4 py-3 font-mono text-lab-muted">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/brackets?model=${entry.modelId}`} className="flex items-center gap-2 group">
                          <span>{entry.model.icon}</span>
                          <span className="font-medium group-hover:underline underline-offset-2" style={{ color: entry.model.color }}>
                            {entry.model.name}
                          </span>
                        </Link>
                      </td>
                      {ROUND_ORDER.map((r) => {
                        const pts = entry[r as keyof ModelScore] as number;
                        const roundActive = activeRounds.has(r);
                        return (
                          <td key={r} className="text-center px-3 py-3 font-mono text-sm">
                            {roundActive ? (
                              <span style={{ color: pts > 0 ? entry.model.color : '#555' }}>
                                {pts}
                              </span>
                            ) : (
                              <span style={{ color: '#555' }}>{'\u2014'}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3 font-mono text-sm text-lab-muted">
                        {entry.accuracy}%
                      </td>
                      <td className="text-center px-3 py-3 font-mono text-sm text-lab-muted">
                        {(() => {
                          const pct = percentiles[entry.modelId];
                          if (!pct) return '\u2014';
                          if (pct.isEstimate && entry.total === 0) return '\u2014';
                          return `${pct.percentile.toFixed(1)}%${pct.isEstimate ? ' (est.)' : ''}`;
                        })()}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="font-mono text-sm font-bold" style={{ color: entry.model.color }}>
                          {entry.total}
                        </span>
                        <span className="font-mono text-xs text-[#555] ml-1">/ {MAX_SCORE}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Bracket view link */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-lab-white mb-4">Bracket View</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center">
          <p className="text-lab-muted text-sm mb-4">
            View each model&apos;s full bracket with live result overlays.
          </p>
          <Link
            href="/brackets"
            className="inline-block bg-lab-white text-lab-bg font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-opacity-90 transition-all"
          >
            Open Brackets
          </Link>
        </div>
      </section>

      {/* Round recaps */}
      <section>
        <h2 className="text-xl font-bold text-lab-white mb-4">Round Recaps</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center text-lab-muted text-sm">
          Round-by-round analysis will be posted as the tournament progresses.
        </div>
      </section>
    </div>
  );
}
