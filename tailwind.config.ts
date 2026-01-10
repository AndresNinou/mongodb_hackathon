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
          "SF Pro Display",
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-inter)",
          ...defaultTheme.fontFamily.sans,
        ],
        mono: [
          "SF Mono",
          "JetBrains Mono",
          "Fira Code",
          ...defaultTheme.fontFamily.mono,
        ],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      colors: {
        // Core palette
        void: "hsl(var(--void))",
        abyss: "hsl(var(--abyss))",
        obsidian: "hsl(var(--obsidian))",
        surface: "hsl(var(--surface))",

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
          purple: "var(--accent-purple)",
          cyan: "var(--accent-cyan)",
          pink: "var(--accent-pink)",
          green: "var(--accent-green)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Glass colors
        glass: {
          clear: "var(--glass-clear)",
          frosted: "var(--glass-frosted)",
          light: "var(--glass-light)",
          medium: "var(--glass-medium)",
          solid: "var(--glass-solid)",
          dense: "var(--glass-dense)",
        },

        // Glow colors
        glow: {
          purple: "var(--glow-purple)",
          cyan: "var(--glow-cyan)",
          pink: "var(--glow-pink)",
          green: "var(--glow-green)",
          orange: "var(--glow-orange)",
        },
      },
      backdropBlur: {
        subtle: "var(--blur-subtle)",
        medium: "var(--blur-medium)",
        heavy: "var(--blur-heavy)",
        extreme: "var(--blur-extreme)",
        max: "var(--blur-max)",
      },
      boxShadow: {
        "glow-sm": "var(--shadow-glow-sm)",
        "glow-md": "var(--shadow-glow-md)",
        "glow-lg": "var(--shadow-glow-lg)",
        float: "var(--shadow-float)",
        lifted: "var(--shadow-lifted)",
        elevated: "var(--shadow-elevated)",
        inset: "var(--shadow-inset)",
        "inset-deep": "var(--shadow-inset-deep)",
      },
      transitionTimingFunction: {
        "spring-bounce": "var(--spring-bounce)",
        "spring-smooth": "var(--spring-smooth)",
        "spring-snappy": "var(--spring-snappy)",
        "out-expo": "var(--ease-out-expo)",
      },
      animation: {
        "fade-in": "fade-in 300ms var(--spring-smooth)",
        "fade-out": "fade-out 200ms ease-out",
        "slide-up": "slide-up 400ms var(--spring-smooth)",
        "slide-down": "slide-down 400ms var(--spring-smooth)",
        "scale-in": "scale-in 300ms var(--spring-bounce)",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "liquid-dots": "liquid-morph 1.4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 4s ease infinite",
        "orb-pulse": "orb-pulse 2s ease-in-out infinite",
        "orb-blink": "orb-blink 1s ease-in-out infinite",
        "prismatic-spin": "prismatic-spin 4s linear infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "liquid-morph": {
          "0%, 100%": { transform: "scale(1)", background: "var(--accent-purple)" },
          "33%": { transform: "scale(1.2)", background: "var(--accent-cyan)" },
          "66%": { transform: "scale(0.8)", background: "var(--accent-pink)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "orb-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.4" },
          "50%": { transform: "scale(1.3)", opacity: "0.2" },
        },
        "orb-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "prismatic-spin": {
          to: { "--angle": "360deg" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
