import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper surfaces
        paper: { DEFAULT: "#efeee9", raised: "#fbfaf7", sunk: "#e7e5de" },
        line: { DEFAULT: "#e3e0d8", strong: "#d0ccc0" },
        mute: "#7b786f",
        // Deep green-grey ink for text and primary actions (not black, not blue)
        ink: {
          50: "#eef2ee",
          100: "#dde6df",
          300: "#8aa190",
          600: "#4a6350",
          700: "#3a5140",
          800: "#2e4235",
          900: "#232f27",
        },
        // Terracotta accent
        clay: { 50: "#fbeee8", 100: "#f4d8cb", 400: "#cd6a45", 500: "#b5532f", 600: "#9a4425" },
        ochre: { 50: "#fbf3df", 500: "#b98a1f", 700: "#8a6414" },
      },
      keyframes: {
        "splash-pop": { "0%": { transform: "scale(0.7)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "splash-bar": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(200%)" } },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
