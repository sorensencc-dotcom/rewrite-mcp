# CIC Design Review Workflow v1.1

**Version:** 1.1.0  
**Status:** Active  
**Enforcement Level:** Mandatory for all v1.1+ assets  

---

## **1. Overview**
The Design Review Workflow ensures that all CIC visual artifacts (UI components, diagrams, visual indexes) adhere to the **CIC Design System v1.1** standards. It is a multi-tier enforcement process combining automation with expert audit.

---

## **2. Tier L1: Automated Checks**
*Goal: Catch structural and tokenization errors before manual review.*

### **2.1 Token Usage Validator**
- **Check:** Verify no raw hex codes, pixel values (outside of tokens), or font names are used.
- **Rule:** Every CSS property or design definition must reference a key from `tokens.json`.
- **Failure:** Block PR if raw values are detected.

### **2.2 Component Variant Validator**
- **Check:** Ensure components use defined variants (e.g., `panel.bordered`).
- **Rule:** Custom styling outside of defined variants must be documented as an "Extended Variant" and approved.

### **2.3 Status Color Validator**
- **Check:** Compare status indicators against the `color.status` token set.
- **Rule:** Use `online`, `degraded`, `down`, or `pending`. No custom status colors.

---

## **3. Tier L2: Manual Audit**
*Goal: Ensure semantic correctness and visual integrity.*

### **3.1 Visual Index Compliance**
- [ ] Does the artifact follow the **Visual Index Layout Spec**?
- [ ] Is the CIC watermark present and correctly positioned?
- [ ] Are version and timestamp metadata accurate?

### **3.2 Diagram Grid Alignment**
- [ ] Does the diagram utilize the `cic-grid` system?
- [ ] Are elements snapped to the 8px baseline grid (derived from `space.sm`)?

### **3.3 Component Integrity**
- [ ] Are `cic-panel` instances using the correct elevation tokens?
- [ ] Do `cic-alert` instances match the severity-to-color mapping?

---

## **4. Tier L3: Design Authority Approval**
*Goal: Final sign-off on architectural and aesthetic alignment.*

### **4.1 Final Checklist**
- [x] **Zero Raw Values:** All assets are 100% token-driven.
- [x] **Semantic Accuracy:** Visuals correctly represent the underlying system state.
- [x] **Aesthetic Uniformity:** The artifact is indistinguishable from official CIC-generated assets.

### **4.2 Approval Signature**
Approval must be recorded in the `DOC_STATE.json` or as a comment on the PR by a member of the **CIC Design Authority**.

---

## **5. Failure Remediation**
If a review fails:
1.  **L1 Failure:** Developer must replace raw values with tokens and re-run validators.
2.  **L2/L3 Failure:** Design Authority provides specific feedback on grid alignment or semantic drift. Developer must adjust and re-submit.
