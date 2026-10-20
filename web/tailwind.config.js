/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        linen: '#FAF3E1',        // Sustainable Linen
        cotton: '#F5E7C6',       // Recycled Cotton
        tangerine: {
          DEFAULT: '#FF6D1F',    // Electric Tangerine
          50: '#FFF5ED',
          100: '#FFE8D6',
          200: '#FFD1AC',
          300: '#FFB177',
          400: '#FF8E42',
          500: '#FF6D1F',
          600: '#E65306',
          700: '#B83E00',
          800: '#8A2D00',
          900: '#5C1D00',
        },
        blackhole: {
          DEFAULT: '#222222',    // Black Hole
          50: '#3A3A3A',
          100: '#2E2E2E',
          200: '#282828',
          300: '#222222',        // Base Black Hole
          400: '#1A1A1A',
          500: '#141414',
          600: '#0F0F0F',
          700: '#0A0A0A',
          800: '#070707',
          900: '#040404',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
      },
      animation: {
        'shimmer': 'shimmer 2.5s linear infinite',
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 4s ease-in-out infinite',
        'spotlight': 'spotlight 2s ease .75s 1 forwards',
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%,-40%) scale(1)' },
        },
      },
    },
  },
};
