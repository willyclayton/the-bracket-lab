'use client';

import { Game } from '@/lib/types';

interface PopoverData {
  game: Game;
  roundLabel: string;
}

interface MatchupPopoverProps {
  data: PopoverData | null;
  modelColor: string;
  onClose: () => void;
}

export default function MatchupPopover({ data, modelColor, onClose }: MatchupPopoverProps) {
  if (!data) return null;

  const { game, roundLabel } = data;
  const isPick1 = game.pick === game.team1;
  const isPick2 = game.pick === game.team2;

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

        {/* Teams */}
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          {/* Team 1 */}
          <div className={`flex items-center gap-3 py-2.5 border-b border-[#252525] ${isPick1 ? '' : ''}`}>
            <span className="font-mono text-[11px] text-lab-muted bg-[#2a2a2a] w-[26px] h-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0">
              {game.seed1}
            </span>
            <span className={`flex-1 text-[15px] ${isPick1 ? 'text-lab-white font-bold' : 'text-[#bbb] font-medium'}`}>
              {game.team1}
            </span>
            {isPick1 && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.08] font-medium"
                style={{ color: modelColor }}
              >
                Pick
              </span>
            )}
          </div>
          {/* Team 2 */}
          <div className="flex items-center gap-3 py-2.5">
            <span className="font-mono text-[11px] text-lab-muted bg-[#2a2a2a] w-[26px] h-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0">
              {game.seed2}
            </span>
            <span className={`flex-1 text-[15px] ${isPick2 ? 'text-lab-white font-bold' : 'text-[#bbb] font-medium'}`}>
              {game.team2}
            </span>
            {isPick2 && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.08] font-medium"
                style={{ color: modelColor }}
              >
                Pick
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
              style={{ color: modelColor }}
            >
              {game.confidence}%
            </span>
          </div>
          <div className="h-[5px] bg-[#2a2a2a] rounded-[3px]">
            <div
              className="h-[5px] rounded-[3px]"
              style={{ width: `${game.confidence}%`, background: modelColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
