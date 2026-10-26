/**
 * Modelo de mensagem da Meta, dito em português (26/10).
 *
 * Três telas mostram os modelos aprovados — Modelos de mensagem, a campanha e
 * o painel do chat — e o chat mostrava o que a Meta devolve, cru:
 * "APPROVED · pt_BR · MARKETING". O dono não lê isso; lê "Aprovado ·
 * Português · Promoção".
 */
import type { BadgeTone } from '../components/ui/Badge';

export interface EstadoDoModelo {
  rotulo: string;
  tone: BadgeTone;
}

const SITUACAO: Record<string, EstadoDoModelo> = {
  approved: { rotulo: 'Aprovado', tone: 'success' },
  pending: { rotulo: 'Em análise', tone: 'warning' },
  in_appeal: { rotulo: 'Em análise', tone: 'warning' },
  rejected: { rotulo: 'Recusado', tone: 'danger' },
  paused: { rotulo: 'Pausado', tone: 'warning' },
  disabled: { rotulo: 'Desativado', tone: 'neutral' },
};

export function estadoDoModelo(status?: string | null): EstadoDoModelo {
  return SITUACAO[String(status || '').toLowerCase()] ?? { rotulo: 'Em análise', tone: 'warning' };
}

const IDIOMA: Record<string, string> = { pt: 'Português', en: 'Inglês', es: 'Espanhol' };

export function idiomaDoModelo(idioma?: string | null): string {
  const base = String(idioma || 'pt').toLowerCase().split(/[_-]/)[0];
  return IDIOMA[base] ?? idioma ?? 'Português';
}

const CATEGORIA: Record<string, string> = {
  marketing: 'Promoção',
  utility: 'Aviso',
  authentication: 'Código de acesso',
};

export function categoriaDoModelo(categoria?: string | null): string {
  return CATEGORIA[String(categoria || '').toLowerCase()] ?? 'Outro';
}

export function resumoDoModelo(m: { status?: string | null; language?: string | null; category?: string | null }): string {
  return [estadoDoModelo(m.status).rotulo, idiomaDoModelo(m.language), categoriaDoModelo(m.category)].join(' · ');
}

/** O corpo (BODY) do modelo — o texto que o cliente lê. */
export function textoDoModelo(componentes?: unknown[] | null): string {
  const corpo = (componentes as Array<Record<string, unknown>> | undefined)?.find(
    (c) => String(c?.type || '').toUpperCase() === 'BODY',
  );
  return typeof corpo?.text === 'string' ? corpo.text : '';
}
