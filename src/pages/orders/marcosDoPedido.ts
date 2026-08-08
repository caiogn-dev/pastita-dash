/**
 * A linha do tempo real do pedido: o que aconteceu, quando, e quanto demorou.
 *
 * O modal mostrava progresso como bolinhas acesas — dá para ver ONDE o pedido
 * está, não QUANDO cada etapa aconteceu nem quanto tempo levou. É a diferença
 * entre "está entregue" e "ficou 40 minutos parado na cozinha", e a segunda é
 * a que responde a reclamação do cliente e mostra onde a operação trava.
 *
 * A API já gravava todos esses campos desde sempre. Ninguém mostrava.
 *
 * DUAS REGRAS:
 *
 * 1. Etapa que não aconteceu não aparece. Pedido de balcão pula "em entrega";
 *    desenhar a etapa vazia sugeriria que algo travou ali.
 *
 * 2. Duração nunca é negativa. Ajuste manual de pedido consegue gravar
 *    `ready_at` antes de `preparing_at`, e "-5 min" na tela lê como bug —
 *    derrubando junto a confiança nos números que estão certos.
 */
export interface MarcoDoPedido {
  chave: string;
  rotulo: string;
  quando: Date;
  /** `null` na primeira etapa: não existe "anterior". */
  minutosDesdeAnterior: number | null;
  /** Marca o desfecho ruim, para a tela poder destacá-lo. */
  ruim?: boolean;
}

/** Ordem canônica do fluxo. Um pedido percorre um subconjunto disto. */
const ETAPAS: { chave: string; campo: string; rotulo: string; ruim?: boolean }[] = [
  { chave: 'created', campo: 'created_at', rotulo: 'Pedido recebido' },
  { chave: 'paid', campo: 'paid_at', rotulo: 'Pagamento confirmado' },
  { chave: 'confirmed', campo: 'confirmed_at', rotulo: 'Confirmado pela loja' },
  { chave: 'preparing', campo: 'preparing_at', rotulo: 'Preparo iniciado' },
  { chave: 'ready', campo: 'ready_at', rotulo: 'Pronto' },
  { chave: 'out_for_delivery', campo: 'out_for_delivery_at', rotulo: 'Saiu para entrega' },
  { chave: 'picked_up', campo: 'picked_up_at', rotulo: 'Retirado pelo cliente' },
  { chave: 'delivered', campo: 'delivered_at', rotulo: 'Entregue' },
  { chave: 'cancelled', campo: 'cancelled_at', rotulo: 'Cancelado', ruim: true },
  { chave: 'refunded', campo: 'refunded_at', rotulo: 'Estornado', ruim: true },
];

type PedidoComMarcos = Record<string, string | null | undefined>;

export function marcosDoPedido(pedido: PedidoComMarcos): MarcoDoPedido[] {
  const brutos: MarcoDoPedido[] = [];

  for (const etapa of ETAPAS) {
    const valor = pedido?.[etapa.campo];
    if (!valor) continue;
    const quando = new Date(valor);
    // Data inválida vira "Invalid Date" e contamina toda a aritmética adiante.
    if (Number.isNaN(quando.getTime())) continue;
    brutos.push({
      chave: etapa.chave,
      rotulo: etapa.rotulo,
      quando,
      minutosDesdeAnterior: null,
      ruim: etapa.ruim,
    });
  }

  // Ordena pelo relógio, não pela ordem canônica: se o horário contradiz o
  // fluxo, quem manda é o horário — é o que de fato aconteceu.
  brutos.sort((a, b) => a.quando.getTime() - b.quando.getTime());

  return brutos.map((m, i) => {
    if (i === 0) return m;
    const delta = (m.quando.getTime() - brutos[i - 1].quando.getTime()) / 60_000;
    return {
      ...m,
      // `max(0)` porque a ordenação acima já garante delta >= 0, mas um
      // arredondamento negativo por milissegundo ainda apareceria como -0.
      minutosDesdeAnterior: Math.max(0, Math.round(delta)),
    };
  });
}

/** Duração em português. "127 min" ninguém converte de cabeça no meio do turno. */
export function duracaoLegivel(minutos: number): string {
  if (minutos <= 0) return 'na hora';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
