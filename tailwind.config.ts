import type { Config } from "tailwindcss";

// Every colour is a CSS variable (RGB triplet) defined in app/globals.css, so light and dark themes
// swap by toggling the `dark` class on <html> and opacity modifiers like `bg-clay-500/40` keep working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper surfaces
        paper: { DEFAULT: v("paper"), raised: v("paper-raised"), sunk: v("paper-sunk") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        mute: v("mute"),
        card: v("card"),
        // Deep green-grey ink for text and primary actions (not black, not blue)
        ink: { 50: v("ink-50"), 100: v("ink-100"), 300: v("ink-300"), 600: v("ink-600"), 700: v("ink-700"), 800: v("ink-800"), 900: v("ink-900") },
        // Terracotta accent
        clay: { 50: v("clay-50"), 100: v("clay-100"), 400: v("clay-400"), 500: v("clay-500"), 600: v("clay-600") },
        ochre: { 50: v("ochre-50"), 500: v("ochre-500"), 700: v("ochre-700") },
      },
      keyframes: {
        "splash-pop": { "0%": { transform: "scale(0.7)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "splash-bar": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(200%)" } },
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
