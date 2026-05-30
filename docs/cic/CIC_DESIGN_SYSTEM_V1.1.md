# CIC Design System v1.1 — Upgrade Specification  
**Version:** 1.1.0  
**Status:** Ready for implementation  
**Scope:** Component hardening, design tokenization, visual index standardization, and enforcement expansion  
**Author:** CIC Design Authority  
**Date:** 2026‑05‑24

---

## **1. Purpose**
v1.1 elevates the CIC Design System from a static specification to a **programmatically consumable, enforceable, and auto‑generative design substrate**.  
The upgrade focuses on:

- Converting the design system into **machine‑readable tokens**
- Hardening core components with **variants, states, and semantics**
- Standardizing the **Visual Index Generator** layout and metadata
- Expanding the **Design Review Workflow** to enforce v1.1 rules

This is the first step toward **CIC Design System v2.0**, where CIC becomes a fully generative design engine.

---

# **2. Versioning**
### **2.1 Version Bump**
- **Minor bump**: 1.0 → **1.1**
- Triggered by:
  - New component variants  
  - New design tokens  
  - New enforcement rules  
  - New auto‑generation standards  

### **2.2 Semantic Delta**
- No breaking changes  
- All v1.0 assets remain valid  
- v1.1 introduces **additive capabilities**

---

# **3. Design Tokens (NEW in v1.1)**  
Design tokens become the **single source of truth** for all CIC visual semantics.

### **3.1 Token File**
`tokens.json` (machine‑readable, consumed by CIC agents)

### **3.2 Token Categories**
- **Color Tokens**
  - `color.bg.primary = #0a0a0a`
  - `color.accent.primary = #00ff88`
  - `color.text.primary = #ffffff`
  - `color.status.online = #00ff88`
  - `color.status.degraded = #ffaa00`
  - `color.status.down = #ff4444`
  - `color.status.pending = #888888`

- **Typography Tokens**
  - `font.heading = "Playfair Display"`
  - `font.subheading = "Baskerville"`
  - `font.body = "Barlow"`
  - `font.mono = "JetBrains Mono"`

- **Spacing Tokens**
  - `space.xs = 4px`
  - `space.sm = 8px`
  - `space.md = 16px`
  - `space.lg = 24px`
  - `space.xl = 32px`

- **Radius Tokens**
  - `radius.sm = 4px`
  - `radius.md = 8px`
  - `radius.lg = 12px`

- **Elevation Tokens**
  - `elevation.none = 0`
  - `elevation.low = 2px`
  - `elevation.med = 6px`
  - `elevation.high = 12px`

### **3.3 Token Enforcement**
- All CIC UI surfaces must reference tokens, not raw values  
- CIC auto‑documentation engine consumes tokens for diagram styling  
- Dashboard consumes tokens for status colors and layout  

---

# **4. Component Hardening (v1.1 Additions)**

## **4.1 cic-panel**
### **New Variants**
- `panel.bordered`
- `panel.elevated`
- `panel.inline`

### **New Properties**
- `panel.padding = space.md`
- `panel.radius = radius.md`
- `panel.elevation = elevation.low | elevation.med`

---

## **4.2 cic-alert**
### **New Severity Scale**
- `info` — accent blue  
- `warn` — amber  
- `error` — red  
- `success` — green  

### **New Structure**
- Icon slot  
- Title slot  
- Body slot  

### **New Behavior**
- Optional auto‑dismiss  
- Pulse animation for `error` and `warn`

---

## **4.3 cic-stat**
### **New Delta Indicators**
- `↑` positive  
- `↓` negative  
- `↔` neutral  

### **New Fields**
- `stat.value`
- `stat.delta`
- `stat.timestamp`

---

## **4.4 cic-grid**
### **New Responsive Breakpoints**
- `grid.sm = 1–2 columns`
- `grid.md = 2–4 columns`
- `grid.lg = 4–8 columns`

### **New Rules**
- All diagrams must use the grid  
- All visual indexes must use the grid  

---

# **5. Visual Index Generator (NEW in v1.1)**

## **5.1 Purpose**
Standardize all CIC visual indexes so they are:

- Uniform  
- Token‑driven  
- Timestamped  
- Versioned  
- Auto‑generated  

## **5.2 Layout Specification**
- **Header**
  - CIC watermark  
  - Artifact name  
  - Version  
  - Timestamp  
  - Region context (if applicable)

- **Grid Layout**
  - 4‑column responsive grid  
  - Each item is a `cic-panel`  
  - Each panel includes:
    - Title  
    - Description  
    - Status  
    - Link to source artifact  
    - Version  

- **Footer**
  - CIC Design Authority signature block  
  - Semantic delta summary  

---

# **6. Enforcement Changes (Design Review Workflow v1.1)**

## **6.1 L1 Automated Checks**
Add new automated validators:

- Token usage validator  
- Component variant validator  
- Visual index layout validator  
- Status color validator  
- Typography stack validator  

## **6.2 L2 Manual Audit**
Expanded checklist:

- Component variant correctness  
- Token alignment  
- Visual index compliance  
- Diagram grid alignment  

## **6.3 L3 Approval**
Design Authority must confirm:

- No raw colors  
- No raw spacing  
- No raw fonts  
- All assets use tokens  
- All visual indexes follow v1.1 layout  

---

# **7. Integration Points**

## **7.1 CIC Auto‑Documentation Engine**
Must consume:

- `tokens.json`  
- Visual index layout spec  
- Component variants  

## **7.2 CIC Observability Dashboard**
Must update:

- Status color tokens  
- Panel variants  
- Typography tokens  

## **7.3 CIC Diagram Generator**
Must adopt:

- Grid system  
- Tokenized colors  
- Tokenized spacing  

---

# **8. Migration Plan**

## **Phase 1 — Tokenization**
- Extract all design values into `tokens.json`  
- Update dashboard to use tokens  
- Update diagram generator to use tokens  

## **Phase 2 — Component Hardening**
- Implement new variants  
- Update existing UI surfaces  

## **Phase 3 — Visual Index Standardization**
- Implement generator  
- Regenerate all indexes  

## **Phase 4 — Enforcement**
- Update L1/L2/L3 workflows  
- Enforce v1.1 across all new assets  

---

# **9. Deliverables**
- `tokens.json`  
- Component v1.1 specs  
- Visual Index Generator spec  
- Updated Design Review Workflow (v1.1)  
- Migration checklist  
- Semantic delta summary  

---

# **10. Summary**
v1.1 transforms the CIC Design System into a **tokenized, enforceable, auto‑generative design substrate**.  
It hardens components, standardizes visual indexes, and expands enforcement to guarantee **industrial consistency across all CIC surfaces**.
