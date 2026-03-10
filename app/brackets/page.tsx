import { Suspense } from 'react';
import BracketsClient from './BracketsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brackets — The Bracket Lab',
  description: 'View and compare the March Madness 2026 brackets from all 5 AI models. Click any game to see the reasoning.',
};

export default function BracketsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-16 text-lab-muted text-sm">Loading brackets...</div>}>
      <BracketsClient />
    </Suspense>
  );
}
