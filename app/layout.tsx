import type { Metadata } from 'next';
import Link from 'next/link';
import NavLinks from '@/components/NavLinks';
import GameTicker from '@/components/GameTicker';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Bracket Lab — 6 AI Models. 1 Tournament.',
  description: '6 AI models compete to predict March Madness 2026. Monte Carlo simulations, LLM scouting, historical archetypes, upset detection, points optimization, and autonomous research. Track accuracy in real time.',
  openGraph: {
    title: 'The Bracket Lab',
    description: '6 AI models. 1 tournament. Real-time tracking.',
    type: 'website',
    images: [
      {
        url: 'https://the-bracket-lab.vercel.app/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Bracket Lab',
    description: '6 AI models compete to predict March Madness 2026.',
    images: ['https://the-bracket-lab.vercel.app/og-image.jpg'],
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
        <Analytics />
        <footer className="border-t border-lab-border mt-24">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-lab-muted">
                <Link href="/models" className="text-lab-text hover:text-lab-white transition-colors underline underline-offset-2">View all models</Link>
                {' '}&middot;{' '}
                <Link href="/about" className="text-lab-text hover:text-lab-white transition-colors underline underline-offset-2">About</Link>
                {' '}&middot;{' '}
                <a href="https://github.com/willyclayton" className="text-lab-text hover:text-lab-white transition-colors underline underline-offset-2">GitHub</a>
                {' '}&middot;{' '}
                <a href="https://www.linkedin.com/in/willuclayton/" className="text-lab-text hover:text-lab-white transition-colors underline underline-offset-2">LinkedIn</a>
              </p>
              <p className="text-xs text-lab-muted font-mono">
                Built by{' '}
                <a href="https://willyclayton.com" className="text-lab-text hover:text-lab-white transition-colors">Will Clayton</a>
                {' '}&middot; Chicago
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
