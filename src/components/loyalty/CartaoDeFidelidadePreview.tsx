/**
 * CartaoDeFidelidadePreview — o programa de fidelidade como o CLIENTE vê.
 *
 * A tela de Fidelidade era um formulário sem resultado: o dono digitava "10"
 * num campo e tinha que imaginar o que isso virava no cardápio. Esta prévia
 * mostra o cartão ao lado, e ele muda a cada tecla.
 *
 * TRÊS DECISÕES:
 *
 * 1. Parece um pedaço do CARDÁPIO, não do painel. Por isso o cartão fica
 *    sobre um fundo de "tela" (`bg-surface-2`), leva o nome da loja na fonte
 *    da identidade e fala com o cliente ("Faltam 3 para o seu grátis"), não
 *    com o dono.
 *
 * 2. O exemplo nunca mostra o cartão cheio. Um cartão completo não ensina
 *    nada; um cartão a 70% mostra o carimbo preenchido, o vazio e o que falta
 *    — os três estados que o cliente vai ver. Com 1 item só, não há "meio".
 *
 * 3. Número inválido vira um pedido de número, não um cartão vazio. Zero
 *    círculos lê como "quebrou". Acima de 20 itens os círculos viram barra:
 *    vinte e tantas bolinhas num cartão estreito é ruído, não cartão.
 *
 * Só tokens do tema. O dourado da marca (`bg-brand`) é a cor do carimbo
 * preenchido — é a única cor "quente" do cartão, e aponta para o progresso.
 */
import React from 'react';
import { CheckIcon, GiftIcon } from '@heroicons/react/24/solid';

import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatters';

/** Acima disto, o cartão troca os círculos por uma barra de progresso. */
const MAX_CIRCULOS = 20;
/** Pedido de exemplo do cashback — o mesmo usado no texto do formulário. */
const TICKET_EXEMPLO = 72;
const PEDIDOS_EXEMPLO = 3;

interface Comum {
  /** Nome da loja no topo do cartão. Sem ele, "Sua loja". */
  nomeDaLoja?: string;
  /**
   * O programa está ligado? Desligado, a prévia continua visível (o dono está
   * configurando) mas avisa que o cliente não vê nada ainda.
   */
  ligado?: boolean;
  className?: string;
}

export interface PreviewDeCarimbo extends Comum {
  tipo: 'carimbo';
  /** Aceita o valor cru do input — string vazia, "8", 10. */
  itensParaGanhar: number | string;
  /** Nomes das categorias que contam. Vazio = todo o cardápio. */
  categorias?: string[];
}

export interface PreviewDeCashback extends Comum {
  tipo: 'cashback';
  /** Porcentagem de volta, crua do input. Aceita "2.5" e "2,5". */
  percentual: number | string;
  /** Validade do saldo em dias, crua do input. */
  validadeDias?: number | string;
}

export type CartaoDeFidelidadePreviewProps = PreviewDeCarimbo | PreviewDeCashback;

const numero = (v: number | string | undefined): number => {
  if (v === undefined || v === '') return NaN;
  return Number(String(v).replace(',', '.'));
};

