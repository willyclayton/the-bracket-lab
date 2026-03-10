'use client';

import { Game } from '@/lib/types';
import { ROUND_LABELS } from '@/lib/models';
import type { GamesByRegion } from './BracketCardsPanel';

const ROUND_KEYS = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8'] as const;
const ROUND_SPACING: Record<string, number> = {
  round_of_64: 2,
  round_of_32: 10,
  sweet_16: 26,
  elite_8: 54,
};

interface BracketGridPanelProps {
  gamesByRegion: GamesByRegion;
  modelColor: string;
  champion: string | null;
  highlightedMatchId: string | null;
  onMatchClick: (matchId: string, game: Game, roundLabel: string) => void;
  winnerMap: Record<string, string>;
}

function MatchupSlot({
  game,
  modelColor,
  isHighlighted,
  onClick,
  winnerMap,
  marginTop,
}: {
  game: Game;
  modelColor: string;
  isHighlighted: boolean;
  onClick: () => void;
  winnerMap: Record<string, string>;
  marginTop: number;
}) {
  const isPick1 = game.pick === game.team1;
  const isPick2 = game.pick === game.team2;
  const result = winnerMap[game.gameId];
  const isWrong = result ? game.pick !== result : false;

  return (
    <div
      className={`bg-lab-surface border border-[#252525] rounded-[3px] overflow-hidden cursor-pointer transition-all w-[110px] relative ${
        isWrong ? 'border-red-500/30' : ''
      } ${isHighlighted ? 'border-current shadow-[0_0_0_1px_currentColor]' : ''}`}
      style={{
        marginTop: `${marginTop}px`,
        marginLeft: '3px',
        marginRight: '3px',
        color: isHighlighted ? modelColor : undefined,
      }}
      onClick={onClick}
    >
      {/* Team 1 */}
      <div
        className={`flex items-center gap-[3px] px-[5px] py-[3px] text-[9px] border-b border-[#1a1a1a] ${
          isPick1 ? 'bg-white/[0.04]' : ''
        }`}
      >
        <span className="font-mono text-[8px] text-[#555] w-[11px] text-right flex-shrink-0">
          {game.seed1}
        </span>
        <span
          className={`text-[9px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 ${
            isPick1
              ? isWrong
                ? 'text-red-500 line-through font-semibold'
                : 'text-[#ddd] font-semibold'
              : 'text-[#777]'
          }`}
        >
          {game.team1}
        </span>
        {isPick1 && !isWrong && (
          <span
            className="w-[3px] h-[3px] rounded-full flex-shrink-0"
            style={{ background: modelColor }}
          />
        )}
      </div>
      {/* Team 2 */}
      <div
        className={`flex items-center gap-[3px] px-[5px] py-[3px] text-[9px] ${
          isPick2 ? 'bg-white/[0.04]' : ''
        }`}
      >
        <span className="font-mono text-[8px] text-[#555] w-[11px] text-right flex-shrink-0">
          {game.seed2}
        </span>
        <span
          className={`text-[9px] whitespace-nowrap overflow-hidden text-ellipsis flex-1 ${
            isPick2
              ? isWrong
                ? 'text-red-500 line-through font-semibold'
                : 'text-[#ddd] font-semibold'
              : 'text-[#777]'
          }`}
        >
          {game.team2}
        </span>
        {isPick2 && !isWrong && (
          <span
            className="w-[3px] h-[3px] rounded-full flex-shrink-0"
            style={{ background: modelColor }}
          />
        )}
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
  reverse,
}: {
  region: string;
  gamesByRegion: GamesByRegion;
  modelColor: string;
  highlightedMatchId: string | null;
  onMatchClick: (matchId: string, game: Game, roundLabel: string) => void;
  winnerMap: Record<string, string>;
  reverse?: boolean;
}) {
  const regionData = gamesByRegion[region] ?? {};
  const rounds = reverse ? [...ROUND_KEYS].reverse() : [...ROUND_KEYS];

  return (
    <div>
      <div className="font-mono text-[8px] text-[#444] uppercase tracking-[1.5px] text-center mb-1.5">
        {region}
      </div>
      <div className={`flex items-start ${reverse ? 'flex-row-reverse' : ''}`}>
        {rounds.map((roundKey) => {
          const games = regionData[roundKey] ?? [];
          const spacing = ROUND_SPACING[roundKey] ?? 2;
          const label = ROUND_LABELS[roundKey] ?? roundKey;

          return (
            <div key={roundKey} className="flex flex-col">
              <div className="font-mono text-[8px] text-[#444] uppercase tracking-wider text-center mb-1">
                {label}
              </div>
              {games.map((game, idx) => (
                <MatchupSlot
                  key={game.gameId}
                  game={game}
                  modelColor={modelColor}
                  isHighlighted={highlightedMatchId === game.gameId}
                  onClick={() => onMatchClick(game.gameId, game, label)}
                  winnerMap={winnerMap}
                  marginTop={idx > 0 ? spacing : 0}
                />
              ))}
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
          {/* Left side: East + West (L-to-R) */}
          <div className="flex flex-col gap-5">
            <RegionBracket
              region="east"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
            />
            <RegionBracket
              region="west"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
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

          {/* Right side: South + Midwest (R-to-L) */}
          <div className="flex flex-col gap-5">
            <RegionBracket
              region="south"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
              reverse
            />
            <RegionBracket
              region="midwest"
              gamesByRegion={gamesByRegion}
              modelColor={modelColor}
              highlightedMatchId={highlightedMatchId}
              onMatchClick={onMatchClick}
              winnerMap={winnerMap}
              reverse
            />
          </div>
        </div>
      </div>
    </div>
  );
}
