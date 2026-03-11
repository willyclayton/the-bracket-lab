'use client';

import { Game, ResultGame } from '@/lib/types';
import { ROUND_POINTS } from '@/lib/models';

interface PopoverData {
  game: Game;
  roundLabel: string;
}

interface MatchupPopoverProps {
  data: PopoverData | null;
  modelColor: string;
  winnerMap: Record<string, string>;
  eliminatedTeams: Set<string>;
  result?: ResultGame | null;
  onClose: () => void;
}

export default function MatchupPopover({ data, modelColor, winnerMap, eliminatedTeams, result, onClose }: MatchupPopoverProps) {
  if (!data) return null;

  const { game, roundLabel } = data;
  const isPick1 = game.pick === game.team1;
  const isPick2 = game.pick === game.team2;

  const actualWinner = winnerMap[game.gameId];
  const isCorrect = actualWinner ? game.pick === actualWinner : undefined;
  const isWrong = actualWinner ? game.pick !== actualWinner : false;
  const isBusted = !actualWinner && game.pick && eliminatedTeams.has(game.pick);

  // Points for this round
  const roundKey = game.round as keyof typeof ROUND_POINTS;
  const pointsForRound = ROUND_POINTS[roundKey] ?? 0;

  // Score string
  const scoreStr = result && result.completed
    ? `${result.score1}\u2013${result.score2}`
    : null;

  // Verdict banner
  let bannerBg = '';
  let bannerText = '';
  if (isWrong && actualWinner) {
    bannerBg = 'bg-red-500/15 border-red-500/30';
    bannerText = `Wrong Pick \u2014 ${actualWinner} won${scoreStr ? ` ${scoreStr}` : ''}`;
  } else if (isCorrect) {
    bannerBg = 'bg-green-500/15 border-green-500/30';
    bannerText = `Correct Pick \u2014 +${pointsForRound} pts${scoreStr ? ` (${scoreStr})` : ''}`;
  } else if (isBusted) {
    bannerBg = 'bg-red-500/15 border-red-500/30';
    bannerText = 'Pick Already Eliminated';
  }

  // Confidence bar color
  const confidenceBarColor = isWrong || isBusted ? '#ef4444' : isCorrect ? '#22c55e' : modelColor;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="popover-animate bg-lab-surface border border-[#444] rounded-xl w-[380px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <span className="font-mono text-[11px] text-lab-muted uppercase tracking-wider">
            {roundLabel}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lab-muted hover:bg-lab-border hover:text-lab-white text-base"
          >
            &#x2715;
          </button>
        </div>

        {/* Verdict banner */}
        {bannerText && (
          <div className={`mx-5 mt-4 px-3.5 py-2.5 rounded-lg border font-mono text-[12px] font-semibold ${bannerBg}`}
            style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}
          >
            {bannerText}
          </div>
        )}

        {/* Teams */}
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          {/* Team 1 */}
          <div className={`flex items-center gap-3 py-2.5 border-b border-[#252525]`}>
            <span className="font-mono text-[11px] text-lab-muted bg-[#2a2a2a] w-[26px] h-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0">
              {game.seed1}
            </span>
            <span className={`flex-1 text-[15px] ${
              isPick1
                ? isWrong || isBusted
                  ? 'text-red-500 line-through font-bold'
                  : 'text-lab-white font-bold'
                : actualWinner === game.team1
                  ? 'text-green-500 font-bold'
                  : 'text-[#bbb] font-medium'
            }`}>
              {game.team1}
            </span>
            {isPick1 && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.08] font-medium"
                style={{ color: isWrong || isBusted ? '#ef4444' : modelColor }}
              >
                Pick
              </span>
            )}
            {result && result.completed && (
              <span className="font-mono text-[11px] text-lab-muted">
                {result.score1}
              </span>
            )}
          </div>
          {/* Team 2 */}
          <div className="flex items-center gap-3 py-2.5">
            <span className="font-mono text-[11px] text-lab-muted bg-[#2a2a2a] w-[26px] h-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0">
              {game.seed2}
            </span>
            <span className={`flex-1 text-[15px] ${
              isPick2
                ? isWrong || isBusted
                  ? 'text-red-500 line-through font-bold'
                  : 'text-lab-white font-bold'
                : actualWinner === game.team2
                  ? 'text-green-500 font-bold'
                  : 'text-[#bbb] font-medium'
            }`}>
              {game.team2}
            </span>
            {isPick2 && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.08] font-medium"
                style={{ color: isWrong || isBusted ? '#ef4444' : modelColor }}
              >
                Pick
              </span>
            )}
            {result && result.completed && (
              <span className="font-mono text-[11px] text-lab-muted">
                {result.score2}
              </span>
            )}
          </div>
        </div>

        {/* Reasoning */}
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <p className="font-mono text-[10px] text-[#666] uppercase tracking-wider mb-2">
            Model Reasoning
          </p>
          <p className="text-[13px] text-[#aaa] leading-relaxed">
            {game.reasoning}
          </p>
        </div>

        {/* Confidence */}
        <div className="px-5 py-3.5">
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-[10px] text-[#666] uppercase tracking-wider">
              Confidence
            </span>
            <span
              className="font-mono text-[13px] font-semibold"
              style={{ color: confidenceBarColor }}
            >
              {game.confidence}%
            </span>
          </div>
          <div className="h-[5px] bg-[#2a2a2a] rounded-[3px]">
            <div
              className="h-[5px] rounded-[3px]"
              style={{ width: `${game.confidence}%`, background: confidenceBarColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
