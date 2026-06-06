---
title: Ideogram 4.0 Integration Decision Matrix
version: 1.0.0
date: 2026-06-05
phase: 6.2a
---

# 🎨 Ideogram 4.0 — Integration Decision Matrix  
*(Rewrite Labs — P0 Critical Path)*

## 📊 Evaluation Matrix (0–5 scoring)

| Dimension | Score (0–5) | Notes |
|----------|-------------|-------|
| **Typography Fidelity** |  | Clarity, legibility, consistency, brand alignment |
| **Layout Stability** |  | Grid adherence, spacing, hierarchy, repeatability |
| **Brand Coherence** |  | Color palette accuracy, vertical‑specific cues |
| **Prompt Determinism** |  | Stability across repeated generations |
| **Hallucination Rate** |  | Incorrect UI elements, distortions, invented structure |
| **HTML Compatibility** |  | Clean mapping into your HTML/CSS generator |
| **AEO Compatibility** |  | Does the design survive AEO metadata injection? |
| **Pipeline Throughput** |  | Local inference speed, batch viability |
| **Cost Efficiency** |  | Zero‑API cost vs. compute load |
| **Overall Fit** |  | Weighted composite for pipeline integration |

---

## 🧮 Weighted Decision Formula  

**Overall Score Formula:**

```
Overall Score = 0.25T + 0.20L + 0.15B + 0.10D + 0.10H + 0.10C + 0.10A
```

Where:  
- **T** = Typography Fidelity (weight: 25%)
- **L** = Layout Stability (weight: 20%)
- **B** = Brand Coherence (weight: 15%)
- **D** = Prompt Determinism (weight: 10%)
- **H** = Hallucination Rate (weight: 10%)
- **C** = HTML Compatibility (weight: 10%)
- **A** = AEO Compatibility (weight: 10%)

---

## 🧭 Integration Decision Logic

### **If Overall ≥ 4.0**  
→ **Promote Ideogram 4.0 to primary generator**  

**Pipeline:**
```
Ideogram 4.0 → HTML Generator → AEO Injector → Delivery
```

**Rationale:** Quality matches/exceeds Sonnet; zero-API cost amortizes compute overhead.

---

### **If 3.0 ≤ Overall < 4.0**  
→ **Use Ideogram as a style‑enhancer**  

**Pipeline:**
```
Claude Sonnet → Ideogram Refinement → HTML Generator → AEO Injector → Delivery
```

**Rationale:** Ideogram excels in specific dimensions (typography/layout); leverage as post-processing refinement.

---

### **If Overall < 3.0**  
→ **Keep Sonnet primary; Ideogram not production-ready**

**Pipeline:**
```
Claude Sonnet → HTML Generator → AEO Injector → Delivery (unchanged)
```

**Rationale:** Ideogram inconsistencies or failures outweigh benefits; revisit when model updates.

---

## 📌 Decision Snapshot

| Outcome | Condition | Action | Cost Impact | Timeline |
|---------|-----------|--------|-------------|----------|
| **Primary Generator** | Score ≥ 4.0 | Replace Sonnet for all redesigns | **Δ -100%** API cost | Immediate |
| **Style‑Enhancer** | 3.0–3.9 | Ideogram post-processing pass | **Δ +0%** (local inference) | Phased rollout |
| **Not Ready** | < 3.0 | Maintain status quo | **Δ 0%** | Revisit in 4–6 weeks |

---

## 📋 Evaluation Checklist

- [ ] **Day 1:** Benchmark setup (10 prompts × 3 models)
- [ ] **Day 1:** A/B test harness running
- [ ] **Day 1:** Scoring rubric applied to first batch
- [ ] **Day 2:** Integration test (design → HTML → AEO → crawl validation)
- [ ] **Day 2:** Composite score calculated
- [ ] **Day 2:** Decision logic applied
- [ ] **Day 2:** Updated redesign pipeline diagram
- [ ] **Day 2:** Week 2 roadmap recommendation
- [ ] **Deliverable:** Integration report (PDF + summary)

---

## 🎯 Success Criteria

**Evaluation is complete when:**
1. All 10 benchmark prompts scored across 7 dimensions
2. Weighted composite calculated and rationalized
3. Integration decision made and documented
4. Pipeline impact assessed
5. Deliverables published

**Quality gates:**
- Each dimension has ≥ 3 data points (repeated runs)
- HTML conversion validates cleanly (0 layout breaks)
- AEO metadata injection verified (✔ AI-search compatible)
- Throughput logs show sustainable batch viability

---

## 📞 Escalation Path

**If evaluation surfaces unexpected issues:**
- Model divergence (Ideogram vs. benchmark): Flag and rescore
- HTML conversion failures: Debug with HTML generator team
- AEO compatibility issues: Consult AEO metadata injector team
- Cost/throughput mismatch: Reassess hardware assumptions

**Owner:** Chris (Rewrite Labs)  
**Stakeholders:** Design team, HTML generator team, AEO team  
**Decision Point:** End of Day 2 (Friday EOD)

---

## 📚 Related Documents

- [Ideogram 4.0 Scoring Sheet Template](./IDEOGRAM_4_0_SCORING_SHEET.md)
- [Phase 6.2a — Master Roadmap](./CIC_MASTER_ROADMAP.md#phase-62a--ideogram-40-model-evaluation)
- [Rewrite Labs Pipeline Architecture](./REWRITE_LABS_PIPELINE.md)

---

*Last Updated: 2026-06-05*  
*Status: PENDING (Evaluation scheduled for this weekend)*
