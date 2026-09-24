import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F4C81",
          50: "#EAF2F9",
          100: "#D6E4F2",
          200: "#A9C9E4",
          300: "#7CAAD5",
          400: "#4D8BC2",
          500: "#2A6DA8",
          600: "#0F4C81",
          700: "#0D4370",
          dark: "#0A3559",
          900: "#072742",
        },
        accent: {
          DEFAULT: "#F5B301",
          light: "#FFC93C",
          dark: "#D99E00",
        },
        success: "#16A34A",
        danger: "#DC2626",
        bg: "#F4F7FB",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.15rem" },
      boxShadow: {
        card: "0 1px 2px rgb(15 76 129 / 0.06), 0 4px 16px rgb(15 76 129 / 0.06)",
        lift: "0 8px 30px rgb(15 76 129 / 0.14)",
      },
    },
  },
  plugins: [],
} satisfies Config;
