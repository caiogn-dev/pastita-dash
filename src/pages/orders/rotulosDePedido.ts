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
