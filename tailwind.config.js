/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1C1917",
        secondary: "#57534E",
        tertiary: "#9A3412",
        neutral: "#FBF9F5",
        "surface-elevated": "#F4F0EA",
        "surface-oatmeal": "#E2D9CA",
        "surface-beam": "#FAF7F1",
        "surface-card": "#FFFFFF",
        "ink-scribble": "#181512",
        "border-subtle": "#E5DEC9",
        "border-strong": "#C7BFA8",
        "accent-forest": "#1E4631",
        "accent-navy": "#1E3A5F",
        "success-ink": "#166534",
        "success-bg": "#EAF3EC",
        "warning-ink": "#92400E",
        "warning-bg": "#FEF3C7",
        "danger-ink": "#991B1B",
        "danger-bg": "#FEE2E2",
        "info-ink": "#1E40AF",
        "info-bg": "#DBEAFE",
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Newsreader", "Lora", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        paper: "0 1px 3px rgba(28, 25, 23, 0.05)",
        modal: "0 12px 32px -4px rgba(28, 25, 23, 0.12)",
      },
    },
  },
  plugins: [],
}
