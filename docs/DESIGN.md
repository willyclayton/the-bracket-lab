# Design Specification

## Overall Vibe

**Between a fun sports podcast and FiveThirtyEight.** Credible enough that a hiring manager takes it seriously. Fun enough that someone shares it in a group chat. Not corporate. Not meme-y. Think: "smart friend who's really into this."

Dark mode. Lab/experiment aesthetic. Data-forward but not sterile.

## Color System

### Base palette (dark theme — updated March 2025)
```
Background:     #141414  (lab-bg)
Surface:        #1e1e1e  (lab-surface) — cards, panels
Border:         #333333  (lab-border)
Muted text:     #888888  (lab-muted)
Body text:      #efefef  (lab-text)
```

These are defined as CSS variables in `globals.css` and as `lab.*` tokens in `tailwind.config.js`.

### Model colors (sacred — never change these)
```
The Scout:       #3b82f6  (blue)
The Quant:       #22c55e  (green)
The Historian:   #f59e0b  (amber)
The Chaos Agent: #ef4444  (red)
The Agent:       #00ff88  (neon green)
```

Each model color is used for:
- Text accents (model name, score)
- Border color on cards (at 20% opacity: `${color}33`)
- Background tint on cards (at 8% opacity)
- Glow/box-shadow effect on hover
- Chart lines and data points
- Tags and badges

### CSS Classes per model
Defined in `globals.css`:
- `.model-{name}` — border color
- `.model-{name}-bg` — subtle background tint
- `.glow-{name}` — box-shadow glow effect

## Typography

Three font tiers:
1. **Display/Body:** For headings, UI text, buttons. Modern and slightly technical.
2. **Serif accent:** For taglines and pull quotes only. Italic. Adds personality contrast.
3. **Monospace:** For data, scores, labels, technical metadata.

Currently set via CSS variables in `globals.css`:
```css
--font-display: 'Space Grotesk', system-ui, sans-serif;
--font-serif: 'Instrument Serif', Georgia, serif;
--font-mono: 'IBM Plex Mono', monospace;
```

## Current Site Structure

### Navigation
Three tabs: **Home** | **Brackets** | **Blog**
- About page is linked from the footer, not the nav
- Home uses `exact: true` URL match to avoid "/" matching all routes

### Pages

#### `/` — Landing Page
- Hero section with animated fade-in (`.hero-fade-*`, `.hero-glow` in globals.css)
- Stats bar component
- Leaderboard (HomeLeaderboard)
- 5 model sections (inline, not using ModelCard component)
- VoteWidget at bottom
- Pure server component — no onClick on `<tr>` elements

#### `/brackets` — Bracket Explorer
- Suspense wrapper (`page.tsx`) + client component (`BracketsClient.tsx`)
- Model tabs with URL param handling (e.g., `?model=the-scout`)
- BracketTree component: round pills + horizontal scroll (desktop), single-round view (mobile)
- Summary card per model
- Year toggle: 2025 (archive) / 2026 (current)
- Lock state shown when bracket data is empty pre-tournament
- Bracket JSON imports use `as unknown as BracketData` due to null fields pre-tournament

#### `/blog` — Blog
- MDX-driven via `next-mdx-remote` + `gray-matter`
- Posts in `content/blog/*.mdx`
- `lib/blog.ts` provides `getAllPosts()` and `getPostBySlug()`

#### `/models/[slug]` — Model Deep Dives
- Updated design with CTA linking to `/brackets`
- Methodology content + bracket summary

#### `/about` — About Page
- Accessible from footer
- Tech stack, ESPN bracket links

## Component Inventory

| Component | File | Description |
|-----------|------|-------------|
| `BracketCardsPanel` | `components/` | Bracket card layout |
| `BracketGridPanel` | `components/` | Grid-based bracket view |
| `GameTicker` | `components/` | Live game ticker display |
| `HomeLeaderboard` | `components/` | Landing page leaderboard |
| `HomeModelCard` | `components/` | Model cards on landing page |
| `Leaderboard` | `components/` | Full leaderboard with round breakdown |
| `MatchupPopover` | `components/` | Click-to-reveal matchup details |
| `ModelCard` | `components/` | Reusable model card (exists but not used on homepage) |
| `ModelDetailTabs` | `components/` | Tabs on model detail pages |
| `NavLinks` | `components/` | Navigation with active state |
| `StatsBar` | `components/` | Statistics summary bar |
| `VoteWidget` | `components/` | localStorage vote + seeded counts + bar chart |
| `BracketsClient` | `app/brackets/` | Client-side bracket page with model tabs |

## Visual Effects

### Hero animations
Defined in `globals.css`: `.hero-fade-up`, `.hero-fade-in`, `.hero-glow`. Staggered entry animations on load.

### Noise texture
Subtle SVG noise overlay on the entire page. Adds depth to the dark background. Barely perceptible.

### Model card glows
On hover, cards get a soft colored box-shadow in model color.

### Eliminated state
When a model's champion pick is knocked out:
- Card gets `opacity: 0.5` + `grayscale(60%)`
- Pseudo-element overlay displays "ELIMINATED" in monospace, red, rotated -12deg
- CSS class: `.eliminated` in `globals.css`

### Live indicator
Pulsing green dot for tournament-in-progress status. Uses Tailwind `animate-ping`.

## Responsive Design

Following Tailwind defaults:
- `sm` (640px): 2-col model card grid
- `md` (768px): Navigation expands
- `lg` (1024px): 3-col model card grid, bracket horizontal scroll
- `xl` (1280px): Max content width

BracketTree handles mobile by showing single-round view with round pills for navigation.

## Social Share / OG Images

Need a dynamic OG image for social sharing. Consider Vercel OG (`@vercel/og`):
- "The Bracket Lab" branding
- For model pages: model name + champion pick + tagline
- For dashboard: current leaderboard standings
- Dark background matching site aesthetic
