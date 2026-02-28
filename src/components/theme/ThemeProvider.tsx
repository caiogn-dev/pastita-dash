import React from 'react';
import { ThemeProvider as ChakraThemeProvider } from '@/context/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ChakraThemeProvider>
      {children}
    </ChakraThemeProvider>
  );
}

export { useTheme } from '@/context/ThemeContext';
