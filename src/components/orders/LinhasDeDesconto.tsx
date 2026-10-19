import type { DescontoDoPedido } from '../../types';

/**
 * De onde veio o desconto do pedido: uma linha por origem (cupom com código,
 * resgate da fidelidade com o item grátis, cashback). Fonte: `order.descontos`,
 * montado no server2 (services/descontos_do_pedido.py) — a mesma lista que a
 * comanda imprime. Lista vazia não desenha nada.
 */
export function LinhasDeDesconto({
  descontos,
  formatar,
}: {
  descontos: DescontoDoPedido[];
  formatar: (valor: number) => string;
}) {
  return (
    <>
      {descontos.map((d) => (
        <div key={`${d.tipo}-${d.rotulo}`} className="flex justify-between gap-3">
          <dt className="text-fg-muted-token">
            {d.tipo === 'cupom' && d.codigo ? (
              <>
                Cupom <span className="font-mono text-xs text-fg-token">{d.codigo}</span>
              </>
            ) : d.tipo === 'fidelidade' ? (
              <>
                🎁 Resgate fidelidade
                {d.item ? (
                  <>
                    {' · '}
                    <span className="text-fg-token">{d.item} grátis</span>
                  </>
                ) : null}
              </>
            ) : (
              d.rotulo
            )}
          </dt>
          <dd className="text-[var(--success)]">-{formatar(Number(d.valor))}</dd>
        </div>
      ))}
    </>
  );
}
