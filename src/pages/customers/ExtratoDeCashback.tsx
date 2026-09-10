/**
 * De ONDE veio cada real de cashback do cliente — e para onde foi.
 *
 * O dono abriu a ficha da MADU CACHEADA e não soube responder uma pergunta
 * simples: os R$ 3,13 dela vieram da compra DELA ou do cupom MADULASH que as
 * amigas usaram? O banco sempre soube (o lote é `referral` e aponta para o
 * pedido da Juliane), mas nenhuma tela dizia. Um programa de indicação que não
 * mostra QUEM indicou é só um desconto com nome bonito.
 *
 * Componente separado de propósito: o pai só o monta depois do clique, então
 * a consulta acontece uma vez, quando alguém realmente pergunta — a ficha
 * comum não paga por ela.
 */
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Loading } from '../../components/common';
import { getErrorMessage } from '../../services';
import { cashbackService, type LancamentoDeCashback } from '../../services/cashback';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  storeSlug: string;
  telefone: string;
}

/** A segunda linha: quem comprou, ou por que a loja creditou. */
const origemDoLancamento = (l: LancamentoDeCashback): string => {
  if (l.pedido) {
    // O nome é a resposta que o dono procurava: "veio do pedido da Juliane".
    const quem = l.pedido.cliente ? ` · ${l.pedido.cliente}` : '';
    return `${l.pedido.numero}${quem}`;
  }
  return l.referencia || '';
};

export const ExtratoDeCashback: React.FC<Props> = ({ storeSlug, telefone }) => {
  const [lancamentos, setLancamentos] = useState<LancamentoDeCashback[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    cashbackService.extrato(storeSlug, telefone)
      .then((linhas) => { if (vivo) setLancamentos(linhas); })
      .catch((e) => { if (vivo) setErro(getErrorMessage(e)); });
    return () => { vivo = false; };
  }, [storeSlug, telefone]);

  if (erro) {
    return <p className="mt-3 text-xs text-danger-token">{erro}</p>;
  }
  if (!lancamentos) {
    return <div className="flex justify-center py-4"><Loading size="sm" /></div>;
  }
  if (lancamentos.length === 0) {
    return (
      <p className="mt-3 border-t border-border-token pt-3 text-xs text-fg-muted-token">
        Nenhum lançamento de cashback para este cliente.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-border-token border-t border-border-token">
      {lancamentos.map((l, i) => {
        const entrada = l.tipo === 'entrada';
        const valor = Number(l.valor || 0);
        const origem = origemDoLancamento(l);
        return (
          <li key={`${l.quando}-${i}`} className="flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg-token">{l.rotulo}</p>
              {origem && (
                <p className="truncate text-xs text-fg-muted-token">{origem}</p>
              )}
              <p className="text-xs text-fg-muted-token">
                {format(new Date(l.quando), "dd/MM/yyyy", { locale: ptBR })}
                {/* Vencido SOME DO SALDO, não do extrato: o cliente pergunta
                    "cadê meus R$ 5" e a resposta é "venceram em tal dia". */}
                {l.vencido && l.vence_em && (
                  <> · venceu em {format(new Date(l.vence_em), 'dd/MM/yyyy', { locale: ptBR })}</>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`text-sm font-bold ${entrada ? 'text-success-token' : 'text-fg-muted-token'}`}>
                {formatCurrency(entrada ? valor : -valor)}
              </span>
              {/* Quanto ainda sobrou DESTE lote: o saldo é a soma disto, não
                  dos valores originais, e sem a coluna a conta não fecha. */}
              {entrada && l.restante !== null && Number(l.restante) !== valor && (
                <p className="text-xs text-fg-muted-token">
                  resta {formatCurrency(l.restante)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
