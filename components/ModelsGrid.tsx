'use client';

import { useState } from 'react';
import { VISIBLE_MODELS, MODELS } from '@/lib/models';
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
import agentData from '@/data/models/the-agent.json';
import superAgentData from '@/data/models/the-super-agent.json';
import scoutPrimeData from '@/data/models/the-scout-prime.json';

const BRACKETS: Record<string, BracketData> = {
  'the-scout': scoutData as unknown as BracketData,
  'the-quant': quantData as unknown as BracketData,
  'the-historian': historianData as unknown as BracketData,
  'the-chaos-agent': chaosData as unknown as BracketData,
  'the-optimizer': optimizerData as unknown as BracketData,
  'the-auto-researcher': autoResearcherData as unknown as BracketData,
  'the-agent': agentData as unknown as BracketData,
  'the-super-agent': superAgentData as unknown as BracketData,
  'the-scout-prime': scoutPrimeData as unknown as BracketData,
};

const HIDDEN_MODELS = MODELS.filter((m) => m.hidden);

export default function ModelsGrid() {
  const [showHidden, setShowHidden] = useState(false);
  const { results } = useLiveResults();
  const hasCompletedGames = results.games.some((g) => g.completed);

  function renderCard(model: typeof MODELS[number], index: number) {
    const bracket = BRACKETS[model.id];
    const score = hasCompletedGames && bracket
      ? calculateScore(bracket, results)
      : null;

    return (
      <ModelCard
        key={model.id}
        model={model}
        index={index}
        champion={bracket?.champion ?? undefined}
        score={score && score.totalPicks > 0 ? score.total : undefined}
        locked={!!bracket?.champion}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {VISIBLE_MODELS.map((model, i) => renderCard(model, i))}
      </div>

      <div className="mb-16">
        <button
          onClick={() => setShowHidden(!showHidden)}
          className="text-[13px] text-[#666] hover:text-[#999] transition-colors"
        >
          {showHidden
            ? '← Hide experimental models'
            : `${HIDDEN_MODELS.length} experimental models also competed. Click here to see them →`}
        </button>

        {showHidden && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {HIDDEN_MODELS.map((model, i) => renderCard(model, VISIBLE_MODELS.length + i))}
          </div>
        )}
      </div>
    </>
  );
}
