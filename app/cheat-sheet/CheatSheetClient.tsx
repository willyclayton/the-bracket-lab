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
  getR64ByRegion,
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
  const firstSentence = text.split(/\.\s+/)[0] || text;
  if (firstSentence.length <= maxLen) return firstSentence.replace(/\.$/, '');
  const cut = firstSentence.lastIndexOf(' ', maxLen);
  return firstSentence.slice(0, cut > 20 ? cut : maxLen) + '\u2026';
}

// ── Shared Components ───────────────────────────────────────────────────

function AgreementPill({ count, total, color }: { count: number; total: number; color: string }) {
  return (
    <span
      className="inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${color}18`, color }}
    >
      {count}/{total}
    </span>
  );
}

// ── Game Detail (expanded view) ─────────────────────────────────────────

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

// ── Pick Row (used for all pick types) ──────────────────────────────────

function PickRow({ game, icon, iconColor, pillColor, expanded, onToggle }: {
  game: GameAgreement;
  icon: string;
  iconColor: string;
  pillColor: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#222] transition-colors min-h-[44px]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: iconColor }} className="text-sm flex-shrink-0">{icon}</span>
          <span className="font-semibold text-lab-white text-sm">
            ({game.consensusSeed}) {game.consensusPick}
          </span>
          <span className="text-lab-muted text-xs hidden sm:inline">over</span>
          <span className="text-lab-muted text-sm hidden sm:inline">
            ({game.otherSeed}) {game.otherTeam}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <AgreementPill count={game.agreementCount} total={game.totalModels} color={pillColor} />
          <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
        </div>
      </div>
      {/* Mobile: show opponent below */}
      <div className="sm:hidden px-4 -mt-2 pb-3">
        <span className="text-lab-muted text-xs">
          over ({game.otherSeed}) {game.otherTeam}
        </span>
      </div>
      {expanded && <GameDetail game={game} />}
    </div>
  );
}

// ── R64 Game Row (compact) ──────────────────────────────────────────────

