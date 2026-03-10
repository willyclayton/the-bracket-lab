# Design Specification

## Overall Vibe

**Between a fun sports podcast and FiveThirtyEight.** Credible enough that a hiring manager takes it seriously. Fun enough that someone shares it in a group chat. Not corporate. Not meme-y. Think: "smart friend who's really into this."

Dark mode. Lab/experiment aesthetic. Data-forward but not sterile.

## Color System

### Base palette (dark theme)
```
Background:     #0a0a0f  (lab-bg)
Surface:        #12121a  (lab-surface) — cards, panels
Border:         #1e1e2e  (lab-border)
Muted text:     #6b7280  (lab-muted)
Body text:      #e5e7eb  (lab-text)
White/headings: #f9fafb  (lab-white)
```

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
1. **Display/Body:** For headings, UI text, buttons. Should feel modern and slightly technical.
2. **Serif accent:** For taglines and pull quotes only. Italic. Adds personality contrast.
3. **Monospace:** For data, scores, labels, technical metadata. IBM Plex Mono or similar.

Currently set via CSS variables in `globals.css`:
```css
--font-display: 'Space Grotesk', system-ui, sans-serif;
--font-serif: 'Instrument Serif', Georgia, serif;
--font-mono: 'IBM Plex Mono', monospace;
```

If these don't feel right, swap them — but keep the three-tier structure. The serif accent on taglines is a key design differentiator.

## Component Specs

### Model Card (`components/ModelCard.tsx`)
The most important visual element. Used on landing page, models overview, and referenced in dashboard.

Structure:
- Model number badge (top-right, monospace, muted)
- Icon + Name (model color) + Subtitle (monospace, muted)
- Tagline (serif italic, muted)
- Champion pick + Score (bottom, split layout)
- Bottom hover line that animates from 0% to 100% width in model color
- Entire card is a link to `/models/[slug]`

States:
- Default: subtle model-color tint background, border at 20% opacity
- Hover: translate-y -2px, glow effect, bottom line animates
- Eliminated: 50% opacity, grayscale(60%), "ELIMINATED" stamp overlay (already in CSS)

### Leaderboard (`components/Leaderboard.tsx`)
Two variants:
- **Compact:** For landing page sidebar. Just rank, model name, accuracy %, score.
- **Full:** For dashboard. Round-by-round breakdown columns, total, accuracy.

Sorted by total score descending. Model colors on names and scores.

### Bracket Visualization (TODO — `components/BracketView.tsx`)
The hardest component to build. Requirements:
- Shows all 64 games in standard bracket layout (4 regions → Final Four → Championship)
- Color-coded per model (toggle models on/off)
- ✅ / ❌ indicators as games complete
- Click any matchup to see each model's pick + reasoning in a tooltip/modal
- Mobile responsive (this is the hard part — bracket layouts are inherently wide)

MVP approach if time-constrained: Just a table/list view of picks grouped by round and region. Upgrade to visual bracket later.

### Voting Widget (TODO)
- Row of 5 buttons, one per model (icon + name, model color)
- Single vote per visitor (cookie or localStorage)
- After voting, show results as horizontal bar chart
- Consider Vercel KV or Supabase for persistence across visitors

## Visual Effects

### Noise texture
Subtle SVG noise overlay on the entire page (`globals.css` → `.noise::before`). Adds depth to the dark background. Should be barely perceptible.

### Model card glows
On hover, cards get a soft colored box-shadow. Already defined in CSS.

### Eliminated state
When a model's champion pick is knocked out:
- Card gets `opacity: 0.5` + `grayscale(60%)`
- Pseudo-element overlay displays "ELIMINATED" in monospace, red, rotated -12deg, bordered
- Already in CSS (`globals.css` → `.eliminated`)

### Live indicator
On the dashboard, a pulsing green dot indicates the tournament is in progress. Uses Tailwind `animate-ping` on a nested span.

## Page Layouts

### Landing Page
- Full-width hero, centered text
- 3-column grid of model cards (2-col on tablet, 1-col on mobile)
- Voting widget in a bordered card
- Email signup in a bordered card
- Maximum width: 6xl (1152px)

### Model Detail Pages
- Narrower max-width: 4xl (896px) — blog-style reading width
- Model header with icon, name, color, tagline
- Prose content area for methodology (MDX)
- Bracket section
- ESPN verification link

### Dashboard
- Full 6xl width
- Leaderboard table at top
- Bracket view below (full width, scrollable on mobile)
- Round recaps below bracket

## Social Share / OG Images

Need a dynamic OG image for social sharing. Consider Vercel OG (`@vercel/og`) to generate images with:
- "The Bracket Lab" branding
- For model pages: model name + champion pick + tagline
- For dashboard: current leaderboard standings
- Dark background matching site aesthetic

This is important for LinkedIn virality — the preview card when someone shares a link needs to look polished.

## Responsive Breakpoints

Following Tailwind defaults:
- `sm` (640px): 2-col model card grid
- `md` (768px): Navigation expands
- `lg` (1024px): 3-col model card grid
- `xl` (1280px): Max content width

The bracket visualization is the main responsive challenge. On mobile, consider a round-by-round list view instead of the traditional bracket layout.
