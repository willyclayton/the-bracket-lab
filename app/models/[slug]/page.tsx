import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MODELS } from '@/lib/models';
import { BracketData } from '@/lib/types';
import ModelDetailTabs from '@/components/ModelDetailTabs';

import scoutData     from '@/data/models/the-scout.json';
import quantData     from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData     from '@/data/models/the-chaos-agent.json';
import agentData     from '@/data/models/the-agent.json';

const BRACKET_MAP: Record<string, BracketData> = {
  'the-scout':       scoutData     as unknown as BracketData,
  'the-quant':       quantData     as unknown as BracketData,
  'the-historian':   historianData as unknown as BracketData,
  'the-chaos-agent': chaosData     as unknown as BracketData,
  'the-agent':       agentData     as unknown as BracketData,
};

export function generateStaticParams() {
  return MODELS.map((model) => ({ slug: model.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const model = MODELS.find((m) => m.slug === params.slug);
  if (!model) return { title: 'Not Found' };
  return {
    title: `${model.name} — The Bracket Lab`,
    description: `${model.tagline} ${model.description}`,
  };
}

export default function ModelPage({ params }: { params: { slug: string } }) {
  const model = MODELS.find((m) => m.slug === params.slug);
  if (!model) notFound();

  const index = MODELS.findIndex((m) => m.slug === params.slug);
  const prevModel = index > 0 ? MODELS[index - 1] : null;
  const nextModel = index < MODELS.length - 1 ? MODELS[index + 1] : null;
  const bracket = BRACKET_MAP[model.id] ?? null;

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-6 pb-16">
      {/* ---- Model nav strip ---- */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {/* Prev arrow */}
        {prevModel ? (
          <Link
            href={`/models/${prevModel.slug}`}
            className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all text-sm"
            aria-label={`Previous: ${prevModel.name}`}
          >
            &#8592;
          </Link>
        ) : (
          <span className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-[#333] text-sm">
            &#8592;
          </span>
        )}

        {/* Model buttons */}
        {MODELS.map((m) => {
          const isCurrent = m.id === model.id;
          return (
            <Link
              key={m.id}
              href={`/models/${m.slug}`}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isCurrent
                  ? 'bg-white/[0.08] text-lab-white'
                  : 'text-lab-muted hover:text-lab-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: m.color }}
              />
              <span className="hidden sm:inline">{m.name}</span>
              <span className="sm:hidden">{m.icon}</span>
            </Link>
          );
        })}

        {/* Next arrow */}
        {nextModel ? (
          <Link
            href={`/models/${nextModel.slug}`}
            className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all text-sm"
            aria-label={`Next: ${nextModel.name}`}
          >
            &#8594;
          </Link>
        ) : (
          <span className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-[#333] text-sm">
            &#8594;
          </span>
        )}
      </div>

      {/* ---- Header card with stat tiles ---- */}
      <div
        className="bg-lab-surface border border-[#2a2a2a] rounded-[10px] p-7 sm:p-8 mb-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-7 flex-wrap"
        style={{ borderTopWidth: '3px', borderTopColor: model.color }}
      >
        {/* Left: emoji + name + tagline */}
        <div className="flex items-center gap-5 flex-1 min-w-[280px]">
          <div
            className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-[44px] flex-shrink-0 border"
            style={{
              background: `${model.color}1a`,
              borderColor: `${model.color}33`,
            }}
          >
            {model.icon}
          </div>
          <div>
            <h1
              className="text-4xl font-bold tracking-tight leading-none mb-1.5"
              style={{ color: model.color }}
            >
              {model.name}
            </h1>
            <p
              className="text-base text-lab-muted italic"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {model.tagline}
            </p>
          </div>
        </div>

        {/* Right: stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 flex-shrink-0">
          <div className="bg-lab-bg border border-[#2a2a2a] rounded-lg px-3.5 py-3 min-w-[100px]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">
              Score
            </span>
            <span className="text-[22px] font-bold leading-none" style={{ color: model.color }}>
              &mdash;
            </span>
          </div>
          <div className="bg-lab-bg border border-[#2a2a2a] rounded-lg px-3.5 py-3 min-w-[100px]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">
              Rank
            </span>
            <span className="text-lg font-bold text-lab-white leading-none">
              &mdash;
            </span>
          </div>
          <div className="bg-lab-bg border border-[#2a2a2a] rounded-lg px-3.5 py-3 min-w-[100px]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">
              Accuracy
            </span>
            <span className="text-[22px] font-bold leading-none" style={{ color: model.color }}>
              &mdash;
            </span>
          </div>
          <div className="bg-lab-bg border border-[#2a2a2a] rounded-lg px-3.5 py-3 min-w-[100px]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">
              Champion
            </span>
            <span className="text-lg font-bold text-lab-white leading-none">
              {bracket?.champion ?? '\u2014'}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <ModelDetailTabs model={model} bracket={bracket} />
    </div>
  );
}
