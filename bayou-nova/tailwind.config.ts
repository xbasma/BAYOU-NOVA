import type { Config } from "tailwindcss";

/**
 * BAYOU-NOVA design tokens, sampled from the logo.
 *   ink      #231423  the logo's own void (text, side rail)
 *   canvas   #EBE1EA  pale nebula mist, a blush-lilac taken from the logo's filaments
 *   accent   #B83A10  deep ember (links, small accents; AA on canvas)
 *   ember    #F06018  bright ember (glows, orb, large fills only)
 *   secondary#62408A  nebula violet
 *   champagne#F6E4C4  the logo's ring and wordmark tone (on dark surfaces)
 * Status colours are the four-level system; each passes AA as text on the glass panels.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/health.ts builds status colour classes (toneClass); Tailwind must see them
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#231423",
        canvas: "#EBE1EA",
        panel: "#FFFFFF",
        accent: "#B83A10",
        ember: "#F06018",
        secondary: "#62408A",
        orchid: "#B89BD6",
        champagne: "#F6E4C4",
        muted: "#6B5870",
        safe: "#1F7F48",
        warning: "#8F5E00",
        caution: "#B8540A",
        danger: "#B3261E",
      },
      fontFamily: {
        display: ['"Archivo Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Archivo Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        wordmark: ["Syncopate", '"Archivo Variable"', "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.8) inset, 0 20px 44px -28px rgba(54,24,76,0.55)",
        glow: "0 0 28px rgba(240,96,24,0.35)",
      },
      keyframes: {
        "orb-spin": { to: { transform: "rotate(360deg)" } },
        "orb-spin-rev": { to: { transform: "rotate(-360deg)" } },
        "rise": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ring-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "orb-spin": "orb-spin 90s linear infinite",
        "orb-spin-rev": "orb-spin-rev 140s linear infinite",
        "fade-up": "rise 0.45s ease-out both",
        "fade-in": "fade-in 0.28s ease-out backwards",
        "ring-pulse": "ring-pulse 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
