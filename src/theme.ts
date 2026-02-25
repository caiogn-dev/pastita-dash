import { createSystem, defaultConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
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
        },
      },
    },
    semanticTokens: {
      colors: {
        'bg.subtle': { value: { base: 'gray.50', _dark: 'gray.900' } },
        'bg.default': { value: { base: 'white', _dark: 'gray.800' } },
        'bg.muted': { value: { base: 'gray.100', _dark: 'gray.700' } },
        'fg.default': { value: { base: 'gray.900', _dark: 'gray.100' } },
        'fg.muted': { value: { base: 'gray.600', _dark: 'gray.400' } },
        'border.default': { value: { base: 'gray.200', _dark: 'gray.700' } },
      },
    },
  },
});

export default system;
