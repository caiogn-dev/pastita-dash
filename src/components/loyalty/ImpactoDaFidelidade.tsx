/**
 * ImpactoDaFidelidade — "quanto custa e está valendo a pena", ao lado do formulário.
 *
 * A tela era só configuração: "10 itens = 1 grátis" e nada sobre o custo, se
 * alguém voltava por causa disso, ou o que fazer com quem está a um item do
 * brinde. Três blocos, na ordem da pergunta do dono:
 *
 * 1. Simulador — acompanha o que ele DIGITA. O backend manda o ritmo de
 *    carimbos e o custo de um brinde; a divisão pelos itens é feita aqui para
 *    o número mudar a cada tecla, sem ida ao servidor.
 * 2. Está funcionando? — um número só: recompra de quem participa × quem não.
 *    Com menos de 30 pedidos a diferença é ruído, e a tela diz isso.
 * 3. Ação — "K clientes a um item do brinde" vira mensagem enviada.
 *
 * Sem dado (backend antigo, loja nova) a tela diz "sem dados ainda". Nunca
 * zero: "R$ 0/mês" leria como "o programa não custa nada".
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Secao, SeloDeEstado } from '../ui';
import type { LoyaltyImpacto } from '../../services/loyaltyImpacto';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

export interface ImpactoDaFidelidadeProps {
  tipo: 'carimbo' | 'cashback';
  /** `undefined` = carregando; `null` = sem endpoint ou sem dados. */
  dados: LoyaltyImpacto | null | undefined;
  /** O que está no campo AGORA, não o gravado — o simulador é para decidir. */
  itensParaGanhar: string | number;
  percentual: string | number;
}

export const CAMINHO_DA_CAMPANHA_DE_FIDELIDADE = '/marketing/whatsapp/new?objetivo=fidelidade';

const SEM_DADOS = 'Sem dados ainda';

const decimal = (n: number) => formatNumber(n, { maximumFractionDigits: 1 });
const taxa = (fracao: number) => formatPercent(fracao * 100, 0);

function positivo(v: string | number): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function textoDoSimulador(
  tipo: ImpactoDaFidelidadeProps['tipo'],
  dados: LoyaltyImpacto | null | undefined,
  itens: string | number,
  percentual: string | number,
): string {
  if (!dados) return SEM_DADOS;

  if (tipo === 'cashback') {
    const pct = Number(percentual);
    if (dados.receita_paga_mes == null || !Number.isFinite(pct)) return SEM_DADOS;
    const saldo = (dados.receita_paga_mes * pct) / 100;
    return `${decimal(pct)}% de ${formatCurrency(dados.receita_paga_mes)}/mês em pedidos ≈ ${formatCurrency(saldo)}/mês em saldo`;
  }

  const n = positivo(itens);
  if (dados.custo_por_brinde == null || n === null) return SEM_DADOS;
  const brindes = dados.carimbos_por_mes / n;
  const custoMes = brindes * dados.custo_por_brinde;
  return `cada cartão fechado custa cerca de ${formatCurrency(dados.custo_por_brinde)} · ~${decimal(brindes)} brindes/mês ≈ ${formatCurrency(custoMes)}/mês`;
}

const Recompra: React.FC<{ dados: LoyaltyImpacto | null | undefined }> = ({ dados }) => {
  if (!dados || dados.taxa_recompra_participantes == null) {
    return <p className="text-caption text-fg-muted-token">{SEM_DADOS}</p>;
  }
  if (!dados.amostra_suficiente) {
    return (
      <p className="text-caption text-fg-muted-token">
        Cedo para medir: faltam {dados.pedidos_faltando}{' '}
        {dados.pedidos_faltando === 1 ? 'pedido' : 'pedidos'}
      </p>
    );
  }
  const part = dados.taxa_recompra_participantes;
  const nao = dados.taxa_recompra_nao_participantes;
  const melhor = nao == null || part > nao;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-fg-token">{taxa(part)}</span>
        <span className="text-caption text-fg-muted-token">
          dos participantes voltam
          {nao != null && <> · {taxa(nao)} de quem não participa</>}
        </span>
      </div>
      {nao != null && (
        <SeloDeEstado tone={melhor ? 'success' : 'warning'} ponto>
          {melhor ? 'Quem participa volta mais' : 'Ainda sem diferença'}
        </SeloDeEstado>
      )}
    </div>
  );
};

export const ImpactoDaFidelidade: React.FC<ImpactoDaFidelidadeProps> = ({
  tipo,
  dados,
  itensParaGanhar,
  percentual,
}) => {
  const navigate = useNavigate();
  const carregando = dados === undefined;
  const aUmItem = tipo === 'carimbo' && dados ? dados.a_um_item_total : 0;

  return (
    <Secao
      titulo="Quanto custa e se está funcionando"
      descricao={`Últimos ${dados?.janela_dias ?? 90} dias de pedidos pagos.`}
    >
      <div className="space-y-4" aria-busy={carregando || undefined}>
        <div>
          <p className="text-caption font-medium text-fg-muted-token">
            {tipo === 'cashback' ? 'Saldo que o cashback gera' : 'Custo do brinde'}
          </p>
          <p data-testid="simulador" className="mt-0.5 text-body text-fg-token">
            {carregando ? 'Calculando…' : textoDoSimulador(tipo, dados, itensParaGanhar, percentual)}
          </p>
          {tipo === 'carimbo' && dados?.custo_por_brinde_origem === 'ticket_medio' && (
            <p className="mt-0.5 text-caption text-fg-muted-token">
              Custo estimado pelo ticket médio: nenhum brinde foi resgatado no período.
            </p>
          )}
        </div>

        <div data-testid="recompra" className="border-t border-border-token pt-4">
          <p className="text-caption font-medium text-fg-muted-token">Está funcionando?</p>
          <div className="mt-1">
            {carregando ? <p className="text-caption text-fg-muted-token">Calculando…</p> : <Recompra dados={dados} />}
          </div>
        </div>

        {aUmItem > 0 && dados && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-token pt-4">
            <div className="min-w-0">
              <p className="text-body font-semibold text-fg-token">
                {aUmItem} {aUmItem === 1 ? 'cliente' : 'clientes'} a um item do brinde
              </p>
              {dados.a_um_item.length > 0 && (
                <p className="truncate text-caption text-fg-muted-token">
                  {dados.a_um_item.slice(0, 3).map((c) => c.nome).join(', ')}
                  {aUmItem > 3 ? ` e mais ${aUmItem - 3}` : ''}
                </p>
              )}
            </div>
            <Button size="sm" onClick={() => navigate(CAMINHO_DA_CAMPANHA_DE_FIDELIDADE)}>
              Avisar pelo WhatsApp
            </Button>
          </div>
        )}
      </div>
    </Secao>
  );
};

ImpactoDaFidelidade.displayName = 'ImpactoDaFidelidade';

export default ImpactoDaFidelidade;
