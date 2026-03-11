import type { Metadata } from 'next';
import Link from 'next/link';
import NavLinks from '@/components/NavLinks';
import GameTicker from '@/components/GameTicker';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Bracket Lab — 5 AI Models. 1 Tournament.',
  description: '5 AI models compete to predict March Madness 2026. Monte Carlo simulations, LLM scouting, historical archetypes, upset detection, and an autonomous AI agent. Track accuracy in real time.',
  openGraph: {
    title: 'The Bracket Lab',
    description: '5 AI models. 1 tournament. Real-time tracking.',
    type: 'website',
    // TODO: Add OG image
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Bracket Lab',
    description: '5 AI models compete to predict March Madness 2026.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="noise min-h-screen bg-lab-bg text-lab-text antialiased">
        <GameTicker />
        <nav className="sticky top-0 z-40 border-b border-lab-border bg-lab-bg/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-base sm:text-lg font-bold tracking-tight text-lab-white group-hover:text-scout transition-colors">
                The Bracket Lab
              </span>
              <span className="hidden sm:inline text-xs font-mono text-lab-muted border border-lab-border rounded px-2 py-0.5">
                2026
              </span>
            </Link>
            <NavLinks />
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-lab-border mt-24">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
              {/* About */}
              <div>
                <p className="text-xs font-mono text-lab-muted uppercase tracking-widest mb-3">About</p>
                <p className="text-sm text-lab-muted leading-relaxed">
                  An experiment in AI sports prediction. Five models with completely different
                  approaches compete to call March Madness 2026. Built by{' '}
                  <a href="https://willyclayton.com" className="text-lab-text hover:text-lab-white transition-colors underline underline-offset-2">
                    Will Clayton
                  </a>
                  , Data &amp; AI Consultant, Chicago.
                </p>
              </div>
              {/* Models */}
              <div>
                <p className="text-xs font-mono text-lab-muted uppercase tracking-widest mb-3">The Models</p>
                <ul className="space-y-1.5 text-sm text-lab-muted">
                  <li><Link href="/models/the-scout" className="hover:text-lab-white transition-colors">🎬 The Scout</Link></li>
                  <li><Link href="/models/the-quant" className="hover:text-lab-white transition-colors">📊 The Quant</Link></li>
                  <li><Link href="/models/the-historian" className="hover:text-lab-white transition-colors">📜 The Historian</Link></li>
                  <li><Link href="/models/the-chaos-agent" className="hover:text-lab-white transition-colors">🔥 The Chaos Agent</Link></li>
                  <li><Link href="/models/the-agent" className="hover:text-lab-white transition-colors">🤖 The Agent</Link></li>
                </ul>
              </div>
              {/* Links */}
              <div>
                <p className="text-xs font-mono text-lab-muted uppercase tracking-widest mb-3">Links</p>
                <ul className="space-y-1.5 text-sm text-lab-muted">
                  <li><Link href="/brackets" className="hover:text-lab-white transition-colors">View All Brackets</Link></li>
                  <li><Link href="/blog" className="hover:text-lab-white transition-colors">Blog &amp; Recaps</Link></li>
                  <li>
                    <a href="https://github.com/willclayton/the-bracket-lab" className="hover:text-lab-white transition-colors">
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a href="https://linkedin.com/in/willclayton" className="hover:text-lab-white transition-colors">
                      LinkedIn
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-lab-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-lab-muted font-mono">
              <span>THE BRACKET LAB — MARCH MADNESS 2026</span>
              <span>PICKS LOCK MARCH 19 · ESPN TOURNAMENT CHALLENGE</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
