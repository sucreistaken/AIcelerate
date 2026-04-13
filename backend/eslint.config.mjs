import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "data/**", "**/*.test.ts", "**/__tests__/**", "scripts/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        performance: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        Response: "readonly",
        Request: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "warn",
      "prefer-const": "error",
    },
  },
  {
    files: ["**/*.ts"],
    ...prettier,
  },
];
