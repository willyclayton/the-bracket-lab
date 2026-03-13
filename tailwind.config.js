/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        lab: {
          bg: '#141414',
          surface: '#1e1e1e',
          border: '#333333',
          muted: '#888888',
          text: '#efefef',
          white: '#f9fafb',
        },
        // Model colors
        scout: '#3b82f6',       // blue
        quant: '#22c55e',       // green
        historian: '#f59e0b',   // amber
        chaos: '#ef4444',       // red
        agent: '#00ff88',       // neon green
        superagent: '#a855f7', // purple
        optimizer: '#06b6d4', // cyan
        scoutprime: '#64748b', // slate
        autoresearcher: '#f97316', // orange
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.25s ease',
      },
    },
  },
  plugins: [],
};
