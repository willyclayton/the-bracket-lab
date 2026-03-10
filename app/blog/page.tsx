export const metadata = {
  title: 'Blog — The Bracket Lab',
};

export default function BlogPage() {
  // TODO: Load blog posts from /content/blog/*.mdx
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12">
        <span className="font-mono text-xs text-lab-muted">DISPATCHES</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mt-2 mb-4">Blog</h1>
        <p className="text-lab-muted">
          Methodology deep dives, round recaps, model obituaries, and lessons learned.
        </p>
      </div>

      {/* Placeholder posts */}
      <div className="space-y-6">
        <article className="rounded-xl border border-lab-border bg-lab-surface p-6 hover:border-lab-muted transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-lab-muted">COMING MAR 15</span>
            <span className="text-xs px-2 py-0.5 rounded border border-scout/30 text-scout">The Scout</span>
          </div>
          <h2 className="text-lg font-semibold text-lab-white mb-2">
            Meet The Scout: Film Room Intelligence at Machine Speed
          </h2>
          <p className="text-sm text-lab-muted">
            How we built an LLM-powered scouting system that evaluates every March Madness matchup
            across coaching experience, roster age, injuries, and clutch performance.
          </p>
        </article>

        <article className="rounded-xl border border-lab-border bg-lab-surface p-6 hover:border-lab-muted transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-lab-muted">COMING MAR 15</span>
            <span className="text-xs px-2 py-0.5 rounded border border-quant/30 text-quant">The Quant</span>
          </div>
          <h2 className="text-lg font-semibold text-lab-white mb-2">
            Meet The Quant: 10,000 Simulations, Zero Feelings
          </h2>
          <p className="text-sm text-lab-muted">
            Inside the Monte Carlo simulation that runs the tournament 10,000 times
            to find the most probable bracket. Pure math. No narratives.
          </p>
        </article>

        <article className="rounded-xl border border-lab-border bg-lab-surface p-6 hover:border-lab-muted transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-lab-muted">COMING MAR 15</span>
            <span className="text-xs px-2 py-0.5 rounded border border-historian/30 text-historian">The Historian</span>
          </div>
          <h2 className="text-lg font-semibold text-lab-white mb-2">
            Meet The Historian: Every Team Has a Twin
          </h2>
          <p className="text-sm text-lab-muted">
            A statistical twin-matching system that finds every 2026 team&apos;s closest
            historical analog from past tournaments. History already played this game.
          </p>
        </article>

        <article className="rounded-xl border border-lab-border bg-lab-surface p-6 hover:border-lab-muted transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-lab-muted">COMING MAR 15</span>
            <span className="text-xs px-2 py-0.5 rounded border border-chaos/30 text-chaos">The Chaos Agent</span>
          </div>
          <h2 className="text-lg font-semibold text-lab-white mb-2">
            Meet The Chaos Agent: Your Bracket Is Too Safe
          </h2>
          <p className="text-sm text-lab-muted">
            An upset detection engine that asks &quot;what could go wrong for the favorite?&quot;
            for every single game. The spiciest bracket in the lab.
          </p>
        </article>

        <article className="rounded-xl border border-lab-border bg-lab-surface p-6 hover:border-lab-muted transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-lab-muted">COMING MAR 19</span>
            <span className="text-xs px-2 py-0.5 rounded border border-agent/30 text-agent">The Agent</span>
          </div>
          <h2 className="text-lg font-semibold text-lab-white mb-2">
            I Gave an AI Zero Instructions and Let It Build a March Madness Bracket
          </h2>
          <p className="text-sm text-lab-muted">
            Claude Code. One prompt. Full autonomy. No methodology defined.
            Here&apos;s what happened when the agent decided for itself.
          </p>
        </article>
      </div>
    </div>
  );
}
