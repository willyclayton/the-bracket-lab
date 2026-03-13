import { VISIBLE_MODELS } from '@/lib/models';

export const metadata = {
  title: 'About — The Bracket Lab',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mb-4">
          About The Bracket Lab
        </h1>
      </div>

      <div className="prose space-y-6 mb-16">
        <p>
          This started with a conversation. My friend Jack Gorman had an idea: what
          if you ran a bunch of different AI models against a March Madness bracket
          and actually tracked how they did?
        </p>
        <p>
          I couldn&apos;t stop thinking about it. I work in AI consulting, and I&apos;d never
          stress-tested these tools against something this clean — 63 games, public
          data, binary outcomes, a universal scoring system. March Madness is a
          near-perfect AI benchmark hiding in plain sight.
        </p>
        <p>
          So I built this in under a week. Eight models, each using a fundamentally
          different approach — from Monte Carlo simulations to autonomous research
          agents to LLM-powered scouting reports. Every pick locked before tip-off.
          Every result verified from ESPN. No take-backs.
        </p>
        <p>
          My co-pilot was Claude Code, Anthropic&apos;s AI coding assistant. It wrote a
          significant chunk of this codebase — the site, the scoring engine, the
          bracket visualizations, the model pipelines. The tool I used to build the
          thing is the same technology I&apos;m testing. That felt right.
        </p>
        <p>
          Mostly I built this because I wanted to see how far I could push AI as a
          prediction tool, and I&apos;m hoping it helps my friends win their bracket
          pools. Not mine though — I&apos;ll fill mine out the old-fashioned way.
        </p>
      </div>

      <section className="mb-16">
        <h2 className="text-xl font-bold text-lab-white mb-6">Built By</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-6 space-y-4">
          <div>
            <p className="text-lab-text font-semibold mb-1">Will Clayton</p>
            <p className="text-sm text-lab-muted mb-3">Data & AI Consultant · Chicago, IL</p>
            <div className="flex gap-4 text-sm">
              <a href="https://willyclayton.com" className="text-scout hover:underline">willyclayton.com</a>
              <a href="https://linkedin.com/in/willclayton" className="text-scout hover:underline">LinkedIn</a>
              <a href="https://github.com/willclayton" className="text-scout hover:underline">GitHub</a>
            </div>
          </div>
          <div className="border-t border-lab-border pt-4">
            <p className="text-sm text-lab-muted">
              Idea credit: <span className="text-lab-text">Jack Gorman</span>
            </p>
            <p className="text-sm text-lab-muted">
              Development assistant: <span className="text-lab-text">Claude Code</span> by Anthropic
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-xl font-bold text-lab-white mb-6">Tech Stack</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">FRONTEND</p>
              <p className="text-lab-text">Next.js · Tailwind CSS · MDX · Recharts</p>
            </div>
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">HOSTING</p>
              <p className="text-lab-text">Vercel · GitHub</p>
            </div>
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">MODEL PIPELINES</p>
              <p className="text-lab-text">Python · Claude API · Claude Code</p>
            </div>
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">DATA</p>
              <p className="text-lab-text">KenPom · BartTorvik · ESPN · JSON</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-lab-white mb-6">ESPN Bracket Links</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
          <p className="text-sm text-lab-muted mb-4">
            All picks verified and locked via ESPN Tournament Challenge before the Round of 64.
          </p>
          <div className="space-y-2">
            {VISIBLE_MODELS.map((model) => (
              <div key={model.id} className="flex items-center justify-between py-2 border-b border-lab-border last:border-0">
                <span className="text-sm font-medium" style={{ color: model.color }}>
                  {model.icon} {model.name}
                </span>
                <span className="text-xs font-mono text-lab-muted">
                  {/* TODO: Replace with actual ESPN links */}
                  Link posted March 19
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
