import tsParser from "@typescript-eslint/parser";

const RESTRICTED_SERVER_IMPORTS = {
  paths: [
    {
      name: "@/lib/db",
      message: "Presentational components must not import Prisma or database modules directly.",
    },
    {
      name: "@prisma/client",
      message: "Presentational components must not import @prisma/client.",
    },
    {
      name: "@/lib/forecasting/forecast-service",
      message: "Presentational components must not import server forecasting services; pass typed props from adapters instead.",
    },
    {
      name: "@/lib/analytics/service",
      message: "Presentational components must not import server analytics services; pass typed props from adapters instead.",
    },
  ],
};

export default [
  {
    ignores: [".next/**", ".next-build-check/**", "node_modules/**", "Valley/**", "playwright-report/**", "test-results/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "react-hooks": {
        rules: {
          "exhaustive-deps": { meta: { type: "suggestion", schema: [] }, create: () => ({}) },
        },
      },
      "@next/next": {
        rules: {
          "no-img-element": { meta: { type: "suggestion", schema: [] }, create: () => ({}) },
        },
      },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    files: [
      "components/visa/**/*.{ts,tsx}",
      "components/timeline/**/*.{ts,tsx}",
      "components/data-display/**/*.{ts,tsx}",
      "components/ui/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", RESTRICTED_SERVER_IMPORTS],
    },
  },
];
