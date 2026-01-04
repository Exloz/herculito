/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Khand"', 'system-ui', 'sans-serif'],
        body: ['"Hind"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0b0f14',
        charcoal: '#121922',
        graphite: '#141b24',
        slateDeep: '#1b2430',
        mist: '#253245',
        mint: '#48e5a3',
        mintDeep: '#1ac981',
        amberGlow: '#f59e0b',
        crimson: '#f87171',
      },
      boxShadow: {
        soft: '0 18px 40px rgba(6, 10, 16, 0.45)',
        lift: '0 12px 24px rgba(11, 15, 20, 0.35)',
      },
    },
  },
  plugins: [],
};