function R64Row({ game, expanded, onToggle }: {
  game: GameAgreement;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isUpset = game.consensusSeed > game.otherSeed;
  const pillColor = isUpset ? '#f59e0b' : '#22c55e';

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#222] transition-colors min-h-[44px]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0 text-sm">
          <span className="font-mono text-[#555] text-xs w-4 text-right flex-shrink-0">{Math.min(game.seed1, game.seed2)}</span>
          <span className={game.consensusSeed === Math.min(game.seed1, game.seed2) ? 'text-lab-white font-semibold' : 'text-lab-muted'}>
            {game.seed1 < game.seed2 ? game.team1 : game.team2}
          </span>
          <span className="text-[#444] text-xs">vs</span>
          <span className="font-mono text-[#555] text-xs w-4 text-right flex-shrink-0">{Math.max(game.seed1, game.seed2)}</span>
          <span className={game.consensusSeed === Math.max(game.seed1, game.seed2) ? 'text-lab-white font-semibold' : 'text-lab-muted'}>
            {game.seed1 > game.seed2 ? game.team1 : game.team2}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <AgreementPill count={game.agreementCount} total={game.totalModels} color={pillColor} />
          <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
        </div>
      </div>
      {expanded && <GameDetail game={game} />}
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
  const r64ByRegion = useMemo(() => getR64ByRegion(agreementMap), [agreementMap]);

  const totalPredictions = modelCount * 63;
  const totalConsensus = lockPicks.length + smartUpsets.length + trapGames.length + (sleeper ? 1 : 0);

  const FREE_LOCK_PICKS = 2;
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

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
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-12">

      {/* ─── 1. Hero ─────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-start justify-between mb-4">
          <div className="max-w-lg">
            <h1
              className="text-[28px] sm:text-[40px] text-lab-white leading-tight mb-3"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Your bracket pool has a <em className="text-[#22c55e] not-italic">blindspot</em>.
            </h1>
            <p className="text-lab-muted text-sm sm:text-base">
              {modelCount} AI models. {totalPredictions} predictions. Distilled into the consensus picks that give you an edge.
            </p>
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
      </div>

      {isPreview && (
        <div className="mb-8 border border-amber-500/30 rounded-lg px-5 py-4 bg-amber-500/5">
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

      {/* ─── 2. Big Stat ─────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="font-mono text-[56px] sm:text-[72px] font-bold text-lab-white leading-none mb-1">
          {totalConsensus}
        </div>
        <p className="text-lab-muted text-sm mb-4">
          consensus picks from {totalPredictions} AI predictions
        </p>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="font-mono text-lab-white font-semibold">{lockPicks.length}</span>
            <span className="text-lab-muted">Locks</span>
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span className="font-mono text-lab-white font-semibold">{smartUpsets.length}</span>
            <span className="text-lab-muted">Upsets</span>
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="font-mono text-lab-white font-semibold">{trapGames.length}</span>
            <span className="text-lab-muted">Traps</span>
          </span>
          {sleeper && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
              <span className="font-mono text-lab-white font-semibold">1</span>
              <span className="text-lab-muted">Sleeper</span>
            </span>
          )}
        </div>
      </div>

      {/* ─── 3. Free Preview: Champion + FF + 2 Lock Picks ───────────── */}
      <section className="mb-10">
        {/* Champion + Final Four */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Champion */}
          <div className="border border-[#2a2a2a] rounded-lg p-5">
            <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Consensus Champion</p>
            {champions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lab-white font-semibold text-lg">{champions[0].team}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: champions[0].count >= 3 ? '#22c55e' : '#888' }}>
                    {champions[0].count}/{modelCount}
                  </span>
                </div>
                <p className="text-xs text-lab-muted">
                  {champions[0].count} model{champions[0].count !== 1 ? 's' : ''} picking this champion
                </p>
                {champions.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                    {champions.slice(1).map((c) => (
                      <div key={c.team} className="flex items-center justify-between text-sm py-0.5">
                        <span className="text-lab-muted">{c.team}</span>
                        <span className="font-mono text-xs text-[#555]">{c.count}/{modelCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Final Four */}
          <div className="border border-[#2a2a2a] rounded-lg p-5">
            <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Final Four Consensus</p>
            <div className="space-y-2">
              {finalFour.slice(0, 6).map((f) => (
                <div key={f.team} className="flex items-center justify-between">
                  <span className="text-lab-white text-sm">{f.team}</span>
                  <AgreementPill count={f.count} total={modelCount} color="#3b82f6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2 free lock picks */}
        <div className="space-y-3">
          {lockPicks.slice(0, FREE_LOCK_PICKS).map((game) => (
            <PickRow
              key={game.gameId}
              game={game}
              icon="&#10003;"
              iconColor="#22c55e"
              pillColor="#22c55e"
              expanded={expandedGameId === game.gameId}
              onToggle={() => toggleGame(game.gameId)}
            />
          ))}
        </div>
      </section>

      {/* ─── 4. Locked Content Tease (when not unlocked) ─────────────── */}
      {!showContent && (
        <>
          <section className="mb-8">
            <div className="space-y-3">
              {[
                { icon: '&#10003;', color: '#22c55e', label: `${lockPicks.length - FREE_LOCK_PICKS} more Lock Picks`, desc: lockPicks.length > FREE_LOCK_PICKS ? `${Math.min(...lockPicks.slice(FREE_LOCK_PICKS).map(g => g.agreementCount))}/${modelCount} to ${Math.max(...lockPicks.map(g => g.agreementCount))}/${modelCount} agreement` : '7+ model agreement' },
                { icon: '&#9889;', color: '#f59e0b', label: `${smartUpsets.length} Smart Upsets`, desc: '4+ models on the underdog' },
                { icon: '&#9888;', color: '#ef4444', label: `${trapGames.length} Trap Games`, desc: 'Favorites to avoid' },
                ...(sleeper ? [{ icon: '&#128301;', color: '#a855f7', label: '1 Sleeper Pick', desc: 'Deep run, high confidence' }] : []),
                { icon: '&#127942;', color: '#3b82f6', label: '32 Opening Round Matchups', desc: 'Every R64 game, model-by-model breakdown' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border border-[#2a2a2a] rounded-lg px-4 py-3.5 min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <span dangerouslySetInnerHTML={{ __html: row.icon }} style={{ color: row.color }} className="text-sm" />
                    <div>
                      <span className="text-lab-white text-sm font-semibold">{row.label}</span>
                      <span className="text-lab-muted text-xs ml-2 hidden sm:inline">&mdash; {row.desc}</span>
                      <p className="text-lab-muted text-xs sm:hidden mt-0.5">{row.desc}</p>
                    </div>
                  </div>
                  <span className="text-[#444] text-sm flex-shrink-0">&#128274;</span>
                </div>
              ))}
            </div>
          </section>

          {/* ─── 5. CTA ────────────────────────────────────────────────── */}
          <div className="mb-10 border border-[#333] rounded-xl px-6 sm:px-8 py-8 text-center bg-[#1a1a1a]">
            <div className="font-mono text-[40px] sm:text-[48px] font-bold text-lab-white leading-none mb-2">
              $2.99
            </div>
            <p className="text-lab-muted text-sm mb-1">One-time. No subscription.</p>
            <p className="text-sm text-[#aaa] mb-6 max-w-md mx-auto">
              Your bracket pool entry is $25. This is a rounding error.
            </p>
            <a
              href={STRIPE_LINK}
              className="inline-block font-mono text-sm font-semibold px-8 py-3.5 rounded-lg transition-all hover:brightness-110 w-full sm:w-auto"
              style={{ background: '#22c55e', color: '#141414' }}
            >
              Unlock the Cheat Sheet
            </a>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-lab-muted">
                <button
                  onClick={() => selectYear('2025')}
                  className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                >
                  Preview the full 2025 cheat sheet free
                </button>
              </p>
              <p className="text-[11px] text-[#555]">
                Powered by Stripe &middot; Instant access
              </p>
            </div>
          </div>
        </>
      )}

      {/* ─── 6. Paid Content ─────────────────────────────────────────── */}
      {showContent && (
        <>
          {/* Lock Picks (remaining) */}
          {lockPicks.length > FREE_LOCK_PICKS && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-green-400">&#10003;</span>
                <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  Lock Picks
                </h2>
                <span className="font-mono text-xs text-[#555] ml-auto">{lockPicks.length} total</span>
              </div>
              <p className="text-sm text-lab-muted mb-4">
                Games where 7+ of {modelCount} models agree. Put these in ink.
              </p>
              <div className="space-y-3">
                {lockPicks.slice(FREE_LOCK_PICKS).map((game) => (
                  <PickRow
                    key={game.gameId}
                    game={game}
                    icon="&#10003;"
                    iconColor="#22c55e"
                    pillColor="#22c55e"
                    expanded={expandedGameId === game.gameId}
                    onToggle={() => toggleGame(game.gameId)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Smart Upsets */}
          {smartUpsets.length > 0 && (
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
                  <PickRow
                    key={game.gameId}
                    game={game}
                    icon="&#9889;"
                    iconColor="#f59e0b"
                    pillColor="#f59e0b"
                    expanded={expandedGameId === game.gameId}
                    onToggle={() => toggleGame(game.gameId)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Trap Games */}
          {trapGames.length > 0 && (
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
              </p>
              <div className="space-y-3">
                {trapGames.map((game) => (
                  <PickRow
                    key={game.gameId}
                    game={game}
                    icon="&#9888;"
                    iconColor="#ef4444"
                    pillColor="#ef4444"
                    expanded={expandedGameId === game.gameId}
                    onToggle={() => toggleGame(game.gameId)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Sleeper Pick */}
          {sleeper && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-400">&#128301;</span>
                <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  Sleeper Pick
                </h2>
              </div>
              <div className="border border-purple-500/30 rounded-lg p-5 bg-purple-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lab-white font-semibold text-lg">{sleeper.team}</span>
                  <span className="font-mono text-xs text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                    {sleeper.deepestRoundLabel}
                  </span>
                </div>
                <p className="text-sm text-lab-muted">
                  Picked by {sleeper.modelPicks.length} model{sleeper.modelPicks.length !== 1 ? 's' : ''} &middot;
                  Avg confidence: {sleeper.avgConfidence}%
                </p>
              </div>
            </section>
          )}

          {/* ─── Full R64 Breakdown ──────────────────────────────────── */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lab-white">&#127942;</span>
              <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
                Full R64 Breakdown
              </h2>
              <span className="font-mono text-xs text-[#555] ml-auto">32 games</span>
            </div>
            <p className="text-sm text-lab-muted mb-6">
              Every opening round matchup with model-by-model analysis. Click any game to expand.
            </p>

            {r64ByRegion.map(({ region, games }) => (
              <div key={region} className="mb-8">
                <div className="sticky top-0 z-10 bg-[#141414] py-2 mb-3">
                  <h3 className="font-mono text-xs text-[#555] uppercase tracking-wider border-b border-[#2a2a2a] pb-2">
                    {region} Region &middot; {games.length} games
                  </h3>
                </div>
                <div className="space-y-2">
                  {games.map((game) => (
                    <R64Row
                      key={game.gameId}
                      game={game}
                      expanded={expandedGameId === game.gameId}
                      onToggle={() => toggleGame(game.gameId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* Bottom CTA for 2025 preview viewers */}
      {isPreview && (
        <div className="mb-10 border border-green-500/30 rounded-xl px-6 sm:px-8 py-7 text-center bg-green-500/5">
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
