'use client';

import { Game } from '@/lib/types';
import { ROUND_LABELS } from '@/lib/models';

const REGIONS = ['east', 'west', 'south', 'midwest', 'ff'] as const;
type Region = typeof REGIONS[number];

const REGION_LABELS: Record<string, string> = {
  east: 'East',
  west: 'West',
  south: 'South',
  midwest: 'Midwest',
  ff: 'FF',
};

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

interface GamesByRegion {
  [region: string]: {
    [round: string]: Game[];
  };
}

interface BracketCardsPanelProps {
  gamesByRegion: GamesByRegion;
  modelColor: string;
  currentRegion: Region;
  onRegionChange: (region: Region) => void;
  highlightedMatchId: string | null;
  onMatchClick: (matchId: string, game: Game, roundLabel: string) => void;
  winnerMap: Record<string, string>;
  eliminatedTeams: Set<string>;
  bustedModelPicks: Set<string>;
}

export default function BracketCardsPanel({
  gamesByRegion,
  modelColor,
  currentRegion,
  onRegionChange,
  highlightedMatchId,
  onMatchClick,
  winnerMap,
  eliminatedTeams,
  bustedModelPicks,
}: BracketCardsPanelProps) {
  const regionData = gamesByRegion[currentRegion] ?? {};

  return (
    <div className="border border-[#2a2a2a] rounded-lg bg-[#1a1a1a] overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
      {/* Scrollable cards */}
      <div className="flex-1 overflow-y-auto p-3 bracket-panel-scroll">
        {ROUND_ORDER.map((round) => {
          const games = regionData[round];
          if (!games || games.length === 0) return null;
          const label = ROUND_LABELS[round] ?? round;

          return (
            <div key={round}>
              {/* Round divider */}
              <div className="flex items-center gap-2 my-4 first:mt-0">
                <span className="flex-1 h-px bg-[#252525]" />
                <span className="font-mono text-[10px] text-[#555] uppercase tracking-wider">
                  {label}
                </span>
                <span className="flex-1 h-px bg-[#252525]" />
              </div>

              {/* Matchup cards */}
              {games.map((game) => {
                const matchId = game.gameId;
                const isPick1 = game.pick === game.team1;
                const isPick2 = game.pick === game.team2;
                const result = winnerMap[game.gameId];
                const isCorrect = result ? game.pick === result : undefined;
                const isWrong = result ? game.pick !== result : false;
                const isBusted = !result && game.pick && eliminatedTeams.has(game.pick);
                const isHighlighted = highlightedMatchId === matchId;

                // Team-level state helpers
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

                const teamTextClass: Record<string, string> = {
                  correct: 'text-lab-white font-semibold',
                  wrong: 'text-red-500 line-through font-semibold',
                  'busted-pick': 'text-red-500 line-through font-semibold',
                  pending: 'text-lab-white font-semibold',
                  ghost: 'text-[#444]',
                  normal: 'text-[#bbb]',
                };
                const teamRowBg: Record<string, string> = {
                  correct: 'bg-green-500/[0.08]',
                  wrong: 'bg-red-500/[0.08]',
                  'busted-pick': 'bg-red-500/[0.08]',
                  pending: 'bg-white/[0.03]',
                  ghost: 'bg-black/20',
                  normal: '',
                };

                return (
                  <div
                    key={matchId}
                    className={`mb-1.5 rounded-md border overflow-hidden cursor-pointer transition-all relative ${
                      isWrong ? 'matchup-card-wrong' : ''
                    } ${isHighlighted ? 'matchup-card-highlight' : ''}`}
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: isWrong || isBusted ? '#ef4444' : modelColor,
                      borderColor: isHighlighted ? modelColor : undefined,
                      ['--mc' as string]: modelColor,
                      background: isBusted ? 'rgba(239,68,68,0.05)' : '#1e1e1e',
                    }}
                    onClick={() => onMatchClick(matchId, game, label)}
                  >
                    {isBusted && (
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 font-mono text-[14px] font-black text-red-500/25 tracking-[3px] uppercase pointer-events-none z-10">
                        BUSTED
                      </span>
                    )}
                    <div className={`flex items-stretch ${isBusted ? 'opacity-[0.35]' : ''}`}>
                      <div className="flex-1">
                        {/* Team 1 */}
                        <div
                          className={`flex items-center px-3 py-2 gap-2 text-xs border-b border-[#252525] ${teamRowBg[state1]}`}
                        >
                          <span className="font-mono text-[9px] text-lab-muted bg-[#252525] w-5 h-5 rounded-[3px] flex items-center justify-center flex-shrink-0">
                            {game.seed1}
                          </span>
                          <span className={`flex-1 text-xs ${teamTextClass[state1]}`}>
                            {game.team1}
                          </span>
                          {isPick1 && state1 === 'correct' && (
                            <span className="w-[5px] h-[5px] rounded-full bg-green-500 flex-shrink-0" />
                          )}
                          {isPick1 && state1 === 'pending' && (
                            <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: modelColor }} />
                          )}
                        </div>
                        {/* Team 2 */}
                        <div
                          className={`flex items-center px-3 py-2 gap-2 text-xs ${teamRowBg[state2]}`}
                        >
                          <span className="font-mono text-[9px] text-lab-muted bg-[#252525] w-5 h-5 rounded-[3px] flex items-center justify-center flex-shrink-0">
                            {game.seed2}
                          </span>
                          <span className={`flex-1 text-xs ${teamTextClass[state2]}`}>
                            {game.team2}
                          </span>
                          {isPick2 && state2 === 'correct' && (
                            <span className="w-[5px] h-[5px] rounded-full bg-green-500 flex-shrink-0" />
                          )}
                          {isPick2 && state2 === 'pending' && (
                            <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: modelColor }} />
                          )}
                        </div>
                      </div>
                      {/* Confidence side */}
                      <div className="flex items-center justify-center w-10 border-l border-[#252525] flex-shrink-0">
                        <span className="font-mono text-[11px] font-medium" style={{ color: modelColor }}>
                          {game.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {Object.keys(regionData).length === 0 && (
          <p className="text-sm text-lab-muted text-center py-8">
            No picks yet for this region.
          </p>
        )}
      </div>
    </div>
  );
}

export { REGIONS, REGION_LABELS };
export type { Region, GamesByRegion };
