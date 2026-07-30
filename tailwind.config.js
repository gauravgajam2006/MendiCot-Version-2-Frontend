/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep charcoal / near-black surfaces
        ink: {
          950: '#0a0d0b',
          900: '#0f1411',
          850: '#131814',
          800: '#171d18',
          750: '#1c241e',
          700: '#222b24',
          600: '#2b352d',
          500: '#364238',
        },
        // Warm ivory card surfaces
        ivory: {
          50: '#fbf8f1',
          100: '#f6f1e6',
          200: '#ece3d2',
          300: '#dccfb5',
        },
        // Muted emerald / forest green primary accent
        emerald: {
          50: '#eaf3ee',
          100: '#cfe3d6',
          200: '#a3c7b1',
          300: '#6fa585',
          400: '#4a8765',
          500: '#356b4d',
          600: '#28543d',
          700: '#1f4230',
          800: '#173325',
          900: '#0f2419',
        },
        // Antique gold accents (used sparingly)
        gold: {
          300: '#e6c878',
          400: '#d4af5a',
          500: '#c19a42',
          600: '#a8843a',
          700: '#8a6c30',
        },
        // Red suit
        crimson: {
          400: '#c44b4b',
          500: '#a83838',
          600: '#8c2e2e',
        },
        // Neutral text
        bone: {
          50: '#f4f1ea',
          100: '#e4e0d6',
          200: '#c8c2b5',
          300: '#a39d8f',
          400: '#7a7568',
          500: '#565249',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        brand: '-0.02em',
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 2px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)',
        'card-lift': '0 12px 24px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.3)',
        'card-played': '0 8px 18px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.35)',
        inset: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.04)',
        glow: '0 0 0 1px rgba(212,175,90,0.4), 0 0 18px rgba(212,175,90,0.18)',
        'turn': '0 0 0 2px rgba(74,135,101,0.7), 0 0 22px rgba(74,135,101,0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'card-play': {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.92)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'reveal': {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'fade-up': 'fade-up 0.35s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'slide-down': 'slide-down 0.3s ease-out both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.8s linear infinite',
        'card-play': 'card-play 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'reveal': 'reveal 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
