'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BracketData } from '@/lib/types';
import {
  buildAgreementMap,
  getLockPicks,
  getSmartUpsets,
  getTrapGames,
  getFinalFourConsensus,
  getSleeperPick,
  GameAgreement,
} from '@/lib/consensus';

// ── 2026 model data ─────────────────────────────────────────────────────
import scoutData from '@/data/models/the-scout.json';
import quantData from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData from '@/data/models/the-chaos-agent.json';
import agentData from '@/data/models/the-agent.json';
import superAgentData from '@/data/models/the-super-agent.json';
import optimizerData from '@/data/models/the-optimizer.json';
import scoutPrimeData from '@/data/models/the-scout-prime.json';
import autoResearcherData from '@/data/models/the-auto-researcher.json';

// ── 2025 archive data ───────────────────────────────────────────────────
import scoutData2025 from '@/data/archive/2025/models/the-scout.json';
import quantData2025 from '@/data/archive/2025/models/the-quant.json';
import historianData2025 from '@/data/archive/2025/models/the-historian.json';
import chaosData2025 from '@/data/archive/2025/models/the-chaos-agent.json';
import agentData2025 from '@/data/archive/2025/models/the-agent.json';
import superAgentData2025 from '@/data/archive/2025/models/the-super-agent.json';
import optimizerData2025 from '@/data/archive/2025/models/the-optimizer.json';
import scoutPrimeData2025 from '@/data/archive/2025/models/the-scout-prime.json';
import autoResearcherData2025 from '@/data/archive/2025/models/the-auto-researcher.json';

// Seed history for upset rates
import seedHistory from '@/data/research/seed-history.json';

type Year = '2026' | '2025';

const BRACKETS_BY_YEAR: Record<Year, Record<string, BracketData>> = {
  '2026': {
    'the-scout': scoutData as unknown as BracketData,
    'the-quant': quantData as unknown as BracketData,
    'the-historian': historianData as unknown as BracketData,
    'the-chaos-agent': chaosData as unknown as BracketData,
    'the-agent': agentData as unknown as BracketData,
    'the-super-agent': superAgentData as unknown as BracketData,
    'the-optimizer': optimizerData as unknown as BracketData,
    'the-scout-prime': scoutPrimeData as unknown as BracketData,
    'the-auto-researcher': autoResearcherData as unknown as BracketData,
  },
  '2025': {
    'the-scout': scoutData2025 as unknown as BracketData,
    'the-quant': quantData2025 as unknown as BracketData,
    'the-historian': historianData2025 as unknown as BracketData,
    'the-chaos-agent': chaosData2025 as unknown as BracketData,
    'the-agent': agentData2025 as unknown as BracketData,
    'the-super-agent': superAgentData2025 as unknown as BracketData,
    'the-optimizer': optimizerData2025 as unknown as BracketData,
    'the-scout-prime': scoutPrimeData2025 as unknown as BracketData,
    'the-auto-researcher': autoResearcherData2025 as unknown as BracketData,
  },
};

const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_CHEATSHEET_LINK_URL || '#';

function getUpsetRate(higherSeed: number, lowerSeed: number): number | null {
  const matchups = (seedHistory as Record<string, unknown>).round_of_64_matchups as Array<{
    higher_seed: number;
    lower_seed: number;
    upset_rate: number;
  }>;
  if (!matchups) return null;
  const m = matchups.find(
    (x) => x.higher_seed === Math.min(higherSeed, lowerSeed) && x.lower_seed === Math.max(higherSeed, lowerSeed)
  );
  return m ? m.upset_rate : null;
}

function truncateReasoning(text: string, maxLen = 80): string {
  if (!text) return '';
  // Take the first sentence or clause
  const firstSentence = text.split(/\.\s+/)[0] || text;
  if (firstSentence.length <= maxLen) return firstSentence.replace(/\.$/, '');
  // Cut at word boundary
  const cut = firstSentence.lastIndexOf(' ', maxLen);
  return firstSentence.slice(0, cut > 20 ? cut : maxLen) + '\u2026';
}

// ── Shared Components ───────────────────────────────────────────────────

function AgreementBar({ count, total, color }: { count: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: i < count ? color : '#333' }}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-lab-muted">{count}/{total}</span>
    </div>
  );
}

