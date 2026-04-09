import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#f3f4f8",
          surface: "#ffffff",
          elevated: "#eceef5",
          popup: "#e4e7f2",
        },
        border: {
          DEFAULT: "#dde0ed",
          bright: "#c4c9e0",
          glow: "#99e6da",
        },
        ink: {
          DEFAULT: "#1a1d3a",
          muted: "#6b7299",
          subtle: "#c0c5de",
          bright: "#0f1128",
        },
        accent: {
          DEFAULT: "#0d9488",
          dim: "#ccfaf5",
          glow: "rgba(13,148,136,0.12)",
        },
        amber: {
          DEFAULT: "#d97706",
          dim: "#fef3c7",
        },
        rose: {
          DEFAULT: "#e11d48",
          dim: "#ffe4e6",
        },
        violet: {
          DEFAULT: "#7c3aed",
          dim: "#ede9fe",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },
      animation: {
        "ring-flash": "ring-flash 1s ease-out forwards",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-in": "slide-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in": "fade-in 0.2s ease forwards",
        "shimmer": "shimmer 1.5s infinite",
      },
      keyframes: {
        "ring-flash": {
          "0%": { boxShadow: "0 0 0 0px rgba(13,148,136,0.6)" },
          "50%": { boxShadow: "0 0 0 4px rgba(13,148,136,0.25)" },
          "100%": { boxShadow: "0 0 0 0px rgba(13,148,136,0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