const formatarPercentual = (p: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(p);

/** Quantos carimbos o cliente de exemplo tem: ~70%, nunca o cartão cheio. */
const carimbosDeExemplo = (total: number): number =>
  total <= 1 ? 0 : Math.min(total - 1, Math.max(1, Math.round(total * 0.7)));

/** Classe de colunas estática: o Tailwind não enxerga classe montada em runtime. */
const COLUNAS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

const listaDeCategorias = (nomes: string[]): string => {
  if (nomes.length <= 2) return nomes.join(' e ');
  return `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2}`;
};

const Carimbos: React.FC<{ total: number; cheios: number }> = ({ total, cheios }) => {
  if (total > MAX_CIRCULOS) {
    return (
      <div
        role="progressbar"
        aria-label={`${cheios} de ${total} itens`}
        aria-valuenow={cheios}
        aria-valuemin={0}
        aria-valuemax={total}
        className="h-3 w-full overflow-hidden rounded-pill bg-surface-2"
      >
        <span
          className="block h-full rounded-pill bg-brand transition-[width] duration-300"
          style={{ width: `${(cheios / total) * 100}%` }}
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${cheios} de ${total} carimbos`}
      className={cn('grid gap-2', COLUNAS[Math.min(total, 5)])}
    >
      {Array.from({ length: total }, (_, i) => {
        const cheio = i < cheios;
        const premio = i === total - 1;
        return (
          <span
            key={i}
            data-carimbo={cheio ? 'cheio' : 'vazio'}
            className={cn(
              'flex aspect-square max-h-11 w-full max-w-11 items-center justify-center justify-self-center rounded-full transition-colors duration-200',
              cheio
                ? 'bg-brand text-on-brand'
                : premio
                  ? 'border-2 border-brand text-brand-ink'
                  : 'border-2 border-dashed border-border-token',
            )}
          >
            {cheio ? (
              <CheckIcon className="h-4 w-4" aria-hidden />
            ) : premio ? (
              <GiftIcon className="h-4 w-4" aria-hidden />
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

const PedidoDeNumero: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-lg bg-surface-2 p-3 text-caption text-fg-muted-token">{children}</p>
);

const CorpoDoCarimbo: React.FC<{ props: PreviewDeCarimbo }> = ({ props }) => {
  const bruto = numero(props.itensParaGanhar);
  const total = Math.floor(bruto);
  if (!Number.isFinite(bruto) || total < 1) {
    return <PedidoDeNumero>Diga quantos itens valem 1 grátis para ver o cartão.</PedidoDeNumero>;
  }
  const cheios = carimbosDeExemplo(total);
  const falta = total - cheios;
  const categorias = props.categorias ?? [];

  return (
    <div className="space-y-4">
      <p className="text-lead font-semibold text-fg-token">
        {`Junte ${total}, ganhe 1 grátis`}
      </p>
      <Carimbos total={total} cheios={cheios} />
      <div className="space-y-1">
        <p className="text-body font-medium text-brand-ink">
          {falta === 1 ? 'Falta 1 para o seu grátis' : `Faltam ${falta} para o seu grátis`}
        </p>
        <p className="text-caption text-fg-muted-token">
          {categorias.length
            ? `Vale para ${listaDeCategorias(categorias)}.`
            : 'Vale para todo o cardápio.'}
        </p>
      </div>
    </div>
  );
};

const CorpoDoCashback: React.FC<{ props: PreviewDeCashback }> = ({ props }) => {
  const bruto = numero(props.percentual);
  if (!Number.isFinite(bruto) || bruto <= 0) {
    return <PedidoDeNumero>Diga quanto volta em cada pedido para ver o saldo.</PedidoDeNumero>;
  }
  const pct = Math.min(100, bruto);
  const saldo = (TICKET_EXEMPLO * pct * PEDIDOS_EXEMPLO) / 100;
  const dias = Math.floor(numero(props.validadeDias));

  return (
    <div className="space-y-4">
      <p className="text-lead font-semibold text-fg-token">
        {`${formatarPercentual(pct)}% de volta em cada pedido`}
      </p>
      <div className="rounded-lg bg-brand-soft p-4">
        <p className="text-caption text-fg-muted-token">Seu saldo</p>
        <p className="text-2xl font-bold tabular-nums text-brand-ink">{formatCurrency(saldo)}</p>
        <p className="mt-1 text-caption text-fg-muted-token">
          {`Depois de ${PEDIDOS_EXEMPLO} pedidos de ${formatCurrency(TICKET_EXEMPLO)}`}
        </p>
      </div>
      <p className="text-caption text-fg-muted-token">
        O desconto entra sozinho no próximo carrinho.
        {Number.isFinite(dias) && dias >= 1 && ` O saldo vale por ${dias} dias.`}
      </p>
    </div>
  );
};

export const CartaoDeFidelidadePreview: React.FC<CartaoDeFidelidadePreviewProps> = (props) => {
  const { nomeDaLoja, ligado = true, className } = props;
  const carimbo = props.tipo === 'carimbo';

  return (
    <figure aria-label="Como o cliente vê no cardápio" className={cn('min-w-0', className)}>
      <figcaption className="mb-2 text-caption text-fg-muted-token">
        Assim o cliente vê no cardápio
      </figcaption>
      {/* O fundo é a "tela" do cardápio; o cartão pousa sobre ela. */}
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className={cn('superficie p-5 transition-opacity', !ligado && 'opacity-60')}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-display text-lg text-fg-token">
              {nomeDaLoja || 'Sua loja'}
            </p>
            <span className="shrink-0 rounded-pill bg-brand-soft px-2.5 py-0.5 text-caption font-medium text-brand-ink">
              {carimbo ? 'Cartão fidelidade' : 'Cashback'}
            </span>
          </div>
          {props.tipo === 'carimbo' ? (
            <CorpoDoCarimbo props={props} />
          ) : (
            <CorpoDoCashback props={props} />
          )}
        </div>
      </div>
      {!ligado && (
        <p className="mt-2 text-caption text-fg-muted-token">
          {carimbo
            ? 'Desligado: o cliente não vê este cartão. Ligue e salve para ele aparecer.'
            : 'Desligado: o cliente não vê este saldo. Ligue e salve para ele aparecer.'}
        </p>
      )}
    </figure>
  );
};

CartaoDeFidelidadePreview.displayName = 'CartaoDeFidelidadePreview';

export default CartaoDeFidelidadePreview;
