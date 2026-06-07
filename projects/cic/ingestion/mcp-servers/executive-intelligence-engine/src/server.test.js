import { describe, it, expect, beforeEach } from "vitest";

// Mock TriageRuleEngine for testing
class TriageRuleEngine {
  constructor() {
    this.rules = {};
  }

  addRule(senderEmail, targetLabel) {
    const PIPELINE_COLUMNS = new Set([
      "@Action Required",
      "@Pending",
      "@Review",
      "Business/Rewrite Labs",
      "Projects/Cast Iron Charlie",
      "Administrative",
      "Archived",
    ]);

    if (!PIPELINE_COLUMNS.has(targetLabel)) {
      const validLabels = Array.from(PIPELINE_COLUMNS).join(", ");
      throw new Error(
        `Invalid label "${targetLabel}". Valid labels: ${validLabels}`
      );
    }
    this.rules[senderEmail] = targetLabel;
  }

  categorize(sender, keywords = []) {
    // 1. Exact sender match
    if (this.rules[sender]) {
      return this.rules[sender];
    }

    // 2. Domain-based matching
    const domain = sender.split("@")[1];
    if (domain) {
      const domainRule = `@${domain}`;
      if (this.rules[domainRule]) {
        return this.rules[domainRule];
      }
    }

    // 3. Keyword matching with word boundaries
    for (const [rule, label] of Object.entries(this.rules)) {
      if (!rule.startsWith("@") && !rule.includes("@")) {
        try {
          const regex = new RegExp(`\\b${rule}\\b`, "i");
          for (const keyword of keywords) {
            if (regex.test(keyword)) {
              return label;
            }
          }
        } catch (err) {
          console.error(`Invalid regex for rule "${rule}": ${err.message}`);
        }
      }
    }

    // 4. Default category
    return "@Pending";
  }
}

describe("TriageRuleEngine", () => {
  let engine;

  beforeEach(() => {
    engine = new TriageRuleEngine();
  });

  it("should match exact sender email", () => {
    engine.addRule("john@example.com", "@Action Required");
    const category = engine.categorize("john@example.com", []);
    expect(category).toBe("@Action Required");
  });

  it("should match domain-based rules", () => {
    engine.addRule("@example.com", "Business/Rewrite Labs");
    const category = engine.categorize("alice@example.com", []);
    expect(category).toBe("Business/Rewrite Labs");
  });

  it("should match keywords with word boundaries", () => {
    engine.addRule("urgent", "Projects/Cast Iron Charlie");
    const category = engine.categorize(
      "unknown@domain.com",
      ["Please review this urgent task"]
    );
    expect(category).toBe("Projects/Cast Iron Charlie");
  });

  it("should not match partial keyword matches (word boundary protection)", () => {
    engine.addRule("claim", "@Review");
    const category = engine.categorize(
      "unknown@domain.com",
      ["Please review this disclaimer"]
    );
    expect(category).toBe("@Pending"); // Should default, not match "claim" in "disclaimer"
  });

  it("should apply priority: exact sender > domain > keywords > default", () => {
    engine.addRule("specific@example.com", "@Action Required");
    engine.addRule("@example.com", "Business/Rewrite Labs");
    engine.addRule("project", "Projects/Cast Iron Charlie");

    const category = engine.categorize("specific@example.com", [
      "Contains project keyword",
    ]);
    expect(category).toBe("@Action Required"); // Exact sender match wins
  });

  it("should default to @Pending when no rules match", () => {
    engine.addRule("john@example.com", "@Action Required");
    const category = engine.categorize("alice@unknown.com", []);
    expect(category).toBe("@Pending");
  });

  it("should reject invalid labels", () => {
    expect(() => {
      engine.addRule("test@example.com", "InvalidLabel");
    }).toThrow(/Invalid label/);
  });
});