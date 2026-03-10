'use client';

import { MODELS } from '@/lib/models';
import { BracketData, Results } from '@/lib/types';

import scoutData from '@/data/models/the-scout.json';
import quantData from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData from '@/data/models/the-chaos-agent.json';
import agentData from '@/data/models/the-agent.json';
import results from '@/data/results/actual-results.json';

const BRACKETS: Record<string, BracketData> = {
  'the-scout': scoutData as unknown as BracketData,
  'the-quant': quantData as unknown as BracketData,
  'the-historian': historianData as unknown as BracketData,
  'the-chaos-agent': chaosData as unknown as BracketData,
  'the-agent': agentData as unknown as BracketData,
};

const RESULTS = results as unknown as Results;

const MODEL_LETTERS: { id: string; letter: string; color: string }[] = [
  { id: 'the-scout', letter: 'S', color: '#3b82f6' },
  { id: 'the-quant', letter: 'Q', color: '#22c55e' },
  { id: 'the-historian', letter: 'H', color: '#f59e0b' },
  { id: 'the-chaos-agent', letter: 'C', color: '#ef4444' },
  { id: 'the-agent', letter: 'A', color: '#00ff88' },
];

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

interface TickerItem {
  gameId: string;
  team1: string;
  seed1: number;
  score1: number;
  team2: string;
  seed2: number;
  score2: number;
  winner: string;
  modelCorrect: Record<string, boolean>;
  correctCount: number;
}

function buildTickerItems(): TickerItem[] {
  const completedGames = RESULTS.games.filter((g) => g.completed && g.winner);
  if (completedGames.length === 0) return [];

  return completedGames.map((game) => {
    const modelCorrect: Record<string, boolean> = {};
    let correctCount = 0;

    for (const model of MODELS) {
      let found = false;
      for (const roundKey of ROUND_ORDER) {
        const games = BRACKETS[model.id]?.rounds[roundKey as keyof BracketData['rounds']] ?? [];
        const match = games.find((g) => g.gameId === game.gameId);
        if (match) {
          const correct = match.pick === game.winner;
          modelCorrect[model.id] = correct;
          if (correct) correctCount++;
          found = true;
          break;
        }
      }
      if (!found) modelCorrect[model.id] = false;
    }

    return {
      gameId: game.gameId,
      team1: game.team1,
      seed1: game.seed1,
      score1: game.score1,
      team2: game.team2,
      seed2: game.seed2,
      score2: game.score2,
      winner: game.winner,
      modelCorrect,
      correctCount,
    };
  });
}

function hasAnyPicks(): boolean {
  return MODELS.some((model) => {
    const bracket = BRACKETS[model.id];
    return ROUND_ORDER.some(
      (r) => (bracket?.rounds[r as keyof BracketData['rounds']] ?? []).length > 0
    );
  });
}

function getMatchupPreviews(): { team1: string; seed1: number; team2: string; seed2: number }[] {
  // Pull R64 matchups from first model that has them
  for (const model of MODELS) {
    const r64 = BRACKETS[model.id]?.rounds.round_of_64 ?? [];
    if (r64.length > 0) {
      return r64.map((g) => ({ team1: g.team1, seed1: g.seed1, team2: g.team2, seed2: g.seed2 }));
    }
  }
  return [];
}

export default function GameTicker() {
  const tickerItems = buildTickerItems();
  const picksExist = hasAnyPicks();

  // State 1: Games completed — show results + model scorecard
  if (tickerItems.length > 0) {
    return (
      <div className="ticker-bar">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-6 pr-6">
              {tickerItems.map((item, i) => (
                <div
                  key={`${copy}-${i}`}
                  className="flex items-center gap-2 flex-shrink-0 px-3"
                >
                  {/* Team 1 */}
                  <span className="font-mono text-[10px] text-[#555]">({item.seed1})</span>
                  <span
                    className={`font-mono text-[11px] ${
                      item.winner === item.team1 ? 'text-lab-white font-bold' : 'text-[#666]'
                    }`}
                  >
                    {item.team1}
                  </span>
                  <span className="font-mono text-[11px] text-[#555]">{item.score1}</span>

                  <span className="text-[#333] text-[10px] mx-0.5">-</span>

                  {/* Team 2 */}
                  <span className="font-mono text-[11px] text-[#555]">{item.score2}</span>
                  <span
                    className={`font-mono text-[11px] ${
                      item.winner === item.team2 ? 'text-lab-white font-bold' : 'text-[#666]'
                    }`}
                  >
                    {item.team2}
                  </span>
                  <span className="font-mono text-[10px] text-[#555]">({item.seed2})</span>

                  {/* Model icons */}
                  <div className="flex items-center gap-[3px] ml-1">
                    {MODEL_LETTERS.map(({ id, letter, color }) => {
                      const correct = item.modelCorrect[id];
                      return (
                        <span
                          key={id}
                          className="ticker-model-icon"
                          style={{
                            background: correct
                              ? `${color}22`
                              : 'rgba(255,255,255,0.04)',
                            borderColor: correct ? color : '#333',
                            color: correct ? color : '#555',
                          }}
                        >
                          {letter}
                        </span>
                      );
                    })}
                    <span className="font-mono text-[9px] text-[#666] ml-0.5">
                      {item.correctCount}/5
                    </span>
                  </div>

                  {/* Separator */}
                  <span className="text-[#222] ml-2">|</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // State 2: Picks exist but no results — show matchup previews
  if (picksExist) {
    const previews = getMatchupPreviews();
    if (previews.length > 0) {
      return (
        <div className="ticker-bar">
          <div className="ticker-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-6 pr-6">
                {previews.map((item, i) => (
                  <div
                    key={`${copy}-${i}`}
                    className="flex items-center gap-1.5 flex-shrink-0 px-3"
                  >
                    <span className="font-mono text-[10px] text-[#555]">({item.seed1})</span>
                    <span className="font-mono text-[11px] text-lab-muted">{item.team1}</span>
                    <span className="text-[#333] text-[10px] mx-0.5">vs</span>
                    <span className="font-mono text-[11px] text-lab-muted">{item.team2}</span>
                    <span className="font-mono text-[10px] text-[#555]">({item.seed2})</span>
                    <span className="text-[#222] ml-2">|</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // State 3: No picks yet — static scrolling message
  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-12 pr-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={`${copy}-${i}`}
                className="font-mono text-[11px] text-[#666] whitespace-nowrap flex-shrink-0"
              >
                PICKS LOCK MARCH 19 &mdash; 5 AI models. 63 games. 1,920 possible points.
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
