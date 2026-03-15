'use client';

const CS_LINK = process.env.NEXT_PUBLIC_STRIPE_CHEATSHEET_LINK_URL || '#';

export default function PaywallOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-[#1a1a1a]/95 border border-[#333] rounded-xl px-8 py-7 text-center max-w-sm shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <div className="text-3xl mb-3">&#128274;</div>
        <h3
          className="text-lg text-lab-white mb-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Unlock the full AI Cheat Sheet
        </h3>
        <p className="text-sm text-lab-muted mb-5">
          9 AI models analyzed. Get the lock picks, smart upsets, trap games, and sleeper picks for $2.99.
        </p>
        <a
          href={CS_LINK}
          className="inline-block font-mono text-sm font-semibold px-6 py-3 rounded-lg transition-all hover:brightness-110"
          style={{ background: '#22c55e', color: '#141414' }}
        >
          Unlock Cheat Sheet &mdash; $2.99
        </a>
        <p className="text-[11px] text-[#555] mt-3">
          Powered by Stripe. One-time payment, no subscription.
        </p>
      </div>
    </div>
  );
}
