import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      // Tokens do CROMO, não paleta crua: este botão vive dentro da barra, que
      // muda de cor com o tema. Com `text-gray-500` fixo ele ficava invisível
      // sobre a barra escura, e com branco fixo some sobre a clara.
      className="rounded-md p-2 text-chrome-muted transition-colors hover:bg-chrome-hover hover:text-chrome-fg"
    >
      {isDark
        ? <SunIcon className="w-5 h-5" />
        : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
