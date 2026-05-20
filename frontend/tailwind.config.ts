import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cinema: {
          black: 'rgb(var(--cinema-black) / <alpha-value>)',
          navy: 'rgb(var(--cinema-navy) / <alpha-value>)',
          'navy-hover': 'rgb(var(--cinema-navy-hover) / <alpha-value>)',
          'navy-border': 'rgb(var(--cinema-navy-border) / <alpha-value>)',
          surface: 'rgb(var(--cinema-surface) / <alpha-value>)',
          muted: 'rgb(var(--cinema-muted) / <alpha-value>)',
          text: 'rgb(var(--cinema-text) / <alpha-value>)',
        },
        accent: {
          DEFAULT: '#F04E28',
          hover: '#E03D18',
          glow: 'rgba(240,78,40,0.3)',
        },
        sky: {
          badge: '#38BDF8',
        },
        rating: '#FBBF24',
        platform: {
          netflix: '#E50914',
          prime: '#00A8E0',
          hotstar: '#1F80E0',
          jio: '#8B4CF7',
          sony: '#C40A0A',
          zee5: '#7B2FBE',
          mx: '#00D4FF',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      aspectRatio: {
        poster: '2 / 3',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(240,78,40,0.15), transparent)',
        'card-overlay': 'linear-gradient(to top, rgba(6,8,15,0.95) 0%, rgba(6,8,15,0.6) 40%, transparent 70%)',
      },
      boxShadow: {
        'accent-glow': '0 0 24px rgba(240,78,40,0.3)',
        'card-hover': '0 20px 60px rgba(0,0,0,0.6)',
        'platform': '0 2px 8px rgba(0,0,0,0.4)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-up': 'fadeUp 0.4s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
