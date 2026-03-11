'use client';

import { useState, useEffect, useRef } from 'react';
import { Model, ROUND_LABELS, ROUND_POINTS } from '@/lib/models';
import { BracketData } from '@/lib/types';

type Tab = 'overview' | 'bracket' | 'methodology' | 'espn';
type Metric = 'byRound' | 'upsets' | 'confidence' | 'seeds';

interface ModelDetailTabsProps {
  model: Model;
  bracket: BracketData | null;
}

// Placeholder chart data (pre-tournament)
const PLACEHOLDER_CHART: Record<Metric, { title: string; subtitle: string; bars: { label: string; pct: number; value: string }[] }> = {
  byRound: {
    title: 'Points Earned by Round',
    subtitle: 'No data yet',
    bars: Object.entries(ROUND_LABELS).map(([, label]) => ({ label, pct: 0, value: '0 pts' })),
  },
  upsets: {
    title: 'Upsets Correctly Called',
    subtitle: 'No data yet',
    bars: [
      { label: 'Round of 64', pct: 0, value: '0' },
      { label: 'Round of 32', pct: 0, value: '0' },
      { label: 'Sweet 16', pct: 0, value: '0' },
      { label: 'Elite 8', pct: 0, value: '0' },
    ],
  },
  confidence: {
    title: 'Accuracy by Confidence Range',
    subtitle: 'How well-calibrated?',
    bars: [
      { label: '50-60%', pct: 0, value: '\u2014' },
      { label: '60-70%', pct: 0, value: '\u2014' },
      { label: '70-80%', pct: 0, value: '\u2014' },
      { label: '80%+', pct: 0, value: '\u2014' },
    ],
  },
  seeds: {
    title: 'Accuracy by Seed Range',
    subtitle: 'Pick correctness',
    bars: [
      { label: 'Seeds 1-4', pct: 0, value: '\u2014' },
      { label: 'Seeds 5-8', pct: 0, value: '\u2014' },
      { label: 'Seeds 9-12', pct: 0, value: '\u2014' },
      { label: 'Seeds 13-16', pct: 0, value: '\u2014' },
    ],
  },
};

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

