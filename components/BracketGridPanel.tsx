'use client';

import { Game } from '@/lib/types';
import { ROUND_LABELS } from '@/lib/models';
import type { GamesByRegion } from './BracketCardsPanel';

const ROUND_KEYS = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8'] as const;

// Bracket funnel layout: each later round is vertically centered between its feeder matchups.
// SLOT_H = approximate rendered height of one MatchupSlot (2 team rows + borders).
// BASE_GAP = vertical space between R64 matchups.
// UNIT = one "slot unit" in the grid (slot + gap).
// For round N (0-indexed): offset = (2^N - 1) * UNIT / 2, gap = 2^N * UNIT - SLOT_H
const SLOT_H = 42;
const BASE_GAP = 4;
const UNIT = SLOT_H + BASE_GAP;

const ROUND_LAYOUT: Record<string, { offset: number; gap: number }> = {
  round_of_64: { offset: 0, gap: BASE_GAP },
  round_of_32: { offset: Math.round(UNIT / 2), gap: Math.round(UNIT * 2 - SLOT_H) },
  sweet_16:    { offset: Math.round(UNIT * 1.5), gap: Math.round(UNIT * 4 - SLOT_H) },
  elite_8:     { offset: Math.round(UNIT * 3.5), gap: 0 },
};

interface BracketGridPanelProps {
  gamesByRegion: GamesByRegion;
  modelColor: string;
  champion: string | null;
  highlightedMatchId: string | null;
  onMatchClick: (matchId: string, game: Game, roundLabel: string) => void;
  winnerMap: Record<string, string>;
  eliminatedTeams: Set<string>;
  bustedModelPicks: Set<string>;
}

