import ModelCard from '@/components/ModelCard';
import { MODELS } from '@/lib/models';

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* ---- Hero ---- */}
      <section className="pt-20 pb-16 text-center relative overflow-hidden">
        {/* Radial glow — scout blue. Swap rgba color to change scheme. */}
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-fade-1 mb-4">
          <span className="inline-block font-mono text-xs text-lab-muted border border-lab-border rounded-full px-4 py-1.5">
            MARCH MADNESS 2026 EXPERIMENT
          </span>
        </div>
        <h1 className="hero-fade-2 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-lab-white mb-4 leading-[1.1]">
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400 }}>
            Five
          </span>{' '}
          AI Models.{' '}
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            One
          </span>{' '}
          Tournament.
        </h1>
        <p className="hero-fade-3 text-lg text-lab-muted max-w-2xl mx-auto mb-8">
          A Monte Carlo simulator, an LLM scout, a historical twin-matcher, an upset detector,
          and an autonomous AI agent walk into March Madness. Only one bracket survives.
        </p>
        <div className="hero-fade-4 flex items-center justify-center gap-4">
          <a
            href="/dashboard"
            className="bg-lab-white text-lab-bg font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-opacity-90 transition-all"
            style={{ boxShadow: '0 0 24px rgba(59,130,246,0.25)' }}
          >
            Live Dashboard →
          </a>
          <a
            href="/models"
            className="border border-lab-border text-lab-text font-medium text-sm px-6 py-2.5 rounded-lg hover:border-lab-muted transition-all"
          >
            Meet the Models
          </a>
        </div>
      </section>

      {/* ---- Picks Lock Banner (remove after March 19) ---- */}
      <section className="mb-12">
        <div className="rounded-xl border border-dashed border-lab-border bg-lab-surface/50 p-6 text-center">
          <p className="font-mono text-sm text-lab-muted">
            🔒 ALL PICKS LOCK <span className="text-lab-white font-semibold">MARCH 19</span> — VERIFIED VIA ESPN TOURNAMENT CHALLENGE
          </p>
        </div>
      </section>

      {/* ---- Model Cards ---- */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold text-lab-white">The Models</h2>
          <span className="text-xs font-mono text-lab-muted">
            {MODELS.length} COMPETING
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODELS.map((model, i) => (
            <ModelCard
              key={model.id}
              model={model}
              index={i}
              // TODO: Pull from bracket JSON once picks are locked
              // champion={bracketData.champion}
              // score={scores.total}
            />
          ))}
        </div>
      </section>

      {/* ---- Voting ---- */}
      <section className="mb-16">
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center">
          <h2 className="text-lg font-bold text-lab-white mb-2">
            Which model are you riding with?
          </h2>
          <p className="text-sm text-lab-muted mb-6">
            Pick your favorite before the tournament starts. No switching.
          </p>
          {/* TODO: Voting widget */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {MODELS.map((model) => (
              <button
                key={model.id}
                className="border border-lab-border rounded-lg px-4 py-2 text-sm font-medium
                  hover:border-opacity-60 transition-all cursor-pointer"
                style={{
                  color: model.color,
                  borderColor: `${model.color}33`,
                }}
              >
                {model.icon} {model.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Email Signup ---- */}
      <section className="mb-16">
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center">
          <h2 className="text-lg font-bold text-lab-white mb-2">
            Follow the experiment
          </h2>
          <p className="text-sm text-lab-muted mb-4">
            Round recaps, model obituaries, and the final results — delivered to your inbox.
          </p>
          {/* TODO: Replace with Buttondown embed */}
          <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@email.com"
              className="flex-1 bg-lab-bg border border-lab-border rounded-lg px-4 py-2.5 text-sm
                text-lab-text placeholder:text-lab-muted focus:outline-none focus:border-scout transition-colors"
            />
            <button className="bg-scout text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-opacity-90 transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
