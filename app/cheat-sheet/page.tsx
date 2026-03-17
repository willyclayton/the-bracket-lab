import { Suspense } from 'react';
import CheatSheetClient from './CheatSheetClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Cheat Sheet — The Bracket Lab',
  description: '9 AI models, one cheat sheet. Lock picks, smart upsets, contested games, and sleeper picks for your March Madness bracket.',
};

export default function CheatSheetPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16 text-lab-muted text-sm">Loading cheat sheet...</div>}>
      <CheatSheetClient />
    </Suspense>
  );
}
