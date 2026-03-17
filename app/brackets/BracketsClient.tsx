'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MODELS, VISIBLE_MODELS, ROUND_LABELS } from '@/lib/models';
import { BracketData, Game, ResultGame, Results } from '@/lib/types';
import { calculateScore } from '@/lib/scoring';
import BracketCardsPanel, { REGIONS, type Region, type GamesByRegion } from '@/components/BracketCardsPanel';
import BracketGridPanel from '@/components/BracketGridPanel';
import MatchupPopover from '@/components/MatchupPopover';
import { getEspnPercentile } from '@/lib/espn-percentile';
import { useLiveResults } from '@/lib/use-live-results';

// 2026 (current)
import scoutData     from '@/data/models/the-scout.json';
import quantData     from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData     from '@/data/models/the-chaos-agent.json';
import agentData     from '@/data/models/the-agent.json';
import superAgentData from '@/data/models/the-super-agent.json';
import optimizerData from '@/data/models/the-optimizer.json';
import scoutPrimeData from '@/data/models/the-scout-prime.json';
import autoResearcherData from '@/data/models/the-auto-researcher.json';

// 2025 (archive)
import scoutData2025     from '@/data/archive/2025/models/the-scout.json';
import quantData2025     from '@/data/archive/2025/models/the-quant.json';
import historianData2025 from '@/data/archive/2025/models/the-historian.json';
import chaosData2025     from '@/data/archive/2025/models/the-chaos-agent.json';
import agentData2025     from '@/data/archive/2025/models/the-agent.json';
import superAgentData2025 from '@/data/archive/2025/models/the-super-agent.json';
import optimizerData2025 from '@/data/archive/2025/models/the-optimizer.json';
import autoResearcherData2025 from '@/data/archive/2025/models/the-auto-researcher.json';
import results2025       from '@/data/archive/2025/results/actual-results.json';

// 2024 (archive)
import scoutData2024     from '@/data/archive/2024/models/the-scout.json';
import quantData2024     from '@/data/archive/2024/models/the-quant.json';
import historianData2024 from '@/data/archive/2024/models/the-historian.json';
import chaosData2024     from '@/data/archive/2024/models/the-chaos-agent.json';
import agentData2024     from '@/data/archive/2024/models/the-agent.json';
import superAgentData2024 from '@/data/archive/2024/models/the-super-agent.json';
import optimizerData2024 from '@/data/archive/2024/models/the-optimizer.json';
import results2024       from '@/data/archive/2024/results/actual-results.json';

const VALID_YEARS = ['2026', '2025', '2024'] as const;
type Year = typeof VALID_YEARS[number];

const BRACKET_DATA: Record<Year, Record<string, BracketData>> = {
  '2026': {
    'the-scout':       scoutData     as unknown as BracketData,
    'the-quant':       quantData     as unknown as BracketData,
    'the-historian':   historianData as unknown as BracketData,
    'the-chaos-agent': chaosData     as unknown as BracketData,
    'the-agent':       agentData     as unknown as BracketData,
    'the-super-agent': superAgentData as unknown as BracketData,
    'the-optimizer':   optimizerData as unknown as BracketData,
    'the-scout-prime': scoutPrimeData as unknown as BracketData,
    'the-auto-researcher': autoResearcherData as unknown as BracketData,
  },
  '2025': {
    'the-scout':       scoutData2025     as unknown as BracketData,
    'the-quant':       quantData2025     as unknown as BracketData,
    'the-historian':   historianData2025 as unknown as BracketData,
    'the-chaos-agent': chaosData2025     as unknown as BracketData,
    'the-agent':       agentData2025     as unknown as BracketData,
    'the-super-agent': superAgentData2025 as unknown as BracketData,
    'the-optimizer':   optimizerData2025 as unknown as BracketData,
    'the-auto-researcher': autoResearcherData2025 as unknown as BracketData,
  },
  '2024': {
    'the-scout':       scoutData2024     as unknown as BracketData,
    'the-quant':       quantData2024     as unknown as BracketData,
    'the-historian':   historianData2024 as unknown as BracketData,
    'the-chaos-agent': chaosData2024     as unknown as BracketData,
    'the-agent':       agentData2024     as unknown as BracketData,
    'the-super-agent': superAgentData2024 as unknown as BracketData,
    'the-optimizer':   optimizerData2024 as unknown as BracketData,
  },
};

