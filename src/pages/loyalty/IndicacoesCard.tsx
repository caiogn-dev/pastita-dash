import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, EmptyState, FalhaAoCarregar, RankedList, type RankedItem } from '../../components/ui';
import { ShareIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';
import { cashbackService } from '../../services/cashback';
import { urlDeClienteBuscado } from '../customers/buscaPelaUrl';
import {
  ordenarIndicadores, rotuloDoAmigo, rotuloDoIndicador, telefoneLegivel,
  type IndicacaoRow, type IndicadorAgregado,
} from './indicacoes';

/**
 * "Quem veio pela Elisangela?"
 *
 * A pergunta do dono (04/09) que o painel não respondia. A tela de cashback
 * mostrava "saldo de indicação: R$ 12,40" — um total somado, sem um nome. Com
 * isso a loja não consegue agradecer quem trouxe cliente, não sabe quem são
 * seus divulgadores, e não percebe um mesmo telefone "indicando" trinta
 * desconhecidos.
 *
 * A LISTA É `RankedList`, o formato canônico do painel para "pessoas com um
 * valor". A primeira versão desta tela desenhou a própria lista à mão, e o
 * dono cobriu: "você está criando vários blocos ao invés de reutilizar o que
 * já existe". Ele estava certo — o componente já fazia medalha, barra
 * proporcional, sublinha e link no rótulo, e melhor.
 *
 * ORDEM POR QUANTAS PESSOAS TROUXE, não por quanto custou: a pergunta é "quem
 * são meus divulgadores", e ordenar por dinheiro colocaria na frente quem
 * trouxe um ticket alto uma vez em vez de quem traz gente toda semana.
 *
 * O VAZIO É O ESTADO MAIS PROVÁVEL por enquanto, e por isso não é um "nada
 * aqui": ele explica que a indicação é rastreada pelo link que o cliente pega
 * na carteira. Um vazio mudo faria o dono achar que o programa quebrou quando
 * ele só não começou.
 */
export const IndicacoesCard: React.FC<{ storeSlug: string }> = ({ storeSlug }) => {
  const [linhas, setLinhas] = useState<IndicacaoRow[]>([]);
  const [porIndicador, setPorIndicador] = useState<IndicadorAgregado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // Guarda monotônica contra resposta obsoleta. Não dá para usar um `vivo` de
  // fechamento aqui: o retry chama `carregar` como callback de evento
  // (`onTentarDeNovo`) e DESCARTA o retorno, então o cleanup de uma busca de
  // retry nunca rodaria — e uma resposta tardia da loja anterior sobrescreveria
  // a loja já trocada, vazando indicações de um tenant no painel de outro. Com
  // o ref, só a busca mais recente aplica, venha ela do efeito ou do botão.
  const requisicaoRef = useRef(0);

  const carregar = useCallback(() => {
    const req = ++requisicaoRef.current;
    setCarregando(true);
    setErro(false);
    cashbackService.indicacoes(storeSlug)
      .then((d) => {
        if (req !== requisicaoRef.current) return; // busca superada (ex.: troca de loja)
        setLinhas(d.indicacoes || []);
        setPorIndicador(ordenarIndicadores(d.por_indicador || []));
      })
      // Sem o flag, a falha ficava muda e a lista vazia virava o vazio
      // CONFIANTE "Nenhuma indicação ainda" — dizendo à loja que ninguém
      // indicou quando foi a busca que caiu (o "vazio enganoso").
      .catch(() => { if (req === requisicaoRef.current) setErro(true); })
      .finally(() => { if (req === requisicaoRef.current) setCarregando(false); });
  }, [storeSlug]);

  // Ao trocar de loja, `carregar` roda de novo e incrementa `requisicaoRef`,
  // superando sozinho qualquer busca anterior em voo — não precisa de cleanup.
  useEffect(() => carregar(), [carregar]);

  if (carregando) {
    return <Card title="Indicações"><div className="h-24 animate-pulse rounded bg-surface-2" /></Card>;
  }

  // Falha SEM dado em cache: erro acionável no lugar do vazio enganoso.
  if (erro && !linhas.length) {
    return (
      <Card title="Indicações">
        <FalhaAoCarregar
          titulo="Não foi possível carregar as indicações"
          onTentarDeNovo={carregar}
        />
      </Card>
    );
  }

  if (!linhas.length) {
    return (
      <Card title="Indicações">
        <EmptyState
          icone={<ShareIcon />}
          titulo="Nenhuma indicação ainda"
          descricao={
            'A indicação é rastreada pelo link que o cliente pega na página da '
            + 'carteira dele — o link leva o número de quem indicou. Quando o '
            + 'amigo comprar por esse link, ele aparece aqui com nome e pedido.'
          }
        />
      </Card>
    );
  }

  // Quem trouxe gente: a barra mede PESSOAS, e o valor à direita mostra o que
  // a loja pagou por elas. Duas grandezas na mesma linha, cada uma no seu
  // lugar — a barra responde "quem divulga", o número responde "quanto custa".
  const divulgadores: RankedItem[] = porIndicador.map((i) => ({
    label: rotuloDoIndicador(i),
    sub: i.nome ? telefoneLegivel(i.phone) : undefined,
    value: i.total_indicados,
    valueLabel: `${i.total_indicados} ${i.total_indicados === 1 ? 'pessoa' : 'pessoas'}`,
    href: urlDeClienteBuscado({ phone: i.phone, name: i.nome }, storeSlug) ?? undefined,
  }));

  // Cada indicação: o valor é o dinheiro creditado, que é o que o dono confere
  // quando quer entender uma linha específica.
  const cada: RankedItem[] = linhas.map((r) => ({
    label: `${rotuloDoIndicador({ phone: r.indicador_phone, nome: r.indicador_nome })} → ${rotuloDoAmigo(r)}`,
    sub: `${r.pedido}${r.pedido_total ? ` · pedido de ${formatCurrency(Number(r.pedido_total))}` : ''}`,
    value: Number(r.valor),
    valueLabel: formatCurrency(Number(r.valor)),
    href: urlDeClienteBuscado(
      { phone: r.indicador_phone, name: r.indicador_nome }, storeSlug,
    ) ?? undefined,
  }));

  return (
    <Card title="Indicações">
      {/* As duas perguntas lado a lado: quem divulga e o que cada indicação rendeu. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-body font-semibold text-fg-token">Quem mais trouxe gente</h3>
          <RankedList items={divulgadores} />
        </div>
        <div>
          <h3 className="mb-2 text-body font-semibold text-fg-token">Cada indicação</h3>
          <RankedList items={cada} medals={false} />
        </div>
      </div>
    </Card>
  );
};
