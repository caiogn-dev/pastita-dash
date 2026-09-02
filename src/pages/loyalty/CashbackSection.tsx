import React from 'react';
import { Badge, Button, Card, Input, KpiGrid, EmptyState } from '../../components/ui';
import {
  BanknotesIcon, ClockIcon, UserGroupIcon, ShareIcon, ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';
import type { CashbackResponse } from '../../services/cashback';

/**
 * Cashback no painel.
 *
 * TRÊS DECISÕES QUE MOLDAM ESTA TELA:
 *
 * 1. "Saldo em circulação" e "já resgatado" são números DIFERENTES e ficam
 *    lado a lado de propósito. O primeiro é promessa — dinheiro que a loja
 *    ainda vai pagar; o segundo é a conta paga. Mostrar só um dos dois deixa
 *    o dono achando que o programa custa metade ou o dobro do que custa.
 *
 * 2. "Vence em 7 dias" é o único número com prazo, e por isso o único que
 *    manda agir hoje. Ganha destaque e vem com a ação escrita ao lado —
 *    número sem verbo é decoração.
 *
 * 3. A lista é ordenada por VENCIMENTO, não por saldo. A pergunta desta tela
 *    é "a quem eu mando mensagem agora", e quem está prestes a perder o saldo
 *    é quem responde. Ordenar por saldo responderia outra pergunta.
 */

/** O backend manda Decimal como string para não perder centavo no JSON. */
const num = (v: string | number | undefined) => Number(v ?? 0);

/** Telefone em E.164 sem '+' vira legível: 5563999547790 → (63) 99954-7790 */
function telefoneLegivel(e164: string): string {
  const d = (e164 || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

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
}

export const CashbackSection: React.FC<Props> = ({
  dados, carregando, percent, referralPercent, expiryDays,
  onPercent, onReferralPercent, onExpiryDays, onSalvar, salvando, ligado, onLigado,
}) => {
  const resumo = dados?.resumo;
  const venceEm7 = num(resumo?.vence_em_7_dias);
  const fila = dados?.results ?? [];

  return (
    <div className="space-y-4">
      {ligado && (
        <KpiGrid
          titulo="Como está o cashback"
          itens={[
            {
              label: 'Saldo em circulação',
              value: formatCurrency(num(resumo?.saldo_em_circulacao)),
              definicao: 'Crédito vivo dos clientes. É promessa: a loja ainda vai pagar isto.',
              icone: <BanknotesIcon />,
            },
            {
              label: 'Já resgatado',
              value: formatCurrency(num(resumo?.ja_resgatado)),
              definicao: 'O que o programa custou de verdade — crédito que virou desconto.',
              icone: <ReceiptPercentIcon />,
            },
            {
              label: 'Clientes com saldo',
              value: resumo?.clientes_com_saldo ?? '—',
              definicao: 'Quantas pessoas têm crédito para gastar agora.',
              icone: <UserGroupIcon />,
            },
            {
              // O número que vira campanha hoje: tem prazo, e prazo move.
              label: 'Vence em 7 dias',
              value: formatCurrency(venceEm7),
              definicao: venceEm7 > 0
                ? 'Mande mensagem para esta gente — depois disso o saldo some.'
                : 'Nenhum saldo vencendo nesta semana.',
              icone: <ClockIcon />,
              tone: venceEm7 > 0 ? 'warning' : 'default',
            },
            {
              label: 'Veio de indicação',
              value: formatCurrency(num(resumo?.saldo_de_indicacao)),
              definicao: 'Saldo que clientes e parceiros ganharam por trazer gente.',
              icone: <ShareIcon />,
            },
          ]}
        />
      )}

      <Card title="Cashback">
        <form className="space-y-4" onSubmit={onSalvar}>
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

          <div className="grid gap-4 sm:grid-cols-3">
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
            <Input
              id="cashback-validade"
              label="Saldo vence em (dias)"
              type="number"
              min={1}
              value={expiryDays}
              onChange={(e) => onExpiryDays(e.target.value)}
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

          <Button type="submit" isLoading={salvando}>Salvar cashback</Button>
        </form>
      </Card>

      {ligado && (
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
            <ul className="divide-y divide-border-token">
              {fila.map((c) => (
                <li key={c.phone} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-body text-fg-token">
                      {telefoneLegivel(c.phone)}
                    </span>
                    <span className="text-caption text-fg-muted-token">
                      {c.dias_para_vencer === 0
                        ? 'vence hoje'
                        : `vence em ${c.dias_para_vencer} dia${c.dias_para_vencer > 1 ? 's' : ''}`}
                    </span>
                  </span>
                  <Badge tone={c.dias_para_vencer <= 7 ? 'warning' : 'neutral'}>
                    {formatCurrency(num(c.saldo))}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default CashbackSection;
