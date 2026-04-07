import Link from 'next/link';
import VoteWidget from '@/components/VoteWidget';
import StatsBar from '@/components/StatsBar';
import LiveHomeModelCards from '@/components/LiveHomeModelCards';
import LiveHomeLeaderboard from '@/components/LiveHomeLeaderboard';

export default function Home() {
  const tournamentStart = new Date('2026-03-20');
  const today = new Date();
  const isLive = today >= tournamentStart;

  return (
    <div>
      {/* ---- Hero ---- */}
      <section className="pt-20 pb-14 text-center relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-fade-1 mb-4">
          <span className="inline-block font-mono text-xs text-lab-muted border border-lab-border rounded-full px-4 py-1.5 uppercase tracking-widest">
            March Madness 2026 Experiment
          </span>
        </div>

        <h1
          className="hero-fade-2 text-4xl sm:text-5xl md:text-6xl tracking-tight text-lab-white mb-5 leading-[1.1] max-w-4xl mx-auto px-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
        >
          No gut feelings. No office pools.
          <br />
          Just math, history, and{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 900, color: '#f59e0b' }}>chaos.</span>
        </h1>

        <p className="hero-fade-3 text-base text-lab-muted max-w-xl mx-auto mb-8 leading-relaxed px-6">
          Nine AI models. Nine brackets. One picked the national champion.{' '}
          <span className="text-lab-white font-semibold">
            The machine that trained itself got it right.
          </span>
        </p>

        <div className="hero-fade-4 flex items-center justify-center gap-3 flex-wrap px-6">
          <Link
            href="/brackets"
            className="bg-lab-white text-lab-bg font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-opacity-90 transition-all"
            style={{ boxShadow: '0 0 24px rgba(59,130,246,0.2)' }}
          >
            View Brackets
          </Link>
          <Link
            href="/models/the-scout"
            className="border border-lab-border text-lab-text font-medium text-sm px-6 py-2.5 rounded-lg hover:border-lab-muted transition-all"
          >
            Meet the Models
          </Link>
          <Link
            href="/cheat-sheet"
            className="cheat-pulse border border-green-500/50 text-green-400 font-medium text-sm px-6 py-2.5 rounded-lg bg-green-500/[0.08] hover:border-green-500/70 hover:text-green-300 transition-all"
          >
            AI Cheat Sheet &mdash; $2.99
          </Link>
        </div>

        <div className="hero-fade-4 mt-5">
          <Link
            href="/blog/why-i-built-this"
            className="text-sm text-lab-muted hover:text-lab-white transition-colors"
          >
            Read why I built this &rarr;
          </Link>
        </div>
      </section>

      {/* ---- Stats bar ---- */}
      <section className="mb-12">
        <StatsBar isLive={isLive} />
      </section>

      {/* ---- Dashboard link ---- */}
      <div className="text-center mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-lab-muted hover:text-lab-white transition-colors"
        >
          See how the brackets did{' '}
          <span className="text-emerald-400 font-semibold">Final</span>
        </Link>
      </div>

      {/* ---- Victory banner ---- */}
      <div className="text-center mb-10">
        <Link
          href="/blog/championship-recap"
          className="victory-glow inline-flex flex-col sm:flex-row items-center gap-2 border border-emerald-500/40 bg-emerald-500/[0.06] rounded-xl px-6 py-4 text-sm font-medium text-emerald-400 hover:border-emerald-500/60 hover:text-emerald-300 transition-all"
        >
          <span className="text-lg">&#9734;</span>
          <span>
            <span className="font-semibold text-emerald-300">The Auto Researcher called it.</span>{' '}
            Michigan wins the national championship. 97.7th percentile on ESPN.
          </span>
          <span className="text-lab-muted text-xs">&rarr;</span>
        </Link>
      </div>

      {/* ---- Model cards (mobile strip + desktop grid) ---- */}
      <LiveHomeModelCards />

      {/* ---- Leaderboard ---- */}
      <section className="mx-auto max-w-[900px] px-6 sm:px-10">
        <LiveHomeLeaderboard />
      </section>

      {/* ---- Vote widget ---- */}
      <section className="mb-16 max-w-2xl mx-auto px-6">
        <VoteWidget />
      </section>
    </div>
  );
}
