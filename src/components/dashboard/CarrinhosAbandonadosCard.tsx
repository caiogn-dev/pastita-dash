/**
 * Carrinhos abandonados da semana — o dinheiro que ficou na sacola.
 *
 * Fonte: `store_carts`. Todo produto posto na sacola do site/app cria um
 * carrinho no servidor; quando vira pedido ele é desativado. Os que sobram
 * ativos, com itens e parados entre 1h e 7 dias, são abandono. Em 19/09 eram
 * R$ 7.782,96 em 51 carrinhos, que o painel nunca mostrou.
 */
import React, { useEffect, useState } from 'react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Card } from '../common';
import { getCarrinhosAbandonados, type CarrinhosAbandonados } from '../../services/reports';
import { formatCurrency } from '../../utils/formatters';

export const CarrinhosAbandonadosCard: React.FC<{ storeSlug?: string }> = ({ storeSlug }) => {
  const [dados, setDados] = useState<CarrinhosAbandonados | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!storeSlug) return;
    let vivo = true;
    setErro(false);
    getCarrinhosAbandonados(storeSlug, 7)
      .then((d) => { if (vivo) setDados(d); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [storeSlug]);

  return (
    <Card>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border-token">
        <ShoppingCartIcon className="h-4 w-4 text-brand-ink" />
        <h2 className="text-sm font-semibold text-fg-token">Ficou na sacola (últimos 7 dias)</h2>
      </div>
      <div className="px-5 py-4">
        {erro ? (
          <p role="alert" className="text-sm text-fg-muted-token">
            Não foi possível carregar os carrinhos abandonados.
          </p>
        ) : !dados ? (
          <p className="text-sm text-fg-muted-token">Carregando…</p>
        ) : dados.carrinhos === 0 ? (
          <p className="text-sm text-fg-muted-token">Nenhum carrinho abandonado nesta semana.</p>
        ) : (
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <p className="overline">Valor parado</p>
              <p className="text-2xl font-bold text-fg-token">{formatCurrency(dados.valor_total)}</p>
              <p className="text-xs text-fg-muted-token mt-0.5">
                em {dados.carrinhos} carrinhos que não viraram pedido
                {dados.identificados > 0 && ` · ${dados.identificados} de clientes identificados`}
                {dados.com_lembrete > 0 && ` · ${dados.com_lembrete} já receberam lembrete`}
              </p>
            </div>
            {dados.produtos.length > 0 && (
              <div className="min-w-[200px]">
                <p className="overline">Mais deixados na sacola</p>
                <ul className="mt-1 space-y-0.5">
                  {dados.produtos.map((p) => (
                    <li key={p.nome} className="text-sm text-fg-token">
                      {p.nome} <span className="text-fg-muted-token">· {p.carrinhos}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CarrinhosAbandonadosCard;
