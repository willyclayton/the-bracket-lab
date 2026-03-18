'use client';

import { VISIBLE_MODELS } from '@/lib/models';
import { BracketData, Results, ResultGame } from '@/lib/types';
import { useLiveResults } from '@/lib/use-live-results';

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

const MODEL_LETTERS: { id: string; letter: string; color: string }[] = [
  { id: 'the-scout', letter: 'S', color: '#3b82f6' },
  { id: 'the-quant', letter: 'Q', color: '#22c55e' },
  { id: 'the-historian', letter: 'H', color: '#f59e0b' },
  { id: 'the-chaos-agent', letter: 'C', color: '#ef4444' },
  { id: 'the-optimizer', letter: 'O', color: '#06b6d4' },
  { id: 'the-auto-researcher', letter: 'R', color: '#f97316' },
];

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

type GameState = 'final' | 'live' | 'upcoming';

interface TickerItem {
  gameId: string;
  state: GameState;
  team1: string;
  seed1: number;
  team2: string;
  seed2: number;
  // Final + live
  score1?: number;
  score2?: number;
  // Final only
  winner?: string;
  modelCorrect?: Record<string, boolean>;
  correctCount?: number;
  // Live only
  gameClock?: string;
  // Upcoming only
  tipoff?: string;
}

function getGameState(game: ResultGame): GameState {
  if (game.completed && game.winner) return 'final';
  if (game.gameClock) return 'live';
  return 'upcoming';
}

function formatTipoff(gameTime: string | null): string {
  if (!gameTime) return 'TBD';
  try {
    const d = new Date(gameTime);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }) + ' ET';
  } catch {
    return 'TBD';
  }
}

function buildTickerItems(results: Results): TickerItem[] {
  // Include all games that have both teams assigned
  const gamesWithTeams = results.games.filter((g) => g.team1 && g.team2);
  if (gamesWithTeams.length === 0) return [];

  return gamesWithTeams.map((game) => {
    const state = getGameState(game);

    const item: TickerItem = {
      gameId: game.gameId,
      state,
      team1: game.team1,
      seed1: game.seed1,
      team2: game.team2,
      seed2: game.seed2,
    };

    if (state === 'final') {
      item.score1 = game.score1;
      item.score2 = game.score2;
      item.winner = game.winner;

      // Build model scorecard
      const modelCorrect: Record<string, boolean> = {};
      let correctCount = 0;
      for (const model of VISIBLE_MODELS) {
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
      item.modelCorrect = modelCorrect;
      item.correctCount = correctCount;
    } else if (state === 'live') {
      item.score1 = game.score1;
      item.score2 = game.score2;
      item.gameClock = game.gameClock;
    } else {
      item.tipoff = formatTipoff(game.gameTime);
    }

    return item;
  });
}

function hasAnyPicks(): boolean {
  return VISIBLE_MODELS.some((model) => {
    const bracket = BRACKETS[model.id];
    return ROUND_ORDER.some(
      (r) => (bracket?.rounds[r as keyof BracketData['rounds']] ?? []).length > 0
    );
  });
}

function getMatchupPreviews(): { team1: string; seed1: number; team2: string; seed2: number }[] {
  for (const model of VISIBLE_MODELS) {
    const r64 = BRACKETS[model.id]?.rounds.round_of_64 ?? [];
    if (r64.length > 0) {
      return r64.map((g) => ({ team1: g.team1, seed1: g.seed1, team2: g.team2, seed2: g.seed2 }));
    }
  }
  return [];
}

function TickerGameFinal({ item }: { item: TickerItem }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 px-3">
      <span className="font-mono text-[10px] text-[#999]">({item.seed1})</span>
      <span
        className={`font-mono text-[11px] ${
          item.winner === item.team1 ? 'text-white font-bold' : 'text-[#777]'
        }`}
      >
        {item.team1}
      </span>
      <span className="font-mono text-[11px] text-[#999]">{item.score1}</span>

      <span className="font-mono text-[9px] text-[#666] uppercase tracking-wider mx-1 font-semibold">
        Final
      </span>

      <span className="font-mono text-[11px] text-[#999]">{item.score2}</span>
      <span
        className={`font-mono text-[11px] ${
          item.winner === item.team2 ? 'text-white font-bold' : 'text-[#777]'
        }`}
      >
        {item.team2}
      </span>
      <span className="font-mono text-[10px] text-[#999]">({item.seed2})</span>

      {/* Model icons */}
      <div className="flex items-center gap-[3px] ml-1">
        {MODEL_LETTERS.map(({ id, letter, color }) => {
          const correct = item.modelCorrect?.[id] ?? false;
          return (
            <span
              key={id}
              className="ticker-model-icon"
              style={{
                background: correct ? `${color}22` : 'rgba(255,255,255,0.04)',
                borderColor: correct ? color : '#333',
                color: correct ? color : '#555',
              }}
            >
              {letter}
            </span>
          );
        })}
        <span className="font-mono text-[9px] text-[#999] ml-0.5">
          {item.correctCount}/6
        </span>
      </div>

      <span className="text-[#444] ml-2">|</span>
    </div>
  );
}

