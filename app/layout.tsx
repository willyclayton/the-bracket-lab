import type { Metadata } from 'next';
import Link from 'next/link';
import NavLinks from '@/components/NavLinks';
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
        <nav className="sticky top-0 z-40 border-b border-lab-border bg-lab-bg/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-lg font-bold tracking-tight text-lab-white group-hover:text-scout transition-colors">
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
          <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-lab-muted">
            <p>The Bracket Lab — Built by <a href="https://willyclayton.com" className="text-lab-text hover:text-lab-white transition-colors">Will Clayton</a></p>
            <div className="flex gap-4">
              <a href="https://github.com/willclayton/the-bracket-lab" className="hover:text-lab-white transition-colors">GitHub</a>
              <a href="https://linkedin.com/in/willclayton" className="hover:text-lab-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
