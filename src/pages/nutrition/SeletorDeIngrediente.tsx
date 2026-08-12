import React, { useEffect, useRef, useState } from 'react';
import api, { normalizePaginatedResponse } from '../../services/api';

export interface IngredienteOpcao {
  id: string;
  display_name: string;
  preparation_state?: string;
  source?: string;
  store?: string | null;
}

/**
 * Busca ingrediente no servidor em vez de listar tudo.
 *
 * O `<select>` que existia aqui carregava a base inteira como `<option>`.
 * Com 69 alimentos passava; com TACO e POF importadas são 2.5 mil, e um
 * dropdown desse tamanho não é uma escolha — é uma rolagem.
 *
 * A busca vai ao servidor porque o que interessa quase nunca está nos
 * primeiros itens em ordem alfabética.
 */
export default function SeletorDeIngrediente({
  valor, aoEscolher, storeId, autoFocus,
}: {
  valor?: IngredienteOpcao | null;
  aoEscolher: (opcao: IngredienteOpcao) => void;
  storeId?: string;
  autoFocus?: boolean;
}) {
  const [termo, setTermo] = useState('');
  const [opcoes, setOpcoes] = useState<IngredienteOpcao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const id = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get('/nutrition/ingredients/', {
          params: { search: termo, page_size: 25, ...(storeId ? { store: storeId } : {}) },
        });
        setOpcoes(normalizePaginatedResponse<IngredienteOpcao>(data));
      } catch { setOpcoes([]); } finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [termo, aberto, storeId]);

  // Clique fora fecha: sem isto a lista fica por cima do resto do formulário.
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const rotulo = (o: IngredienteOpcao) =>
    `${o.display_name}${o.preparation_state ? ` (${o.preparation_state.toLowerCase()})` : ''}`;

  return (
    <div ref={caixa} className="relative">
      <input
        autoFocus={autoFocus}
        className="w-full rounded border p-2 bg-transparent"
        placeholder={valor ? rotulo(valor) : 'Buscar ingrediente…'}
        value={termo}
        onFocus={() => setAberto(true)}
        onChange={(e) => { setTermo(e.target.value); setAberto(true); }}
        aria-label="Buscar ingrediente"
      />
      {aberto && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border border-black/15 bg-white dark:bg-zinc-900 shadow-lg text-sm">
          {buscando && <li className="p-2 opacity-60">Buscando…</li>}
          {!buscando && !opcoes.length && <li className="p-2 opacity-60">Nada encontrado</li>}
          {opcoes.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-black/5"
                onClick={() => { aoEscolher(o); setTermo(''); setAberto(false); }}
              >
                {rotulo(o)}
                {/* A origem importa na hora de escolher: o da loja é o dela,
                    o oficial é referência. */}
                <span className="ml-2 text-xs opacity-55 uppercase">
                  {o.store ? 'da loja' : (o.source || 'oficial')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
