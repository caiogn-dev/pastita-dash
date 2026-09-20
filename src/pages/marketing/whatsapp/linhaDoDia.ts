/**
 * A campanha grátis espalhada pelo dia — as contas puras da tela.
 *
 * O WhatsApp só deixa a loja mandar texto livre de graça dentro de 24 h da
 * última mensagem do cliente. Por isso o envio não é um bloco às 20h: quem
 * fecharia a janela antes recebe antes. Este módulo é usado no agendamento
 * (prévia) e no acompanhamento (campanha rodando) — a mesma linha, dois
 * momentos.
 */

/** A faixa em que a loja pode falar: promoção às 23h não é lembrete, é incômodo. */
export const INICIO = 8;
export const FIM = 21;

export interface FaixaDaApi {
  hora: number;
  /** Quantas pessoas caem nesta faixa (prévia). */
  quantidade?: number;
  /** Quantas já receberam (campanha rodando). */
  enviadas?: number;
  /** Quantas ainda esperam (campanha rodando). */
  aguardando?: number;
}

export interface HoraDaLinha {
  hora: number;
  quantidade: number;
  enviadas: number;
  passou: boolean;
  eAgora: boolean;
  eDaCampanha: boolean;
}

export interface LinhaDoDia {
  horas: HoraDaLinha[];
  totalAntecipado: number;
  totalNoHorario: number;
  totalEnviado: number;
  horaDaCampanha: number | null;
}

interface Entrada {
  faixas: FaixaDaApi[];
  /** Horário escolhido para a campanha (valor do campo datetime-local ou ISO). */
  horarioDaCampanha?: string | null;
  agora?: string | Date;
}

/** Hora local de um valor de campo `datetime-local` ou ISO; null se incompleto.
 *
 * "2026-09-" é alguém digitando, não um horário: o `Date` do navegador aceita
 * pedaços e devolveria meia-noite, o que viraria erro vermelho no meio da
 * digitação.
 */
const COMPLETO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function horaDe(valor?: string | Date | null): number | null {
  if (!valor) return null;
  if (typeof valor === 'string' && !COMPLETO.test(valor)) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.getHours();
}

export function montarLinhaDoDia({ faixas, horarioDaCampanha, agora }: Entrada): LinhaDoDia {
  const porHora = new Map(faixas.map((f) => [f.hora, f]));
  const horaDaCampanha = horaDe(horarioDaCampanha);
  const horaAgora = horaDe(agora ?? new Date());

  const horas: HoraDaLinha[] = [];
  for (let hora = INICIO; hora <= FIM; hora += 1) {
    const faixa = porHora.get(hora);
    const quantidade = faixa?.quantidade ?? ((faixa?.enviadas ?? 0) + (faixa?.aguardando ?? 0));
    horas.push({
      hora,
      quantidade,
      enviadas: faixa?.enviadas ?? 0,
      // A faixa da hora corrente já disparou (11:30 → as 11h saíram).
      passou: horaAgora !== null && hora <= horaAgora,
      eAgora: horaAgora === hora,
      eDaCampanha: horaDaCampanha === hora,
    });
  }

  const totalNoHorario = horaDaCampanha === null
    ? 0
    : horas.find((h) => h.hora === horaDaCampanha)?.quantidade ?? 0;
  const totalAntecipado = horas
    .filter((h) => horaDaCampanha !== null && h.hora < horaDaCampanha)
    .reduce((soma, h) => soma + h.quantidade, 0);

  return {
    horas,
    totalAntecipado,
    totalNoHorario,
    totalEnviado: horas.reduce((soma, h) => soma + h.enviadas, 0),
    horaDaCampanha,
  };
}

/**
 * O horário escolhido cabe na faixa em que a loja pode falar?
 *
 * Campo pela metade devolve `ok`: quem está digitando não merece erro vermelho
 * antes de terminar.
 */
export function horarioPermitido(valor: string): { ok: boolean; motivo: string } {
  const hora = horaDe(valor);
  if (hora === null) return { ok: true, motivo: '' };
  if (hora < INICIO || hora > FIM) {
    return { ok: false, motivo: `Escolha um horário entre 8h e 21h — é quando o cliente aceita receber.` };
  }
  return { ok: true, motivo: '' };
}

/** Uma frase com os DOIS números: quem recebe no horário e quem é antecipado. */
export function resumoDaAgenda(linha: LinhaDoDia): string {
  const { totalNoHorario, totalAntecipado, horaDaCampanha } = linha;
  if (!totalNoHorario && !totalAntecipado) return 'Ninguém recebe nesse horário';
  const partes: string[] = [];
  if (totalNoHorario) partes.push(`${totalNoHorario} recebem às ${horaDaCampanha}h`);
  if (totalAntecipado) partes.push(`${totalAntecipado} antes, para não perder a janela`);
  return partes.join(' · ');
}
