import { notFound } from 'next/navigation';
import { MODELS } from '@/lib/models';

// Generate static paths for all models
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-xs text-lab-muted">
            MODEL {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded border"
            style={{ color: model.color, borderColor: `${model.color}44` }}>
            {model.subtitle}
          </span>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-4xl">{model.icon}</span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: model.color }}>
              {model.name}
            </h1>
            <p className="text-lg mt-1 italic text-lab-muted" style={{ fontFamily: 'var(--font-serif)' }}>
              &ldquo;{model.tagline}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="prose mb-12">
        <p className="text-base leading-relaxed text-lab-text">
          {model.description}
        </p>
      </div>

      {/* Methodology (placeholder — will be replaced with MDX content) */}
      <section className={`rounded-xl border bg-lab-surface p-8 mb-8 ${model.bgClass}`}
        style={{ borderColor: `${model.color}22` }}>
        <h2 className="text-lg font-bold text-lab-white mb-4">Methodology</h2>
        <div className="text-sm text-lab-muted">
          <p>Full methodology writeup coming March 15 (Selection Sunday).</p>
          {/* TODO: Load MDX content from /content/models/{slug}.mdx */}
        </div>
      </section>

      {/* Bracket (placeholder) */}
      <section className="rounded-xl border border-lab-border bg-lab-surface p-8 mb-8">
        <h2 className="text-lg font-bold text-lab-white mb-4">Full Bracket</h2>
        <div className="text-sm text-lab-muted text-center py-12">
          <p>🔒 Picks lock March 19</p>
          <p className="mt-2">Bracket visualization will appear here.</p>
        </div>
      </section>

      {/* ESPN Link (placeholder) */}
      <section className="rounded-xl border border-lab-border bg-lab-surface p-6 text-center">
        <p className="text-xs font-mono text-lab-muted mb-2">VERIFIED ON</p>
        <p className="text-sm text-lab-text">
          ESPN Tournament Challenge bracket link will be posted once picks are locked.
        </p>
        {/* TODO: <a href={bracketData.espnBracketUrl}>View on ESPN →</a> */}
      </section>
    </div>
  );
}
