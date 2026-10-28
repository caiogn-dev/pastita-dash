const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "14:00-15:00" → "14:00–15:00"; "14:30:00" → "14:30". */
function faixa(hora: string): string {
  if (hora.includes('-')) return hora.split('-').map((h) => h.trim().slice(0, 5)).join('–');
  return hora.slice(0, 5);
}

/**
 * Data + faixa do agendamento, igual no quadro, no detalhe e na comanda.
 * `curto`: "27/10 14:00–15:00". `longo`: "27 de outubro, 14:00–15:00".
 */
export function rotuloDoAgendamento(
  data: string | null | undefined,
  hora: string | null | undefined,
  formato: 'curto' | 'longo' = 'curto',
): string {
  let dia = '';
  if (data) {
    const [, m, d] = data.split('-');
    if (m && d) dia = formato === 'longo' ? `${Number(d)} de ${MESES[Number(m) - 1]}` : `${d}/${m}`;
    else dia = data;
  }
  const h = hora ? faixa(hora) : '';
  if (dia && h) return formato === 'longo' ? `${dia}, ${h}` : `${dia} ${h}`;
  return dia || h;
}
