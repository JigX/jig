import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // JIG brand — deep navy + electric blue
        jig: {
          50:  "#eef4ff",
          100: "#d9e7ff",
          200: "#b3cfff",
          300: "#7aadff",
          400: "#3a83ff",
          500: "#1a5eff",
          600: "#0a3fdb",
          700: "#082eb0",
          800: "#0a268f",
          900: "#0c2272",
          950: "#070f46",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
