---
title: Ideogram 4.0 Scoring Sheet Template
version: 1.0.0
date: 2026-06-05
phase: 6.2a
---

# 🎨 **Ideogram 4.0 — Scoring Sheet Template**  
*(Rewrite Labs — P0 Critical Evaluation)*

---

## 📌 **Evaluation Metadata**

| Field | Value |
|-------|-------|
| **Project** | Ideogram 4.0 Integration Assessment |
| **Evaluator** | Chris |
| **Date** | __________ |
| **Prompt Set** | Benchmark 10‑site SMB corpus (6 verticals) |
| **Run IDs** | __________ |
| **Model Versions** | Ideogram 4.0 / Claude Sonnet / Claude Opus |
| **Environment** | Local inference (Ideogram), API (Claude) |

---

## 🧪 **1. Dimension Scores (0–5)**  

Fill these during evaluation runs. Include brief observations for each dimension.

| # | Dimension | Score | Observations | Confidence |
|---|-----------|-------|--------------|------------|
| 1 | **Typography Fidelity** | ___ | Legibility, consistency, brand alignment | High / Medium / Low |
| 2 | **Layout Stability** | ___ | Grid adherence, spacing, hierarchy repeatability | High / Medium / Low |
| 3 | **Brand Coherence** | ___ | Color palette accuracy, vertical‑specific cues | High / Medium / Low |
| 4 | **Prompt Determinism** | ___ | Stability across repeated generations (≥3 runs) | High / Medium / Low |
| 5 | **Hallucination Rate** | ___ | Distortions, invented UI, structural drift | High / Medium / Low |
| 6 | **HTML Compatibility** | ___ | Clean mapping into HTML/CSS generator | High / Medium / Low |
| 7 | **AEO Compatibility** | ___ | Survives metadata injection + AI search crawl | High / Medium / Low |
| 8 | **Pipeline Throughput** | ___ | Local inference speed, batch viability | High / Medium / Low |
| 9 | **Cost Efficiency** | ___ | Zero‑API cost vs. compute load tradeoff | High / Medium / Low |

---

## 🎯 **2. Per-Vertical Scoring**  

Score each of the 6 benchmark verticals independently, then average.

### **Vertical 1: Local Service (Dental/Legal/Landscaping)**

| Dimension | Ideogram | Sonnet | Opus | Notes |
|-----------|----------|--------|------|-------|
| Typography | ___ | ___ | ___ | |
| Layout | ___ | ___ | ___ | |
| Brand Fit | ___ | ___ | ___ | |

**Vertical Average (Ideogram):** ___

---

### **Vertical 2: Fitness / Wellness**

| Dimension | Ideogram | Sonnet | Opus | Notes |
|-----------|----------|--------|------|-------|
| Typography | ___ | ___ | ___ | |
| Layout | ___ | ___ | ___ | |
| Brand Fit | ___ | ___ | ___ | |

**Vertical Average (Ideogram):** ___

---

### **Vertical 3: Salon / Spa**

| Dimension | Ideogram | Sonnet | Opus | Notes |
|-----------|----------|--------|------|-------|
| Typography | ___ | ___ | ___ | |
| Layout | ___ | ___ | ___ | |
| Brand Fit | ___ | ___ | ___ | |

**Vertical Average (Ideogram):** ___

---

### **Vertical 4: Restaurant / Café**

| Dimension | Ideogram | Sonnet | Opus | Notes |
|-----------|----------|--------|------|-------|
| Typography | ___ | ___ | ___ | |
| Layout | ___ | ___ | ___ | |
| Brand Fit | ___ | ___ | ___ | |

**Vertical Average (Ideogram):** ___

---

### **Vertical 5: Contractor / Trades**

| Dimension | Ideogram | Sonnet | Opus | Notes |
|-----------|----------|--------|------|-------|
| Typography | ___ | ___ | ___ | |
| Layout | ___ | ___ | ___ | |
| Brand Fit | ___ | ___ | ___ | |

**Vertical Average (Ideogram):** ___

---

### **Vertical 6: Generic Small Business**

| Dimension | Ideogram | Sonnet | Opus | Notes |
|-----------|----------|--------|------|-------|
| Typography | ___ | ___ | ___ | |
| Layout | ___ | ___ | ___ | |
| Brand Fit | ___ | ___ | ___ | |

**Vertical Average (Ideogram):** ___

---

## 🧮 **3. Weighted Composite Score**  

**Formula:**
```
Overall Score = 0.25T + 0.20L + 0.15B + 0.10D + 0.10H + 0.10C + 0.10A
```

