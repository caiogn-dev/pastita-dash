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
  },
});

export default system;
