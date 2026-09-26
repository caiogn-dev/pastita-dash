import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Input, EmptyState, RankedList } from '../../components/ui';
import { SecaoDoPrograma } from '../../components/loyalty';
import { formatCurrency } from '../../utils/formatters';
import type { CashbackClienteRow, CashbackResponse } from '../../services/cashback';
import { cashbackService } from '../../services/cashback';
import { telefoneLegivel } from './indicacoes';
import { urlDeClienteBuscado } from '../customers/buscaPelaUrl';

/**
 * Cashback no painel.
 *
 * Aqui moram a configuração (em seções: como o cliente ganha, o que ele
 * recebe, onde vale) e a fila de quem perde saldo. Os NÚMEROS — saldo em
 * circulação, já resgatado, vence em 7 dias — ficam no resumo ao lado da
 * prévia, na FidelidadePage, lado a lado de propósito: "em circulação" é
 * promessa, "já resgatado" é a conta paga, e mostrar só um dos dois deixa o
 * dono achando que o programa custa metade ou o dobro do que custa.
 *
 * A lista é ordenada por VENCIMENTO, não por saldo. A pergunta desta tela
 *    é "a quem eu mando mensagem agora", e quem está prestes a perder o saldo
 *    é quem responde. Ordenar por saldo responderia outra pergunta.
 */

/** O backend manda Decimal como string para não perder centavo no JSON. */
const num = (v: string | number | undefined) => Number(v ?? 0);


interface Props {
  dados: CashbackResponse | null;
  carregando: boolean;
  percent: string;
  referralPercent: string;
  expiryDays: string;
  onPercent: (v: string) => void;
  onReferralPercent: (v: string) => void;
  onExpiryDays: (v: string) => void;
  onSalvar: (e: React.FormEvent) => void;
  salvando: boolean;
  ligado: boolean;
  onLigado: (v: boolean) => void;
  storeSlug: string;
  /**
   * Qual pedaço mostrar. A página virou abas (`PageTabs`): a configuração
   * numa aba e a fila de quem perde saldo noutra. Os números do cashback
   * moram no resumo ao lado da prévia (FidelidadePage), junto com os do
   * cartão de carimbo — antes cada programa desenhava a própria faixa.
   */
  parte?: 'config' | 'clientes';
  onAjustou?: () => void;
}

