import Link from 'next/link';
import { MODELS } from '@/lib/models';
import VoteWidget from '@/components/VoteWidget';

// Pre-tournament placeholder champion picks per model
// TODO: Replace with data/models/[slug].json champion once picks are locked
const CHAMPION_PICKS: Record<string, string> = {
  'the-scout':      'TBD',
  'the-quant':      'TBD',
  'the-historian':  'TBD',
  'the-chaos-agent':'TBD',
  'the-agent':      'TBD',
};

export default function Home() {
  const tournamentStart = new Date('2026-03-20');
  const today = new Date('2026-03-10'); // hardcoded to today per CLAUDE.md
  const isLive = today >= tournamentStart;

  return (
    <div className="mx-auto max-w-6xl px-6">

      {/* ---- Hero ---- */}
      <section className="pt-20 pb-16 text-center relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-fade-1 mb-4">
          <span className="inline-block font-mono text-xs text-lab-muted border border-lab-border rounded-full px-4 py-1.5 uppercase tracking-widest">
            March Madness 2026 Experiment
          </span>
        </div>

        <h1 className="hero-fade-2 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-lab-white mb-5 leading-[1.1]">
          Five AI Models.{' '}
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

        <p className="hero-fade-3 text-base text-lab-muted max-w-xl mx-auto mb-8 leading-relaxed">
          A Monte Carlo simulator, an LLM scout, a historical twin-finder, an upset detector,
          and an autonomous AI agent each build their own March Madness bracket.
          Track which one survives.
        </p>

        <div className="hero-fade-4 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/brackets"
            className="bg-lab-white text-lab-bg font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-opacity-90 transition-all"
            style={{ boxShadow: '0 0 24px rgba(59,130,246,0.2)' }}
          >
            View Brackets
          </Link>
          <Link
            href="/blog"
            className="border border-lab-border text-lab-text font-medium text-sm px-6 py-2.5 rounded-lg hover:border-lab-muted transition-all"
          >
            Blog &amp; Recaps
          </Link>
        </div>
      </section>

      {/* ---- Stats bar ---- */}
      <section className="mb-14">
        <div className="flex items-center justify-center gap-8 sm:gap-14 py-5 border-y border-lab-border">
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-lab-white">5</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mt-0.5">Models</p>
          </div>
          <div className="w-px h-8 bg-lab-border" />
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-lab-white">63</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mt-0.5">Games</p>
          </div>
          <div className="w-px h-8 bg-lab-border" />
          <div className="text-center">
            <p className="font-mono text-2xl font-semibold text-lab-white">
              {isLive ? 'LIVE' : 'Mar 20'}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mt-0.5">
              {isLive ? 'Tournament' : 'Tip-off'}
            </p>
          </div>
        </div>
      </section>

      {/* ---- Compact leaderboard ---- */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-mono uppercase tracking-widest text-lab-muted">Leaderboard</h2>
          <span className="text-xs font-mono text-lab-muted">
            {isLive ? 'Live scores' : 'Picks lock Mar 19'}
          </span>
        </div>

        <div className="rounded-2xl border border-lab-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-lab-muted w-8">#</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-lab-muted">Model</th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-lab-muted hidden sm:table-cell">Score</th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-lab-muted hidden md:table-cell">Accuracy</th>
                <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-lab-muted">Champion Pick</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((model, i) => (
                <tr
                  key={model.id}
                  className="border-b border-lab-border last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-lab-muted text-xs">{i + 1}</td>
                  <td className="px-4 py-4">
                    <Link href={`/brackets?model=${model.id}`} className="flex items-center gap-3 group">
                      <span
                        className="w-1.5 h-8 rounded-full flex-shrink-0"
                        style={{ background: model.color }}
                      />
                      <span className="font-medium text-lab-white group-hover:underline underline-offset-2">
                        {model.icon} {model.name}
                      </span>
                      <span className="hidden sm:inline text-xs text-lab-muted">{model.subtitle}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-lab-muted hidden sm:table-cell">—</td>
                  <td className="px-4 py-4 text-right font-mono text-lab-muted hidden md:table-cell">—</td>
                  <td className="px-5 py-4 text-right font-mono text-xs text-lab-muted">
                    {CHAMPION_PICKS[model.id] === 'TBD'
                      ? <span className="text-lab-muted">TBD</span>
                      : <span className="text-lab-white">{CHAMPION_PICKS[model.id]}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Model scroll sections ---- */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-mono uppercase tracking-widest text-lab-muted">The Models</h2>
          <Link href="/brackets" className="text-xs text-lab-muted hover:text-lab-white transition-colors font-mono">
            View all brackets →
          </Link>
        </div>

        <div className="space-y-4">
          {MODELS.map((model, i) => (
            <div
              key={model.id}
              className="group rounded-2xl border bg-lab-surface overflow-hidden transition-all duration-150 hover:border-opacity-60"
              style={{ borderColor: `${model.color}2a` }}
            >
              <div className="flex items-stretch">
                {/* Color accent bar */}
                <div
                  className="w-1 flex-shrink-0"
                  style={{ background: model.color }}
                />

                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Number + icon */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        <span className="font-mono text-[10px] text-lab-muted">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-2xl">{model.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-bold tracking-tight" style={{ color: model.color }}>
                            {model.name}
                          </h3>
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider"
                            style={{ background: `${model.color}15`, color: model.color }}
                          >
                            {model.subtitle}
                          </span>
                        </div>
                        <p
                          className="text-sm text-lab-muted mb-3 italic"
                          style={{ fontFamily: 'var(--font-serif)' }}
                        >
                          &ldquo;{model.tagline}&rdquo;
                        </p>
                        <p className="text-sm text-lab-muted leading-relaxed max-w-2xl">
                          {model.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: champion + CTAs */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-lab-muted mb-1">Champion</p>
                        <p className="font-mono text-sm text-lab-muted">
                          {CHAMPION_PICKS[model.id] === 'TBD' ? '—' : CHAMPION_PICKS[model.id]}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/brackets?model=${model.id}`}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150 hover:border-opacity-80"
                          style={{ color: model.color, borderColor: `${model.color}44`, background: `${model.color}0d` }}
                        >
                          Bracket
                        </Link>
                        <Link
                          href={`/models/${model.slug}`}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all duration-150"
                        >
                          Methodology
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Vote widget ---- */}
      <section className="mb-16 max-w-2xl mx-auto">
        <VoteWidget />
      </section>

    </div>
  );
}
