import React from 'react';

export interface Fatia { id: string; nome: string; gramas: number }

/**
 * O prato como uma barra só, fatiada por ingrediente.
 *
 * Digitar 160 g de purê e 120 g de frango são dois números soltos: você não vê
 * que o purê é 40% do prato. Numa ficha técnica de cozinha a proporção é a
 * informação principal, e ela não aparecia em lugar nenhum da tela.
 *
 * A barra é leitura, não controle. Arrastar divisória seria charmoso e errado:
 * quem monta prato pesa em balança, e um arrasto de 3 px viraria 7 g de
 * diferença sem ninguém pedir.
 */
const TONS = ['#C9A227', '#8C6D1F', '#B08968', '#7F5539', '#9C6644', '#D4A373', '#6B705C', '#A5A58D'];

export default function BarraDeComposicao({ fatias }: { fatias: Fatia[] }) {
  const total = fatias.reduce((soma, f) => soma + (f.gramas || 0), 0);
  if (!total) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/10" role="img"
           aria-label={`Composição: ${fatias.map((f) => `${f.nome} ${Math.round((f.gramas / total) * 100)}%`).join(', ')}`}>
        {fatias.filter((f) => f.gramas > 0).map((f, i) => (
          <div key={f.id || i} style={{ width: `${(f.gramas / total) * 100}%`, background: TONS[i % TONS.length] }}
               title={`${f.nome} — ${f.gramas} g`} />
        ))}
      </div>
      {/* Legenda só dos que ocupam espaço suficiente para serem apontados na
          barra; abaixo disso o rótulo briga com o vizinho e não ajuda. */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-75">
        {fatias.filter((f) => f.gramas / total >= 0.05).map((f, i) => (
          <span key={f.id || i} className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: TONS[i % TONS.length] }} />
            {f.nome} <b className="font-semibold">{Math.round((f.gramas / total) * 100)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
