import React from 'react';
import { IconButton, Icon } from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <IconButton
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      aria-label={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      <Icon as={resolvedTheme === 'dark' ? SunIcon : MoonIcon} boxSize={5} />
    </IconButton>
  );
}