**Your values:**
- T (Typography) = ___
- L (Layout) = ___
- B (Brand Coherence) = ___
- D (Determinism) = ___
- H (Hallucination Rate) = ___
- C (HTML Compatibility) = ___
- A (AEO Compatibility) = ___

**Calculation:**
```
Overall = 0.25(___) + 0.20(___) + 0.15(___) + 0.10(___) + 0.10(___) + 0.10(___) + 0.10(___)
        = ___ + ___ + ___ + ___ + ___ + ___ + ___
        = ___________
```

**Overall Score: _________ / 5.0**

---

## 🧭 **4. Integration Decision**  

**Circle one:**

### **Option A: Primary Generator** ✅
- **Condition:** Overall ≥ 4.0
- **Action:** Replace Sonnet as main redesign generator
- **Pipeline:** `Ideogram → HTML → AEO → Delivery`
- **Cost Impact:** –100% API spend

---

### **Option B: Style‑Enhancer** ⚙️
- **Condition:** 3.0–3.9
- **Action:** Ideogram post-processes Sonnet output
- **Pipeline:** `Sonnet → Ideogram → HTML → AEO → Delivery`
- **Cost Impact:** +0% (local inference only)

---

### **Option C: Not Ready** ⏸️
- **Condition:** < 3.0
- **Action:** Keep current pipeline unchanged
- **Pipeline:** `Sonnet → HTML → AEO → Delivery` (status quo)
- **Cost Impact:** 0% (no change)

---

**FINAL DECISION:** ______________________

**Justification:**
- _______________________________________________
- _______________________________________________
- _______________________________________________

---

## 📂 **5. Evidence & Attachments**

Link or paste evidence for each category:

| Evidence Type | Location / File | Status |
|---------------|-----------------|--------|
| Sample outputs (Ideogram) | | ✓ / ✗ |
| Sample outputs (Sonnet) | | ✓ / ✗ |
| A/B diffs / comparison images | | ✓ / ✗ |
| HTML conversion screenshots | | ✓ / ✗ |
| HTML validation logs | | ✓ / ✗ |
| AEO injection test results | | ✓ / ✗ |
| Crawl validation (ChatGPT, Perplexity, Gemini) | | ✓ / ✗ |
| Throughput / latency logs | | ✓ / ✗ |
| Cost analysis | | ✓ / ✗ |

---

## 📝 **6. Strengths & Weaknesses**

### **Ideogram 4.0 Strengths:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### **Ideogram 4.0 Weaknesses:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### **Ideogram vs. Sonnet (head-to-head):**
| Dimension | Winner | Margin | Notes |
|-----------|--------|--------|-------|
| Typography | | | |
| Layout | | | |
| Cost | | | |
| Speed | | | |

---

## 🎯 **7. Next Steps & Contingencies**

**If Primary Generator (A):**
- [ ] Promote Ideogram to default in redesign pipeline
- [ ] Train team on new prompt patterns
- [ ] Update Rewrite Labs documentation
- [ ] Monitor first 20 redesigns for regressions
- [ ] Rollback threshold: If >2 significant failures, revert to Sonnet

**If Style‑Enhancer (B):**
- [ ] Wire Ideogram as optional refinement pass
- [ ] Create toggle in control plane (`use_ideogram_refinement: true/false`)
- [ ] A/B test on next 10 redesigns (cost/quality tradeoff)
- [ ] Document prompt fusion patterns (Sonnet + Ideogram)

**If Not Ready (C):**
- [ ] Schedule re-evaluation in 4–6 weeks
- [ ] Monitor Ideogram model updates
- [ ] Document blockers and reopening criteria
- [ ] Keep Sonnet as primary

---

## 📞 **8. Sign-Off**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Evaluator** | Chris | __________ | __________ |
| **Design Lead** | __________ | __________ | __________ |
| **Pipeline Architect** | __________ | __________ | __________ |

---

## 📚 **Related Documents**

- [Ideogram 4.0 Decision Matrix](./IDEOGRAM_4_0_DECISION_MATRIX.md)
- [Phase 6.2a — Evaluation Plan](./CIC_MASTER_ROADMAP.md#phase-62a--ideogram-40-model-evaluation)
- [Rewrite Labs Pipeline Architecture](./REWRITE_LABS_PIPELINE.md)

---

**Instructions:**
1. Print this sheet or open in Obsidian/Notion
2. Fill scores during evaluation (pencil-in first, finalize at end)
3. Calculate composite score
4. Circle decision
5. Attach evidence
6. Send to design team + pipeline architect
7. Archive in `/docs/evaluations/ideogram-4-0-[DATE].md`

*Last Updated: 2026-06-05*  
*Status: READY FOR EVALUATION*
