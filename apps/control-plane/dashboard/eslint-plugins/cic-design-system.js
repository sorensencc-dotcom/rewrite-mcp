/**
 * CIC Design System ESLint Plugin
 * Enforces token usage at commit time
 * No raw colors, spacing, fonts, or inline styles allowed
 */

const COLOR_REGEX = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;
const PX_REGEX = /\b\d+px\b/;
const FONT_SIZE_REGEX = /\b\d+(px|rem|em)\b/;
const INLINE_STYLE_REGEX = /style\s*=\s*{{/;
const MOTION_REGEX = /(transition|animation):\s*[^;]*(?!var\()/;
const FOCUS_RING_REGEX = /outline:\s*(?!var\()/;
const CSS_IN_JS_IMPORT = /^(styled-components|emotion)$/;

module.exports = {
  rules: {
    "cic/no-raw-colors": {
      meta: {
        type: "problem",
        docs: {
          description: "Use CIC color tokens, not raw hex values",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          Literal(node) {
            if (typeof node.value === "string" && COLOR_REGEX.test(node.value)) {
              ctx.report({
                node,
                message: `Use CIC color tokens (--cic-color-*), not raw hex: ${node.value}`,
              });
            }
          },
          TemplateElement(node) {
            if (COLOR_REGEX.test(node.value.raw)) {
              ctx.report({
                node,
                message: `Use CIC color tokens (--cic-color-*), not raw hex: ${node.value.raw}`,
              });
            }
          },
        };
      },
    },

    "cic/no-raw-spacing": {
      meta: {
        type: "problem",
        docs: {
          description: "Use CIC spacing tokens (--cic-space-*), not px values",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          Literal(node) {
            if (typeof node.value === "string" && PX_REGEX.test(node.value)) {
              ctx.report({
                node,
                message: `Use CIC spacing tokens (--cic-space-*), not px: ${node.value}`,
              });
            }
          },
          TemplateElement(node) {
            if (PX_REGEX.test(node.value.raw)) {
              ctx.report({
                node,
                message: `Use CIC spacing tokens (--cic-space-*), not px: ${node.value.raw}`,
              });
            }
          },
        };
      },
    },

    "cic/no-raw-font-size": {
      meta: {
        type: "problem",
        docs: {
          description: "Use CIC typography tokens (--cic-type-*), not raw font sizes",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          Literal(node) {
            if (typeof node.value === "string" && FONT_SIZE_REGEX.test(node.value)) {
              ctx.report({
                node,
                message: `Use CIC typography tokens (--cic-type-*), not raw sizes: ${node.value}`,
              });
            }
          },
          TemplateElement(node) {
            if (FONT_SIZE_REGEX.test(node.value.raw)) {
              ctx.report({
                node,
                message: `Use CIC typography tokens (--cic-type-*), not raw sizes: ${node.value.raw}`,
              });
            }
          },
        };
      },
    },

    "cic/no-inline-style": {
      meta: {
        type: "problem",
        docs: {
          description: "Inline styles bypass token enforcement. Use className instead.",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          JSXAttribute(node) {
            if (node.name && node.name.name === "style") {
              ctx.report({
                node,
                message:
                  "Inline styles bypass token enforcement. Use className with CSS tokens instead.",
              });
            }
          },
        };
      },
    },

    "cic/no-raw-motion": {
      meta: {
        type: "problem",
        docs: {
          description: "Use CIC motion tokens (--cic-motion-*), not raw transition/animation",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          Literal(node) {
            if (typeof node.value === "string" && MOTION_REGEX.test(node.value)) {
              ctx.report({
                node,
                message: `Use CIC motion tokens (--cic-motion-*), not raw transition/animation: ${node.value}`,
              });
            }
          },
          TemplateElement(node) {
            if (MOTION_REGEX.test(node.value.raw)) {
              ctx.report({
                node,
                message: `Use CIC motion tokens (--cic-motion-*), not raw transition/animation: ${node.value.raw}`,
              });
            }
          },
        };
      },
    },

    "cic/no-raw-focus-ring": {
      meta: {
        type: "problem",
        docs: {
          description: "Use Radix focus ring tokens or --cic-interaction-focus-ring, not raw outline",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          Literal(node) {
            if (typeof node.value === "string" && FOCUS_RING_REGEX.test(node.value)) {
              ctx.report({
                node,
                message: `Use Radix focus ring or --cic-interaction-focus-ring token, not raw outline: ${node.value}`,
              });
            }
          },
          TemplateElement(node) {
            if (FOCUS_RING_REGEX.test(node.value.raw)) {
              ctx.report({
                node,
                message: `Use Radix focus ring or --cic-interaction-focus-ring token, not raw outline: ${node.value.raw}`,
              });
            }
          },
        };
      },
    },

    "cic/no-css-in-js": {
      meta: {
        type: "problem",
        docs: {
          description:
            "CSS-in-JS (styled-components, emotion) is forbidden. Use CSS tokens and className instead.",
          category: "CIC Design System",
          recommended: true,
        },
        fixable: null,
        schema: [],
      },
      create(ctx) {
        return {
          ImportDeclaration(node) {
            if (CSS_IN_JS_IMPORT.test(node.source.value)) {
              ctx.report({
                node,
                message: `CSS-in-JS is forbidden in CIC. Use CSS tokens and className instead. Banned: ${node.source.value}`,
              });
            }
          },
        };
      },
    },
  },
};
