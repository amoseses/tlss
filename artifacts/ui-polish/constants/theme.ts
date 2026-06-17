// Theme Constants
// Centralized design tokens for consistency

export const theme = {
  // Border radius: reduced from 12px to 6px primary
  radius: {
    xs: '2px',
    sm: '4px',
    base: '6px', // Primary
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // Spacing: 8-point grid
  spacing: {
    0: '0',
    1: '0.125rem', // 2px
    2: '0.25rem', // 4px
    4: '0.5rem', // 8px
    6: '0.75rem', // 12px
    8: '1rem', // 16px
    12: '1.5rem', // 24px
    16: '2rem', // 32px
    24: '3rem', // 48px
  },

  // Colors: deep violet + mint accent
  colors: {
    primary: {
      50: '#f8f5ff',
      100: '#f0e6ff',
      200: '#dcc9ff',
      300: '#c5a9ff',
      400: '#a87dff',
      500: '#8b5cf6', // Brand
      600: '#7c3aed', // Interactive
      700: '#6d28d9', // Hover
      800: '#5b21b6',
      900: '#4c1d95',
    },
    accent: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Mint
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },

  // Shadows
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
    base: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  },

  // Typography
  typography: {
    // Font sizes
    fontSizes: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    // Font weights
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    // Line heights
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    overlay: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },
};

export type Theme = typeof theme;