export default function ModelDetailTabs({ model, bracket }: ModelDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activeMetric, setActiveMetric] = useState<Metric>('byRound');
  const [animated, setAnimated] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const chart = PLACEHOLDER_CHART[activeMetric];

  // Animate bars when chart changes
  useEffect(() => {
    setAnimated(false);
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true));
    });
    return () => cancelAnimationFrame(timer);
  }, [activeMetric, activeTab]);

  // Get championship path from bracket
  const champPath: { round: string; team: string; seed: number; opponent?: string }[] = [];
  if (bracket && bracket.champion) {
    for (const roundKey of ROUND_ORDER) {
      const games = bracket.rounds[roundKey as keyof typeof bracket.rounds] ?? [];
      for (const game of games) {
        if (game.pick === bracket.champion || game.team1 === bracket.champion || game.team2 === bracket.champion) {
          if (game.pick === bracket.champion) {
            const opponent = game.pick === game.team1 ? game.team2 : game.team1;
            const seed = game.pick === game.team1 ? game.seed1 : game.seed2;
            champPath.push({ round: ROUND_LABELS[roundKey] ?? roundKey, team: bracket.champion, seed, opponent });
          }
        }
      }
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'espn', label: 'ESPN' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-lab-border mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium relative transition-colors ${
              activeTab === tab.id ? '' : 'text-[#555] hover:text-lab-white'
            }`}
            style={{ color: activeTab === tab.id ? model.color : undefined }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-[-1px] left-0 right-0 h-0.5"
                style={{ background: model.color }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div>
          <p className="text-[15px] text-[#ccc] leading-[1.75] mb-7 pb-6 border-b border-[#222]">
            {model.description}
          </p>

          {/* Metric pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            {(['byRound', 'upsets', 'confidence', 'seeds'] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap ${
                  activeMetric === m ? '' : 'border-lab-border text-lab-muted hover:border-[#555] hover:text-lab-white'
                }`}
                style={
                  activeMetric === m
                    ? {
                        background: `${model.color}1f`,
                        borderColor: `${model.color}80`,
                        color: model.color,
                      }
                    : undefined
                }
              >
                {m === 'byRound' ? 'By Round' : m === 'upsets' ? 'Upsets' : m === 'confidence' ? 'Confidence' : 'Seeds'}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-lab-surface border border-[#2a2a2a] rounded-[10px] p-6 sm:p-7">
            <div className="flex justify-between items-baseline mb-5">
              <span className="text-[15px] font-semibold text-lab-white">{chart.title}</span>
              <span className="font-mono text-[11px] text-[#555]">{chart.subtitle}</span>
            </div>
            <div ref={chartRef} className="flex flex-col gap-4">
              {chart.bars.map((bar) => (
                <div key={bar.label} className="grid grid-cols-[130px_1fr_80px] sm:grid-cols-[130px_1fr_80px] gap-3.5 items-center">
                  <span className="text-[13px] text-[#aaa] text-right font-medium">{bar.label}</span>
                  <div className="h-3 bg-[#2a2a2a] rounded-md overflow-hidden relative">
                    <div
                      className="absolute top-0 left-0 h-full rounded-md"
                      style={{
                        background: `${model.color}26`,
                        width: animated ? `${bar.pct}%` : '0%',
                        transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1) 0.15s',
                      }}
                    />
                    <div
                      className="h-full rounded-md relative z-10"
                      style={{
                        background: model.color,
                        width: animated ? `${bar.pct}%` : '0%',
                        transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs font-medium" style={{ color: model.color }}>
                    {bar.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bracket tab */}
      {activeTab === 'bracket' && (
        <div>
          <p className="font-mono text-[11px] text-lab-muted uppercase tracking-[1.5px] mb-3.5 pb-2 border-b border-[#222]">
            {model.name}&apos;s Championship Path
          </p>
          <div className="flex flex-col gap-2.5">
            {champPath.length > 0 ? (
              champPath.map((pick, i) => {
                const isChamp = i === champPath.length - 1;
                return (
                  <div
                    key={pick.round}
                    className={`rounded-lg border p-3 sm:p-4 flex justify-between items-center ${
                      isChamp ? '' : 'bg-lab-surface border-[#2a2a2a]'
                    }`}
                    style={
                      isChamp
                        ? {
                            background: `${model.color}12`,
                            borderColor: `${model.color}55`,
                          }
                        : undefined
                    }
                  >
                    <span className="font-mono text-[11px] text-[#555] uppercase tracking-wider">
                      {pick.round}
                    </span>
                    <span>
                      <span
                        className={`font-semibold ${isChamp ? 'text-[15px]' : ''}`}
                        style={{ color: model.color }}
                      >
                        {pick.team} {isChamp && '\uD83C\uDFC6'}
                      </span>
                      {pick.opponent && (
                        <span className="text-lab-muted text-xs ml-2">
                          vs. {pick.opponent}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-lab-muted text-center py-8">
                Championship path will appear after picks are locked.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Methodology tab */}
      {activeTab === 'methodology' && (
        <div>
          <p className="font-mono text-[11px] text-lab-muted uppercase tracking-[1.5px] mb-3.5 pb-2 border-b border-[#222]">
            Methodology
          </p>
          <div className="text-[15px] text-[#ccc] leading-[1.75] space-y-4">
            <p>{model.description}</p>
            <p>
              Full methodology writeup will appear here on Selection Sunday (March 15).
              Each model&apos;s approach &mdash; what data it uses, how it processes matchups,
              and why it makes the choices it does &mdash; will be documented in detail
              before picks lock on March 19.
            </p>
          </div>
        </div>
      )}

      {/* ESPN tab */}
      {activeTab === 'espn' && (
        <div className="bg-lab-surface border border-[#2a2a2a] rounded-[10px] p-12 flex flex-col items-center gap-4 text-center">
          <span className="text-[40px]">&#127936;</span>
          <h3 className="text-xl font-bold text-lab-white">
            View {model.name} on ESPN
          </h3>
          <p className="text-sm text-lab-muted max-w-[440px] leading-relaxed">
            All picks were submitted to ESPN Tournament Challenge before the tournament
            began. This serves as immutable proof that no picks were altered retroactively.
          </p>
          {bracket?.espnBracketUrl ? (
            <a
              href={bracket.espnBracketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-sm text-white px-5 py-2.5 rounded-lg hover:opacity-85 transition-opacity"
              style={{ background: model.color }}
            >
              Open ESPN Bracket &#8599;
            </a>
          ) : (
            <span className="font-mono text-xs text-lab-muted">
              ESPN link available after March 19
            </span>
          )}
          <span className="font-mono text-[10px] text-[#444] uppercase tracking-wider">
            Locked March 19, 2026
          </span>
        </div>
      )}
    </div>
  );
}
