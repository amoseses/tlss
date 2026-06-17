// Tailwind Theme Configuration
// Refined for Givit with reduced border radius and polished spacing

import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      // Reduced border radius: primary is 6px instead of 12px+
      borderRadius: {
        xs: '2px',
        sm: '4px',
        base: '6px', // Primary radius
        md: '8px',
        lg: '12px',
        xl: '16px',
      },

      // 8-point spacing scale for consistency
      spacing: {
        0: '0',
        1: '0.125rem', // 2px
        2: '0.25rem', // 4px
        3: '0.375rem', // 6px
        4: '0.5rem', // 8px
        6: '0.75rem', // 12px
        8: '1rem', // 16px
        12: '1.5rem', // 24px
        16: '2rem', // 32px
        20: '2.5rem', // 40px
        24: '3rem', // 48px
        32: '4rem', // 64px
      },

      // Color palette: deep violet + mint accent
      colors: {
        primary: {
          50: '#f8f5ff',
          100: '#f0e6ff',
          200: '#dcc9ff',
          300: '#c5a9ff',
          400: '#a87dff',
          500: '#8b5cf6', // Primary brand violet
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Mint accent
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#145231',
        },
      },

      // Subtle shadows for polish
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        xl: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      },

      // Transitions for micro-interactions
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        300: '300ms',
      },

      // Typography
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },

      // Animation for typing indicator and hover states
      keyframes: {
        'typing-pulse': {
          '0%, 60%, 100%': { opacity: '0.3' },
          '30%': { opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'typing-pulse': 'typing-pulse 1.4s infinite',
        'fade-in': 'fade-in 300ms ease-in-out',
        'slide-up': 'slide-up 300ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
