# Methodology Page Style Guide — Option A (Clean Editorial)

## Structure

Each methodology MDX file has two top-level sections:

1. **Overview** — "Quick Mental Model"
2. **Methodology** — "The Actual Build"

Each section opens with a header row: mono eyebrow label (model color) + title + bottom border divider.

---

## Section Header Pattern

```jsx
<div className="flex items-center gap-3 mb-8 pb-3 border-b border-[#222]">
  <span className="font-mono text-[10px] uppercase tracking-[2px]" style={{color:'MODEL_COLOR'}}>Section Label</span>
  <span className="text-[20px] font-semibold text-[#f9fafb]">Section Title</span>
</div>
```

---

## Subsection Pattern

Subsections are separated by top border dividers (`border-t border-[#1e1e1e]`). Label uses mono uppercase muted style.

```jsx
<div className="pt-5 border-t border-[#1e1e1e] mb-7">
  <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#888] mb-3">Subsection Label</p>
  {/* content */}
</div>
```

First subsection in each section omits the top border (no divider before the first item).

---

## Bullet Lists

Use `—` dash bullets (not markdown `-`). Text at `text-[15px] text-[#ccc] leading-[1.75]`.

```jsx
<ul className="text-[15px] text-[#ccc] leading-[1.75] space-y-1">
  <li>— Item text</li>
</ul>
```

---

## Champion Callout Box

Left-border accent box with model color at 5% opacity background.

```jsx
<div className="rounded-md p-4" style={{borderLeft: '3px solid MODEL_COLOR', backgroundColor: 'rgba(R,G,B,0.05)'}}>
  <p className="font-mono text-[10px] uppercase tracking-[1.5px] mb-2" style={{color:'MODEL_COLOR'}}>2026 Predicted Champion</p>
  <p className="text-[16px] font-semibold text-[#f9fafb]">Champion Name</p>
  <p className="text-[13px] text-[#888] mt-1">Supporting detail</p>
</div>
```

---

## Factor Weight Bars

Horizontal bar chart. Each bar uses model color. Labels at `text-[12px] text-[#aaa]`, percentages at `font-mono text-[11px] text-[#666]`.

```jsx
<div className="space-y-3">
  {factors.map(f => (
    <div key={f.label}>
      <div className="flex justify-between mb-1">
        <span className="text-[12px] text-[#aaa]">{f.label}</span>
        <span className="font-mono text-[11px] text-[#666]">{f.pct}%</span>
      </div>
      <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{width: `${f.pct}%`, backgroundColor: 'MODEL_COLOR'}} />
      </div>
    </div>
  ))}
</div>
```

---

## Process Steps (Numbered 01–05)

```jsx
<div className="flex gap-4">
  <span className="font-mono text-[13px] shrink-0 mt-0.5" style={{color:'MODEL_COLOR'}}>01</span>
  <div>
    <p className="text-[14px] font-semibold text-[#efefef] mb-1">Step title</p>
    <p className="text-[14px] text-[#888] leading-[1.65]">Step description.</p>
  </div>
</div>
```

---

## Example Box

Dark surface card with mono matchup tag, bold pick in model color, rationale text.

```jsx
<div className="rounded-md p-5 bg-[#1a1a1a] border border-[#2a2a2a]">
  <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#555] mb-3">Region — Round</p>
  <p className="text-[14px] text-[#aaa] mb-2">Matchup description</p>
  <p className="text-[16px] font-semibold mb-3" style={{color:'MODEL_COLOR'}}>Pick: Team — confidence/score</p>
  <p className="text-[13px] text-[#777] leading-[1.65]">Rationale text.</p>
</div>
```

---

## Model Colors

| Model | Color |
|-------|-------|
| The Scout | `#3b82f6` |
| The Quant | `#22c55e` |
| The Historian | `#f59e0b` |
| The Chaos Agent | `#ef4444` |
| The Agent | `#00ff88` |

---

## Writing Rules

- **Layer 1 (lead):** Data or concept first. No intro fluff.
- **Layer 2:** Technical thinking, short paragraphs (2–3 sentences).
- **Layer 3 (10%):** Authentic voice, not hype.
- No em-dashes. Use periods.
- Core Philosophy = 2 sentences max.
- No docstrings or meta-commentary about the writing.

---

## Overview Subsections (in order)

1. Core Philosophy
2. Key Inputs
3. Strengths
4. Predicted Champion (callout box)
5. Factor Weights (bar chart)

## Methodology Subsections (in order)

1. Process (steps 01–05)
2. Data Sources
3. Key Assumptions
4. Limitations
5. Example (dark box)

Some models add model-specific subsections between Process and Data Sources (e.g., Historian adds Team Archetypes grid, Chaos Agent adds Upset Threshold scorecards).