export const CashbackSection: React.FC<Props> = ({
  dados, carregando, percent, referralPercent, expiryDays,
  onPercent, onReferralPercent, onExpiryDays, onSalvar, salvando, ligado, onLigado,
  storeSlug, onAjustou, parte = 'config',
}) => {
  // Crédito manual: cortesia, reparação, brinde. Antes disto só existia pelo
  // shell de produção, que é como se perde dinheiro sem rastro.
  const [ajustePara, setAjustePara] = useState<string | null>(null);
  const [ajusteValor, setAjusteValor] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [ajustando, setAjustando] = useState(false);
  const [erroAjuste, setErroAjuste] = useState('');

  const creditar = async () => {
    setErroAjuste('');
    if (!ajustePara) return;
    // O motivo é obrigatório no backend; barrar aqui evita a ida à rede e
    // deixa a razão explícita para quem está creditando.
    if (!ajusteMotivo.trim()) {
      setErroAjuste('Diga o motivo — o crédito fica registrado com ele.');
      return;
    }
    setAjustando(true);
    try {
      await cashbackService.ajustar(storeSlug, {
        phone: ajustePara,
        valor: ajusteValor.replace(',', '.'),
        motivo: ajusteMotivo.trim(),
      });
      setAjustePara(null);
      onAjustou?.();
    } catch (e: any) {
      setErroAjuste(e?.response?.data?.error || 'Não foi possível creditar agora.');
    } finally {
      setAjustando(false);
    }
  };
  const fila = dados?.results ?? [];

  // SALDO COMPRADO, mais novo primeiro. A fila abaixo é ordenada por
  // vencimento — certa para "a quem eu falo hoje", errada para "quem acabou
  // de comprar": em 26/09 a compra da Flaviane caiu na página 2 de 69 e o
  // dono achou que a venda tinha sumido.
  const [comprados, setComprados] = useState<CashbackClienteRow[]>([]);
  useEffect(() => {
    if (parte !== 'clientes' || !ligado || !storeSlug) return;
    let vivo = true;
    cashbackService.get(storeSlug, 1, { origem: 'prepaid', ordem: 'recente' })
      .then((r) => { if (vivo) setComprados((r.results ?? []).filter((c) => num(c.saldo_carteira) > 0)); })
      .catch(() => { if (vivo) setComprados([]); });
    return () => { vivo = false; };
  }, [parte, ligado, storeSlug, dados]);

  return (
    <div className="space-y-4">
      {parte === 'config' && (
      <Card size="lg">
        <form className="space-y-5" onSubmit={onSalvar}>
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded border border-border-token bg-surface-2 p-3">
            <span className="min-w-0">
              <span className="block text-body font-semibold text-fg-token">
                Cashback ativo
              </span>
              <span className="mt-0.5 block text-caption text-fg-muted-token">
                Ligado, todo pedido pago devolve uma parte em saldo, e o saldo
                aparece sozinho no carrinho do próximo pedido do cliente.
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
              checked={ligado}
              onChange={(e) => onLigado(e.target.checked)}
            />
          </label>

          <SecaoDoPrograma
            titulo="Como o cliente ganha"
            descricao="Uma parte de cada pedido pago volta em saldo. Quem indica um amigo também ganha."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="cashback-percent"
                label="Volta em cada compra (%)"
                type="number"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => onPercent(e.target.value)}
              />
              <Input
                id="cashback-indicacao"
                label="Volta por indicação (%)"
                type="number"
                min={0}
                max={100}
                value={referralPercent}
                onChange={(e) => onReferralPercent(e.target.value)}
              />
            </div>
            {/* O exemplo em dinheiro é o ponto: "3%" é abstrato, "R$ 2,16 no
                pedido médio de R$ 72" é a decisão que o dono está tomando. */}
            <p className="text-caption text-fg-muted-token">
              Num pedido de {formatCurrency(72)} o cliente ganha{' '}
              <strong className="text-fg-token">
                {formatCurrency(72 * (Number(percent) || 0) / 100)}
              </strong>{' '}
              de volta, e quem indicou ganha{' '}
              <strong className="text-fg-token">
                {formatCurrency(72 * (Number(referralPercent) || 0) / 100)}
              </strong>.
            </p>
          </SecaoDoPrograma>

          <SecaoDoPrograma
            titulo="O que ele recebe"
            descricao="Saldo em reais para gastar na loja. Depois do prazo, o saldo some."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="cashback-validade"
                label="Saldo vence em (dias)"
                type="number"
                min={1}
                value={expiryDays}
                onChange={(e) => onExpiryDays(e.target.value)}
              />
            </div>
          </SecaoDoPrograma>

          <SecaoDoPrograma titulo="Onde vale">
            <p className="text-caption text-fg-muted-token">
              Em qualquer pedido do cardápio. O saldo entra sozinho no carrinho e
              desconta do que sobra depois dos outros descontos.
            </p>
          </SecaoDoPrograma>

          <div className="border-t border-border-token pt-5">
            <Button type="submit" isLoading={salvando}>Salvar cashback</Button>
          </div>
        </form>
      </Card>
      )}

      {parte === 'clientes' && ligado && comprados.length > 0 && (
        <Card
          title="Saldo comprado (carteira)"
          subtitle="Quem pagou adiantado, do mais recente para o mais antigo. É dinheiro que já entrou."
        >
          <RankedList
            medals={false}
            items={comprados.map((c) => ({
              label: c.nome || telefoneLegivel(c.phone),
              sub: [
                c.nome ? telefoneLegivel(c.phone) : null,
                c.dias_para_vencer === 0 ? 'vence hoje' : `vence em ${c.dias_para_vencer} dia${c.dias_para_vencer > 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · '),
              value: Math.max(1, Number(c.saldo_carteira) || 1),
              valueLabel: formatCurrency(num(c.saldo_carteira)),
              href: urlDeClienteBuscado({ phone: c.phone, name: c.nome }, storeSlug) ?? undefined,
              badge: <Badge tone="success">carteira</Badge>,
            }))}
          />
        </Card>
      )}

      {parte === 'clientes' && ligado && (
        <Card
          title="Quem perde saldo primeiro"
          subtitle="Ordenado por vencimento, não por valor: a pergunta aqui é a quem mandar mensagem hoje."
        >
          {carregando ? (
            <p className="text-body text-fg-muted-token">Carregando…</p>
          ) : fila.length === 0 ? (
            <EmptyState
              variante="ativacao"
              titulo="Ninguém com saldo ainda"
              descricao="Os créditos aparecem aqui assim que o primeiro pedido for pago com o cashback ligado."
            />
          ) : (
            <RankedList
              medals={false}
              items={fila.map((c) => ({
                // O NOME, não o telefone. A pergunta desta lista é "a quem eu
                // falo hoje antes do saldo vencer", e ela não se responde com
                // um número — o dono tinha que abrir outra página e procurar
                // cada um. Sem nome no cadastro, o telefone legível assume.
                label: c.nome || telefoneLegivel(c.phone),
                // O prazo POR EXTENSO, não "3d": este é o número que manda
                // agir hoje, e abreviação num aviso de urgência custa a
                // leitura que ele existe para provocar.
                sub: [
                  c.nome ? telefoneLegivel(c.phone) : null,
                  c.dias_para_vencer === 0
                    ? 'vence hoje'
                    : `vence em ${c.dias_para_vencer} dia${c.dias_para_vencer > 1 ? 's' : ''}`,
                ].filter(Boolean).join(' · '),
                // A barra mede o VENCIMENTO, não o saldo: quem está prestes a
                // perder é quem responde a mensagem de hoje, e a lista já vem
                // ordenada por isso do backend.
                value: Math.max(1, 30 - c.dias_para_vencer),
                valueLabel: formatCurrency(num(c.saldo)),
                href: urlDeClienteBuscado({ phone: c.phone, name: c.nome }, storeSlug) ?? undefined,
                badge: (
                  <span className="flex items-center gap-1.5">
                    {c.dias_para_vencer <= 7 && (
                      // Selo só quando é urgente: um badge em toda linha vira
                      // ruído e deixa de marcar o que precisa de ação.
                      <Badge tone="warning">urgente</Badge>
                    )}
                    {num(c.saldo_carteira) > 0 && (
                      // Distingue o comprado do concedido na própria linha: são
                      // dinheiros diferentes e só um deles a loja ainda deve.
                      <Badge tone="success">
                        carteira {formatCurrency(num(c.saldo_carteira))}
                      </Badge>
                    )}
                    {num(c.cupons_entrega) > 0 && (
                      <Badge tone="neutral">
                        {c.cupons_entrega} entrega{c.cupons_entrega > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </span>
                ),
                actions: (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAjustePara(c.phone); setAjusteValor(''); setAjusteMotivo(''); }}
                  >
                    + saldo
                  </Button>
                ),
              }))}
            />
          )}

          {ajustePara && (
            <div className="mt-4 space-y-3 rounded border border-border-token bg-surface-2 p-3">
              <p className="text-body font-semibold text-fg-token">
                Creditar saldo para {telefoneLegivel(ajustePara)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Valor (R$)"
                  inputMode="decimal"
                  value={ajusteValor}
                  onChange={(e) => setAjusteValor(e.target.value)}
                  placeholder="50,00"
                />
                <Input
                  label="Motivo"
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  placeholder="Pedido atrasado, cortesia"
                />
              </div>
              {erroAjuste && (
                <p role="alert" className="text-caption text-danger-token">{erroAjuste}</p>
              )}
              <p className="text-caption text-fg-muted-token">
                O crédito entra como cortesia da loja e o cliente usa sem precisar
                confirmar o número — diferente do saldo comprado.
              </p>
              <div className="flex gap-2">
                <Button onClick={creditar} disabled={ajustando}>
                  {ajustando ? 'Creditando…' : 'Creditar'}
                </Button>
                <Button variant="ghost" onClick={() => setAjustePara(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default CashbackSection;
