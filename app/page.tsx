import Link from 'next/link';
import { VISIBLE_MODELS } from '@/lib/models';
import VoteWidget from '@/components/VoteWidget';
import StatsBar from '@/components/StatsBar';
import HomeModelCard from '@/components/HomeModelCard';
import HomeModelStrip from '@/components/HomeModelStrip';
import HomeLeaderboard from '@/components/HomeLeaderboard';

const CHAMPION_PICKS: Record<string, string> = {
  'the-scout':       'Florida',
  'the-quant':       'Houston',
  'the-historian':   'Duke',
  'the-chaos-agent': 'UC San Diego',
  'the-optimizer':   'TBD',
  'the-auto-researcher': 'TBD',
};

export default function Home() {
  const tournamentStart = new Date('2026-03-20');
  const today = new Date();
  const isLive = today >= tournamentStart;

  // Pre-tournament: no scores yet
  const leaderboardEntries = VISIBLE_MODELS.map((model, i) => ({
    model,
    champion: CHAMPION_PICKS[model.id] ?? 'TBD',
    rank: i + 1,
  }));

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
          Six AI models built brackets six completely different ways.{' '}
          <span className="text-lab-white font-semibold">
            Now we wait to see which one survived contact with reality.
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
            className="border border-green-500/30 text-green-400 font-medium text-sm px-6 py-2.5 rounded-lg hover:border-green-500/50 hover:text-green-300 transition-all"
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

      {/* ---- Model strip (mobile) ---- */}
      <section className="md:hidden mx-auto max-w-[1200px] px-6 mb-12">
        <HomeModelStrip
          entries={VISIBLE_MODELS.map((model) => ({
            model,
            champion: CHAMPION_PICKS[model.id] ?? 'TBD',
          }))}
        />
      </section>

      {/* ---- Card grid (tablet+) ---- */}
      <section className="hidden md:block mx-auto max-w-[1200px] px-6 sm:px-10 mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {VISIBLE_MODELS.map((model) => (
            <HomeModelCard
              key={model.id}
              model={model}
              champion={CHAMPION_PICKS[model.id] ?? 'TBD'}
            />
          ))}
        </div>
      </section>

      {/* ---- Leaderboard ---- */}
      <section className="mx-auto max-w-[900px] px-6 sm:px-10">
        <HomeLeaderboard entries={leaderboardEntries} />
      </section>

      {/* ---- Vote widget ---- */}
      <section className="mb-16 max-w-2xl mx-auto px-6">
        <VoteWidget />
      </section>
    </div>
  );
}
