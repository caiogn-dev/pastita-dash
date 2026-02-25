import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Brand colors - WhatsApp green
        brand: {
          50: { value: '#e6f7ed' },
          100: { value: '#c5ebd6' },
          200: { value: '#9fddba' },
          300: { value: '#78cf9e' },
          400: { value: '#5ac58a' },
          500: { value: '#25D366' },
          600: { value: '#1fb85a' },
          700: { value: '#1a9e4d' },
          800: { value: '#158440' },
          900: { value: '#106a33' },
          950: { value: '#0a4020' },
        },
        // Accent colors
        accent: {
          50: { value: '#f0f9ff' },
          100: { value: '#e0f2fe' },
          200: { value: '#bae6fd' },
          300: { value: '#7dd3fc' },
          400: { value: '#38bdf8' },
          500: { value: '#0ea5e9' },
          600: { value: '#0284c7' },
          700: { value: '#0369a1' },
          800: { value: '#075985' },
          900: { value: '#0c4a6e' },
          950: { value: '#082f49' },
        },
        // Semantic colors
        success: {
          50: { value: '#f0fdf4' },
          100: { value: '#dcfce7' },
          200: { value: '#bbf7d0' },
          300: { value: '#86efac' },
          400: { value: '#4ade80' },
          500: { value: '#22c55e' },
          600: { value: '#16a34a' },
          700: { value: '#15803d' },
          800: { value: '#166534' },
          900: { value: '#14532d' },
        },
        warning: {
          50: { value: '#fffbeb' },
          100: { value: '#fef3c7' },
          200: { value: '#fde68a' },
          300: { value: '#fcd34d' },
          400: { value: '#fbbf24' },
          500: { value: '#f59e0b' },
          600: { value: '#d97706' },
          700: { value: '#b45309' },
          800: { value: '#92400e' },
          900: { value: '#78350f' },
        },
        danger: {
          50: { value: '#fef2f2' },
          100: { value: '#fee2e2' },
          200: { value: '#fecaca' },
          300: { value: '#fca5a5' },
          400: { value: '#f87171' },
          500: { value: '#ef4444' },
          600: { value: '#dc2626' },
          700: { value: '#b91c1c' },
          800: { value: '#991b1b' },
          900: { value: '#7f1d1d' },
        },
      },
      fonts: {
        heading: { value: 'Inter, system-ui, sans-serif' },
        body: { value: 'Inter, system-ui, sans-serif' },
        mono: { value: 'JetBrains Mono, monospace' },
      },
      fontSizes: {
        xs: { value: '0.75rem' },
        sm: { value: '0.875rem' },
        base: { value: '1rem' },
        lg: { value: '1.125rem' },
        xl: { value: '1.25rem' },
        '2xl': { value: '1.5rem' },
        '3xl': { value: '1.875rem' },
        '4xl': { value: '2.25rem' },
        '5xl': { value: '3rem' },
      },
      radii: {
        sm: { value: '0.375rem' },
        base: { value: '0.5rem' },
        md: { value: '0.625rem' },
        lg: { value: '0.75rem' },
        xl: { value: '1rem' },
        '2xl': { value: '1.25rem' },
        full: { value: '9999px' },
      },
      shadows: {
        sm: { value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
        base: { value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
        md: { value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
        lg: { value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
        xl: { value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
        '2xl': { value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
        inner: { value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
      },
    },
    semanticTokens: {
      colors: {
        // Background colors
        'bg.primary': { value: { base: 'white', _dark: 'gray.900' } },
        'bg.secondary': { value: { base: 'gray.50', _dark: 'gray.800' } },
        'bg.tertiary': { value: { base: 'gray.100', _dark: 'gray.700' } },
        'bg.card': { value: { base: 'white', _dark: 'gray.800' } },
        'bg.hover': { value: { base: 'gray.50', _dark: 'gray.700' } },
        'bg.active': { value: { base: 'gray.100', _dark: 'gray.600' } },
        'bg.subtle': { value: { base: 'gray.50', _dark: 'gray.900' } },
        'bg.muted': { value: { base: 'gray.100', _dark: 'gray.800' } },
        'bg.inverted': { value: { base: 'gray.900', _dark: 'white' } },
        
        // Foreground colors
        'fg.primary': { value: { base: 'gray.900', _dark: 'gray.100' } },
        'fg.secondary': { value: { base: 'gray.600', _dark: 'gray.400' } },
        'fg.tertiary': { value: { base: 'gray.400', _dark: 'gray.500' } },
        'fg.muted': { value: { base: 'gray.500', _dark: 'gray.400' } },
        'fg.inverted': { value: { base: 'white', _dark: 'gray.900' } },
        
        // Border colors
        'border.primary': { value: { base: 'gray.200', _dark: 'gray.700' } },
        'border.secondary': { value: { base: 'gray.300', _dark: 'gray.600' } },
        'border.subtle': { value: { base: 'gray.100', _dark: 'gray.800' } },
        'border.focus': { value: { base: 'brand.500', _dark: 'brand.400' } },
        
        // Brand colors
        'brand.primary': { value: { base: 'brand.500', _dark: 'brand.400' } },
        'brand.secondary': { value: { base: 'brand.600', _dark: 'brand.300' } },
        'brand.subtle': { value: { base: 'brand.50', _dark: 'brand.900' } },
        
        // Status colors
        'status.success': { value: { base: 'success.500', _dark: 'success.400' } },
        'status.warning': { value: { base: 'warning.500', _dark: 'warning.400' } },
        'status.danger': { value: { base: 'danger.500', _dark: 'danger.400' } },
        'status.info': { value: { base: 'accent.500', _dark: 'accent.400' } },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);

export default system;
