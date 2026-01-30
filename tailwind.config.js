/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============================================
        // PASTITA BRAND - Marsala (Primary)
        // ============================================
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
          950: '#1A0B0D',
        },
        marsala: {
          DEFAULT: '#722F37',
          50: '#F9F2F3',
          100: '#F0E0E2',
          200: '#E1C1C5',
          300: '#D2A2A8',
          400: '#C3838B',
          500: '#B4646E',
          600: '#8A3D46',
          700: '#722F37',
          800: '#4A1E23',
          900: '#2D1215',
          950: '#1A0B0D',
        },
        background: {
          DEFAULT: '#ffffff',
          light: '#ffffff',
          dark: '#0f172a',
        },
        surface: {
          DEFAULT: '#f8fafc',
          light: '#f8fafc',
          dark: '#1e293b',
        },
        foreground: {
          DEFAULT: '#111827',
          light: '#111827',
          dark: '#f8fafc',
        },
        // ============================================
        // AGRIÃO BRAND - Verde Agrião (Secondary)
        // ============================================
        agriao: {
          DEFAULT: '#4A5D23',
          50: '#F4F7EF',
          100: '#E8EFDE',
          200: '#D1DFBD',
          300: '#B5C896',
          400: '#8FB06B',
          500: '#6B8E23', // Olive Drab
          600: '#4A5D23', // Verde Agrião escuro
          700: '#3D4D1D',
          800: '#2F3B16',
          900: '#1F2710',
          950: '#141A0A',
        },
        // ============================================
        // NEUTRAL COLORS
        // ============================================
        cream: {
          DEFAULT: '#FDFBF7',
          50: '#FFFFFF',
          100: '#FDFBF7',
          200: '#F5EFE6',
          300: '#EDE3D5',
          400: '#E5D7C4',
        },
        gold: {
          DEFAULT: '#D4AF37',
          50: '#FCF9EE',
          100: '#F8F0D4',
          200: '#F1E1A9',
          300: '#EAD27E',
          400: '#E3C353',
          500: '#D4AF37',
          600: '#B8942A',
          700: '#8C7120',
          800: '#604E16',
          900: '#342B0C',
        },
        // ============================================
        // STATUS COLORS
        // ============================================
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
      },
      // ============================================
      // SHADOWS
      // ============================================
      boxShadow: {
        'soft': '0 10px 30px rgba(114, 47, 55, 0.1)',
        'soft-lg': '0 20px 40px rgba(114, 47, 55, 0.15)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'inner-marsala': 'inset 0 -3px 0 0 #722F37',
        'inner-gold': 'inset 0 -3px 0 0 #D4AF37',
        'glow-marsala': '0 0 20px rgba(114, 47, 55, 0.4)',
        'glow-agriao': '0 0 20px rgba(74, 93, 35, 0.4)',
      },
      // ============================================
      // ANIMATIONS
      // ============================================
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'bounce-soft': 'bounceSoft 0.5s ease-out',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      // ============================================
      // BACKDROP BLUR
      // ============================================
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
