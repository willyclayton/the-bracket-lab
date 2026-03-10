'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MODELS } from '@/lib/models';
import { BracketData, Results } from '@/lib/types';
import BracketTree from '@/components/BracketTree';

// 2026 (current — will be populated before tournament)
import scoutData     from '@/data/models/the-scout.json';
import quantData     from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData     from '@/data/models/the-chaos-agent.json';
import agentData     from '@/data/models/the-agent.json';
import results2026   from '@/data/results/actual-results.json';

// 2025 (archive)
import scoutData2025     from '@/data/archive/2025/models/the-scout.json';
import quantData2025     from '@/data/archive/2025/models/the-quant.json';
import historianData2025 from '@/data/archive/2025/models/the-historian.json';
import chaosData2025     from '@/data/archive/2025/models/the-chaos-agent.json';
import agentData2025     from '@/data/archive/2025/models/the-agent.json';
import results2025       from '@/data/archive/2025/results/actual-results.json';

const VALID_YEARS = ['2026', '2025'] as const;
type Year = typeof VALID_YEARS[number];

const BRACKET_DATA: Record<Year, Record<string, BracketData>> = {
  '2026': {
    'the-scout':       scoutData     as unknown as BracketData,
    'the-quant':       quantData     as unknown as BracketData,
    'the-historian':   historianData as unknown as BracketData,
    'the-chaos-agent': chaosData     as unknown as BracketData,
    'the-agent':       agentData     as unknown as BracketData,
  },
  '2025': {
    'the-scout':       scoutData2025     as unknown as BracketData,
    'the-quant':       quantData2025     as unknown as BracketData,
    'the-historian':   historianData2025 as unknown as BracketData,
    'the-chaos-agent': chaosData2025     as unknown as BracketData,
    'the-agent':       agentData2025     as unknown as BracketData,
  },
};

const ALL_RESULTS: Record<Year, Results> = {
  '2026': results2026 as unknown as Results,
  '2025': results2025 as unknown as Results,
};

export default function BracketsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const yearParam = searchParams.get('year');
  const activeYear: Year = VALID_YEARS.includes(yearParam as Year) ? (yearParam as Year) : '2026';

  const modelParam = searchParams.get('model');
  const defaultModel = MODELS[0].id;
  const activeModelId = MODELS.find((m) => m.id === modelParam)?.id ?? defaultModel;
  const activeModel = MODELS.find((m) => m.id === activeModelId)!;

  const bracket = BRACKET_DATA[activeYear][activeModelId];
  const results = ALL_RESULTS[activeYear];

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">

      {/* ---- Page header ---- */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lab-white mb-1">Brackets</h1>
          <p className="text-sm text-lab-muted">
            Select a model to explore its full bracket. Click any game to read the reasoning.
          </p>
        </div>
        {/* Year toggle */}
        <div className="flex gap-1 flex-shrink-0">
          {VALID_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => selectYear(year)}
              className="font-mono text-xs px-3 py-1.5 rounded-lg border transition-all duration-150"
              style={{
                borderColor: activeYear === year ? '#888888' : '#333333',
                color: activeYear === year ? '#efefef' : '#666666',
                background: activeYear === year ? '#1e1e1e' : 'transparent',
              }}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Model tabs ---- */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 border-b border-lab-border">
        {MODELS.map((model) => {
          const isActive = model.id === activeModelId;
          return (
            <button
              key={model.id}
              onClick={() => selectModel(model.id)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 relative"
              style={{ color: isActive ? model.color : '#888' }}
            >
              <span>{model.icon}</span>
              <span>{model.name}</span>
              {/* Active underline */}
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-150"
                style={{ background: isActive ? model.color : 'transparent' }}
              />
            </button>
          );
        })}
      </div>

      {/* ---- Model summary card ---- */}
      <div
        className="rounded-2xl border bg-lab-surface p-6 mb-8 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between"
        style={{ borderColor: `${activeModel.color}2a` }}
      >
        <div className="flex items-start gap-4">
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${activeModel.color}15` }}
          >
            {activeModel.icon}
          </span>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-bold" style={{ color: activeModel.color }}>
                {activeModel.name}
              </h2>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider"
                style={{ background: `${activeModel.color}15`, color: activeModel.color }}
              >
                {activeModel.subtitle}
              </span>
            </div>
            <p className="text-sm italic text-lab-muted" style={{ fontFamily: 'var(--font-serif)' }}>
              &ldquo;{activeModel.tagline}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          {/* Champion */}
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mb-1">Champion</p>
            <p className="font-mono text-sm text-lab-white">
              {bracket?.champion || '—'}
            </p>
          </div>
          {/* Score */}
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mb-1">Score</p>
            <p className="font-mono text-sm text-lab-muted">—</p>
          </div>
          {/* Links */}
          <div className="flex flex-col gap-2">
            <Link
              href={`/models/${activeModel.slug}`}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all duration-150"
            >
              Methodology →
            </Link>
            {bracket?.espnBracketUrl ? (
              <a
                href={bracket.espnBracketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 text-center"
                style={{ color: activeModel.color, borderColor: `${activeModel.color}44`, background: `${activeModel.color}0d` }}
              >
                ESPN →
              </a>
            ) : (
              <span className="text-xs font-mono text-lab-muted px-3 py-1.5 text-center">
                ESPN TBD
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---- Bracket tree ---- */}
      <BracketTree
        bracket={bracket}
        modelColor={activeModel.color}
        results={results}
      />

    </div>
  );
}
