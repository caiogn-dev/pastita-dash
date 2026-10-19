import React, { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Button, Input, SearchInput } from '../../components/ui';
import { productsService, type Product } from '../../services/products';
import { formatCurrency } from '../../utils/formatters';
import { precoVigenteDoProduto } from '../../utils/precoVigente';
import { dinheiro, type LinhaDaNota } from './contaDaNota';

interface Props {
  loja: string;
  linhas: LinhaDaNota[];
  onMudar: (linhas: LinhaDaNota[]) => void;
  problemas: Record<string, string>;
}

let sequencia = 0;
const novaChave = () => `nova-${Date.now()}-${(sequencia += 1)}`;

/** Etapa Produtos: as linhas da nota, que são os itens do pedido. */
export const ProdutosDaNota: React.FC<Props> = ({ loja, linhas, onMudar, problemas }) => {
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<Product[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) { setAchados([]); return undefined; }
    let ativo = true;
    setBuscando(true);
    const espera = setTimeout(() => {
      productsService.getProducts({ store: loja, search: termo, is_active: true, page_size: 8 })
        .then((res) => { if (ativo) setAchados(res.results ?? []); })
        .catch(() => { if (ativo) setAchados([]); })
        .finally(() => { if (ativo) setBuscando(false); });
    }, 250);
    return () => { ativo = false; clearTimeout(espera); };
  }, [busca, loja]);

  const mudar = (chave: string, mudanca: Partial<LinhaDaNota>) =>
    onMudar(linhas.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));

  const remover = (linha: LinhaDaNota) => (linha.itemId
    ? mudar(linha.chave, { removida: true })
    : onMudar(linhas.filter((l) => l.chave !== linha.chave)));

  const doCardapio = (produto: Product) => {
    onMudar([...linhas, {
      chave: novaChave(), productId: produto.id, nome: produto.name,
      quantidade: 1, valor: precoVigenteDoProduto(produto).toFixed(2), doCardapio: true,
    }]);
    setBusca('');
    setAchados([]);
  };

  const foraDoCardapio = () => onMudar([...linhas, {
    chave: novaChave(), nome: '', quantidade: 1, valor: '', doCardapio: false,
  }]);

  const visiveis = linhas.filter((l) => !l.removida);

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchInput
          aria-label="Adicionar do cardápio"
          placeholder="Adicionar do cardápio: nome do produto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          loading={buscando}
        />
        {achados.length > 0 && (
          <ul className="superficie absolute z-10 mt-1 max-h-60 w-full divide-y divide-border-token overflow-y-auto shadow-lg">
            {achados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => doCardapio(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted-token"
                >
                  <span className="truncate text-fg-token">{p.name}</span>
                  <span className="text-fg-muted-token">{formatCurrency(precoVigenteDoProduto(p))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="superficie overflow-x-auto">
        <div className="min-w-[560px] divide-y divide-border-token">
        <div className="grid grid-cols-[1fr_5rem_8rem_7rem_2.5rem] gap-2 px-3 py-2 text-caption uppercase text-fg-muted-token">
          <span>Nome</span>
          <span>Qtd.</span>
          <span>Valor unit.</span>
          <span className="text-right">Total</span>
          <span className="sr-only">Ações</span>
        </div>
        {visiveis.map((l) => {
          const problema = problemas[l.chave];
          return (
            <div key={l.chave} className="grid grid-cols-[1fr_5rem_8rem_7rem_2.5rem] items-start gap-2 px-3 py-2">
              <Input
                aria-label="Nome do item"
                value={l.nome}
                placeholder={l.doCardapio ? '' : 'Ex.: Adicional 10 pessoas'}
                error={problema === 'Informe o nome' ? problema : undefined}
                aria-invalid={problema === 'Informe o nome' ? true : undefined}
                onChange={(e) => mudar(l.chave, { nome: e.target.value })}
              />
              <Input
                aria-label="Quantidade"
                type="number" min={1} inputMode="numeric"
                className="text-right tabular-nums"
                value={l.quantidade}
                onChange={(e) => mudar(l.chave, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
              />
              <Input
                aria-label="Valor unitário"
                inputMode="decimal"
                className="text-right tabular-nums"
                value={l.valor}
                placeholder="0,00"
                error={problema === 'Informe o valor' ? problema : undefined}
                aria-invalid={problema === 'Informe o valor' ? true : undefined}
                // Item do cardápio novo entra pelo preço do cardápio: o
                // servidor usa o preço vigente e ignoraria o digitado.
                readOnly={Boolean(l.productId)}
                onChange={(e) => mudar(l.chave, { valor: e.target.value })}
              />
              <span className="py-2 text-right text-sm font-medium tabular-nums text-fg-token">
                {formatCurrency(dinheiro(l.valor) * l.quantidade)}
              </span>
              <Button
                variant="ghost" size="sm" aria-label={`Remover ${l.nome || 'item'}`}
                disabled={visiveis.length === 1}
                onClick={() => remover(l)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        </div>
      </div>

      <Button variant="outline" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={foraDoCardapio}>
        Item fora do cardápio
      </Button>
    </div>
  );
};

export default ProdutosDaNota;
