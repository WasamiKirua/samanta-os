module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'samanta': {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        'samanta-button': '#FFB6C1',
        'samanta-button-hover': '#FF91A4',
        'background-color': '#FFF0F5'
      },
      fontFamily: {
        samanta: ['"Comic Sans MS"', 'cursive'],
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '50%': { transform: 'scale(1)', opacity: 0.5 },
          '100%': { transform: 'scale(1.2)', opacity: 0 }
        },
        'pulse-core': {
          '0%': { transform: 'scale(0.8)', opacity: 0.5 },
          '50%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(0.8)', opacity: 0.5 }
        },
        'pulse-small': {
          '0%': { transform: 'scale(1)', opacity: 0.5 },
          '50%': { transform: 'scale(1.2)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 0.5 }
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'orbit-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' }
        },
        'ripple-fast': {
          '0%': { transform: 'scale(0.8)', opacity: 1 },
          '100%': { transform: 'scale(1.2)', opacity: 0 }
        },
        'ripple-slow': {
          '0%': { transform: 'scale(0.8)', opacity: 0.5 },
          '100%': { transform: 'scale(1.5)', opacity: 0 }
        }
      },
      animation: {
        'pulse-ring': 'pulse-ring 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-core': 'pulse-core 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-small': 'pulse-small 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 1s ease-out forwards',
        'orbit': 'orbit 8s linear infinite',
        'orbit-reverse': 'orbit-reverse 6s linear infinite',
        'ripple-fast': 'ripple-fast 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'ripple-slow': 'ripple-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
      }
    },
  },
  plugins: [],
} 