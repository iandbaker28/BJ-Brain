/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0d0d0f",
          1: "#111115",
          2: "#18181d",
          3: "#222228",
          4: "#2a2a32",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          muted: "#3730a3",
        },
        border: "#2a2a38",
        text: {
          primary: "#e2e2e8",
          secondary: "#9090a0",
          muted: "#5a5a6e",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#e2e2e8",
            maxWidth: "none",
            a: { color: "#818cf8" },
            strong: { color: "#e2e2e8" },
            h1: { color: "#e2e2e8" },
            h2: { color: "#e2e2e8" },
            h3: { color: "#e2e2e8" },
            code: {
              color: "#a5b4fc",
              backgroundColor: "#18181d",
              borderRadius: "0.25rem",
              padding: "0.1em 0.3em",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              backgroundColor: "#111115",
              color: "#e2e2e8",
            },
            blockquote: {
              color: "#9090a0",
              borderLeftColor: "#3730a3",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
