/**
 * Helpers de tempo para o inbox de conversas (lista + separadores de data).
 * Regras estilo WhatsApp: hoje = HH:mm, ontem = "Ontem", <7 dias = dia da
 * semana, mais antigo = dd/mm/aa.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function isSameDay(a?: string | null, b?: string | null): boolean {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return false;
  return startOfDay(da) === startOfDay(db);
}

/** Rótulo curto para a lista de conversas. */
export function formatConversationTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '';

  const now = new Date();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);

  if (daysAgo === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (daysAgo === 1) return 'Ontem';
  if (daysAgo < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Rótulo do separador de dia dentro do chat. */
export function formatDayLabel(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '';

  const now = new Date();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);

  if (daysAgo === 0) return 'Hoje';
  if (daysAgo === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
