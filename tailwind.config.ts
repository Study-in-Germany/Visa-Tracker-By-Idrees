import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a1128",
          900: "#0f1b3d",
          800: "#152752",
          700: "#1c3468",
          600: "#274785",
        },
        gold: {
          500: "#d4af37",
          400: "#e0c158",
          300: "#ecd587",
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