function ModelDots({ models }: { models: { modelName: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {models.map((m, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#333]"
          style={{ color: m.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: m.color }} />
          {m.modelName}
        </span>
      ))}
    </div>
  );
}

// ── Inline Expand Detail ────────────────────────────────────────────────

function GameDetail({ game }: { game: GameAgreement }) {
  const forPicks = game.modelPicks.filter((p) => p.pick === game.consensusPick).sort((a, b) => b.confidence - a.confidence);
  const againstPicks = game.modelPicks.filter((p) => p.pick !== game.consensusPick).sort((a, b) => b.confidence - a.confidence);
  const forPct = Math.round((forPicks.length / game.totalModels) * 100);
  const upsetRate = game.round === 'round_of_64' ? getUpsetRate(
    Math.min(game.seed1, game.seed2),
    Math.max(game.seed1, game.seed2)
  ) : null;

  return (
    <div className="px-4 pb-4 pt-1">
      {/* Consensus bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#1a1a1a] rounded-lg mb-4">
        <span className="font-mono text-xs text-[#22c55e] whitespace-nowrap">{game.consensusPick}</span>
        <div className="flex-1 h-2 bg-[#2a2a2a] rounded-full overflow-hidden flex">
          <div className="h-full bg-[#22c55e] rounded-l-full" style={{ width: `${forPct}%` }} />
          <div className="h-full bg-[#ef4444] rounded-r-full" style={{ width: `${100 - forPct}%` }} />
        </div>
        <span className="font-mono text-xs text-[#ef4444] whitespace-nowrap">{game.otherTeam}</span>
      </div>

      {/* Model table */}
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            <th className="font-mono text-[9px] text-[#555] uppercase tracking-wider text-left py-1.5 pr-2">Model</th>
            <th className="font-mono text-[9px] text-[#555] uppercase tracking-wider text-left py-1.5 pr-2">Pick</th>
            <th className="font-mono text-[9px] text-[#555] uppercase tracking-wider text-left py-1.5 pr-2 hidden sm:table-cell">Key Reasoning</th>
            <th className="font-mono text-[9px] text-[#555] uppercase tracking-wider text-right py-1.5">Conf</th>
          </tr>
        </thead>
        <tbody>
          {[...forPicks, ...againstPicks].map((p) => {
            const isFor = p.pick === game.consensusPick;
            return (
              <tr key={p.modelId} className="border-b border-[#1a1a1a]">
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-xs font-semibold" style={{ color: p.color }}>{p.modelName}</span>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: isFor ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: isFor ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {p.pick}
                  </span>
                </td>
                <td className="py-2 pr-2 hidden sm:table-cell">
                  <span className="text-[11px] text-[#999] leading-snug">{truncateReasoning(p.reasoning)}</span>
                </td>
                <td className="py-2 text-right">
                  <span className="font-mono text-[11px] text-[#666]">{p.confidence}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: reasoning list (hidden on sm+) */}
      <div className="sm:hidden space-y-2 mb-4">
        {[...forPicks, ...againstPicks].map((p) => (
          <div key={p.modelId + '-mobile'} className="text-[11px] text-[#999] leading-snug">
            <span className="font-semibold" style={{ color: p.color }}>{p.modelName}:</span>{' '}
            {truncateReasoning(p.reasoning, 120)}
          </div>
        ))}
      </div>

      {/* Stat boxes */}
      <div className="flex gap-2">
        <div className="flex-1 bg-[#1a1a1a] rounded-md px-3 py-2.5 text-center">
          <div className="font-mono text-base font-bold text-lab-white">{game.agreementCount}/{game.totalModels}</div>
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mt-0.5">Agreement</div>
        </div>
        <div className="flex-1 bg-[#1a1a1a] rounded-md px-3 py-2.5 text-center">
          <div className="font-mono text-base font-bold text-lab-white">{game.avgConfidence}%</div>
          <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mt-0.5">Avg Conf</div>
        </div>
        {upsetRate != null && (
          <div className="flex-1 bg-[#1a1a1a] rounded-md px-3 py-2.5 text-center">
            <div className="font-mono text-base font-bold text-lab-white">{(upsetRate * 100).toFixed(1)}%</div>
            <div className="font-mono text-[9px] text-[#555] uppercase tracking-wider mt-0.5">Hist. Upset</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Components ─────────────────────────────────────────────────────

function LockPickCard({ game, blurred, expanded, onToggle }: {
  game: GameAgreement; blurred: boolean; expanded: boolean; onToggle: () => void;
}) {
  const topReasoning = game.modelPicks
    .filter((p) => p.pick === game.consensusPick)
    .sort((a, b) => b.confidence - a.confidence)[0];

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'} ${blurred ? 'blur-sm select-none' : ''}`}>
      <div
        className={`p-4 cursor-pointer transition-colors ${!blurred ? 'hover:bg-[#222]' : ''}`}
        onClick={!blurred ? onToggle : undefined}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm">&#10003;</span>
            <span className="font-semibold text-lab-white text-sm">
              ({game.consensusSeed}) {game.consensusPick}
            </span>
            <span className="text-lab-muted text-xs">over</span>
            <span className="text-lab-muted text-sm">
              ({game.otherSeed}) {game.otherTeam}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AgreementBar count={game.agreementCount} total={game.totalModels} color="#22c55e" />
            {!blurred && (
              <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-lab-muted mb-2">
          <span>{game.region}</span>
          <span>{game.round.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          <span>Avg confidence: {game.avgConfidence}%</span>
        </div>
        {!expanded && topReasoning && (
          <p className="text-xs text-[#aaa] leading-relaxed line-clamp-2">
            &ldquo;{topReasoning.reasoning}&rdquo;
            <span className="text-[#666] ml-1">&mdash; {topReasoning.modelName}</span>
          </p>
        )}
      </div>
      {expanded && !blurred && <GameDetail game={game} />}
    </div>
  );
}

function UpsetCard({ game, blurred, expanded, onToggle }: {
  game: GameAgreement; blurred: boolean; expanded: boolean; onToggle: () => void;
}) {
  const upsetRate = getUpsetRate(game.otherSeed, game.consensusSeed);
  const topReasoning = game.modelPicks
    .filter((p) => p.pick === game.consensusPick)
    .sort((a, b) => b.confidence - a.confidence)[0];

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'} ${blurred ? 'blur-sm select-none' : ''}`}>
      <div
        className={`p-4 cursor-pointer transition-colors ${!blurred ? 'hover:bg-[#222]' : ''}`}
        onClick={!blurred ? onToggle : undefined}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">&#9889;</span>
            <span className="font-semibold text-lab-white text-sm">
              ({game.consensusSeed}) {game.consensusPick}
            </span>
            <span className="text-lab-muted text-xs">upset over</span>
            <span className="text-lab-muted text-sm">
              ({game.otherSeed}) {game.otherTeam}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AgreementBar count={game.agreementCount} total={game.totalModels} color="#f59e0b" />
            {!blurred && (
              <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-lab-muted mb-2">
          <span>{game.region}</span>
          {upsetRate != null && (
            <span>Historical upset rate: {(upsetRate * 100).toFixed(1)}%</span>
          )}
          <span>Avg confidence: {game.avgConfidence}%</span>
        </div>
        {!expanded && topReasoning && (
          <p className="text-xs text-[#aaa] leading-relaxed line-clamp-2">
            &ldquo;{topReasoning.reasoning}&rdquo;
            <span className="text-[#666] ml-1">&mdash; {topReasoning.modelName}</span>
          </p>
        )}
      </div>
      {expanded && !blurred && <GameDetail game={game} />}
    </div>
  );
}

function TrapGameCard({ game, blurred, expanded, onToggle }: {
  game: GameAgreement; blurred: boolean; expanded: boolean; onToggle: () => void;
}) {
  const dissenters = game.modelPicks.filter((p) => p.pick !== game.consensusPick);
  const topDissenter = [...dissenters].sort((a, b) => b.confidence - a.confidence)[0];

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'} ${blurred ? 'blur-sm select-none' : ''}`}>
      <div
        className={`p-4 cursor-pointer transition-colors ${!blurred ? 'hover:bg-[#222]' : ''}`}
        onClick={!blurred ? onToggle : undefined}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm">&#9888;</span>
            <span className="font-semibold text-lab-white text-sm">
              ({game.consensusSeed}) {game.consensusPick}
            </span>
            <span className="text-lab-muted text-xs">vs</span>
            <span className="text-lab-muted text-sm">
              ({game.otherSeed}) {game.otherTeam}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AgreementBar count={game.agreementCount} total={game.totalModels} color="#ef4444" />
            {!blurred && (
              <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-lab-muted mb-2">
          <span>{game.region}</span>
          <span>{dissenters.length} model{dissenters.length !== 1 ? 's' : ''} picking the upset</span>
        </div>
        {!expanded && topDissenter && (
          <div>
            <p className="text-xs text-[#aaa] leading-relaxed line-clamp-2">
              Why {topDissenter.pick} wins: &ldquo;{topDissenter.reasoning}&rdquo;
              <span className="text-[#666] ml-1">&mdash; {topDissenter.modelName}</span>
            </p>
            <ModelDots models={dissenters.map((d) => ({ modelName: d.modelName, color: d.color }))} />
          </div>
        )}
      </div>
      {expanded && !blurred && <GameDetail game={game} />}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function CheatSheetClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const yearParam = searchParams.get('year');
  const activeYear: Year = yearParam === '2025' ? '2025' : '2026';
  const isPreview = activeYear === '2025';

  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    setUnlocked(document.cookie.split(';').some((c) => c.trim().startsWith('cs_unlocked=')));
  }, []);

  const showContent = unlocked || isPreview;

  const brackets = BRACKETS_BY_YEAR[activeYear];
  const modelCount = Object.keys(brackets).length;

  const agreementMap = useMemo(() => buildAgreementMap(brackets), [brackets]);
  const lockPicks = useMemo(() => getLockPicks(agreementMap), [agreementMap]);
  const smartUpsets = useMemo(() => getSmartUpsets(agreementMap), [agreementMap]);
  const trapGames = useMemo(() => getTrapGames(agreementMap), [agreementMap]);
  const { finalFour, champions } = useMemo(() => getFinalFourConsensus(brackets), [brackets]);
  const sleeper = useMemo(() => getSleeperPick(brackets), [brackets]);

  const FREE_LOCK_PICKS = 2;

  type Filter = 'all' | 'locks' | 'upsets' | 'traps' | 'final-four' | 'sleeper';
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  const FILTERS: { id: Filter; label: string; icon: string; color: string; count: number }[] = [
    { id: 'all',        label: 'All',         icon: '',     color: '#888',    count: lockPicks.length + smartUpsets.length + trapGames.length + (sleeper ? 1 : 0) + (champions.length > 0 ? 1 : 0) },
    { id: 'locks',      label: 'Locks',       icon: '\u2713', color: '#22c55e', count: lockPicks.length },
    { id: 'upsets',     label: 'Upsets',       icon: '\u26A1', color: '#f59e0b', count: smartUpsets.length },
    { id: 'traps',      label: 'Traps',       icon: '\u26A0', color: '#ef4444', count: trapGames.length },
    { id: 'final-four', label: 'Final Four',  icon: '\uD83C\uDFC6', color: '#3b82f6', count: champions.length },
    { id: 'sleeper',    label: 'Sleeper',     icon: '\uD83D\uDD2D', color: '#a855f7', count: sleeper ? 1 : 0 },
  ];

  const show = (section: Filter) => activeFilter === 'all' || activeFilter === section;

  function toggleGame(gameId: string) {
    setExpandedGameId((prev) => (prev === gameId ? null : gameId));
  }

  function selectYear(year: Year) {
    setExpandedGameId(null);
    const params = new URLSearchParams();
    if (year === '2025') params.set('year', '2025');
    router.push(`/cheat-sheet${params.toString() ? '?' + params : ''}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-[#22c55e] uppercase tracking-widest mb-2">
              AI Consensus Report
            </p>
            <h1
              className="text-[32px] sm:text-[40px] text-lab-white mb-3 leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              The Cheat Sheet
            </h1>
          </div>
          <div className="flex gap-1 flex-shrink-0 mt-2">
            {(['2026', '2025'] as Year[]).map((year) => (
              <button
                key={year}
                onClick={() => selectYear(year)}
                className="font-mono text-xs px-3 py-1.5 rounded-lg border transition-all duration-150"
                style={{
                  borderColor: activeYear === year ? '#888' : '#333',
                  color: activeYear === year ? '#efefef' : '#666',
                  background: activeYear === year ? '#1e1e1e' : 'transparent',
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <p className="text-lab-muted text-sm sm:text-base max-w-xl">
          {modelCount} AI models. 63 games each. {modelCount * 63} predictions distilled into the
          picks that actually matter for your bracket pool.
        </p>
      </div>

      {isPreview && (
        <div className="mb-6 border border-amber-500/30 rounded-lg px-5 py-4 bg-amber-500/5">
          <p className="text-sm text-amber-300 font-semibold mb-1">2025 Preview</p>
          <p className="text-xs text-lab-muted">
            This is last year&apos;s cheat sheet with real 2025 tournament data &mdash; fully unlocked
            so you can see exactly what you get.{' '}
            <button
              onClick={() => selectYear('2026')}
              className="text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors"
            >
              Switch to 2026 &rarr;
            </button>
          </p>
        </div>
      )}

      {/* Model count + filter pills */}
      <div className="mb-8 pb-6 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[11px] text-[#555] uppercase tracking-wider">Models analyzed:</span>
          <span className="font-mono text-sm text-lab-white">{modelCount}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFilter(f.id); setExpandedGameId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all duration-150"
                style={{
                  borderColor: isActive ? f.color : '#333',
                  color: isActive ? f.color : '#666',
                  background: isActive ? `${f.color}15` : 'transparent',
                }}
              >
                {f.icon && <span>{f.icon}</span>}
                {f.label}
                <span className="font-mono text-[10px] opacity-60">{f.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Lock Picks */}
      {show('locks') && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-400">&#10003;</span>
            <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
              Lock Picks
            </h2>
            <span className="font-mono text-xs text-[#555] ml-auto">{lockPicks.length} games</span>
          </div>
          <p className="text-sm text-lab-muted mb-4">
            Games where 7+ of {modelCount} models agree. Put these in ink.
          </p>
          <div className="space-y-3">
            {lockPicks.map((game, i) => (
              <LockPickCard
                key={game.gameId}
                game={game}
                blurred={!showContent && i >= FREE_LOCK_PICKS}
                expanded={expandedGameId === game.gameId}
                onToggle={() => toggleGame(game.gameId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* CTA if locked (2026 only) */}
      {!showContent && (
        <div className="relative mb-10">
          <div className="border border-[#333] rounded-xl px-8 py-8 text-center bg-[#1a1a1a]">
            <div className="text-3xl mb-3">&#128274;</div>
            <h3
              className="text-lg text-lab-white mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Unlock the full Cheat Sheet
            </h3>
            <p className="text-sm text-lab-muted mb-2 max-w-md mx-auto">
              You&apos;re seeing {FREE_LOCK_PICKS} of {lockPicks.length} lock picks.
              Get all {lockPicks.length + smartUpsets.length + trapGames.length + (sleeper ? 1 : 0)} insights
              including smart upsets, trap games, Final Four analysis, and the sleeper pick.
            </p>
            <p className="text-xs text-lab-muted mb-5 max-w-md mx-auto">
              <button
                onClick={() => selectYear('2025')}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Preview the 2025 cheat sheet free
              </button>{' '}
              to see exactly what you get.
            </p>
            <a
              href={STRIPE_LINK}
              className="inline-block font-mono text-sm font-semibold px-6 py-3 rounded-lg transition-all hover:brightness-110"
              style={{ background: '#22c55e', color: '#141414' }}
            >
              Unlock Cheat Sheet &mdash; $2.99
            </a>
            <p className="text-[11px] text-[#555] mt-3">
              Powered by Stripe. One-time payment, no subscription.
            </p>
          </div>
        </div>
      )}

      {/* Section 2: Smart Upsets */}
      {show('upsets') && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-400">&#9889;</span>
            <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
              Smart Upsets
            </h2>
            <span className="font-mono text-xs text-[#555] ml-auto">{smartUpsets.length} games</span>
          </div>
          <p className="text-sm text-lab-muted mb-4">
            Lower seeds that 4+ models agree on. The upsets worth taking.
          </p>
          <div className="space-y-3">
            {smartUpsets.map((game) => (
              <UpsetCard
                key={game.gameId}
                game={game}
                blurred={!showContent}
                expanded={expandedGameId === game.gameId}
                onToggle={() => toggleGame(game.gameId)}
              />
            ))}
            {smartUpsets.length === 0 && (
              <p className={`text-sm text-[#555] italic ${!showContent ? 'blur-sm' : ''}`}>
                No smart upsets found with current model data.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Section 3: Trap Games */}
      {show('traps') && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-red-400">&#9888;</span>
            <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
              Trap Games
            </h2>
            <span className="font-mono text-xs text-[#555] ml-auto">{trapGames.length} games</span>
          </div>
          <p className="text-sm text-lab-muted mb-4">
            Everyone in your pool will pick these favorites &mdash; here&apos;s why you shouldn&apos;t.
            Games where the favorite wins the consensus but nearly half the models disagree.
          </p>
          <div className="space-y-3">
            {trapGames.map((game) => (
              <TrapGameCard
                key={game.gameId}
                game={game}
                blurred={!showContent}
                expanded={expandedGameId === game.gameId}
                onToggle={() => toggleGame(game.gameId)}
              />
            ))}
            {trapGames.length === 0 && (
              <p className={`text-sm text-[#555] italic ${!showContent ? 'blur-sm' : ''}`}>
                No trap games found with current model data.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Section 4: Final Four & Champion */}
      {show('final-four') && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lab-white">&#127942;</span>
            <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
              Final Four &amp; Champion
            </h2>
          </div>

          <div className={`border border-[#2a2a2a] rounded-lg p-5 mb-4 ${!showContent ? 'blur-sm select-none' : ''}`}>
            <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Champion Picks</p>
            <div className="space-y-3">
              {champions.map((c) => (
                <div key={c.team} className="flex items-center justify-between">
                  <div>
                    <span className="text-lab-white font-semibold">{c.team}</span>
                    <span className="text-lab-muted text-xs ml-2">
                      {c.count} model{c.count !== 1 ? 's' : ''} &middot; avg conf {c.avgConfidence}%
                    </span>
                    <ModelDots models={c.models} />
                  </div>
                  <span className="font-mono text-lg font-bold" style={{ color: c.count >= 3 ? '#22c55e' : '#888' }}>
                    {c.count}/{modelCount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`border border-[#2a2a2a] rounded-lg p-5 ${!showContent ? 'blur-sm select-none' : ''}`}>
            <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Final Four Appearances</p>
            <div className="grid grid-cols-2 gap-3">
              {finalFour.slice(0, 8).map((f) => (
                <div key={f.team} className="flex items-center justify-between py-1">
                  <span className="text-lab-white text-sm">{f.team}</span>
                  <div className="flex items-center gap-1.5">
                    <AgreementBar count={f.count} total={modelCount} color="#3b82f6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 5: Sleeper Pick */}
      {show('sleeper') && sleeper && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-purple-400">&#128301;</span>
            <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
              Sleeper Pick
            </h2>
          </div>
          <p className="text-sm text-lab-muted mb-4">
            The deepest run that only 1-2 models see. Your differentiator pick.
          </p>
          <div className={`border border-purple-500/30 rounded-lg p-5 bg-purple-500/5 ${!showContent ? 'blur-sm select-none' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lab-white font-semibold text-lg">{sleeper.team}</span>
              <span className="font-mono text-xs text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                {sleeper.deepestRoundLabel}
              </span>
            </div>
            <p className="text-sm text-lab-muted mb-3">
              Picked by {sleeper.modelPicks.length} model{sleeper.modelPicks.length !== 1 ? 's' : ''} &middot;
              Avg confidence: {sleeper.avgConfidence}%
            </p>
            <ModelDots models={sleeper.modelPicks.map((p) => ({ modelName: p.modelName, color: p.color }))} />
            {sleeper.modelPicks[0] && (
              <p className="text-xs text-[#aaa] leading-relaxed mt-3 line-clamp-3">
                &ldquo;{sleeper.modelPicks[0].reasoning}&rdquo;
                <span className="text-[#666] ml-1">&mdash; {sleeper.modelPicks[0].modelName}</span>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Bottom CTA for 2025 preview viewers */}
      {isPreview && (
        <div className="mb-10 border border-green-500/30 rounded-xl px-8 py-7 text-center bg-green-500/5">
          <h3
            className="text-lg text-lab-white mb-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Ready for the 2026 Cheat Sheet?
          </h3>
          <p className="text-sm text-lab-muted mb-5 max-w-md mx-auto">
            Same format, fresh data. All {modelCount} models re-run on the 2026 bracket.
          </p>
          <a
            href={STRIPE_LINK}
            className="inline-block font-mono text-sm font-semibold px-6 py-3 rounded-lg transition-all hover:brightness-110"
            style={{ background: '#22c55e', color: '#141414' }}
          >
            Unlock 2026 Cheat Sheet &mdash; $2.99
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#2a2a2a] pt-6 mt-10">
        <p className="text-[11px] text-[#555] text-center">
          Generated from {modelCount} independent AI models.
          Each model uses a different methodology &mdash; from Monte Carlo simulation to LLM analysis.
          <br />
          <a href="/models" className="text-lab-muted hover:text-lab-white transition-colors">
            Learn how each model works &rarr;
          </a>
        </p>
      </div>
    </div>
  );
}
