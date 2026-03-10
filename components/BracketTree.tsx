'use client';

import { useState } from 'react';
import { BracketData, Game, Results } from '@/lib/types';

interface BracketTreeProps {
  bracket: BracketData;
  modelColor: string;
  results?: Results;
}

const ROUND_KEYS = [
  { key: 'round_of_64',  label: 'R64' },
  { key: 'round_of_32',  label: 'R32' },
  { key: 'sweet_16',     label: 'S16' },
  { key: 'elite_8',      label: 'E8' },
  { key: 'final_four',   label: 'F4' },
  { key: 'championship', label: '🏆' },
] as const;

type RoundKey = typeof ROUND_KEYS[number]['key'];

function GameNode({
  game,
  modelColor,
  activeId,
  onToggle,
  winner,
}: {
  game: Game;
  modelColor: string;
  activeId: string | null;
  onToggle: (id: string) => void;
  winner?: string;
}) {
  const isOpen = activeId === game.gameId;
  const isPick1 = game.pick === game.team1;
  const isPick2 = game.pick === game.team2;

  // Hit/miss: only show when game is completed (winner known)
  const isHit = winner !== undefined && game.pick === winner;
  const isMiss = winner !== undefined && game.pick !== winner;
  const hitColor = '#22c55e';
  const missColor = '#ef4444';
  const resultColor = isHit ? hitColor : isMiss ? missColor : undefined;

  return (
    <div className="mb-1">
      <button
        onClick={() => onToggle(game.gameId)}
        className="bracket-game-node w-full rounded-lg border border-lab-border bg-lab-surface text-left px-3 py-2 min-w-[160px]"
        style={{ borderColor: isOpen ? `${modelColor}60` : resultColor ? `${resultColor}40` : undefined }}
      >
        <div className={`flex items-center justify-between gap-2 text-xs mb-1 ${isPick1 ? 'text-lab-white' : 'text-lab-muted'}`}>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10px] flex-shrink-0 w-5 text-right" style={{ color: modelColor }}>
              {game.seed1}
            </span>
            <span className="truncate">{game.team1}</span>
          </span>
          {isPick1 && (
            <span className="font-mono text-[10px] flex-shrink-0" style={{ color: resultColor ?? modelColor }}>
              {isHit ? '✓' : isMiss ? '✗' : '✓'}
            </span>
          )}
        </div>
        <div className={`flex items-center justify-between gap-2 text-xs ${isPick2 ? 'text-lab-white' : 'text-lab-muted'}`}>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10px] flex-shrink-0 w-5 text-right text-lab-muted">
              {game.seed2}
            </span>
            <span className="truncate">{game.team2}</span>
          </span>
          {isPick2 && (
            <span className="font-mono text-[10px] flex-shrink-0" style={{ color: resultColor ?? modelColor }}>
              {isHit ? '✓' : isMiss ? '✗' : '✓'}
            </span>
          )}
        </div>
      </button>

      {/* Reasoning expand */}
      <div
        className="bracket-reasoning overflow-hidden px-3"
        data-open={isOpen ? 'true' : 'false'}
      >
        <div className="py-2 border-l-2 pl-3 mt-1 text-xs text-lab-muted" style={{ borderColor: resultColor ?? modelColor }}>
          <span className="font-mono text-[10px] uppercase tracking-widest block mb-1" style={{ color: resultColor ?? modelColor }}>
            {game.pick} · {game.confidence}% confidence
          </span>
          <p className="leading-relaxed">{game.reasoning}</p>
        </div>
      </div>
    </div>
  );
}

function RoundColumn({
  title,
  games,
  modelColor,
  activeId,
  onToggle,
  winnerMap,
}: {
  title: string;
  games: Game[];
  modelColor: string;
  activeId: string | null;
  onToggle: (id: string) => void;
  winnerMap: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted text-center mb-2 sticky top-0 bg-lab-bg py-1">
        {title}
      </p>
      {games.map((game) => (
        <GameNode
          key={game.gameId}
          game={game}
          modelColor={modelColor}
          activeId={activeId}
          onToggle={onToggle}
          winner={winnerMap[game.gameId]}
        />
      ))}
    </div>
  );
}

export default function BracketTree({ bracket, modelColor, results }: BracketTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<RoundKey>('round_of_64');

  function toggleGame(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
  }

  // Build a gameId → winner lookup from results
  const winnerMap: Record<string, string> = {};
  if (results) {
    for (const g of results.games) {
      if (g.completed && g.winner) winnerMap[g.gameId] = g.winner;
    }
  }

  const allGames = bracket.rounds as Record<RoundKey, Game[]>;
  const isEmpty = ROUND_KEYS.every(({ key }) => (allGames[key] ?? []).length === 0);

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-lab-border bg-lab-surface p-16 text-center">
        <p className="font-mono text-2xl mb-3">🔒</p>
        <p className="text-lab-white font-semibold mb-2">Picks lock March 19</p>
        <p className="text-sm text-lab-muted max-w-sm mx-auto">
          After the First Four play-in games (Mar 17–18), this model will run on the final
          64-team field and the full bracket will appear here.
        </p>
      </div>
    );
  }

  // Mobile: round pill selector + single-round view
  // Desktop: horizontal scroll with all rounds
  const activeGames = allGames[activeRound] ?? [];

  return (
    <div>
      {/* Round pills (mobile primary nav, desktop shortcut) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {ROUND_KEYS.map(({ key, label }) => {
          const count = (allGames[key] ?? []).length;
          const isActive = activeRound === key;
          return (
            <button
              key={key}
              onClick={() => setActiveRound(key)}
              className="flex-shrink-0 font-mono text-xs px-3 py-1.5 rounded-lg border transition-all duration-150"
              style={{
                borderColor: isActive ? modelColor : undefined,
                color: isActive ? modelColor : '#888',
                background: isActive ? `${modelColor}12` : undefined,
              }}
            >
              {label}
              {count > 0 && <span className="ml-1 text-lab-muted">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Desktop: full horizontal bracket scroll */}
      <div className="hidden lg:block bracket-scroll">
        <div className="flex gap-4 min-w-max pb-4">
          {ROUND_KEYS.map(({ key, label }) => {
            const games = allGames[key] ?? [];
            if (games.length === 0) return null;
            return (
              <div key={key} className="w-48">
                <RoundColumn
                  title={label}
                  games={games}
                  modelColor={modelColor}
                  activeId={activeId}
                  onToggle={toggleGame}
                  winnerMap={winnerMap}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: single round at a time */}
      <div className="lg:hidden">
        {activeGames.length === 0 ? (
          <p className="text-sm text-lab-muted text-center py-8">No picks yet for this round.</p>
        ) : (
          <div className="space-y-1">
            {activeGames.map((game) => (
              <GameNode
                key={game.gameId}
                game={game}
                modelColor={modelColor}
                activeId={activeId}
                onToggle={toggleGame}
                winner={winnerMap[game.gameId]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
