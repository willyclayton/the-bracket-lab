'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Model, MAX_SCORE } from '@/lib/models';

const CYCLE_MS = 4500;

const GLOW_CLASS: Record<string, string> = {
  'the-scout': 'card-glow-scout',
  'the-quant': 'card-glow-quant',
  'the-historian': 'card-glow-historian',
  'the-chaos-agent': 'card-glow-chaos',
  'the-agent': 'card-glow-agent',
  'the-super-agent': 'card-glow-superagent',
  'the-optimizer': 'card-glow-optimizer',
  'the-scout-prime': 'card-glow-scoutprime',
  'the-auto-researcher': 'card-glow-autoresearcher',
};

interface ModelEntry {
  model: Model;
  champion: string;
  score?: number;
  accuracy?: number;
  rank?: number;
}

export default function HomeModelStrip({ entries }: { entries: ModelEntry[] }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const miniRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % entries.length);
    }, CYCLE_MS);
  }, [entries.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // Scroll active mini into view
  useEffect(() => {
    miniRefs.current[active]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [active]);

  const goTo = (idx: number) => {
    setActive(idx);
    resetTimer();
  };

  const entry = entries[active];
  const { model, champion, score, accuracy, rank } = entry;
  const hasData = score !== undefined && score > 0;
  const progressPct = hasData ? Math.round((score / MAX_SCORE) * 100) : 0;

  return (
    <div>
      {/* Mini-card strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {entries.map((e, i) => {
          const isActive = i === active;
          const eHasData = e.score !== undefined && e.score > 0;
          return (
            <button
              key={e.model.id}
              ref={(el) => { miniRefs.current[i] = el; }}
              onClick={() => goTo(i)}
              className="flex-shrink-0 w-[100px] rounded-[10px] border text-center py-2.5 px-2 transition-all duration-200"
              style={{
                borderColor: isActive ? e.model.color : '#333',
                background: isActive ? '#252525' : '#1e1e1e',
                boxShadow: isActive ? `0 4px 16px ${e.model.color}44` : 'none',
              }}
            >
              <div className="text-xl mb-1">{e.model.icon}</div>
              <div
                className="text-[10px] font-bold leading-tight"
                style={{ color: e.model.color }}
              >
                {e.model.name}
              </div>
              <div className="font-mono text-[9px] text-lab-muted mt-1">
                {e.champion}
              </div>
              <div
                className="font-mono text-sm font-bold mt-0.5"
                style={{ color: e.model.color }}
              >
                {eHasData ? e.score : '\u2014'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Auto-cycling indicator */}
      <div className="text-center font-mono text-[10px] text-[#555] mb-3">
        <span className="inline-block w-1 h-1 rounded-full bg-current mx-0.5 animate-pulse" />
        <span className="inline-block w-1 h-1 rounded-full bg-current mx-0.5 animate-pulse [animation-delay:300ms]" />
        <span className="inline-block w-1 h-1 rounded-full bg-current mx-0.5 animate-pulse [animation-delay:600ms]" />
        {' '}auto-cycling
      </div>

      {/* Detail card */}
      <div
        key={model.id}
        className={`rounded-2xl border bg-lab-surface p-6 overflow-hidden animate-slideUp ${GLOW_CLASS[model.id] ?? ''}`}
        style={{ borderColor: model.color }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-[26px]">{model.icon}</span>
          <span className="text-xl font-bold" style={{ color: model.color }}>
            {model.name}
          </span>
        </div>

        {/* Subtitle */}
        <p className="font-mono text-[11px] text-[#666] uppercase tracking-wider mb-2">
          {model.subtitle}
        </p>

        {/* Tagline */}
        <p
          className="text-sm text-lab-muted italic mb-4"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          &ldquo;{model.tagline}&rdquo;
        </p>

        {/* Glass stat panel */}
        <div className="rounded-[10px] border border-white/[0.08] bg-[rgba(30,30,30,0.6)] backdrop-blur-[20px] p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#666] mb-0.5">
                Score
              </p>
              <p className="font-mono text-lg font-semibold" style={{ color: model.color }}>
                {hasData ? score : '\u2014'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#666] mb-0.5">
                Accuracy
              </p>
              <p className="font-mono text-lg font-semibold text-lab-white">
                {hasData ? `${accuracy}%` : '\u2014'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#666] mb-0.5">
                Rank
              </p>
              <p className="font-mono text-lg font-semibold text-lab-white">
                {hasData ? `#${rank}` : '\u2014'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#666] mb-0.5">
                Champion
              </p>
              <p className="font-mono text-sm font-semibold text-lab-white">
                {champion}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex justify-between font-mono text-[9px] text-[#666] mb-1">
            <span>Progress</span>
            <span>{hasData ? `${score} / ${MAX_SCORE}` : `0 / ${MAX_SCORE}`}</span>
          </div>
          <div className="w-full h-[5px] bg-lab-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${progressPct}%`, background: model.color }}
            />
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-5">
          <Link
            href={`/brackets?model=${model.id}`}
            className="font-mono text-xs hover:opacity-80 transition-opacity"
            style={{ color: model.color }}
          >
            View bracket &rarr;
          </Link>
          <Link
            href={`/models/${model.slug}`}
            className="font-mono text-xs text-lab-muted hover:opacity-80 transition-opacity"
          >
            How it works &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
