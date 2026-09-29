import React, { useMemo, useState } from 'react';

export interface ProdutoDaGrade {
  id: string;
  nome: string;
  preco: number;
  categoria?: string;
  loja?: string;
  semEstoque?: boolean;
}

export interface GradeDeProdutosProps {
  produtos: ProdutoDaGrade[];
  onEscolher: (id: string) => void;
  formatarValor: (v: number) => string;
  /** Quantos de cada já estão na comanda (mostra o contador no botão). */
  naComanda?: Record<string, number>;
}

/**
 * Botões grandes de produto, por categoria: vender sem leitor em um toque,
 * como em qualquer caixa. A busca por nome continua para o que não está aqui.
 */
export const GradeDeProdutos: React.FC<GradeDeProdutosProps> = ({ produtos, onEscolher, formatarValor, naComanda = {} }) => {
  const categorias = useMemo(() => {
    const vistas: string[] = [];
    produtos.forEach((p) => { const c = p.categoria || 'Outros'; if (!vistas.includes(c)) vistas.push(c); });
    return vistas;
  }, [produtos]);
  const [categoria, setCategoria] = useState<string>('');
  const ativa = categoria && categorias.includes(categoria) ? categoria : categorias[0] ?? '';
  const visiveis = produtos.filter((p) => (p.categoria || 'Outros') === ativa);

  if (produtos.length === 0) return null;
  return (
    <div className="space-y-3" data-testid="pdv-grade">
      {categorias.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorias">
          {categorias.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={c === ativa} onClick={() => setCategoria(c)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${c === ativa ? 'border-brand bg-brand text-on-brand' : 'border-border-token text-fg-muted-token hover:text-fg-token'}`}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {visiveis.map((p) => {
          const qtd = naComanda[p.id] ?? 0;
          return (
            <button key={p.id} type="button" onClick={() => onEscolher(p.id)} disabled={p.semEstoque}
              aria-label={`Adicionar ${p.nome}`} title={p.loja ? `${p.nome} · ${p.loja}` : p.nome}
              className={`superficie-alta relative flex min-h-20 flex-col justify-between p-2.5 text-left disabled:opacity-40 ${qtd ? 'ring-2 ring-brand' : ''}`}>
              <span className="line-clamp-2 text-sm font-medium leading-tight text-fg-token">{p.nome}</span>
              <span className="mt-1 text-sm font-semibold tabular-nums text-fg-token">{formatarValor(p.preco)}</span>
              {qtd > 0 && (
                <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs font-bold leading-5 text-on-brand">{qtd}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GradeDeProdutos;
