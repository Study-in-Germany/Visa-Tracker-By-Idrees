import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: v("paper"), raised: v("paper-raised"), sunk: v("paper-sunk") },
        surface: { DEFAULT: v("paper-raised"), hover: v("paper-sunk") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        mute: v("mute"),
        card: v("card"),
        ink: { 50: v("ink-50"), 100: v("ink-100"), 300: v("ink-300"), 600: v("ink-600"), 700: v("ink-700"), 800: v("ink-800"), 900: v("ink-900") },
        accent: { 50: v("accent-50"), 100: v("accent-100"), 500: v("accent-500"), 600: v("accent-600"), 700: v("accent-700") },
        clay: { 50: v("clay-50"), 100: v("clay-100"), 400: v("clay-400"), 500: v("clay-500"), 600: v("clay-600") },
        ochre: { 50: v("ochre-50"), 500: v("ochre-500"), 700: v("ochre-700") },
      },
      keyframes: {
        "drawer-in": { "0%": { transform: "translateX(24px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        "sheet-up": { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
      },
      animation: { "sheet-up": "sheet-up 160ms ease-out", "drawer-in": "drawer-in 180ms ease-out" },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
