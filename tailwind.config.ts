import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        "ink-soft": "#1A1418",
        pink: {
          DEFAULT: "#E84CAD",
          deep: "#A82D79",
        },
        surface: "#FFFFFF",
        bg: "#FAF8F9",
        gray: {
          soft: "#F5F1F3",
          text: "#6E6570",
          border: "#ECE1E7",
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "12px",
        md: "20px",
        lg: "28px",
      },
      boxShadow: {
        soft: "0 20px 40px rgba(10, 10, 10, 0.06)",
        lift: "0 24px 48px rgba(10, 10, 10, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
