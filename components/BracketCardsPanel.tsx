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
}

export default function BracketCardsPanel({
  gamesByRegion,
  modelColor,
  currentRegion,
  onRegionChange,
  highlightedMatchId,
  onMatchClick,
  winnerMap,
}: BracketCardsPanelProps) {
  const regionData = gamesByRegion[currentRegion] ?? {};

  return (
    <div className="border border-[#2a2a2a] rounded-lg bg-[#1a1a1a] overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
      {/* Region tabs */}
      <div className="px-3.5 py-2.5 border-b border-[#2a2a2a] flex items-center gap-2">
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => onRegionChange(r)}
            className="px-3 py-1 rounded-full border text-[11px] font-semibold transition-all"
            style={{
              borderColor: currentRegion === r ? 'transparent' : '#333',
              color: currentRegion === r ? '#141414' : '#888',
              background: currentRegion === r ? modelColor : 'transparent',
            }}
          >
            {REGION_LABELS[r]}
          </button>
        ))}
      </div>

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
                const isHighlighted = highlightedMatchId === matchId;

                return (
                  <div
                    key={matchId}
                    className={`mb-1.5 rounded-md border bg-lab-surface overflow-hidden cursor-pointer transition-all ${
                      isWrong ? 'matchup-card-wrong' : ''
                    } ${isHighlighted ? 'matchup-card-highlight' : ''}`}
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: isWrong ? '#ef4444' : modelColor,
                      borderColor: isHighlighted ? modelColor : undefined,
                      ['--mc' as string]: modelColor,
                    }}
                    onClick={() => onMatchClick(matchId, game, label)}
                  >
                    <div className="flex items-stretch">
                      <div className="flex-1">
                        {/* Team 1 */}
                        <div
                          className={`flex items-center px-3 py-2 gap-2 text-xs border-b border-[#252525] ${
                            isPick1 ? 'bg-white/[0.03]' : ''
                          }`}
                        >
                          <span className="font-mono text-[9px] text-lab-muted bg-[#252525] w-5 h-5 rounded-[3px] flex items-center justify-center flex-shrink-0">
                            {game.seed1}
                          </span>
                          <span
                            className={`flex-1 text-xs ${
                              isPick1
                                ? isWrong
                                  ? 'text-red-500 line-through font-semibold'
                                  : 'text-lab-white font-semibold'
                                : 'text-[#bbb]'
                            }`}
                          >
                            {game.team1}
                          </span>
                          {isPick1 && !isWrong && (
                            <span className="text-[10px]" style={{ color: isCorrect ? '#22c55e' : modelColor }}>
                              {isCorrect ? '\u2713' : '\u2713'}
                            </span>
                          )}
                        </div>
                        {/* Team 2 */}
                        <div
                          className={`flex items-center px-3 py-2 gap-2 text-xs ${
                            isPick2 ? 'bg-white/[0.03]' : ''
                          }`}
                        >
                          <span className="font-mono text-[9px] text-lab-muted bg-[#252525] w-5 h-5 rounded-[3px] flex items-center justify-center flex-shrink-0">
                            {game.seed2}
                          </span>
                          <span
                            className={`flex-1 text-xs ${
                              isPick2
                                ? isWrong
                                  ? 'text-red-500 line-through font-semibold'
                                  : 'text-lab-white font-semibold'
                                : 'text-[#bbb]'
                            }`}
                          >
                            {game.team2}
                          </span>
                          {isPick2 && !isWrong && (
                            <span className="text-[10px]" style={{ color: isCorrect ? '#22c55e' : modelColor }}>
                              {isCorrect ? '\u2713' : '\u2713'}
                            </span>
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
