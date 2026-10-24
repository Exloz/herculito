/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['system-ui', 'sans-serif'],
        body: ['system-ui', 'sans-serif'],
      },
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        raised: 'rgb(var(--color-raised) / <alpha-value>)',
        content: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        onAccent: 'rgb(var(--color-on-accent) / <alpha-value>)',
        ink: 'rgb(var(--color-canvas) / <alpha-value>)',
        charcoal: 'rgb(var(--color-surface) / <alpha-value>)',
        graphite: 'rgb(var(--color-card) / <alpha-value>)',
        slateDeep: 'rgb(var(--color-raised) / <alpha-value>)',
        mist: 'rgb(var(--color-border) / <alpha-value>)',
        mint: 'rgb(var(--color-accent) / <alpha-value>)',
        mintDeep: 'rgb(var(--color-accent-hover) / <alpha-value>)',
        amberGlow: 'rgb(var(--color-warning) / <alpha-value>)',
        crimson: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      textColor: {
        red: {
          200: 'rgb(var(--color-danger) / <alpha-value>)',
          300: 'rgb(var(--color-danger) / <alpha-value>)',
          400: 'rgb(var(--color-danger) / <alpha-value>)',
        },
        sky: {
          100: 'rgb(var(--color-info) / <alpha-value>)',
          200: 'rgb(var(--color-info) / <alpha-value>)',
        },
        orange: {
          100: 'rgb(var(--color-warning) / <alpha-value>)',
          200: 'rgb(var(--color-warning) / <alpha-value>)',
        },
        white: 'rgb(var(--color-text) / <alpha-value>)',
        ink: 'rgb(var(--color-on-accent) / <alpha-value>)',
        slate: {
          100: 'rgb(var(--color-text) / <alpha-value>)',
          200: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          300: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          400: 'rgb(var(--color-text-muted) / <alpha-value>)',
          500: 'rgb(var(--color-text-subtle) / <alpha-value>)',
          600: 'rgb(var(--color-text-subtle) / <alpha-value>)',
        },
      },
      backgroundColor: {
        white: 'rgb(var(--color-overlay) / <alpha-value>)',
        slate: { 600: 'rgb(var(--color-border) / <alpha-value>)' },
      },
      borderColor: { white: 'rgb(var(--color-overlay) / <alpha-value>)' },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
      },
    },
  },
  plugins: [],
};
