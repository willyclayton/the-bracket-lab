'use client';

import { VISIBLE_MODELS } from '@/lib/models';
import { BracketData } from '@/lib/types';
import { calculateScore } from '@/lib/scoring';
import { useLiveResults } from '@/lib/use-live-results';
import ModelCard from '@/components/ModelCard';

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

export default function ModelsGrid() {
  const { results } = useLiveResults();
  const hasCompletedGames = results.games.some((g) => g.completed);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
      {VISIBLE_MODELS.map((model, i) => {
        const bracket = BRACKETS[model.id];
        const score = hasCompletedGames && bracket
          ? calculateScore(bracket, results)
          : null;

        return (
          <ModelCard
            key={model.id}
            model={model}
            index={i}
            champion={bracket?.champion ?? undefined}
            score={score && score.totalPicks > 0 ? score.total : undefined}
            locked={!!bracket?.champion}
          />
        );
      })}
    </div>
  );
}
