'use client';

import Link from 'next/link';
import { Model, MAX_SCORE } from '@/lib/models';

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

interface HomeModelCardProps {
  model: Model;
  champion: string;
  score?: number;
  accuracy?: number;
  rank?: number;
}

export default function HomeModelCard({
  model,
  champion,
  score,
  accuracy,
  rank,
}: HomeModelCardProps) {
  const hasData = score !== undefined;
  const progressPct = hasData ? Math.round((score / MAX_SCORE) * 100) : 0;

  return (
    <div
      className={`relative rounded-2xl border border-lab-border bg-lab-surface p-8 overflow-hidden transition-all duration-200 hover:-translate-y-1 ${GLOW_CLASS[model.id] ?? ''}`}
      style={{
        // Border color changes on hover via CSS
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = model.color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '';
      }}
    >
      {/* Header */}
      <div className="relative flex items-center gap-2.5 mb-1.5">
        <span className="text-[28px]">{model.icon}</span>
        <span className="text-xl font-bold" style={{ color: model.color }}>
          {model.name}
        </span>
      </div>

      {/* Tagline */}
      <p
        className="relative text-sm text-lab-muted italic mb-3"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        &ldquo;{model.tagline}&rdquo;
      </p>

      {/* Description */}
      <p className="relative text-[13px] text-[#aaa] leading-relaxed mb-5">
        {model.description}
      </p>

      {/* Glass stat panel */}
      <div className="relative rounded-[10px] border border-white/[0.08] bg-[rgba(30,30,30,0.6)] backdrop-blur-[20px] p-5 mb-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
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
      <div className="relative flex flex-col gap-2.5">
        <Link
          href={`/brackets?model=${model.id}`}
          className="relative inline-block font-mono text-xs hover:opacity-80 transition-opacity"
          style={{ color: model.color }}
        >
          View bracket &rarr;
        </Link>
        <Link
          href={`/models/${model.slug}`}
          className="relative inline-block font-mono text-xs text-lab-muted hover:opacity-80 transition-opacity"
        >
          How it works &rarr;
        </Link>
      </div>
    </div>
  );
}
