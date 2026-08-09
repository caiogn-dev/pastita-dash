/**
 * O atalho da barra do topo para a Central de Pedidos.
 *
 * Mora na navbar, e não no menu lateral, porque não é navegação: é abrir a
 * estação de trabalho. O menu leva você a outra parte do painel; isto abre a
 * tela que fica ligada o turno inteiro, ao lado do que você estiver fazendo.
 *
 * `_blank`, e NÃO uma aba nomeada.
 *
 * A primeira versão usava `target="central-de-pedidos"` para reaproveitar a
 * aba já aberta. Na prática o link passou a navegar na PRÓPRIA aba: basta a
 * aba onde o painel está carregado receber esse nome — o que acontece assim
 * que alguém volta para o painel dentro da aba da Central — para que todo
 * clique seguinte vire navegação comum. O reaproveitamento é bonito no papel
 * e imprevisível no uso.
 *
 * `_blank` sempre abre guia nova, que é o comportamento pedido: a Central
 * fica ligada ao lado do painel o expediente inteiro.
 *
 * O "abre fora" é declarado com ícone e texto: link que muda de aba sem
 * avisar é um dos incômodos clássicos de web.
 */
import React from 'react';
import { ArrowTopRightOnSquareIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

export interface CentralDePedidosLinkProps {
  storeSlug?: string | null;
  className?: string;
}

export const CentralDePedidosLink: React.FC<CentralDePedidosLinkProps> = ({
  storeSlug,
  className,
}) => {
  // Sem loja o destino seria `/stores//orders` — uma tela de erro no meio do
  // expediente. Melhor não oferecer o atalho.
  if (!storeSlug) return null;

  return (
    <a
      href={`/stores/${storeSlug}/orders`}
      target="_blank"
      rel="noopener noreferrer"
      title="Abre em nova aba e fica disponível durante todo o expediente"
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-lg border border-chrome-border px-2.5 py-1.5 ' +
        'text-sm font-semibold text-chrome-fg transition-colors hover:bg-chrome-hover ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
      }
    >
      <ShoppingCartIcon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="max-lg:sr-only">Central de Pedidos</span>
      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
};

export default CentralDePedidosLink;
