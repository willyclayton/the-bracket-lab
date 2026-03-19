'use client';

import { VISIBLE_MODELS } from '@/lib/models';
import { BracketData } from '@/lib/types';
import { calculateScore, rankModels } from '@/lib/scoring';
import { useLiveResults } from '@/lib/use-live-results';
import HomeModelCard from '@/components/HomeModelCard';
import HomeModelStrip from '@/components/HomeModelStrip';

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

export default function LiveHomeModelCards() {
  const { results } = useLiveResults();
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

  // Build a rank map from ranked results
  const rankMap: Record<string, number> = {};
  ranked.forEach((s, i) => { rankMap[s.modelId] = i + 1; });

  // Build a score map for quick lookup
  const scoreMap: Record<string, { total: number; accuracy: number }> = {};
  for (const s of ranked) {
    scoreMap[s.modelId] = { total: s.total, accuracy: s.accuracy };
  }

  // Read champion from bracket JSON
  const getChampion = (modelId: string): string => {
    const bracket = BRACKETS[modelId];
    if (!bracket) return 'TBD';
    return bracket.champion || 'TBD';
  };

  const entries = VISIBLE_MODELS.map((model) => ({
    model,
    champion: getChampion(model.id),
    score: scoreMap[model.id]?.total,
    accuracy: scoreMap[model.id]?.accuracy,
    rank: rankMap[model.id],
  }));

  return (
    <>
      {/* Mobile strip */}
      <section className="md:hidden mx-auto max-w-[1200px] px-6 mb-12">
        <HomeModelStrip entries={entries} />
      </section>

      {/* Desktop card grid */}
      <section className="hidden md:block mx-auto max-w-[1200px] px-6 sm:px-10 mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.map((entry) => (
            <HomeModelCard
              key={entry.model.id}
              model={entry.model}
              champion={entry.champion}
              score={entry.score}
              accuracy={entry.accuracy}
              rank={entry.rank}
            />
          ))}
        </div>
      </section>
    </>
  );
}
