/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pastita brand colors
        primary: {
          50: '#fdf2f3',
          100: '#fce4e6',
          200: '#facdd2',
          300: '#f5a3ad',
          400: '#ed6b7b',
          500: '#722F37', // Marsala - main brand color
          600: '#5c262d',
          700: '#4d1f25',
          800: '#411b20',
          900: '#391a1e',
        },
        marsala: {
          DEFAULT: '#722F37',
          light: '#8B3A42',
          dark: '#5c262d',
        },
        cream: {
          DEFAULT: '#FDF5E6',
          light: '#FFFAF0',
          dark: '#F5E6D3',
        },
        // Keep WhatsApp colors for messaging features
        whatsapp: {
          light: '#25D366',
          dark: '#128C7E',
          teal: '#075E54',
          blue: '#34B7F1',
        }
      },
    },
  },
  plugins: [],
}
