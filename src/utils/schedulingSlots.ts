// Slots fixos de agendamento, alinhados ao storefront (cardapidex-web/ce-saladas).
// Mantidos no código (não configuráveis por loja nesta fase).
export const TIME_SLOTS: string[] = [
  '10:00-12:00',
  '12:00-14:00',
  '14:00-16:00',
  '16:00-18:00',
  '18:00-20:00',
];

export function isValidSlot(slot: string): boolean {
  return TIME_SLOTS.includes(slot);
}
