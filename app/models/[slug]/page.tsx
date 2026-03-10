import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MODELS } from '@/lib/models';

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

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-lab-muted mb-8">
        <Link href="/" className="hover:text-lab-white transition-colors">Home</Link>
        <span>/</span>
        <span style={{ color: model.color }}>{model.name}</span>
      </div>

      {/* Header */}
      <div
        className="rounded-2xl border p-8 mb-8 flex flex-col sm:flex-row gap-6 sm:items-start"
        style={{ borderColor: `${model.color}2a`, background: `${model.color}07` }}
      >
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <span
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${model.color}15` }}
          >
            {model.icon}
          </span>
          <span className="font-mono text-[10px] text-lab-muted">
            MODEL {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: model.color }}>
              {model.name}
            </h1>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded uppercase tracking-widest"
              style={{ background: `${model.color}15`, color: model.color }}
            >
              {model.subtitle}
            </span>
          </div>
          <p className="text-base italic text-lab-muted mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
            &ldquo;{model.tagline}&rdquo;
          </p>
          <p className="text-sm text-lab-muted leading-relaxed">
            {model.description}
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex gap-3 mb-10 flex-wrap">
        <Link
          href={`/brackets?model=${model.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border transition-all duration-150"
          style={{ color: model.color, borderColor: `${model.color}44`, background: `${model.color}0d` }}
        >
          View Full Bracket →
        </Link>
        <Link
          href="/brackets"
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all duration-150"
        >
          Compare All Models
        </Link>
      </div>

      {/* Methodology */}
      <section
        className="rounded-2xl border bg-lab-surface p-8 mb-6"
        style={{ borderColor: `${model.color}1a` }}
      >
        <h2 className="text-lg font-bold text-lab-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full inline-block" style={{ background: model.color }} />
          Methodology
        </h2>
        {/* TODO: Load MDX content from /content/models/{slug}.mdx */}
        <div className="text-sm text-lab-muted leading-relaxed space-y-3">
          <p>Full methodology writeup will appear here on Selection Sunday (March 15).</p>
          <p>
            Each model&apos;s approach — what data it uses, how it processes matchups, and why it
            makes the choices it does — will be documented in detail before picks lock on March 19.
          </p>
        </div>
      </section>

      {/* Bracket preview */}
      <section className="rounded-2xl border border-lab-border bg-lab-surface p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-lab-white flex items-center gap-2">
            <span className="w-1 h-5 rounded-full inline-block bg-lab-border" />
            Full Bracket
          </h2>
          <Link
            href={`/brackets?model=${model.id}`}
            className="text-xs font-medium transition-colors hover:underline underline-offset-2"
            style={{ color: model.color }}
          >
            Open bracket view →
          </Link>
        </div>
        <div className="text-center py-12 text-sm text-lab-muted">
          <p className="font-mono text-2xl mb-3">🔒</p>
          <p>Picks lock March 19</p>
          <p className="mt-1 text-xs">Bracket visualization will appear after the First Four.</p>
        </div>
      </section>

      {/* ESPN verification */}
      <section className="rounded-2xl border border-lab-border bg-lab-surface p-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: model.color }} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mb-1">
              ESPN Tournament Challenge
            </p>
            <p className="text-sm text-lab-muted">
              Each model&apos;s bracket will be entered into ESPN Tournament Challenge as timestamp
              proof that picks were locked before games start. Link posted March 19.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