// 2026 results are fetched live; archive years use static imports
const ARCHIVE_RESULTS: Partial<Record<Year, Results>> = {
  '2025': results2025 as unknown as Results,
  '2024': results2024 as unknown as Results,
};

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

function getGamesByRegion(bracket: BracketData): GamesByRegion {
  const result: GamesByRegion = {};
  for (const roundKey of ROUND_ORDER) {
    const games = bracket.rounds[roundKey as keyof typeof bracket.rounds] ?? [];
    for (const game of games) {
      let region = (game.region || 'ff').toLowerCase();
      if (region === 'national' || region === 'final four' || region === 'championship') region = 'ff';
      if (!result[region]) result[region] = {};
      if (!result[region][roundKey]) result[region][roundKey] = [];
      result[region][roundKey].push(game);
    }
  }
  return result;
}

function countUpsets(bracket: BracketData): number {
  let count = 0;
  for (const roundKey of ROUND_ORDER) {
    const games = bracket.rounds[roundKey as keyof typeof bracket.rounds] ?? [];
    for (const game of games) {
      const pickedSeed = game.pick === game.team1 ? game.seed1 : game.seed2;
      const otherSeed = game.pick === game.team1 ? game.seed2 : game.seed1;
      if (pickedSeed > otherSeed) count++;
    }
  }
  return count;
}

