/**
 * Paleta de comandos (Ctrl+K) — digitar o destino em vez de navegar até ele.
 *
 * Ir de "Pedidos" para "Fidelidade" custa hoje: achar a seção certa, abrir,
 * ler os itens, clicar. Três decisões e quatro movimentos do mouse para uma
 * coisa que a pessoa já sabia que queria antes de começar — e quem usa o
 * painel o dia inteiro repete isso dezenas de vezes.
 *
 * A paleta inverte o problema. O operador não precisa saber em que seção a
 * tela mora, e é exatamente esse conhecimento que ele não tem: a taxonomia é
 * nossa, não dele.
 *
 * A lista sai de `buildNavSections` — a MESMA árvore do menu e da trilha.
 * Página nova entra na paleta sem ninguém lembrar de cadastrar.
 *
 * Cada resultado mostra a seção onde mora, então a paleta também ENSINA o
 * menu: quem usa o atalho descobre onde a tela fica, em vez de aprender a
 * evitar a navegação.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { cn } from '../../utils/cn';
import { NavSection } from './navSections';

export interface CommandPaletteProps {
  aberto: boolean;
  onFechar: () => void;
  sections: NavSection[];
  onNavegar: (href: string) => void;
}

interface Destino {
  nome: string;
  secao: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Minúsculas e sem acento: ninguém digita "Relatórios" com acento na correria. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function achatar(sections: NavSection[]): Destino[] {
  const out: Destino[] = [];
  for (const s of sections) {
    if (s.href) out.push({ nome: s.label, secao: '', href: s.href, icon: s.icon });
    for (const i of s.items) {
      out.push({ nome: i.name, secao: s.label, href: i.href, icon: i.icon });
    }
  }
  return out;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  aberto,
  onFechar,
  sections,
  onNavegar,
}) => {
  const [termo, setTermo] = useState('');
  const [cursor, setCursor] = useState(0);
  const campoRef = useRef<HTMLInputElement>(null);

  const destinos = useMemo(() => achatar(sections), [sections]);

  const resultados = useMemo(() => {
    const q = normalizar(termo.trim());
    if (!q) return destinos;
    // Casa contra "seção nome" para que "cardapio bio" também encontre.
    return destinos.filter((d) => normalizar(`${d.secao} ${d.nome}`).includes(q));
  }, [destinos, termo]);

  // Abrir sempre começa do zero: a paleta é para um salto, não para retomar
  // uma busca antiga que já não tem contexto.
  useEffect(() => {
    if (aberto) {
      setTermo('');
      setCursor(0);
      campoRef.current?.focus();
    }
  }, [aberto]);

  // Filtrar move o alvo debaixo do cursor; manter o índice selecionaria outra
  // coisa e o Enter levaria para onde ninguém pediu.
  useEffect(() => setCursor(0), [termo]);

  if (!aberto) return null;

  const escolher = (href: string) => {
    onNavegar(href);
    onFechar();
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onFechar();
      return;
    }
    if (!resultados.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Circular: travar na ponta obriga a voltar item a item, e todo seletor
      // de teclado circula — quebrar a expectativa custa mais do que ganha.
      setCursor((c) => (c + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      escolher(resultados[cursor].href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ir para"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border-token bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-border-token px-4">
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-fg-muted-token" aria-hidden />
          <input
            ref={campoRef}
            role="combobox"
            aria-expanded
            aria-controls="paleta-resultados"
            aria-label="Buscar tela"
            placeholder="Ir para… (pedidos, cupons, fidelidade)"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclar}
            className="flex-1 bg-transparent py-3.5 text-lead text-fg-token outline-none placeholder:text-fg-muted-token"
          />
          <kbd className="rounded border border-border-token px-1.5 py-0.5 text-badge text-fg-muted-token">
            esc
          </kbd>
        </div>

        {resultados.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-fg-muted-token">
            Nada encontrado para “{termo}”.
          </p>
        ) : (
          <ul id="paleta-resultados" role="listbox" className="max-h-80 overflow-y-auto py-1.5">
            {resultados.map((d, i) => {
              const Icone = d.icon;
              const selecionado = i === cursor;
              return (
                <li key={`${d.href}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selecionado}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => escolher(d.href)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-body transition-colors',
                      selecionado ? 'bg-surface-2 text-fg-token' : 'text-fg-muted-token'
                    )}
                  >
                    <Icone className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{d.nome}</span>
                    {d.secao && (
                      <span className="ml-auto text-caption text-fg-muted-token">{d.secao}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

CommandPalette.displayName = 'CommandPalette';

export default CommandPalette;
