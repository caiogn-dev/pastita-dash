/**
 * Os estados do pedido em português — um lugar só.
 *
 * Estavam duplicados em quatro telas (kanban, modal, histórico, KDS), cada uma
 * com um subconjunto diferente. O modal mostrava "Dinheiro cancelled" porque
 * o mapa dele tinha 5 dos 7 estados de pagamento, e o fallback
 * `|| order.status` escondia a falta: nada quebrava, só aparecia em inglês na
 * tela que o dono mostra para o cliente ao telefone.
 *
 * `rotulosCompletos.test.ts` é a catraca: status novo no backend sem rótulo
 * aqui vira teste vermelho em vez de palavra em inglês em produção.
 */
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Processando',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  shipped: 'Enviado',
  out_for_delivery: 'Em entrega',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'Falhou',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado',
  partially_refunded: 'Reembolsado em parte',
  cancelled: 'Cancelado',
};

/**
 * COMO o cliente pagou — UM nome por forma, o mesmo do backend
 * (server2 `apps/stores/formas_de_pagamento.py` → `ROTULOS`).
 *
 * Cada tela tinha o seu dicionário: o mesmo débito era "Débito", "DEBITO",
 * "Débito (maquininha)" ou "Cartão de débito" conforme a tela, e o vale saía
 * cru ("voucher") no detalhe, no histórico e nos relatórios. Agora toda tela
 * passa por `rotuloDePagamento`; `rotulosDeEstado.test.ts` é a catraca.
 *
 * `card_on_delivery` (01/10) separa a maquininha do dinheiro: antes os dois
 * eram `cash`, e o caixa esperava na gaveta o dinheiro que tinha ido para a
 * maquininha.
 *
 * Fora do vocabulário do backend ficam só os códigos que o painel ainda lê em
 * dado antigo (`boleto`, `wallet`) e o balde `nao_informado` dos relatórios.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  card: 'Cartão',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  cash: 'Dinheiro',
  card_on_delivery: 'Cartão na maquininha',
  voucher: 'Vale-refeição',
  voucher_link: 'Vale-refeição (link)',
  link: 'Link de pagamento',
  bank_transfer: 'Transferência',
  other: 'Outro',
  boleto: 'Boleto',
  wallet: 'Carteira digital',
  nao_informado: 'Não informado',
};

/**
 * Nome da forma de pagamento para a tela. Vazio vira "Não informado"; código
 * desconhecido aparece como veio (igual ao backend) — melhor o slug do que
 * esconder a informação.
 */
export function rotuloDePagamento(metodo?: string | null): string {
  const valor = (metodo ?? '').trim();
  if (!valor) return 'Não informado';
  return PAYMENT_METHOD_LABELS[valor] ?? valor;
}

/**
 * Pagas em mãos na entrega/retirada: o pedido nasce pendente e liquida ao
 * entregar — não é cobrança online parada. Espelha `PAGOS_NA_ENTREGA` do
 * backend. `dinheiro` é o apelido que o checkout normaliza para `cash`.
 */
export const PAGOS_NA_ENTREGA: ReadonlySet<string> = new Set(['cash', 'card_on_delivery', 'dinheiro']);

export function pagoNaEntrega(metodo?: string | null): boolean {
  return PAGOS_NA_ENTREGA.has((metodo ?? '').trim().toLowerCase());
}

/** O que o PDV de balcão oferece: o cliente está na loja, cartão é crédito ou débito. */
export const FORMAS_DO_BALCAO = ['cash', 'pix', 'credit_card', 'debit_card'] as const;

/** Formas no filtro do histórico de pedidos — as que os pedidos de fato gravam. */
export const FORMAS_NO_FILTRO = [
  'pix', 'cash', 'card_on_delivery', 'credit_card', 'debit_card', 'card', 'voucher', 'voucher_link',
] as const;

/**
 * Status de uma COBRANÇA (StorePayment) — vocabulário próprio, não o do pedido.
 *
 * O pedido fica `paid`; a cobrança fica `completed`. Como o modal reusava o
 * mapa do pedido, a lista de cobranças exibia "completed" cru. Dois domínios,
 * dois mapas.
 */
export const PAYMENT_RECORD_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  completed: 'Recebido',
  failed: 'Falhou',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  partially_refunded: 'Reembolsada em parte',
};

/** Fila de impressão. O dono acompanha isto quando a comanda não sai. */
export const PRINT_JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Na fila',
  claimed: 'Enviado à impressora',
  completed: 'Impresso',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

/** Conta de WhatsApp conectada. */
export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  suspended: 'Suspensa',
  pending: 'Aguardando verificação',
};

/**
 * Destinatário de campanha de e-mail.
 *
 * "Bounce" fica em inglês de propósito: é o termo que o mercado usa e que
 * aparece em qualquer painel de e-mail, então traduzir atrapalharia quem já
 * sabe o que é. "Devolvido" está junto para quem não sabe.
 */
export const EMAIL_RECIPIENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  delivered: 'Entregue',
  opened: 'Aberto',
  clicked: 'Clicou',
  bounced: 'Devolvido (bounce)',
  unsubscribed: 'Descadastrou',
  failed: 'Falhou',
};