export default function BracketsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { results: liveResults } = useLiveResults();

  const yearParam = searchParams.get('year');
  const activeYear: Year = VALID_YEARS.includes(yearParam as Year) ? (yearParam as Year) : '2026';

  const modelParam = searchParams.get('model');
  const defaultModel = VISIBLE_MODELS[0].id;
  const activeModelId = MODELS.find((m) => m.id === modelParam)?.id ?? defaultModel;
  const activeModel = MODELS.find((m) => m.id === activeModelId)!;

  const bracket = BRACKET_DATA[activeYear][activeModelId] ?? null;
  const results = activeYear === '2026' ? liveResults : (ARCHIVE_RESULTS[activeYear] as Results);

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const el = tabRefs.current[activeModelId];
    if (el) el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, [activeModelId]);

  const [currentRegion, setCurrentRegion] = useState<Region>('east');
  const [mobileView, setMobileView] = useState<'cards' | 'bracket'>('cards');
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [popoverData, setPopoverData] = useState<{ game: Game; roundLabel: string } | null>(null);

  // Easter egg: tap "Chicago" in footer to reveal hidden model tabs
  const [showHidden, setShowHidden] = useState(false);
  useEffect(() => {
    function onChicagoTap() {
      setShowHidden((prev) => !prev);
    }
    window.addEventListener('chicago-tap', onChicagoTap);
    return () => window.removeEventListener('chicago-tap', onChicagoTap);
  }, []);

  const isPaywalled = false;
  const blurredRounds: string[] | undefined = undefined;

  // Build winner map + eliminated teams set
  const winnerMap: Record<string, string> = {};
  const eliminatedTeams = new Set<string>();
  const resultsMap: Record<string, ResultGame> = {};
  if (results) {
    for (const g of results.games) {
      if (g.completed && g.winner) {
        winnerMap[g.gameId] = g.winner;
        const loser = g.winner === g.team1 ? g.team2 : g.team1;
        eliminatedTeams.add(loser);
      }
      resultsMap[g.gameId] = g;
    }
  }

  // Teams this model picked in at least one game that are now eliminated
  const bustedModelPicks = new Set<string>();
  const gamesByRegion = bracket ? getGamesByRegion(bracket) : {};
  for (const games of Object.values(gamesByRegion)) {
    for (const roundGames of Object.values(games)) {
      for (const game of roundGames) {
        if (game.pick && eliminatedTeams.has(game.pick)) {
          bustedModelPicks.add(game.pick);
        }
      }
    }
  }

  const upsetCount = bracket ? countUpsets(bracket) : 0;

  // Champion correctness check
  const champGameId = 'championship';
  const champResult = winnerMap[champGameId];
  const champCorrect = champResult && bracket?.champion ? bracket.champion === champResult : undefined;

  // Compute score if results exist
  const modelScore = bracket && results && results.games.length > 0
    ? calculateScore(bracket, results)
    : null;

  const espnPct = modelScore ? getEspnPercentile(modelScore.total, activeYear) : null;

  // Check if bracket is empty (or missing for this year)
  const isEmpty = !bracket || ROUND_ORDER.every(
    (r) => (bracket.rounds[r as keyof typeof bracket.rounds] ?? []).length === 0
  );

  function selectModel(id: string) {
    const params = new URLSearchParams();
    if (activeYear !== '2026') params.set('year', activeYear);
    params.set('model', id);
    router.push(`/brackets?${params}`, { scroll: false });
  }

  function selectYear(year: Year) {
    const params = new URLSearchParams();
    if (year !== '2026') params.set('year', year);
    params.set('model', activeModelId);
    router.push(`/brackets?${params}`, { scroll: false });
  }

  function handleCardMatchClick(matchId: string, game: Game, roundLabel: string) {
    setHighlightedMatchId(matchId);
    setPopoverData({ game, roundLabel });
  }

  function handleGridMatchClick(matchId: string, game: Game, roundLabel: string) {
    setHighlightedMatchId(matchId);
    setPopoverData({ game, roundLabel });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12">
      {/* Page header — V3: title left, year chip right */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-[32px] text-lab-white mb-1"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Brackets
          </h1>
          <p className="hidden sm:block text-sm text-lab-muted">
            Side-by-side card stack and bracket view. Click any matchup for details.
          </p>
        </div>
        {/* Mobile: single year chip that toggles */}
        <button
          className="sm:hidden flex items-center gap-1 font-mono text-xs px-3 py-1.5 rounded-lg border flex-shrink-0 transition-all"
          style={{ borderColor: '#888', color: '#efefef', background: '#1e1e1e' }}
          onClick={() => {
            const idx = VALID_YEARS.indexOf(activeYear);
            selectYear(VALID_YEARS[(idx + 1) % VALID_YEARS.length]);
          }}
        >
          {activeYear} &#9662;
        </button>
        {/* Desktop: original two-button toggle */}
        <div className="hidden sm:flex gap-1 flex-shrink-0">
          {VALID_YEARS.map((year) => (
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

      {/* Model tabs */}
      <div className="flex border-b border-lab-border mb-0 overflow-x-auto">
        {VISIBLE_MODELS.map((model) => {
          const isActive = model.id === activeModelId;
          return (
            <button
              key={model.id}
              ref={(el) => { tabRefs.current[model.id] = el; }}
              onClick={() => selectModel(model.id)}
              className="flex-shrink-0 flex items-center gap-[7px] px-5 py-2.5 text-[13px] font-semibold transition-all relative whitespace-nowrap"
              style={{ color: isActive ? '#efefef' : '#888' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: model.color }}
              />
              {model.name}
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px] transition-all"
                style={{ background: isActive ? model.color : 'transparent' }}
              />
            </button>
          );
        })}
        {showHidden && MODELS.filter((m) => m.hidden).map((model) => {
          const isActive = model.id === activeModelId;
          return (
            <button
              key={model.id}
              ref={(el) => { tabRefs.current[model.id] = el; }}
              onClick={() => selectModel(model.id)}
              className="flex-shrink-0 flex items-center gap-[7px] px-5 py-2.5 text-[13px] font-semibold transition-all relative whitespace-nowrap"
              style={{ color: isActive ? '#efefef' : '#888' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: model.color }}
              />
              {model.name}
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px] transition-all"
                style={{ background: isActive ? model.color : 'transparent' }}
              />
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2a2a2a] border-t-0 mb-4">
        <div className="flex-1 text-center py-2 px-3 border-r border-[#2a2a2a]">
          <p className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-0.5">Score</p>
          <p className="font-mono text-[13px] font-semibold" style={{ color: activeModel.color }}>
            {modelScore ? modelScore.total : '\u2014'}
          </p>
        </div>
        <div className="flex-1 text-center py-2 px-3 border-r border-[#2a2a2a]">
          <p className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-0.5">ESPN %</p>
          <p className="font-mono text-[13px] font-semibold" style={{ color: activeModel.color }}>
            {espnPct != null ? `${espnPct.toFixed(1)}%` : '\u2014'}
          </p>
        </div>
        <div className="flex-1 text-center py-2 px-3 border-r border-[#2a2a2a]">
          <p className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-0.5">Accuracy</p>
          <p className="font-mono text-[13px] font-semibold text-lab-white">
            {modelScore ? `${modelScore.accuracy}%` : '\u2014'}
          </p>
        </div>
        <div className="flex-1 text-center py-2 px-3 border-r border-[#2a2a2a]">
          <p className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-0.5">Champion</p>
          <p
            className={`font-mono text-[13px] font-semibold ${champCorrect === false ? 'line-through opacity-80' : ''}`}
            style={{ color: champCorrect === true ? '#22c55e' : champCorrect === false ? '#ef4444' : activeModel.color }}
          >
            {bracket?.champion || '\u2014'}
          </p>
        </div>
        <div className="flex-1 text-center py-2 px-3">
          <p className="font-mono text-[9px] text-[#555] uppercase tracking-wider mb-0.5">Upsets</p>
          <p className="font-mono text-[13px] font-semibold text-lab-white">
            {isEmpty ? '\u2014' : upsetCount}
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-lab-border bg-lab-surface p-16 text-center">
          <p className="font-mono text-2xl mb-3">&#128274;</p>
          <p className="text-lab-white font-semibold mb-2">Picks lock March 19</p>
          <p className="text-sm text-lab-muted max-w-sm mx-auto">
            After the First Four play-in games (Mar 17-18), this model will run on the final
            64-team field and the full bracket will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: Side-by-side */}
          <div className="hidden lg:flex gap-4 relative">
            <div className="w-[40%] flex-shrink-0">
              <BracketCardsPanel
                gamesByRegion={gamesByRegion}
                modelColor={activeModel.color}
                currentRegion={currentRegion}
                onRegionChange={setCurrentRegion}
                highlightedMatchId={highlightedMatchId}
                onMatchClick={handleCardMatchClick}
                winnerMap={winnerMap}
                eliminatedTeams={eliminatedTeams}
                bustedModelPicks={bustedModelPicks}
                blurredRounds={blurredRounds}
              />
            </div>
            <div className="flex-1">
              <BracketGridPanel
                gamesByRegion={gamesByRegion}
                modelColor={activeModel.color}
                champion={bracket?.champion ?? null}
                highlightedMatchId={highlightedMatchId}
                onMatchClick={handleGridMatchClick}
                winnerMap={winnerMap}
                eliminatedTeams={eliminatedTeams}
                bustedModelPicks={bustedModelPicks}
                blurredRounds={blurredRounds}
              />
            </div>
          </div>

          {/* Mobile: Toggle */}
          <div className="lg:hidden relative">
            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center bg-lab-surface border border-lab-border rounded-md overflow-hidden flex-shrink-0">
                <button
                  className={`px-3.5 py-1.5 text-[11px] font-mono uppercase transition-all ${
                    mobileView === 'cards' ? 'bg-lab-border text-lab-white' : 'text-[#666]'
                  }`}
                  onClick={() => setMobileView('cards')}
                >
                  Cards
                </button>
                <button
                  className={`px-3.5 py-1.5 text-[11px] font-mono uppercase transition-all ${
                    mobileView === 'bracket' ? 'bg-lab-border text-lab-white' : 'text-[#666]'
                  }`}
                  onClick={() => setMobileView('bracket')}
                >
                  Bracket
                </button>
              </div>
            </div>

            {/* Mobile cards view */}
            {mobileView === 'cards' && (
              <BracketCardsPanel
                gamesByRegion={gamesByRegion}
                modelColor={activeModel.color}
                currentRegion={currentRegion}
                onRegionChange={setCurrentRegion}
                highlightedMatchId={highlightedMatchId}
                onMatchClick={handleCardMatchClick}
                winnerMap={winnerMap}
                eliminatedTeams={eliminatedTeams}
                bustedModelPicks={bustedModelPicks}
                blurredRounds={blurredRounds}
              />
            )}

            {/* Mobile bracket view */}
            {mobileView === 'bracket' && (
              <div className="overflow-x-auto pb-4">
                <BracketGridPanel
                  gamesByRegion={gamesByRegion}
                  modelColor={activeModel.color}
                  champion={bracket?.champion ?? null}
                  highlightedMatchId={highlightedMatchId}
                  onMatchClick={handleGridMatchClick}
                  winnerMap={winnerMap}
                  eliminatedTeams={eliminatedTeams}
                  bustedModelPicks={bustedModelPicks}
                  blurredRounds={blurredRounds}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Popover */}
      <MatchupPopover
        data={popoverData}
        modelColor={activeModel.color}
        modelName={activeModel.name}
        modelId={activeModel.id}
        winnerMap={winnerMap}
        eliminatedTeams={eliminatedTeams}
        bustedModelPicks={bustedModelPicks}
        result={popoverData ? (resultsMap[popoverData.game.gameId] ?? null) : null}
        blurredRounds={blurredRounds}
        onClose={() => {
          setPopoverData(null);
          setHighlightedMatchId(null);
        }}
      />
    </div>
  );
}
