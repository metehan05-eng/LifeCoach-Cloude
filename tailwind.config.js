/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        han: {
          bg: "#0a0a0c",
          surface: "#0c0c18",
          card: "rgba(18, 18, 40, 0.65)",
          purple: "#7c3aed",
          "purple-light": "#a78bfa",
          indigo: "#6366f1",
          blue: "#3b82f6",
          gold: "#fbbf24",
          "gold-dark": "#f59e0b",
          text: "#e0e0ff",
          muted: "rgba(160, 160, 200, 0.55)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "Space Grotesk", "sans-serif"],
      },
      backdropBlur: {
        glass: "24px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(124, 58, 237, 0.25)",
        "glow-gold": "0 0 24px rgba(251, 191, 36, 0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.5s ease-out both",
        float: "float 6s ease-in-out infinite",
        "pulse-dot": "pulseDot 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
      },
    },
  },
  plugins: [],
};
