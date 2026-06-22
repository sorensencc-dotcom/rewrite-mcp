module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  plugins: ["./eslint-plugins/cic-design-system"],
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    // CIC Design System token enforcement
    "cic/no-raw-colors": "error",
    "cic/no-raw-spacing": "error",
    "cic/no-raw-font-size": "error",
    "cic/no-inline-style": "error",
    "cic/no-raw-motion": "error",
    "cic/no-raw-focus-ring": "error",
    "cic/no-css-in-js": "error",
  },
  overrides: [
    {
      files: ["**/*.jsx", "**/*.tsx"],
      rules: {
        "cic/no-inline-style": "error",
      },
    },
  ],
};
