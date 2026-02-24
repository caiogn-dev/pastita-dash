// Chakra UI v3 - Theme configuration
// Using createSystem for v3 API

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#e6f7ed' },
          100: { value: '#c5ebd6' },
          200: { value: '#9fddba' },
          300: { value: '#78cf9e' },
          400: { value: '#5ac58a' },
          500: { value: '#25D366' }, // WhatsApp Green
          600: { value: '#1fb85a' },
          700: { value: '#1a9e4d' },
          800: { value: '#158440' },
          900: { value: '#106a33' },
        },
        meta: {
          50: { value: '#e7f1ff' },
          100: { value: '#c5d8f9' },
          200: { value: '#9ebff2' },
          300: { value: '#78a5eb' },
          400: { value: '#5a92e6' },
          500: { value: '#1877F2' }, // Meta Blue
          600: { value: '#1469d6' },
          700: { value: '#115bb8' },
          800: { value: '#0e4d9a' },
          900: { value: '#0b3f7c' },
        },
      },
      fonts: {
        heading: { value: 'Inter, sans-serif' },
        body: { value: 'Inter, sans-serif' },
      },
    },
  },
})

export const theme = createSystem(defaultConfig, config)

export default theme
