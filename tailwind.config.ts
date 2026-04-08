import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          dark: "#0f2f1f",
          green: "#22c55e",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
