# UI Options Reference — The Bracket Lab

All options are live-previewed as standalone HTML files in `/previews/`. Open in any browser.

---

## Hero Section Variants

| # | File | Style | Approach |
|---|------|-------|----------|
| 1 | `hero-option-1.html` | **Minimal** | Clean center-aligned, fade-up only, no background effects |
| 2 | `hero-option-2.html` | **Radial Glow** | Scout-blue radial gradient + pulsing orb, gradient headline text |
| 3 | `hero-option-3.html` | **Stat-Forward** | 3 big numbers (5 / 10K+ / 1920) above headline, count-up entrance |
| 4 | `hero-option-4.html` | **Split Layout** | Left-aligned headline + right model icon strip, directional slides |
| 5 | `hero-option-5.html` | **Terminal** | Monospace terminal block with staggered line reveals, cursor blink |

### Hero CSS Snippets

**Radial glow (Option 2):**
```css
.radial-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -60%);
  width: 800px; height: 600px;
  background: radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 70%);
  animation: glowPulse 4s ease-in-out infinite;
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
```

**Staggered fade-up (all options):**
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up-1 { animation: fadeUp 0.6s ease 0.1s both; }
.fade-up-2 { animation: fadeUp 0.6s ease 0.25s both; }
.fade-up-3 { animation: fadeUp 0.6s ease 0.4s both; }
```

**Terminal cursor blink (Option 5):**
```css
.cursor {
  display: inline-block;
  width: 3px; height: 1em;
  background: #00ff88;
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

### Hero Tradeoffs

| Option | Complexity | Reduced-motion safe? | Standout factor |
|--------|-----------|---------------------|----------------|
| Minimal | ★ | Yes | Low |
| Radial Glow | ★★ | Yes (animation pauses) | Medium |
| Stat-Forward | ★★ | Yes | High (data credibility) |
| Split Layout | ★★ | Yes | High (editorial) |
| Terminal | ★★★ | Partial (cursor blinks) | Very High |

---

## Model Card Hover Variants

| # | File | Style | Mechanism |
|---|------|-------|-----------|
| 1 | `card-option-1.html` | **Lift + Icon Scale** | translateY(-4px) + icon scale(1.15) + colored shadow |
| 2 | `card-option-2.html` | **Full Border Glow** | Model-colored border + double box-shadow ring |
| 3 | `card-option-3.html` | **Scanline Sweep** | CSS ::before gradient sweeps top-to-bottom |
| 4 | `card-option-4.html` | **Flip Accent Bar** | CSS ::after bar grows from center outward |
| 5 | `card-option-5.html` | **Mouse Spotlight** | Radial spotlight follows mouse via CSS custom props + JS |

### Card CSS Snippets

**Lift + colored shadow (Option 1):**
```css
.model-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.model-card:hover { transform: translateY(-4px); }
.card-scout:hover { box-shadow: 0 12px 40px rgba(59,130,246,0.15); }
.card-quant:hover { box-shadow: 0 12px 40px rgba(34,197,94,0.15); }
/* etc. */
```

**Full border glow (Option 2):**
```css
.card-scout:hover {
  border-color: rgba(59,130,246,0.6);
  box-shadow: 0 0 0 1px rgba(59,130,246,0.2), 0 8px 32px rgba(59,130,246,0.2);
}
```

**Scanline sweep (Option 3) — CSS only:**
```css
.model-card::before {
  content: '';
  position: absolute;
  top: -100%; left: 0; right: 0;
  height: 60%;
  background: linear-gradient(to bottom, transparent, var(--scan-color), transparent);
  transition: top 0.5s ease;
  pointer-events: none;
}
.model-card:hover::before { top: 120%; }
```

**Center-outward bar (Option 4) — CSS only:**
```css
.model-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 50%; right: 50%;
  height: 2px;
  background: var(--accent);
  transition: left 0.3s ease, right 0.3s ease;
}
.model-card:hover::after { left: 0; right: 0; }
```

**Mouse spotlight (Option 5) — needs ~10 lines JS:**
```css
.spotlight {
  position: absolute; inset: 0;
  border-radius: 16px;
  opacity: 0; transition: opacity 0.2s;
  background: radial-gradient(250px circle at var(--x, 50%) var(--y, 50%), var(--spot-color), transparent 70%);
}
.model-card:hover .spotlight { opacity: 1; }
```
```js
card.addEventListener('mousemove', (e) => {
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--x', ((e.clientX - rect.left) / rect.width) * 100 + '%');
  card.style.setProperty('--y', ((e.clientY - rect.top) / rect.height) * 100 + '%');
});
```

### Card Tradeoffs

| Option | JS required? | Reduced-motion safe? | Distinctiveness |
|--------|-------------|---------------------|----------------|
| Lift + Scale | No | Yes | Low |
| Border Glow | No | Yes | High |
| Scanline | No | Yes (no motion if `prefers-reduced-motion`) | Medium |
| Flip Accent Bar | No | Yes | Medium |
| Mouse Spotlight | Yes (10 lines) | Yes (opacity only) | Very High |

---

## Navigation Active State Variants

| # | File | Style | Notes |
|---|------|-------|-------|
| 1 | `nav-option-1.html` | **Underline Dot** | 4px colored circle below active link |
| 2 | `nav-option-2.html` | **Underline Bar** | Full-width colored border, scaleX from left |
| 3 | `nav-option-3.html` | **Highlighted Pill** | Rounded pill bg + border on active |
| 4 | `nav-option-4.html` | **Dimmed Others** | Active = full white, rest = 25% opacity |

### Nav CSS Snippets

**Underline dot (Option 1):**
```css
.nav-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s;
}
.nav-link.active .nav-dot { background: #3b82f6; }
```

**Underline bar with slide-in (Option 2):**
```css
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: #3b82f6;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.nav-link.active::after { transform: scaleX(1); }
```

**Pill (Option 3):**
```css
.nav-link.active {
  color: white;
  background: rgba(59,130,246,0.15);
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: 6px;
  padding: 5px 12px;
}
```

**Dimmed others (Option 4):**
```css
.nav-links-group.has-active .nav-link { color: rgba(255,255,255,0.25); }
.nav-links-group.has-active .nav-link.active { color: white; font-weight: 600; }
```

### Nav Tradeoffs

| Option | Complexity | Readability | Personality |
|--------|-----------|-------------|------------|
| Dot | ★ | High | Low |
| Underline Bar | ★ | High | Medium |
| Pill | ★ | High | Medium-High |
| Dimmed Others | ★ | High | High |

---

## Implementation Notes

### Reduced Motion
Always pair entrance animations with:
```css
@media (prefers-reduced-motion: reduce) {
  .fade-up-1, .fade-up-2, .fade-up-3 { animation: none; opacity: 1; }
  .cursor { animation: none; }
}
```

### Next.js Integration
- Card hover effects: pure Tailwind + CSS custom properties (no client component needed)
- Mouse spotlight (Option 5): requires `'use client'` + `useRef` + mouse event listener
- Nav active state: use Next.js `usePathname()` hook to add `active` class

### Model Color CSS Custom Properties (in globals.css)
```css
:root {
  --color-scout:     #3b82f6;
  --color-quant:     #22c55e;
  --color-historian: #f59e0b;
  --color-chaos:     #ef4444;
  --color-agent:     #00ff88;
}
```
