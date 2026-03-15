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
  modelName: string;
  modelId: string;
  winnerMap: Record<string, string>;
  eliminatedTeams: Set<string>;
  bustedModelPicks: Set<string>;
  result?: ResultGame | null;
  onClose: () => void;
  blurredRounds?: string[];
}

function getVerdictLine(reasoning: string): string {
  if (!reasoning) return '';
  const sentences = reasoning.split(/\.\s+/).filter((s) => s.length > 10);
  if (sentences.length === 0) return reasoning;
  // Skip generic openers like "Simulation: X wins Y%"
  const first = sentences[0];
  if (/^(simulation|monte carlo|model|analysis):/i.test(first) && sentences.length > 1) {
    return sentences[sentences.length - 1].replace(/\.$/, '') + '.';
  }
  return first.replace(/\.$/, '') + '.';
}

function parseEvidenceBullets(reasoning: string): string[] {
  if (!reasoning) return [];
  // Split on sentence boundaries or em dashes
  const fragments = reasoning.split(/\.\s+|\s+—\s+/).filter((s) => s.length >= 15);
  // Skip the first fragment (used as verdict) and cap at 3
  const bullets = fragments.slice(1, 4);
  return bullets.map((b) => b.replace(/\.$/, ''));
}

function getBoldLead(bullet: string): { bold: string; rest: string } {
  // Try to find a stat pattern
  const statMatch = bullet.match(/^(.{0,60}?\d+[\d.]*%?)/);
  if (statMatch && statMatch[1].length < bullet.length * 0.8) {
    const bold = statMatch[1];
    const rest = bullet.slice(bold.length);
    return { bold, rest };
  }
  // Fall back to first clause before comma or dash
  const clauseMatch = bullet.match(/^([^,—]+[,—])/);
  if (clauseMatch && clauseMatch[1].length < bullet.length * 0.8) {
    return { bold: clauseMatch[1], rest: bullet.slice(clauseMatch[1].length) };
  }
  // Default: bold first ~40 chars at a word boundary
  const cutoff = bullet.indexOf(' ', 30);
  if (cutoff > 0 && cutoff < bullet.length * 0.7) {
    return { bold: bullet.slice(0, cutoff), rest: bullet.slice(cutoff) };
  }
  return { bold: bullet, rest: '' };
}

export default function MatchupPopover({ data, modelColor, modelName, modelId, winnerMap, eliminatedTeams, bustedModelPicks, result, onClose, blurredRounds }: MatchupPopoverProps) {
  if (!data) return null;

  // Block popover for paywalled rounds
  if (blurredRounds?.includes(data.game.round)) {
    return null;
  }

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
          {[
            { team: game.team1, seed: game.seed1, isPick: isPick1, score: result?.completed ? result.score1 : null, isFirst: true },
            { team: game.team2, seed: game.seed2, isPick: isPick2, score: result?.completed ? result.score2 : null, isFirst: false },
          ].map(({ team, seed, isPick, score, isFirst }) => {
            const state = isPick
              ? isCorrect ? 'correct'
                : isWrong ? 'wrong'
                : isBusted ? 'busted-pick'
                : 'pending'
              : actualWinner === team ? 'winner'
              : bustedModelPicks.has(team) ? 'ghost'
              : 'normal';

            const textCls: Record<string, string> = {
              correct: 'text-lab-white font-bold',
              wrong: 'text-red-500 line-through font-bold',
              'busted-pick': 'text-red-500 line-through font-bold',
              pending: 'text-lab-white font-bold',
              winner: 'text-green-500 font-bold',
              ghost: 'text-[#444] font-medium',
              normal: 'text-[#bbb] font-medium',
            };
            const bgCls: Record<string, string> = {
              correct: 'bg-green-500/[0.08]',
              wrong: 'bg-red-500/[0.08]',
              'busted-pick': 'bg-red-500/[0.08]',
              ghost: 'bg-black/20',
              pending: '', winner: '', normal: '',
            };

            return (
              <div key={team} className={`flex items-center gap-3 py-2.5 rounded-md ${isFirst ? 'border-b border-[#252525] mb-0.5' : ''} ${bgCls[state]}`}>
                <span className="font-mono text-[11px] text-lab-muted bg-[#2a2a2a] w-[26px] h-[26px] rounded-[5px] flex items-center justify-center flex-shrink-0 ml-1">
                  {seed}
                </span>
                <span className={`flex-1 text-[15px] ${textCls[state]}`}>
                  {team}
                </span>
                {isPick && game.confidence != null && (
                  <span
                    className="font-mono text-[11px] px-2.5 py-1 rounded-md font-bold flex-shrink-0"
                    style={{
                      background: (state === 'wrong' || state === 'busted-pick' ? '#ef4444' : state === 'correct' ? '#22c55e' : modelColor) + '1f',
                      color: state === 'wrong' || state === 'busted-pick' ? '#ef4444' : state === 'correct' ? '#22c55e' : modelColor,
                    }}
                  >
                    {game.confidence}%
                  </span>
                )}
                {score !== null && (
                  <span className="font-mono text-[11px] text-lab-muted">
                    {score}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Verdict line */}
        {game.reasoning && (
          <div className="px-5 py-3.5 border-b border-[#2a2a2a]">
            <p className="text-[15px] font-semibold text-[#ddd] leading-[1.45]">
              {getVerdictLine(game.reasoning)}
            </p>
          </div>
        )}

        {/* The Case — evidence bullets */}
        {game.reasoning && (
          <div className="px-5 py-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 mb-3">
              <p className="font-mono text-[10px] text-[#666] uppercase tracking-wider">
                The Case
              </p>
              <span
                className="font-mono text-[9px] px-2 py-0.5 rounded-[10px] font-semibold"
                style={{ background: modelColor + '1f', color: modelColor }}
              >
                {modelName}
              </span>
            </div>
            <ul className="space-y-2">
              {parseEvidenceBullets(game.reasoning).map((bullet, i) => {
                const { bold, rest } = getBoldLead(bullet);
                return (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#999] leading-relaxed">
                    <span
                      className="w-1 h-1 rounded-full mt-[8px] flex-shrink-0"
                      style={{ background: modelColor }}
                    />
                    <span>
                      <span className="text-[#ccc] font-semibold">{bold}</span>
                      {rest}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
