import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { MODELS } from '@/lib/models';
import { BracketData } from '@/lib/types';
import ModelDetailTabs from '@/components/ModelDetailTabs';
import ModelNavStrip from '@/components/ModelNavStrip';

import scoutData     from '@/data/models/the-scout.json';
import quantData     from '@/data/models/the-quant.json';
import historianData from '@/data/models/the-historian.json';
import chaosData     from '@/data/models/the-chaos-agent.json';
import agentData     from '@/data/models/the-agent.json';
import superAgentData from '@/data/models/the-super-agent.json';
import optimizerData from '@/data/models/the-optimizer.json';

const BRACKET_MAP: Record<string, BracketData> = {
  'the-scout':       scoutData     as unknown as BracketData,
  'the-quant':       quantData     as unknown as BracketData,
  'the-historian':   historianData as unknown as BracketData,
  'the-chaos-agent': chaosData     as unknown as BracketData,
  'the-agent':       agentData     as unknown as BracketData,
  'the-super-agent': superAgentData as unknown as BracketData,
  'the-optimizer':   optimizerData as unknown as BracketData,
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

  const bracket = BRACKET_MAP[model.id] ?? null;

  const mdxPath = path.join(process.cwd(), 'content/models', `${model.slug}.mdx`);
  const methodologyContent = fs.existsSync(mdxPath)
    ? <MDXRemote source={fs.readFileSync(mdxPath, 'utf8')} />
    : null;

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-6 pb-16">
      {/* ---- Model nav strip ---- */}
      <ModelNavStrip currentSlug={params.slug} />

      {/* ---- Header card with stat tiles ---- */}
      <div
        className="bg-lab-surface border border-[#2a2a2a] rounded-[10px] p-7 sm:p-8 mb-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-7 flex-wrap"
        style={{ borderTopWidth: '3px', borderTopColor: model.color }}
      >
        {/* Left: emoji + name + tagline */}
        <div className="flex items-center gap-5 flex-1">
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

        {/* Right: horizontal stat bar */}
        <div className="flex border border-[#2a2a2a] rounded-lg overflow-hidden flex-shrink-0">
          <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Score</span>
            <span className="font-mono text-sm font-bold leading-none" style={{ color: model.color }}>&mdash;</span>
          </div>
          <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Rank</span>
            <span className="font-mono text-sm font-bold text-lab-white leading-none">&mdash;</span>
          </div>
          <div className="flex-1 text-center py-2.5 px-2 border-r border-[#2a2a2a]">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Accuracy</span>
            <span className="font-mono text-sm font-bold leading-none" style={{ color: model.color }}>&mdash;</span>
          </div>
          <div className="flex-1 text-center py-2.5 px-2">
            <span className="font-mono text-[9px] text-[#555] uppercase tracking-wider block mb-0.5">Champion</span>
            <span className="font-mono text-sm font-bold text-lab-white leading-none">
              {bracket?.champion ?? '\u2014'}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <ModelDetailTabs model={model} bracket={bracket} methodologyContent={methodologyContent} />
    </div>
  );
}
