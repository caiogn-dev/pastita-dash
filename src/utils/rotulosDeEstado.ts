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
  refunded: 'Estornado',
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

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  cash: 'Dinheiro',
  card: 'Cartão',
  nao_informado: 'Não informado',
};

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
  refunded: 'Estornada',
  partially_refunded: 'Estornada em parte',
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