function MatchupSlot({
  game,
  modelColor,
  isHighlighted,
  onClick,
  winnerMap,
  eliminatedTeams,
  bustedModelPicks,
  marginTop,
}: {
  game: Game;
  modelColor: string;
  isHighlighted: boolean;
  onClick: () => void;
  winnerMap: Record<string, string>;
  eliminatedTeams: Set<string>;
  bustedModelPicks: Set<string>;
  marginTop?: number;
}) {
  const isPick1 = game.pick === game.team1;
  const isPick2 = game.pick === game.team2;
  const result = winnerMap[game.gameId];
  const isCorrect = result ? game.pick === result : undefined;
  const isWrong = result ? game.pick !== result : false;
  const isBusted = !result && game.pick && eliminatedTeams.has(game.pick);

  const teamState = (team: string, isPick: boolean) => {
    if (isPick) {
      if (isCorrect) return 'correct';
      if (isWrong) return 'wrong';
      if (isBusted) return 'busted-pick';
      return 'pending';
    }
    if (bustedModelPicks.has(team)) return 'ghost';
    return 'normal';
  };
  const state1 = teamState(game.team1, isPick1);
  const state2 = teamState(game.team2, isPick2);

  const textCls: Record<string, string> = {
    correct: 'text-[#ddd] font-semibold',
    wrong: 'text-red-500 line-through font-semibold',
    'busted-pick': 'text-red-500 line-through font-semibold',
    pending: 'text-[#ddd] font-semibold',
    ghost: 'text-[#444]',
    normal: 'text-[#777]',
  };
  const rowBg: Record<string, string> = {
    correct: 'bg-green-500/[0.08]',
    wrong: 'bg-red-500/[0.08]',
    'busted-pick': 'bg-red-500/[0.08]',
    pending: 'bg-white/[0.04]',
    ghost: 'bg-black/20',
    normal: '',
  };

  return (
    <div
      className={`border border-[#252525] rounded-[3px] overflow-hidden cursor-pointer transition-all w-[110px] relative ${
        isWrong ? 'border-red-500/30' : ''
      } ${isHighlighted ? 'border-current shadow-[0_0_0_1px_currentColor]' : ''}`}
      style={{
        marginTop: marginTop ? `${marginTop}px` : undefined,
        marginLeft: '3px',
        marginRight: '3px',
        color: isHighlighted ? modelColor : undefined,
        background: isBusted ? 'rgba(239,68,68,0.05)' : '#1e1e1e',
      }}
      onClick={onClick}
    >
      {isBusted && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 font-mono text-[7px] font-black text-red-500/25 tracking-[2px] uppercase pointer-events-none z-10">
          BUSTED
        </span>
      )}
      <div className={isBusted ? 'opacity-[0.35]' : undefined}>
        {/* Team 1 */}
        <div
          className={`flex items-center gap-[3px] px-[5px] py-[3px] text-[9px] border-b border-[#1a1a1a] ${rowBg[state1]}`}
        >
          <span className="font-mono text-[8px] text-[#555] w-[11px] text-right flex-shrink-0">
            {game.seed1}
          </span>
          <span
            className={`text-[9px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 ${textCls[state1]}`}
          >
            {game.team1}
          </span>
          {isPick1 && state1 === 'correct' && (
            <span className="w-[3px] h-[3px] rounded-full bg-green-500 flex-shrink-0" />
          )}
          {isPick1 && state1 === 'pending' && (
            <span
              className="w-[3px] h-[3px] rounded-full flex-shrink-0"
              style={{ background: modelColor }}
            />
          )}
        </div>
        {/* Team 2 */}
        <div
          className={`flex items-center gap-[3px] px-[5px] py-[3px] text-[9px] ${rowBg[state2]}`}
        >
          <span className="font-mono text-[8px] text-[#555] w-[11px] text-right flex-shrink-0">
            {game.seed2}
          </span>
          <span
            className={`text-[9px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 ${textCls[state2]}`}
          >
            {game.team2}
          </span>
          {isPick2 && state2 === 'correct' && (
            <span className="w-[3px] h-[3px] rounded-full bg-green-500 flex-shrink-0" />
          )}
          {isPick2 && state2 === 'pending' && (
            <span
              className="w-[3px] h-[3px] rounded-full flex-shrink-0"
              style={{ background: modelColor }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RegionBracket({
  region,
  gamesByRegion,
  modelColor,
  highlightedMatchId,
  onMatchClick,
  winnerMap,
  eliminatedTeams,
  bustedModelPicks,
  reverse,
}: {
  region: string;
  gamesByRegion: GamesByRegion;
  modelColor: string;
  highlightedMatchId: string | null;
  onMatchClick: (matchId: string, game: Game, roundLabel: string) => void;
  winnerMap: Record<string, string>;
  eliminatedTeams: Set<string>;
  bustedModelPicks: Set<string>;
  reverse?: boolean;
}) {
  const regionData = gamesByRegion[region] ?? {};

  return (
    <div>
      <div className="font-mono text-[8px] text-[#444] uppercase tracking-[1.5px] text-center mb-1.5">
        {region}
      </div>
      <div className={`flex items-start ${reverse ? 'flex-row-reverse' : ''}`}>
        {ROUND_KEYS.map((roundKey) => {
          const games = regionData[roundKey] ?? [];
          const layout = ROUND_LAYOUT[roundKey] ?? { offset: 0, gap: BASE_GAP };
          const label = ROUND_LABELS[roundKey] ?? roundKey;

          return (
            <div key={roundKey} className="flex flex-col">
              <div className="font-mono text-[8px] text-[#444] uppercase tracking-wider text-center mb-1">
                {label}
              </div>
              <div style={{ paddingTop: layout.offset }}>
                {games.map((game, idx) => (
                  <MatchupSlot
                    key={game.gameId}
                    game={game}
                    modelColor={modelColor}
                    isHighlighted={highlightedMatchId === game.gameId}
                    onClick={() => onMatchClick(game.gameId, game, label)}
                    winnerMap={winnerMap}
                    eliminatedTeams={eliminatedTeams}
                    bustedModelPicks={bustedModelPicks}
                    marginTop={idx > 0 ? layout.gap : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BracketGridPanel({
  gamesByRegion,
  modelColor,
  champion,
  highlightedMatchId,
  onMatchClick,
  winnerMap,
  eliminatedTeams,
  bustedModelPicks,
}: BracketGridPanelProps) {
  const ffGames = gamesByRegion['ff'] ?? {};
  const finalFour = ffGames['final_four'] ?? [];
  const championship = ffGames['championship'] ?? [];

  return (
    <div className="border border-[#2a2a2a] rounded-lg bg-[#1a1a1a] overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
      <div className="px-3.5 py-2.5 border-b border-[#2a2a2a] font-mono text-[10px] text-[#555] uppercase tracking-wider">
        Full Bracket
      </div>
      <div className="flex-1 overflow-auto p-3 bracket-panel-scroll">
        <div className="flex items-start min-w-[850px]">
          {/* Left side: South + West (L-to-R, funnel right) */}
          <div className="flex flex-col gap-5">
            <RegionBracket
              region="south"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
              eliminatedTeams={eliminatedTeams}
              bustedModelPicks={bustedModelPicks}
            />
            <RegionBracket
              region="west"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
              eliminatedTeams={eliminatedTeams}
              bustedModelPicks={bustedModelPicks}
            />
          </div>

          {/* Center: Final Four + Championship */}
          <div className="text-center px-2 min-w-[120px] self-center">
            <div className="font-mono text-[8px] text-[#444] uppercase tracking-[1.5px] mb-1.5">
              Final Four
            </div>
            {finalFour.map((game) => (
              <MatchupSlot
                key={game.gameId}
                game={game}
                modelColor={modelColor}
                isHighlighted={highlightedMatchId === game.gameId}
                onClick={() => onMatchClick(game.gameId, game, 'F4')}
                winnerMap={winnerMap}
                eliminatedTeams={eliminatedTeams}
                bustedModelPicks={bustedModelPicks}
                marginTop={6}
              />
            ))}
            {championship.map((game) => (
              <MatchupSlot
                key={game.gameId}
                game={game}
                modelColor={modelColor}
                isHighlighted={highlightedMatchId === game.gameId}
                onClick={() => onMatchClick(game.gameId, game, 'Final')}
                winnerMap={winnerMap}
                eliminatedTeams={eliminatedTeams}
                bustedModelPicks={bustedModelPicks}
                marginTop={8}
              />
            ))}
            {/* Champion */}
            <div className="border border-lab-border rounded-md p-2.5 text-center mt-2">
              <div className="font-mono text-[8px] text-[#555] uppercase tracking-[1.5px] mb-0.5">
                Champion
              </div>
              <div
                className="text-base"
                style={{ fontFamily: 'var(--font-serif)', color: modelColor }}
              >
                {champion ?? '\u2014'}
              </div>
            </div>
          </div>

          {/* Right side: East + Midwest (R-to-L, funnel left) */}
          <div className="flex flex-col gap-5">
            <RegionBracket
              region="east"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
              eliminatedTeams={eliminatedTeams}
              bustedModelPicks={bustedModelPicks}
              reverse
            />
            <RegionBracket
              region="midwest"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
              eliminatedTeams={eliminatedTeams}
              bustedModelPicks={bustedModelPicks}
              reverse
            />
          </div>
        </div>
      </div>
    </div>
  );
}
