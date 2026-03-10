import Link from 'next/link';
import { MODELS } from '@/lib/models';
import VoteWidget from '@/components/VoteWidget';
import StatsBar from '@/components/StatsBar';
import HomeModelCard from '@/components/HomeModelCard';
import HomeLeaderboard from '@/components/HomeLeaderboard';

const CHAMPION_PICKS: Record<string, string> = {
  'the-scout':       'Florida',
  'the-quant':       'Houston',
  'the-historian':   'Duke',
  'the-chaos-agent': 'UC San Diego',
  'the-agent':       'Auburn',
};

export default function Home() {
  const tournamentStart = new Date('2026-03-20');
  const today = new Date();
  const isLive = today >= tournamentStart;

  // Pre-tournament: no scores yet
  const leaderboardEntries = MODELS.map((model, i) => ({
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
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          No gut feelings. No office pools.
          <br />
          Just math, history, and chaos.
        </h1>

        <p className="hero-fade-3 text-base text-lab-muted max-w-xl mx-auto mb-8 leading-relaxed px-6">
          Five AI models built brackets five completely different ways.{' '}
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
            href="/blog"
            className="border border-lab-border text-lab-muted font-medium text-sm px-6 py-2.5 rounded-lg hover:border-lab-muted hover:text-lab-text transition-all"
          >
            Blog &amp; Recaps
          </Link>
        </div>
      </section>

      {/* ---- Stats bar ---- */}
      <section className="mb-12">
        <StatsBar isLive={isLive} />
      </section>

      {/* ---- Card grid ---- */}
      <section className="mx-auto max-w-[1200px] px-6 sm:px-10 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODELS.map((model) => (
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
