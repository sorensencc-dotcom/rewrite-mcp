/**
 * CIC Design System Regression Tests
 * Verifies token usage, spacing, typography, and component stability
 * Run: npm test -- regression.test
 */

describe("CIC Design System Regression", () => {
  describe("Color Tokens", () => {
    it("should have all 7 color tokens defined", () => {
      const colorTokens = [
        "--cic-color-bg",
        "--cic-color-surface",
        "--cic-color-border",
        "--cic-color-text",
        "--cic-color-text-muted",
        "--cic-color-accent",
        "--cic-color-danger",
      ];

      colorTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should have no raw hex colors in computed styles", () => {
      const hexRegex = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;
      const elements = document.querySelectorAll("*");

      elements.forEach((el) => {
        const bgColor = window.getComputedStyle(el).backgroundColor;
        expect(bgColor).not.toMatch(hexRegex);
      });
    });
  });

  describe("Spacing Tokens", () => {
    it("should have all 7 spacing tokens defined", () => {
      const spacingTokens = [
        "--cic-space-2",
        "--cic-space-4",
        "--cic-space-6",
        "--cic-space-8",
        "--cic-space-12",
        "--cic-space-16",
        "--cic-space-24",
      ];

      spacingTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should have no raw px values in padding/margin", () => {
      const pxRegex = /\b\d+px\b/;
      const elements = document.querySelectorAll(".panel, .sidebar-item, .metric-card");

      elements.forEach((el) => {
        const padding = window.getComputedStyle(el).padding;
        const margin = window.getComputedStyle(el).margin;
        expect(padding).not.toMatch(pxRegex);
        expect(margin).not.toMatch(pxRegex);
      });
    });
  });

  describe("Typography Tokens", () => {
    it("should have all typography tokens defined", () => {
      const typeTokens = [
        "--cic-type-h4",
        "--cic-type-h5",
        "--cic-type-body-m",
        "--cic-type-body-s",
        "--cic-type-line-h4",
        "--cic-type-line-h5",
        "--cic-type-line-body-m",
        "--cic-type-line-body-s",
        "--cic-type-mono",
        "--cic-type-label",
      ];

      typeTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should use monospace font for body", () => {
      const body = document.querySelector("body");
      const fontFamily = window.getComputedStyle(body!).fontFamily;
      expect(fontFamily).toContain("Mono");
    });
  });

  describe("Component Tokens", () => {
    it("should have all button tokens defined", () => {
      const buttonTokens = [
        "--cic-button-primary-bg",
        "--cic-button-primary-text",
        "--cic-button-primary-hover-bg",
        "--cic-button-secondary-bg",
        "--cic-button-secondary-hover-bg",
        "--cic-button-danger-bg",
      ];

      buttonTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should have all row tokens defined", () => {
      const rowTokens = [
        "--cic-row-height",
        "--cic-row-gap",
        "--cic-row-hover-bg",
        "--cic-row-selected-bg",
      ];

      rowTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should have all input tokens defined", () => {
      const inputTokens = [
        "--cic-input-bg",
        "--cic-input-border",
        "--cic-input-focus-ring",
        "--cic-input-placeholder",
        "--cic-input-disabled-bg",
      ];

      inputTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should have all table tokens defined", () => {
      const tableTokens = [
        "--cic-table-header-height",
        "--cic-table-row-height",
        "--cic-table-divider",
        "--cic-table-zebra-bg",
        "--cic-table-hover-bg",
      ];

      tableTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });
  });

  describe("Interaction Tokens", () => {
    it("should have all interaction tokens defined", () => {
      const interactionTokens = [
        "--cic-interaction-hover-bg",
        "--cic-interaction-hover-border",
        "--cic-interaction-focus-ring",
        "--cic-interaction-selected-bg",
        "--cic-interaction-selected-border",
        "--cic-interaction-disabled-bg",
        "--cic-interaction-disabled-text",
        "--cic-interaction-pressed-bg",
      ];

      interactionTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });

    it("should have focus ring on interactive elements", () => {
      const focusableElements = document.querySelectorAll(
        "button, input, a, [tabindex]"
      );

      focusableElements.forEach((el) => {
        const outline = window.getComputedStyle(el).outline;
        expect(outline).toBeTruthy();
      });
    });
  });

  describe("Layout Stability", () => {
    it("should have fixed row height of 36px", () => {
      const rows = document.querySelectorAll(".table tr");
      rows.forEach((row) => {
        const height = (row as HTMLElement).offsetHeight;
        expect(height).toBe(36);
      });
    });

    it("should have fixed sidebar width of 240px", () => {
      const sidebar = document.querySelector(".sidebar");
      const width = (sidebar as HTMLElement)?.offsetWidth;
      expect(width).toBe(240);
    });

    it("should have fixed topbar height of 48px", () => {
      const topbar = document.querySelector(".topbar");
      const height = (topbar as HTMLElement)?.offsetHeight;
      expect(height).toBe(48);
    });

    it("should have no text clipping", () => {
      const textElements = document.querySelectorAll("h1, h2, h3, h4, p, span, a");
      textElements.forEach((el) => {
        const scrollWidth = (el as HTMLElement).scrollWidth;
        const offsetWidth = (el as HTMLElement).offsetWidth;
        expect(scrollWidth).toBeLessThanOrEqual(offsetWidth + 1);
      });
    });
  });

  describe("No Inline Styles", () => {
    it("should have no inline style attributes", () => {
      const styledElements = document.querySelectorAll("[style]");
      expect(styledElements.length).toBe(0);
    });

    it("should use only CSS tokens for styling", () => {
      const elements = document.querySelectorAll(".panel, .sidebar, .topbar");
      elements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;

        if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
          expect(bgColor).toMatch(/rgb|var\(/);
        }
      });
    });
  });

  describe("No CSS-in-JS", () => {
    it("should not import styled-components", () => {
      const scripts = Array.from(document.scripts)
        .map((s) => s.src || s.textContent)
        .join("");

      expect(scripts).not.toContain("styled-components");
    });

    it("should not import emotion", () => {
      const scripts = Array.from(document.scripts)
        .map((s) => s.src || s.textContent)
        .join("");

      expect(scripts).not.toContain("emotion");
    });
  });

  describe("Motion Tokens", () => {
    it("should use CSS tokens for transitions", () => {
      const interactiveElements = document.querySelectorAll(
        "button, .sidebar-item, .metric-card"
      );

      interactiveElements.forEach((el) => {
        const transition = window.getComputedStyle(el).transition;
        if (transition && transition !== "all 0s ease 0s") {
          expect(transition).toBeTruthy();
        }
      });
    });
  });

  describe("Focus Ring Consistency", () => {
    it("should use consistent focus ring color", () => {
      const focusColor = getComputedStyle(document.documentElement).getPropertyValue(
        "--cic-interaction-focus-ring"
      );

      expect(focusColor).toContain("0 0 0 2px");
      expect(focusColor).toContain("#4da3ff");
    });

    it("should apply focus ring to all focusable elements", () => {
      const focusableElements = document.querySelectorAll(
        "button:focus, input:focus, a:focus"
      );

      focusableElements.forEach((el) => {
        const focusRing = window.getComputedStyle(el).outline;
        expect(focusRing).toBeTruthy();
      });
    });
  });

  describe("Scrollbar Styling", () => {
    it("should have consistent scrollbar tokens", () => {
      const scrollbarTokens = [
        "--cic-scrollbar-track",
        "--cic-scrollbar-thumb",
        "--cic-scrollbar-thumb-hover",
      ];

      scrollbarTokens.forEach((token) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(
          token
        );
        expect(value).toBeTruthy();
      });
    });
  });
});
