import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  // Ignore patterns - be more aggressive to exclude bundled files
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.min.js",
    "**/*.bundle.js",
    "**/vite.config.*",
    "**/.next/**",
    "**/coverage/**",
    "**/temp.md",
  ]),
  tseslint.configs.recommended,
  // Backend files - allow require() style imports (CommonJS) and be lenient with unused vars
  {
    files: ["backend/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
    },
  },
  // Frontend utility files - allow require for dayjs
  {
    files: ["frontend/src/lib/utils.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // React configuration only for frontend files
  {
    files: ["frontend/**/*.{js,jsx,ts,tsx}"],
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "19.2", // React 19.2 as specified in requirements
      },
    },
    rules: {
      // React 19 doesn't require React in scope for JSX
      "react/react-in-jsx-scope": "off",
      // We use TypeScript for prop validation, not prop-types
      "react/prop-types": "off",
      // Allow apostrophes in text (common in English)
      "react/no-unescaped-entities": ["warn", {
        forbid: [">", "}"]
      }],
      // Be lenient with unused vars (prefix with _ to ignore)
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      // Allow 'any' but warn about it
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused expressions in certain contexts
      "@typescript-eslint/no-unused-expressions": ["error", {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      }],
      // Allow case declarations with braces
      "no-case-declarations": "warn",
      // Other warnings
      "no-prototype-builtins": "warn",
      "no-useless-escape": "warn",
      "getter-return": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "no-empty": "warn",
    },
  },
]);
