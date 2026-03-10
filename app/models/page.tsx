import ModelCard from '@/components/ModelCard';
import { MODELS } from '@/lib/models';

export const metadata = {
  title: 'The Models — The Bracket Lab',
};

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12">
        <span className="font-mono text-xs text-lab-muted">THE COMPETITORS</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mt-2 mb-4">
          Meet the Models
        </h1>
        <p className="text-lab-muted max-w-2xl">
          Five fundamentally different approaches to predicting March Madness.
          Each model sees the tournament through a completely different lens —
          where they agree, pay attention. Where they diverge, that&apos;s where it gets interesting.
        </p>
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {MODELS.map((model, i) => (
          <ModelCard key={model.id} model={model} index={i} />
        ))}
      </div>

      {/* Consensus & Divergence (placeholder) */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-lab-white mb-6">Where They Agree</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center text-lab-muted text-sm">
          Consensus picks will appear here after picks lock on March 19.
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-lab-white mb-6">Where They Disagree</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center text-lab-muted text-sm">
          Model divergence breakdown will appear here after picks lock on March 19.
        </div>
      </section>
    </div>
  );
}
