# DESIGN.md — Brand router (not a design system)

> **This file does not invent tokens.** It routes agents to the correct existing source of truth.
> Coding agents (Grok Bots, Cursor, Chief): read this first, then open the linked SoT for the active brand.
> Pair with `.cursor/rules/figma-design-system.mdc`.

**Owners:** Chris Sorensen (design authority)  
**Last updated:** 2026-09-27  
**Role of this pack:** routing + enforcement only

---

## 1. Hard rules (every brand)

1. **Never invent** colors, fonts, radii, shadows, gradients, or components.
2. **Never blend brands.** CIC industrial forge tokens and Rewrite Labs control-plane tokens are incompatible. Do not mix hex, fonts, or aesthetics across brands in one surface.
3. **Match before make.** Prefer existing patterns in the active SoT + repo catalog.
4. **Named tokens only.** Use SoT token names / CSS variables bound to that SoT — not magic hex/px in product UI.
5. **Document gaps.** Missing coverage → propose an addition to the *real* SoT (linked below). Do not freelance a third system in this file or in feature folders.
6. **Cite sources.** In PRs / agent summaries: brand name, SoT path, component/token names.

If brand context is unclear: **stop and ask** which brand owns the surface. Default guessing is forbidden.

---

## 2. Brand router — which SoT to open

| If you are working on… | Brand | Open these SoT files (in order) |
|------------------------|-------|----------------------------------|
| Cast Iron Charlie / CIC diagrams, master sheets, treatment boards, Charlie-branded wiki embeds, forge preview UIs | **CIC** | `cic_design_system.md` → `docs/CIC_DESIGN_SYSTEM_ENFORCEMENT.md` |
| Rewrite Labs / rewrite-mcp operator console, control-plane UI/CSS, control-room panels | **Rewrite Labs** | `design/control-plane/tokens.json` → `layout.md` → `wireframes.txt` → `README.md` |
| Neither / unknown | — | **Stop.** Do not invent a neutral third palette. |

### CIC — Cast Iron Charlie (Charlie-branded)

| Resource | Location |
|----------|----------|
| Canonical (GitHub) | https://github.com/sorensencc-dotcom/charlie-deep-research/blob/main/cic_design_system.md |
| Local (box / clone) | `/workspace/charlie-fix/main-repo/cic_design_system.md` (repo root: `cic_design_system.md`) |
| Enforcement checklist | `docs/CIC_DESIGN_SYSTEM_ENFORCEMENT.md` — **Charlie publishing only; out of scope for RewriteLabs product UI** |

**Brief summary (not a competing bible — verify in SoT):**

- Forge palette: `BACKGROUND #1A1410`, `GRID #2C2420`, `STROKES #B8922A`, `EMBER #C4501A`, `TEXT_PRIMARY #E8E0D4`, `TEXT_SECONDARY #9A9088`
- Fonts: Playfair Display (titles), Barlow Condensed (labels), Libre Baskerville (subtext)
- Aesthetic: brass grid/strokes, ember nodes, CIC crest watermark @ 0.22 — **no shadows, no gradients, no rounded corners**
- Canvas: diagram 1200×800; master sheet 3840×2160
- **Wiki diagrams:** parchment / paper field mode (board + default node fills light; forge black as ink only). See `cic_design_system.md` § Wiki diagram readability — do not ship dark-on-dark wiki embeds

### Rewrite Labs — rewrite-mcp (operator / control-plane UI)

| Resource | Location |
|----------|----------|
| Repo | https://github.com/sorensencc-dotcom/rewrite-mcp |
| Design SoT dir | `design/control-plane/` |
| Tokens | `design/control-plane/tokens.json` |
| Layout | `design/control-plane/layout.md` |
| Wireframes | `design/control-plane/wireframes.txt` |
| Architecture README | `design/control-plane/README.md` |

**Brief summary (not a competing bible — verify in SoT):**

- Control-plane tokens differ from CIC industrial: dark `#0a0a0a` / `#111111` / `#141414`, accent `#00ff88`, radius allowed (`sm/md/lg`), elevation scale exists
- Fonts in tokens: Playfair Display, Baskerville, Barlow, JetBrains Mono (operator density — monospace for data)
- Consumers: `operator-ui/css/control-room.css`, `operator-ui/control-room.html`, panel JS under `operator-ui/js/`

**BOB sandwich (order of patches):**

```
OUTER  design/control-plane/{tokens,layout,wireframes,README}
MIDDLE operator-ui/ (control-room.html, css/, js/)
CORE   services/control-plane/ (API + routes)
```

Control-plane BOBs: OUTER → MIDDLE → CORE. Do not smuggle CIC forge styling into operator UI, or neon control-plane accents into Charlie diagrams.

---

## 3. Anti-slop (agents)

- No random gradients, glass blur, glow shadows, or “make it pretty” freelancing
- No inventing a shared “Acme” or placeholder palette in this pack
- No copying CIC brass/ember into rewrite-mcp CSS; no `#00ff88` / soft radius on CIC forge diagrams
- No new atoms when the active catalog / wireframes already define the pattern
- Screenshots are layout reference after SoT mapping — not a license for new primitives
- Prefer composition; keep data-fetch wiring outside design-system boundaries when applicable

---

## 4. Gap protocol

If the needed UI is **missing** from the active brand’s SoT:

1. **Refuse freelancing** a permanent one-off in a feature folder.
2. **Propose an addition** to the *correct* SoT file (CIC markdown or `tokens.json` / `layout.md` / `wireframes.txt`) — never invent a parallel table here.
3. Optionally use the closest existing token/component as a temporary stand-in; call the gap out explicitly.
4. Log the gap in the owning repo’s design docs / PR (not as a shadow bible in this pack).

This pack’s §2 tables stay **summaries + links**. Full token tables live only in the SoT files above.

---

## 5. Accessibility baseline

Obey the active SoT. Minimum expectations for both brands:

- Visible focus; never `outline: none` without a replacement
- Sufficient contrast on the chosen background (esp. CIC wiki parchment vs forge)
- Labels / accessible names for controls
- Keyboard paths for tabs, dialogs, disclosure
- Respect `prefers-reduced-motion` for non-essential motion

Rewrite Labs specifics: see `layout.md` accessibility baseline. CIC: enforcement checklist + SoT aesthetic rules.

---

## 6. Agent handoff checklist

- [ ] Brand identified (CIC vs Rewrite Labs)
- [ ] Correct SoT file(s) read before writing UI
- [ ] No invented colors/fonts/effects outside that SoT
- [ ] Brands not blended
- [ ] Gaps proposed against the real SoT (not this router)
- [ ] Components / tokens cited by name
- [ ] a11y baseline met

---

## 7. What this pack is / is not

| Is | Is not |
|----|--------|
| Brand router + enforcement | A third design system |
| Pointers to github.com/sorensencc-dotcom/{charlie-deep-research,rewrite-mcp} | A place to duplicate full token tables |
| Cursor rule companion | Figma variable dump |

When Figma MCP is available: map nodes to the **active brand’s** library / SoT. If Figma and SoT conflict, stop and reconcile — do not invent a third variant.
