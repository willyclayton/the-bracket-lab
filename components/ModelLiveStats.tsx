'use client';

import { MODELS, ROUND_POINTS } from '@/lib/models';
import { BracketData } from '@/lib/types';
import { calculateScore, rankModels } from '@/lib/scoring';
import { useLiveResults } from '@/lib/use-live-results';
import { useEspnPercentiles } from '@/lib/use-espn-percentiles';

import scoutData from '@/data/models/the-scout.json';
import quantData from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData from '@/data/models/the-chaos-agent.json';
import agentData from '@/data/models/the-agent.json';
import superAgentData from '@/data/models/the-super-agent.json';
import optimizerData from '@/data/models/the-optimizer.json';
import scoutPrimeData from '@/data/models/the-scout-prime.json';
import autoResearcherData from '@/data/models/the-auto-researcher.json';

const ALL_BRACKETS: Record<string, BracketData> = {
  'the-scout': scoutData as unknown as BracketData,
  'the-quant': quantData as unknown as BracketData,
  'the-historian': historianData as unknown as BracketData,
  'the-chaos-agent': chaosData as unknown as BracketData,
  'the-agent': agentData as unknown as BracketData,
  'the-super-agent': superAgentData as unknown as BracketData,
  'the-optimizer': optimizerData as unknown as BracketData,
  'the-scout-prime': scoutPrimeData as unknown as BracketData,
  'the-auto-researcher': autoResearcherData as unknown as BracketData,
};

interface ModelLiveStatsProps {
  modelId: string;
  color: string;
  champion: string | null;
}

export default function ModelLiveStats({ modelId, color, champion }: ModelLiveStatsProps) {
  const { results } = useLiveResults();

  const hasCompletedGames = results.games.some((g) => g.completed);

  // Calculate scores for ALL models to determine rank
  const allScores = hasCompletedGames
    ? MODELS.map((m) => {
        const bracket = ALL_BRACKETS[m.id];
        if (!bracket) return null;
        return calculateScore(bracket, results);
      }).filter((s): s is NonNullable<typeof s> => s !== null)
    : [];

  const ranked = rankModels(allScores);
  const myScore = ranked.find((s) => s.modelId === modelId);
  const myRank = ranked.findIndex((s) => s.modelId === modelId) + 1;

  // Build scores map for percentile hook
  const modelScoresMap: Record<string, number> = {};
  for (const s of ranked) {
    modelScoresMap[s.modelId] = s.total;
  }
  const { percentiles } = useEspnPercentiles(modelScoresMap);

  const hasData = hasCompletedGames && myScore && myScore.totalPicks > 0;
  const pct = percentiles[modelId];

  return (
    <div className="flex border border-[#2a2a2a] rounded-lg overflow-hidden flex-shrink-0">
      <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
        <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Score</span>
        <span className="font-mono text-sm font-bold leading-none" style={{ color: hasData ? color : undefined }}>
          {hasData ? myScore.total : '\u2014'}
        </span>
      </div>
      <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
        <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Rank</span>
        <span className="font-mono text-sm font-bold text-lab-white leading-none">
          {hasData ? `${myRank} of ${ranked.length}` : '\u2014'}
        </span>
      </div>
      <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
        <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Accuracy</span>
        <span className="font-mono text-sm font-bold leading-none" style={{ color: hasData ? color : undefined }}>
          {hasData ? `${myScore.accuracy}%` : '\u2014'}
        </span>
      </div>
      <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
        <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">ESPN %</span>
        <span className="font-mono text-sm font-bold leading-none" style={{ color: hasData ? color : undefined }}>
          {hasData && pct ? `${pct.percentile.toFixed(1)}%${pct.isEstimate ? ' (est.)' : ''}` : '\u2014'}
        </span>
      </div>
      <div className="flex-1 text-center py-2.5 px-2">
        <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Champion</span>
        <span className="font-mono text-sm font-bold text-lab-white leading-none">
          {champion ?? '\u2014'}
        </span>
      </div>
    </div>
  );
}
