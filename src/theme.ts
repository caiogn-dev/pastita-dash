import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

const colors = {
  brand: {
    50: '#e6f7ed',
    100: '#c5ebd6',
    200: '#9fddba',
    300: '#78cf9e',
    400: '#5ac58a',
    500: '#25D366', // WhatsApp Green
    600: '#1fb85a',
    700: '#1a9e4d',
    800: '#158440',
    900: '#106a33',
  },
  meta: {
    50: '#e7f1ff',
    100: '#c5d8f9',
    200: '#9ebff2',
    300: '#78a5eb',
    400: '#5a92e6',
    500: '#1877F2', // Meta Blue
    600: '#1469d6',
    700: '#115bb8',
    800: '#0e4d9a',
    900: '#0b3f7c',
  },
  gray: {
    50: '#F0F2F5',
    100: '#E4E6EB',
    200: '#D8DADF',
    300: '#BEC3C9',
    400: '#8A8D91',
    500: '#65676B',
    600: '#4B4F56',
    700: '#3A3B3C',
    800: '#242526',
    900: '#050505',
  },
  success: {
    500: '#00C853',
  },
  warning: {
    500: '#FFB300',
  },
  error: {
    500: '#FF1744',
  },
}

const fonts = {
  heading: 'Inter, sans-serif',
  body: 'Inter, sans-serif',
}

const components = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'lg',
    },
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
        },
      },
      outline: {
        borderColor: 'brand.500',
        color: 'brand.500',
        _hover: {
          bg: 'brand.50',
        },
      },
      ghost: {
        color: 'gray.600',
        _hover: {
          bg: 'gray.100',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: 'white',
        borderRadius: 'xl',
        boxShadow: 'sm',
        border: '1px solid',
        borderColor: 'gray.100',
      },
    },
  },
  Input: {
    baseStyle: {
      field: {
        borderRadius: 'lg',
        borderColor: 'gray.200',
        _focus: {
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px #25D366',
        },
      },
    },
  },
}

const theme = extendTheme({
  config,
  colors,
  fonts,
  components,
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.900',
      },
    },
  },
})

export default theme
