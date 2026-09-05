import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional slate-blue scale — used for headings, text, and
        // outlined/dark UI elements. Lighter and softer than the old
        // near-black navy.
        navy: {
          50: "#f1f5f9",
          600: "#3b5773",
          700: "#33495f",
          800: "#2a3b4d",
          900: "#22303e",
          950: "#1c2733",
        },
        // Primary accent — a clean professional blue, replacing the old gold.
        gold: {
          300: "#93c5fd",
          400: "#3b82f6",
          500: "#2563eb",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