function TickerGameLive({ item }: { item: TickerItem }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 px-3">
      <span className="font-mono text-[10px] text-[#999]">({item.seed1})</span>
      <span className="font-mono text-[11px] text-[#ccc]">{item.team1}</span>
      <span className="font-mono text-[11px] text-[#efefef] font-semibold">{item.score1}</span>

      <span className="font-mono text-[9px] text-green-400 font-semibold mx-1">
        {item.gameClock}
      </span>

      <span className="font-mono text-[11px] text-[#efefef] font-semibold">{item.score2}</span>
      <span className="font-mono text-[11px] text-[#ccc]">{item.team2}</span>
      <span className="font-mono text-[10px] text-[#999]">({item.seed2})</span>

      <span className="text-[#444] ml-2">|</span>
    </div>
  );
}

function TickerGameUpcoming({ item }: { item: TickerItem }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 px-3">
      <span className="font-mono text-[10px] text-[#999]">({item.seed1})</span>
      <span className="font-mono text-[11px] text-[#ccc]">{item.team1}</span>

      <span className="font-mono text-[9px] text-[#888] mx-1.5">
        {item.tipoff}
      </span>

      <span className="font-mono text-[11px] text-[#ccc]">{item.team2}</span>
      <span className="font-mono text-[10px] text-[#999]">({item.seed2})</span>

      <span className="text-[#444] ml-2">|</span>
    </div>
  );
}

function TickerGame({ item }: { item: TickerItem }) {
  switch (item.state) {
    case 'final':
      return <TickerGameFinal item={item} />;
    case 'live':
      return <TickerGameLive item={item} />;
    case 'upcoming':
      return <TickerGameUpcoming item={item} />;
  }
}

export default function GameTicker() {
  const { results, isLive } = useLiveResults();
  const tickerItems = buildTickerItems(results);
  const hasLiveOrFinal = tickerItems.some((t) => t.state === 'final' || t.state === 'live');
  const picksExist = hasAnyPicks();

  // State 1: Games have started (mix of final, live, upcoming)
  if (tickerItems.length > 0 && hasLiveOrFinal) {
    return (
      <div className="ticker-bar">
        {isLive && (
          <div className="flex items-center gap-1.5 px-3 flex-shrink-0 border-r border-[#2a2a2a]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="font-mono text-[9px] text-green-400 uppercase tracking-wider">Live</span>
          </div>
        )}
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-6 pr-6">
              {tickerItems.map((item, i) => (
                <TickerGame key={`${copy}-${i}`} item={item} />
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
                    <span className="font-mono text-[10px] text-[#999]">({item.seed1})</span>
                    <span className="font-mono text-[11px] text-[#ccc]">{item.team1}</span>
                    <span className="text-[#555] text-[10px] mx-0.5">vs</span>
                    <span className="font-mono text-[11px] text-[#ccc]">{item.team2}</span>
                    <span className="font-mono text-[10px] text-[#999]">({item.seed2})</span>
                    <span className="text-[#333] ml-2">|</span>
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
                className="font-mono text-[11px] text-[#999] whitespace-nowrap flex-shrink-0"
              >
                PICKS LOCK MARCH 19 &mdash; 6 AI models. 63 games. 1,920 possible points.
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
