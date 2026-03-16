'use client';

import { useState } from 'react';

export default function PaywallOverlay() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/create-checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutLoading(false);
    }
  }

  async function handleEmailUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailStatus('loading');
    setEmailError('');
    try {
      const res = await fetch('/api/unlock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setEmailStatus('error');
        setEmailError('No purchase found for this email.');
      }
    } catch {
      setEmailStatus('error');
      setEmailError('Something went wrong. Try again.');
    }
  }

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
        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="inline-block font-mono text-sm font-semibold px-6 py-3 rounded-lg transition-all hover:brightness-110 disabled:opacity-70"
          style={{ background: '#22c55e', color: '#141414' }}
        >
          {checkoutLoading ? 'Redirecting...' : 'Unlock Cheat Sheet \u2014 $2.99'}
        </button>
        <p className="text-[11px] text-[#555] mt-3">
          Powered by Stripe. One-time payment, no subscription.
        </p>

        {/* Already purchased? */}
        {!showEmailForm ? (
          <div className="mt-5 border border-[#333] rounded-lg px-4 py-3 bg-[#1a1a1a]">
            <button
              onClick={() => setShowEmailForm(true)}
              className="text-xs text-lab-muted hover:text-lab-white transition-colors"
            >
              Already purchased? <span className="text-lab-white underline underline-offset-2">Plug your email in here</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailUnlock} className="mt-4 space-y-2">
            <input
              type="email"
              placeholder="Email used at checkout"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#222] border border-[#444] rounded-lg text-sm text-lab-white placeholder-[#555] focus:outline-none focus:border-[#666]"
              required
            />
            <button
              type="submit"
              disabled={emailStatus === 'loading'}
              className="w-full font-mono text-xs font-semibold px-4 py-2 rounded-lg border border-[#444] text-lab-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            >
              {emailStatus === 'loading' ? 'Checking...' : 'Unlock'}
            </button>
            {emailStatus === 'error' && (
              <p className="text-[11px] text-red-400">{emailError}</p>
            )}
          </form>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-[#444] mt-4 leading-relaxed">
          AI-generated predictions for entertainment purposes only. Not financial or gambling advice. No guaranteed results. All sales final.
        </p>
      </div>
    </div>
  );
}
