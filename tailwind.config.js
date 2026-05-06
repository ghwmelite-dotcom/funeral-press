/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Wider-screen breakpoint above the default 2xl=1536px so utilities like
      // max-w-* and px-* can scale on 27"+ monitors. Defaults stop at 2xl.
      screens: {
        '3xl': '1920px',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Design token-mapped colors (Layer 1 primitives)
        gold: {
          50: 'hsl(var(--gold-50))',
          100: 'hsl(var(--gold-100))',
          200: 'hsl(var(--gold-200))',
          300: 'hsl(var(--gold-300))',
          400: 'hsl(var(--gold-400))',
          500: 'hsl(var(--gold-500))',
          600: 'hsl(var(--gold-600))',
        },
        burgundy: {
          50: 'hsl(var(--burgundy-50))',
          100: 'hsl(var(--burgundy-100))',
          200: 'hsl(var(--burgundy-200))',
          300: 'hsl(var(--burgundy-300))',
          400: 'hsl(var(--burgundy-400))',
          500: 'hsl(var(--burgundy-500))',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      gridTemplateRows: {
        '0fr': '0fr',
        '1fr': '1fr',
      },
      keyframes: {
        'accordion-down': {
          from: { gridTemplateRows: '0fr' },
          to: { gridTemplateRows: '1fr' },
        },
        'accordion-up': {
          from: { gridTemplateRows: '1fr' },
          to: { gridTemplateRows: '0fr' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
      },
    },
  },
  plugins: [],
}
