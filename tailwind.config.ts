import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          ...defaultTheme.fontFamily.sans,
        ],
        mono: [
          "Courier New",
          "Monaco",
          "Menlo",
          ...defaultTheme.fontFamily.mono,
        ],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        md: "4px",
        lg: "4px",
        xl: "4px",
      },
      colors: {
        // MongoDB palette
        mongodb: {
          green: "#00ED64",
          "green-dark": "#13AA52",
          "green-darker": "#00684A",
          forest: "#001E2B",
          slate: "#023430",
        },

        // Status colors
        warning: "#FFE212",
        error: "#E03E3E",
        success: "#00ED64",

        // Shadcn compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Brutal palette
        brutal: {
          black: "var(--brutal-black)",
          white: "var(--brutal-white)",
          "gray-light": "var(--brutal-gray-light)",
          gray: "var(--brutal-gray)",
          "gray-dark": "var(--brutal-gray-dark)",
        },
      },
      borderWidth: {
        thin: "var(--border-thin)",
        medium: "var(--border-medium)",
        thick: "var(--border-thick)",
        heavy: "var(--border-heavy)",
      },
      boxShadow: {
        "brutal-sm": "var(--shadow-brutal-sm)",
        "brutal-md": "var(--shadow-brutal-md)",
        "brutal-lg": "var(--shadow-brutal-lg)",
        "brutal-xl": "var(--shadow-brutal-xl)",
        inset: "var(--shadow-inset)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
