'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BracketData } from '@/lib/types';
import {
  buildAgreementMap,
  getLockPicks,
  getSmartUpsets,
  getFinalFourConsensus,
  getSleeperPick,
  getContestedGames,
  getRoundRegionSummaries,
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

type Year = '2026' | '2025';
type FilterType = 'all' | 'locks' | 'upsets' | 'contested';
type GameCategory = 'lock' | 'contested' | 'clean';
type RoundTab = 'round_of_64' | 'round_of_32' | 'sweet_16' | 'elite_8';

const ROUND_TABS: { key: RoundTab; label: string; shortLabel: string }[] = [
  { key: 'round_of_64', label: 'Round of 64', shortLabel: 'R64' },
  { key: 'round_of_32', label: 'Round of 32', shortLabel: 'R32' },
  { key: 'sweet_16', label: 'Sweet 16', shortLabel: 'S16' },
  { key: 'elite_8', label: 'Elite 8', shortLabel: 'E8' },
];

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

// ── Helpers ──────────────────────────────────────────────────────────────

/** Extract first N sentences from text, up to maxLen chars. */
function extractSentences(text: string, maxSentences = 2, maxLen = 200): string {
  if (!text) return '';
  const sentences = text.match(/[^.!?]*(?:(?:St|vs|Dr|Jr|Sr|Mt|Univ)\.[^.!?]*)*[.!?]+/g);
  if (!sentences) return text.length <= maxLen ? text : text.slice(0, text.lastIndexOf(' ', maxLen)) + '\u2026';
  let result = '';
  for (let i = 0; i < Math.min(sentences.length, maxSentences); i++) {
    const next = result + sentences[i].trim();
    if (next.length > maxLen && result.length > 0) break;
    result = next + ' ';
  }
  return result.trim();
}

/** Build a bold verdict from model reasonings */
function buildVerdict(game: GameAgreement): { thesis: string; counter: string | null } {
  const forPicks = game.modelPicks
    .filter((p) => p.pick === game.consensusPick)
    .sort((a, b) => b.confidence - a.confidence);
  const againstPicks = game.modelPicks
    .filter((p) => p.pick !== game.consensusPick)
    .sort((a, b) => b.confidence - a.confidence);

  const topFor = forPicks[0];
  const thesis = topFor?.reasoning
    ? extractSentences(topFor.reasoning, 2, 200)
    : `${game.agreementCount} of ${game.totalModels} models agree on ${game.consensusPick}.`;

  const topAgainst = againstPicks[0];
  const counter = topAgainst?.reasoning
    ? extractSentences(topAgainst.reasoning, 2, 160)
    : null;

  return { thesis, counter };
}

/** Pool strategy text based on game category + upset flag */
function getPoolStrategy(game: GameAgreement, category: GameCategory, isUpset: boolean): string {
  if (category === 'lock' && isUpset) {
    return `The models agree \u2014 take the upset. It\u2019s rare to get consensus on an underdog.`;
  }
  if (isUpset) {
    return `${game.underdogPickCount} of ${game.totalModels} models back the underdog \u2014 enough signal to justify the risk in a large pool.`;
  }
  switch (category) {
    case 'lock':
      return 'Put this in ink. Focus your energy on the close calls.';
    case 'contested':
      return "Genuine coin flip \u2014 pick based on your bracket needs, not gut feel.";
    default:
      return "Models lean one way but the margin is moderate. A standard confidence pick.";
  }
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

function CategoryTag({ category, game, isUpset }: { category: GameCategory; game: GameAgreement; isUpset: boolean }) {
  const tags: { label: string; bg: string; color: string }[] = [];

  if (category === 'lock') {
    tags.push({ label: 'LOCK', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' });
  } else if (category === 'contested') {
    tags.push({
      label: `${game.agreementCount}-${game.totalModels - game.agreementCount}`,
      bg: 'rgba(168,85,247,0.12)',
      color: '#a855f7',
    });
  }

  if (isUpset) {
    tags.push({
      label: `UPSET ${game.underdogPickCount}/${game.totalModels}`,
      bg: 'rgba(245,158,11,0.12)',
      color: '#f59e0b',
    });
  }

  if (tags.length === 0) return null;

  return (
    <span className="flex items-center gap-1 flex-shrink-0">
      {tags.map((config) => (
        <span
          key={config.label}
          className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
          style={{ background: config.bg, color: config.color }}
        >
          {config.label}
        </span>
      ))}
    </span>
  );
}

// ── Filter Pills ────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: FilterType; label: string; color: string; icon: string }[] = [
  { key: 'all', label: 'All', color: '#888', icon: '' },
  { key: 'locks', label: 'Locks', color: '#22c55e', icon: '\u2713' },
  { key: 'upsets', label: 'Upsets', color: '#f59e0b', icon: '\u26A1' },
  { key: 'contested', label: 'Contested', color: '#a855f7', icon: '\u2694' },
];

function FilterPills({ active, counts, onChange }: {
  active: FilterType;
  counts: Record<FilterType, number>;
  onChange: (f: FilterType) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap mb-6">
      {FILTER_OPTIONS.map(({ key, label, color, icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex items-center gap-1.5 font-mono text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150"
            style={{
              borderColor: isActive ? color : '#333',
              color: isActive ? color : '#666',
              background: isActive ? `${color}12` : 'transparent',
            }}
          >
            {icon && <span>{icon}</span>}
            {label}
            <span className="text-[10px] opacity-60">{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Round Pills ──────────────────────────────────────────────────────────

function RoundPills({ active, onChange }: {
  active: RoundTab;
  onChange: (r: RoundTab) => void;
}) {
  return (
    <div className="flex gap-1.5 mb-4">
      {ROUND_TABS.map(({ key, shortLabel }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="font-mono text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150"
            style={{
              borderColor: isActive ? '#efefef' : '#333',
              color: isActive ? '#efefef' : '#555',
              background: isActive ? '#2a2a2a' : 'transparent',
            }}
          >
            {shortLabel}
          </button>
        );
      })}
    </div>
  );
}

// ── Game Detail (redesigned: verdict + pool strategy + cases + models) ──

function GameDetail({ game, category, isUpset = false }: { game: GameAgreement; category: GameCategory; isUpset?: boolean }) {
  const [showModels, setShowModels] = useState(false);
  const forPicks = game.modelPicks.filter((p) => p.pick === game.consensusPick).sort((a, b) => b.confidence - a.confidence);
  const againstPicks = game.modelPicks.filter((p) => p.pick !== game.consensusPick).sort((a, b) => b.confidence - a.confidence);
  const forPct = Math.round((forPicks.length / game.totalModels) * 100);
  const { thesis } = buildVerdict(game);

  // Synthesize case text from top 1-2 model reasonings per side
  const forCase = forPicks
    .slice(0, 2)
    .map((p) => extractSentences(p.reasoning, 2, 150))
    .filter(Boolean)
    .join(' ');
  const againstCase = againstPicks
    .slice(0, 2)
    .map((p) => extractSentences(p.reasoning, 2, 150))
    .filter(Boolean)
    .join(' ');

  const poolStrategy = getPoolStrategy(game, category, isUpset);

  return (
    <div className="px-4 pb-4 pt-1">
      {/* Top card: consensus bar + verdict + pool strategy */}
      <div className="bg-[#1a1a1a] rounded-lg p-4 mb-3">
        {/* Consensus bar */}
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-xs text-[#22c55e] whitespace-nowrap">{game.consensusPick}</span>
          <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#22c55e] rounded-l-full" style={{ width: `${forPct}%` }} />
            <div className="h-full bg-[#ef4444] rounded-r-full" style={{ width: `${100 - forPct}%` }} />
          </div>
          <span className="font-mono text-xs text-[#ef4444] whitespace-nowrap">{game.otherTeam}</span>
        </div>

        {/* Verdict */}
        <div className="mb-3">
          <span className="font-mono text-[9px] font-bold text-[#22c55e] uppercase tracking-wide">Verdict</span>
          <p className="text-[13px] font-bold text-lab-white leading-snug mt-1">{thesis}</p>
        </div>

        {/* Pool Strategy */}
        <div>
          <span className="font-mono text-[9px] font-bold text-[#3b82f6] uppercase tracking-wide">Pool Strategy</span>
          <p className="text-[12px] text-[#aaa] leading-snug mt-1">{poolStrategy}</p>
        </div>
      </div>

      {/* Side-by-side case columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg overflow-hidden">
          <div
            className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
          >
            Case for {game.consensusPick} ({forPicks.length})
          </div>
          <div className="bg-[#1a1a1a] px-3 py-2.5">
            <p className="text-[12px] text-[#bbb] leading-relaxed">
              {forCase || 'No detailed reasoning available.'}
            </p>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden">
          <div
            className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
          >
            Case for {game.otherTeam} ({againstPicks.length})
          </div>
          <div className="bg-[#1a1a1a] px-3 py-2.5">
            <p className="text-[12px] text-[#bbb] leading-relaxed">
              {againstCase || 'No dissenters \u2014 full consensus.'}
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible model reasoning */}
      <button
        onClick={() => setShowModels(!showModels)}
        className="flex items-center gap-2 text-[11px] text-[#666] hover:text-[#999] transition-colors w-full py-2"
      >
        <span className={`text-[10px] transition-transform duration-200 ${showModels ? 'rotate-180' : ''}`}>&#9660;</span>
        See each model&apos;s reasoning ({game.totalModels} models)
      </button>

      {showModels && (
        <div className="border-t border-[#222]">
          {[...game.modelPicks].sort((a, b) => b.confidence - a.confidence).map((p) => (
            <div key={p.modelId} className="py-2.5 border-b border-[#222] last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-[11px] font-semibold" style={{ color: p.color }}>{p.modelName}</span>
                <span
                  className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: p.pick === game.consensusPick ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: p.pick === game.consensusPick ? '#22c55e' : '#ef4444',
                  }}
                >
                  {p.pick}
                </span>
                <span className="font-mono text-[10px] text-[#555] ml-auto">{p.confidence}%</span>
              </div>
              <p className="text-[11px] text-[#888] leading-relaxed pl-4">{p.reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pick Row (simplified, used for free preview lock picks) ──────────────

function PickRow({ game, expanded, onToggle }: {
  game: GameAgreement;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'}`}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#222] transition-colors min-h-[44px]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: '#22c55e' }} className="text-sm flex-shrink-0">&#10003;</span>
          <span className="font-semibold text-lab-white text-sm">
            ({game.consensusSeed}) {game.consensusPick}
          </span>
          <span className="text-lab-muted text-xs hidden sm:inline">over</span>
          <span className="text-lab-muted text-sm hidden sm:inline">
            ({game.otherSeed}) {game.otherTeam}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <AgreementPill count={game.agreementCount} total={game.totalModels} color="#22c55e" />
          <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
        </div>
      </div>
      {/* Mobile: show opponent below */}
      <div className="sm:hidden px-4 -mt-2 pb-1">
        <span className="text-lab-muted text-xs">
          over ({game.otherSeed}) {game.otherTeam}
        </span>
      </div>
      {expanded && <GameDetail game={game} category="lock" />}
    </div>
  );
}

// ── Region Accordion Row ─────────────────────────────────────────────────

function RegionAccordionRow({ game, category, isUpset, expanded, onToggle }: {
  game: GameAgreement;
  category: GameCategory;
  isUpset: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pillColor =
    isUpset && category !== 'lock' ? '#f59e0b' :
    category === 'contested' ? '#a855f7' :
    '#22c55e';
  const seedLow = Math.min(game.seed1, game.seed2);
  const seedHigh = Math.max(game.seed1, game.seed2);
  const hiTeam = game.seed1 < game.seed2 ? game.team1 : game.team2;
  const loTeam = game.seed1 > game.seed2 ? game.team1 : game.team2;
  const pickIsHi = game.consensusSeed === seedLow;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${expanded ? 'border-[#444]' : 'border-[#2a2a2a]'}`}>
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 cursor-pointer hover:bg-[#1e1e1e] transition-colors text-sm min-h-[40px]"
        onClick={onToggle}
      >
        <span className="font-mono text-[11px] text-[#444] w-9 text-center flex-shrink-0">{seedLow}v{seedHigh}</span>
        <span className={pickIsHi ? 'font-semibold text-lab-white' : 'text-lab-muted'}>{hiTeam}</span>
        <span className="text-[#555] text-xs flex-shrink-0">&gt;</span>
        <span className={!pickIsHi ? 'font-semibold text-lab-white' : 'text-lab-muted'}>{loTeam}</span>
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {game.isProjected && game.matchupAgreement < game.totalModels && (
            <span className="font-mono text-[9px] text-[#666] px-1" title="Models agreeing this matchup occurs">
              ~{game.matchupAgreement}/{game.totalModels}
            </span>
          )}
          <CategoryTag category={category} game={game} isUpset={isUpset} />
          <AgreementPill count={game.agreementCount} total={game.isProjected ? game.matchupAgreement : game.totalModels} color={pillColor} />
          <span className={`text-[#444] text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
        </div>
      </div>
      {expanded && <GameDetail game={game} category={category} isUpset={isUpset} />}
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

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Email unlock state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  // Round + Filter + expand state
  const [activeRound, setActiveRound] = useState<RoundTab>('round_of_64');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutLoading(false);
    }
  }

  async function handleEmailUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailStatus('loading');
    setEmailError('');
    try {
      const res = await fetch('/api/unlock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setEmailStatus('error');
        setEmailError('No purchase found for this email.');
      }
    } catch {
      setEmailStatus('error');
      setEmailError('Something went wrong. Try again.');
    }
  }

  const showContent = unlocked || isPreview;

  const brackets = BRACKETS_BY_YEAR[activeYear];
  const modelCount = Object.keys(brackets).length;

  const agreementMap = useMemo(() => buildAgreementMap(brackets), [brackets]);
  const lockPicks = useMemo(() => getLockPicks(agreementMap), [agreementMap]);
  const smartUpsets = useMemo(() => getSmartUpsets(agreementMap), [agreementMap]);
  const contestedGames = useMemo(() => getContestedGames(agreementMap), [agreementMap]);
  const { finalFour, champions } = useMemo(() => getFinalFourConsensus(brackets), [brackets]);
  const sleeper = useMemo(() => getSleeperPick(brackets), [brackets]);
  const regionSummaries = useMemo(() => getRoundRegionSummaries(agreementMap, activeRound), [agreementMap, activeRound]);

  const totalPredictions = modelCount * 63;

  const FREE_LOCK_PICKS = 2;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  function matchesSearch(game: GameAgreement): boolean {
    if (!normalizedQuery) return true;
    return (
      game.team1.toLowerCase().includes(normalizedQuery) ||
      game.team2.toLowerCase().includes(normalizedQuery)
    );
  }

  // Build category map: gameId -> primary category (agreement strength, orthogonal to upset)
  const gameCategories = useMemo(() => {
    const lockIds = new Set(lockPicks.map((g) => g.gameId));
    const contestedIds = new Set(contestedGames.map((g) => g.gameId));

    const map: Record<string, GameCategory> = {};
    for (const game of Object.values(agreementMap)) {
      if (game.round !== activeRound) continue;
      if (lockIds.has(game.gameId)) map[game.gameId] = 'lock';
      else if (contestedIds.has(game.gameId)) map[game.gameId] = 'contested';
      else map[game.gameId] = 'clean';
    }
    return map;
  }, [agreementMap, activeRound, lockPicks, contestedGames]);

  // Upset overlay (orthogonal to primary category)
  const upsetGameIds = useMemo(
    () => new Set(smartUpsets.map((g) => g.gameId)),
    [smartUpsets]
  );

  // R64 category counts for Big Stat display (always R64, doesn't change with round tab)
  const r64Counts = useMemo(() => {
    const lockIds = new Set(lockPicks.map((g) => g.gameId));
    const contestedIds = new Set(contestedGames.map((g) => g.gameId));

    let locks = 0, upsets = 0, contested = 0;
    for (const game of Object.values(agreementMap)) {
      if (game.round !== 'round_of_64') continue;
      if (lockIds.has(game.gameId)) locks++;
      if (contestedIds.has(game.gameId)) contested++;
      if (game.underdogPickCount >= 3) upsets++;
    }
    return { locks, upsets, contested };
  }, [agreementMap, lockPicks, contestedGames]);
  const totalConsensus = r64Counts.locks + r64Counts.upsets + r64Counts.contested + (sleeper ? 1 : 0);

  // Matchup agreement threshold for R32+ rounds (majority of models must agree the matchup occurs)
  const matchupThreshold = Math.ceil(modelCount * 0.5);

  // Filter counts (active round games by category, respecting search + matchup threshold)
  const filterCounts: Record<FilterType, number> = useMemo(() => {
    let searchFiltered = Object.values(agreementMap).filter((g) => g.round === activeRound);
    // Apply matchup agreement threshold for R32+
    if (activeRound !== 'round_of_64') {
      searchFiltered = searchFiltered.filter((g) => g.matchupAgreement >= matchupThreshold);
    }
    if (normalizedQuery) searchFiltered = searchFiltered.filter(matchesSearch);

    return {
      all: searchFiltered.length,
      locks: searchFiltered.filter((g) => gameCategories[g.gameId] === 'lock').length,
      upsets: searchFiltered.filter((g) => upsetGameIds.has(g.gameId)).length,
      contested: searchFiltered.filter((g) => gameCategories[g.gameId] === 'contested').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementMap, activeRound, normalizedQuery, gameCategories, upsetGameIds, matchupThreshold]);

  // Region accordion data with search + category filtering
  const filteredRegions = useMemo(() => {
    return regionSummaries
      .map(({ region, games }) => {
        let filtered = games;
        // For R32+, only show games where enough models agree on the matchup
        if (activeRound !== 'round_of_64') {
          filtered = filtered.filter((g) => g.matchupAgreement >= matchupThreshold);
        }
        if (normalizedQuery) filtered = filtered.filter(matchesSearch);

        // Apply filter
        if (activeFilter === 'locks') {
          filtered = filtered.filter((g) => gameCategories[g.gameId] === 'lock');
        } else if (activeFilter === 'upsets') {
          filtered = filtered.filter((g) => upsetGameIds.has(g.gameId));
        } else if (activeFilter === 'contested') {
          filtered = filtered.filter((g) => gameCategories[g.gameId] === 'contested');
        }

        // Compute per-region category counts for header
        let lockCount = 0, upsetCount = 0, contestedCount = 0;
        for (const g of filtered) {
          const cat = gameCategories[g.gameId];
          if (cat === 'lock') lockCount++;
          if (upsetGameIds.has(g.gameId)) upsetCount++;
          if (cat === 'contested') contestedCount++;
        }

        return { region, games: filtered, lockCount, upsetCount, contestedCount };
      })
      .filter((r) => r.games.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionSummaries, normalizedQuery, activeFilter, gameCategories, upsetGameIds]);

  // Search-filtered free preview data
  const filteredFinalFour = useMemo(() => {
    if (!normalizedQuery) return finalFour;
    return finalFour.filter((f) => f.team.toLowerCase().includes(normalizedQuery));
  }, [finalFour, normalizedQuery]);
  const filteredChampions = useMemo(() => {
    if (!normalizedQuery) return champions;
    return champions.filter((c) => c.team.toLowerCase().includes(normalizedQuery));
  }, [champions, normalizedQuery]);
  const filteredSleeper = sleeper && normalizedQuery ? (sleeper.team.toLowerCase().includes(normalizedQuery) ? sleeper : null) : sleeper;
  const filteredLockPicks = useMemo(() => lockPicks.filter(matchesSearch), [lockPicks, normalizedQuery]);

  function toggleGame(gameId: string) {
    setExpandedGameId((prev) => (prev === gameId ? null : gameId));
  }

  function toggleRegion(region: string) {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  }

  function selectYear(year: Year) {
    setExpandedGameId(null);
    setExpandedRegions(new Set());
    setActiveFilter('all');
    setActiveRound('round_of_64');
    const params = new URLSearchParams();
    if (year === '2025') params.set('year', '2025');
    router.push(`/cheat-sheet${params.toString() ? '?' + params : ''}`, { scroll: false });
  }

  function switchRound(round: RoundTab) {
    setActiveRound(round);
    setExpandedGameId(null);
    setExpandedRegions(new Set());
    setActiveFilter('all');
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

      {/* ─── Search ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder={showContent ? 'Search by team name...' : 'Search available after purchase'}
            value={showContent ? searchQuery : ''}
            onChange={(e) => showContent && setSearchQuery(e.target.value)}
            disabled={!showContent}
            className={`w-full px-4 py-3 pl-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm placeholder-[#555] focus:outline-none transition-colors ${
              showContent
                ? 'text-lab-white focus:border-[#444] cursor-text'
                : 'text-[#444] cursor-not-allowed opacity-50'
            }`}
          />
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${showContent ? 'text-[#555]' : 'text-[#444]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && showContent && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-lab-white transition-colors text-sm"
            >
              &#10005;
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter Pills ────────────────────────────────────────────── */}
      {showContent && (
        <FilterPills
          active={activeFilter}
          counts={filterCounts}
          onChange={(f) => { setActiveFilter(f); setExpandedGameId(null); }}
        />
      )}

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
      {activeFilter === 'all' && (
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
              <span className="font-mono text-lab-white font-semibold">{r64Counts.locks}</span>
              <span className="text-lab-muted">Locks</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span className="font-mono text-lab-white font-semibold">{r64Counts.upsets}</span>
              <span className="text-lab-muted">Upsets</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
              <span className="font-mono text-lab-white font-semibold">{r64Counts.contested}</span>
              <span className="text-lab-muted">Contested</span>
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
      )}

      {/* ─── 3. Free Preview: Champion + FF + 2 Lock Picks ───────────── */}
      {activeFilter === 'all' && (
        <section className="mb-10">
          {/* Champion + Final Four */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Champion */}
            <div className="border border-[#2a2a2a] rounded-lg p-5">
              <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-3">Consensus Champion</p>
              {filteredChampions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lab-white font-semibold text-lg">{filteredChampions[0].team}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: filteredChampions[0].count >= 3 ? '#22c55e' : '#888' }}>
                      {filteredChampions[0].count}/{modelCount}
                    </span>
                  </div>
                  <p className="text-xs text-lab-muted">
                    {filteredChampions[0].count} model{filteredChampions[0].count !== 1 ? 's' : ''} picking this champion
                  </p>
                  {filteredChampions.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                      {filteredChampions.slice(1).map((c) => (
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
                {filteredFinalFour.slice(0, 6).map((f) => (
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
            {filteredLockPicks.slice(0, FREE_LOCK_PICKS).map((game) => (
              <PickRow
                key={game.gameId}
                game={game}
                expanded={expandedGameId === game.gameId}
                onToggle={() => toggleGame(game.gameId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── 4. Locked Content Tease (when not unlocked) ─────────────── */}
      {!showContent && (
        <>
          <section className="mb-8">
            <div className="space-y-3">
              {[
                { icon: '&#10003;', color: '#22c55e', label: `${r64Counts.locks - FREE_LOCK_PICKS} more Lock Picks`, desc: r64Counts.locks > FREE_LOCK_PICKS ? '7+ model agreement' : '7+ model agreement' },
                { icon: '&#9889;', color: '#f59e0b', label: `${r64Counts.upsets} Smart Upsets`, desc: '4+ models on the underdog' },
                { icon: '&#9876;', color: '#a855f7', label: `${r64Counts.contested} Contested Games`, desc: 'Where the models debate' },
                ...(sleeper ? [{ icon: '&#128301;', color: '#a855f7', label: '1 Sleeper Pick', desc: 'Deep run, high confidence' }] : []),
                { icon: '&#127942;', color: '#3b82f6', label: '32 Opening Round Matchups', desc: 'Every R64 game, model-by-model breakdown' },
                { icon: '&#127942;', color: '#3b82f6', label: 'Round of 32 spotlight matchups', desc: 'Where models agree on the pairing' },
                { icon: '&#127942;', color: '#3b82f6', label: 'Sweet 16 spotlight matchups', desc: 'Where models agree on the pairing' },
                { icon: '&#127942;', color: '#3b82f6', label: 'Elite 8 spotlight matchups', desc: 'Where models agree on the pairing' },
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
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="inline-block font-mono text-sm font-semibold px-8 py-3.5 rounded-lg transition-all hover:brightness-110 w-full sm:w-auto disabled:opacity-70"
              style={{ background: '#22c55e', color: '#141414' }}
            >
              {checkoutLoading ? 'Redirecting...' : 'Unlock the Cheat Sheet'}
            </button>
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

            {/* Already purchased? */}
            {!showEmailForm ? (
              <div className="mt-5 border border-[#333] rounded-lg px-4 py-3 bg-[#1a1a1a]">
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="text-xs text-lab-muted hover:text-lab-white transition-colors"
                >
                  Already purchased? <span className="text-lab-white underline underline-offset-2">Plug your email in here</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailUnlock} className="mt-4 max-w-xs mx-auto space-y-2">
                <input
                  type="email"
                  placeholder="Email used at checkout"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222] border border-[#444] rounded-lg text-sm text-lab-white placeholder-[#555] focus:outline-none focus:border-[#666]"
                  required
                />
                <button
                  type="submit"
                  disabled={emailStatus === 'loading'}
                  className="w-full font-mono text-xs font-semibold px-4 py-2 rounded-lg border border-[#444] text-lab-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                >
                  {emailStatus === 'loading' ? 'Checking...' : 'Unlock'}
                </button>
                {emailStatus === 'error' && (
                  <p className="text-[11px] text-red-400">{emailError}</p>
                )}
              </form>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-[#444] mt-4 leading-relaxed max-w-sm mx-auto">
              AI-generated predictions for entertainment purposes only. Not financial or gambling advice. No guaranteed results. All sales final.
            </p>
          </div>
        </>
      )}

      {/* ─── 6. Paid Content ─────────────────────────────────────────── */}
      {showContent && (
        <>
          {unlocked && !isPreview && activeFilter === 'all' && (
            <div className="mb-8 border border-green-500/30 rounded-lg px-5 py-4 bg-green-500/5">
              <p className="text-sm text-green-300 font-semibold mb-0.5">Thanks for your purchase.</p>
              <p className="text-xs text-lab-muted">
                Your full cheat sheet is unlocked below. Good luck in your pool.
              </p>
            </div>
          )}

          {/* Sleeper Pick */}
          {activeFilter === 'all' && filteredSleeper && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-400">&#128301;</span>
                <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  Sleeper Pick
                </h2>
              </div>
              <div className="border border-purple-500/30 rounded-lg p-5 bg-purple-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lab-white font-semibold text-lg">{filteredSleeper.team}</span>
                  <span className="font-mono text-xs text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                    {filteredSleeper.deepestRoundLabel}
                  </span>
                </div>
                <p className="text-sm text-lab-muted">
                  Picked by {filteredSleeper.modelPicks.length} model{filteredSleeper.modelPicks.length !== 1 ? 's' : ''} &middot;
                  Avg confidence: {filteredSleeper.avgConfidence}%
                </p>
              </div>
            </section>
          )}

          {/* ─── Region Accordion (primary paid content) ───────────────── */}
          <section className="mb-10">
            {activeFilter === 'all' && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lab-white">&#127942;</span>
                  <h2 className="text-lg font-semibold text-lab-white" style={{ fontFamily: 'var(--font-serif)' }}>
                    {activeRound === 'round_of_64' ? 'R64' : activeRound === 'round_of_32' ? 'R32' : activeRound === 'sweet_16' ? 'S16' : 'E8'} Breakdown
                  </h2>
                  <span className="font-mono text-xs text-[#555] ml-auto">{filterCounts.all} games</span>
                </div>
                <p className="text-sm text-lab-muted mb-6">
                  {activeRound === 'round_of_64'
                    ? 'Every opening round matchup with model-by-model analysis. Click a region to expand.'
                    : 'Spotlight matchups where most models agree on the pairing. Click a region to expand.'}
                </p>
              </>
            )}

            <RoundPills active={activeRound} onChange={switchRound} />

            {activeRound !== 'round_of_64' && (
              <div className="mb-4 border border-amber-500/20 rounded-lg px-4 py-3 bg-amber-500/5">
                <p className="text-xs text-amber-300/80">
                  <span className="font-semibold">Spotlight matchups.</span> Showing games where {matchupThreshold}+ models agree on the same pairing. Games with too much divergence are omitted.
                </p>
              </div>
            )}

            {activeRound !== 'round_of_64' && filteredRegions.length === 0 && (
              <div className="text-center py-10">
                <p className="text-lab-muted text-sm">Not enough model agreement to show reliable matchups for this round.</p>
              </div>
            )}

            <div className="space-y-2">
              {filteredRegions.map(({ region, games, lockCount, upsetCount, contestedCount }) => {
                const isOpen = expandedRegions.has(region);
                return (
                  <div key={region} className={`border rounded-lg overflow-hidden transition-all duration-200 ${isOpen ? 'border-[#444]' : 'border-[#2a2a2a]'}`}>
                    {/* Region header */}
                    <div
                      className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[#1e1e1e] transition-colors"
                      onClick={() => toggleRegion(region)}
                    >
                      <span className="text-lab-white font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                        {region} Region
                      </span>
                      <div className="flex items-center gap-3">
                        {lockCount > 0 && (
                          <span className="font-mono text-[10px] text-[#22c55e]">
                            <span className="font-bold">{lockCount}</span> <span className="text-[#555]">locks</span>
                          </span>
                        )}
                        {upsetCount > 0 && (
                          <span className="font-mono text-[10px] text-[#f59e0b]">
                            <span className="font-bold">{upsetCount}</span> <span className="text-[#555]">upsets</span>
                          </span>
                        )}
                        {contestedCount > 0 && (
                          <span className="font-mono text-[10px] text-[#a855f7]">
                            <span className="font-bold">{contestedCount}</span> <span className="text-[#555]">contested</span>
                          </span>
                        )}
                        <span className={`text-[#444] text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>&#9660;</span>
                      </div>
                    </div>

                    {/* Expanded: game rows */}
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {games.map((game) => (
                          <RegionAccordionRow
                            key={game.gameId}
                            game={game}
                            category={gameCategories[game.gameId] || 'clean'}
                            isUpset={upsetGameIds.has(game.gameId)}
                            expanded={expandedGameId === game.gameId}
                            onToggle={() => toggleGame(game.gameId)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="inline-block font-mono text-sm font-semibold px-6 py-3 rounded-lg transition-all hover:brightness-110 disabled:opacity-70"
            style={{ background: '#22c55e', color: '#141414' }}
          >
            {checkoutLoading ? 'Redirecting...' : 'Unlock 2026 Cheat Sheet \u2014 $2.99'}
          </button>
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
        <p className="text-[10px] text-[#444] text-center mt-3 leading-relaxed">
          AI-generated predictions for entertainment purposes only. Not financial or gambling advice. No guaranteed results. All sales final.
        </p>
      </div>
    </div>
  );
}
