import React, { useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * Selos do produto — "Zero lactose", "Fit", "Bistrô" — que a vitrine mostra
 * no card e no detalhe.
 *
 * Moram em `attributes.selos`, NÃO em `tags`: `tags` já é palavra de busca e
 * marcação interna em outras lojas ("rondelli", "4-queijos", "destaque",
 * "bebida"). Selo virar `tags` faria essas palavras aparecerem no cardápio.
 *
 * A ordem é a de escolha: o primeiro selo é o que aparece primeiro no card.
 */
export const SELOS_PADRAO = [
  'Fit',
  'Low Carb',
  'Zero lactose',
  'Sem glúten',
  'Zero açúcar',
  'Vegano',
  'Vegetariano',
  'Proteico',
  'Picante',
  'Novidade',
];

const chave = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export const lerSelos = (attributes?: Record<string, unknown>): string[] => {
  const bruto = attributes?.selos;
  if (!Array.isArray(bruto)) return [];
  return bruto.map((s) => String(s).trim()).filter(Boolean);
};

/** Lista vazia apaga a chave — ausente e vazio dizem a mesma coisa. */
export const gravarSelos = (attributes: Record<string, unknown> | undefined, selos: string[]) => {
  const attrs = { ...(attributes || {}) };
  if (selos.length === 0) delete attrs.selos;
  else attrs.selos = selos;
  return attrs;
};

/** Padrão + os que a loja já usa em outros produtos, sem repetir por caixa/acento. */
export const sugestoesDeSelos = (daLoja: string[] = []): string[] => {
  const vistos = new Set<string>();
  const saida: string[] = [];
  [...SELOS_PADRAO, ...daLoja].forEach((s) => {
    const texto = String(s).trim();
    if (!texto || vistos.has(chave(texto))) return;
    vistos.add(chave(texto));
    saida.push(texto);
  });
  return saida;
};

interface SelosDoProdutoProps {
  value: string[];
  onChange: (selos: string[]) => void;
  sugestoes?: string[];
}

export const SelosDoProduto: React.FC<SelosDoProdutoProps> = ({ value, onChange, sugestoes = SELOS_PADRAO }) => {
  const [rascunho, setRascunho] = useState('');
  const ligados = new Set(value.map(chave));

  const alternar = (selo: string) => {
    if (ligados.has(chave(selo))) onChange(value.filter((s) => chave(s) !== chave(selo)));
    else onChange([...value, selo]);
  };

  const adicionar = () => {
    const texto = rascunho.trim();
    setRascunho('');
    if (!texto || ligados.has(chave(texto))) return;
    onChange([...value, texto]);
  };

  // Escolhidos fora das sugestões continuam na tela, senão não há como tirá-los.
  const sugeridos = new Set(sugestoes.map(chave));
  const chips = [...sugestoes, ...value.filter((s) => !sugeridos.has(chave(s)))];

  return (
    <div>
      <label className="block text-sm font-medium text-fg-token mb-2">Selos</label>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((selo) => {
          const ativo = ligados.has(chave(selo));
          return (
            <button
              key={chave(selo)}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternar(selo)}
              className={cn(
                'inline-flex min-h-9 items-center rounded-full border px-3.5',
                'text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                ativo
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-transparent bg-surface-2 text-fg-muted-token hover:text-fg-token',
              )}
            >
              {selo}
            </button>
          );
        })}
        <input
          type="text"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
          onBlur={adicionar}
          maxLength={24}
          placeholder="+ Outro selo"
          className="min-h-9 w-36 rounded-full border border-dashed border-border-token bg-surface px-3.5 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
    </div>
  );
};
