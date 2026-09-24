/**
 * A situação da impressão, em palavras do lojista.
 *
 * O dono só descobria que a cozinha não imprimia quando o cliente ligava
 * perguntando do pedido. O backend (vigia de impressão) calcula por agente
 * `situacao`, `situacao_desde` e `situacao_detalhe`; aqui isso vira a frase
 * da faixa e a cor:
 *
 *  - `impressora_indisponivel` → vermelho: o computador está ligado mas a
 *    impressora não imprime — comanda presa, pedido sem ninguém ver.
 *  - `offline` → amarelo: o computador sumiu (desligado, sem internet).
 *  - `ok` ou campo ausente (backend antigo) → nada.
 */
import type { SituacaoDoAgente } from '../../services/printing';
import { FUSO_DE_NEGOCIO, horaNoFuso, mesmoDiaNoFuso } from '../../utils/fusoDeNegocio';

export interface AgenteComSituacao {
  id: string;
  name: string;
  station: string;
  is_active?: boolean;
  situacao?: SituacaoDoAgente | string;
  situacao_desde?: string | null;
  situacao_detalhe?: string;
}

export interface AlertaDeImpressora {
  agenteId: string;
  tom: 'perigo' | 'aviso';
  texto: string;
}

const LUGAR: Record<string, string> = {
  kitchen: 'da cozinha',
  balcao: 'do balcão',
};

/** Rótulo curto para a tela de Impressão. */
export const ROTULO_DA_SITUACAO: Record<SituacaoDoAgente, string> = {
  ok: 'Imprimindo',
  offline: 'Computador sem sinal',
  impressora_indisponivel: 'Impressora não responde',
};

export const TOM_DA_SITUACAO: Record<SituacaoDoAgente, 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  offline: 'warning',
  impressora_indisponivel: 'danger',
};

/** "19:00" no mesmo dia; "22/09 19:00" quando parou antes de hoje. */
export function desdeQuando(iso: string | null | undefined, agora = new Date()): string | null {
  if (!iso) return null;
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return null;
  const hora = horaNoFuso(quando);
  if (mesmoDiaNoFuso(quando, agora)) return hora;
  const dia = quando.toLocaleDateString('pt-BR', { timeZone: FUSO_DE_NEGOCIO, day: '2-digit', month: '2-digit' });
  return `${dia} ${hora}`;
}

export function alertasDeImpressora(agentes: AgenteComSituacao[], agora = new Date()): AlertaDeImpressora[] {
  return agentes
    .filter((a) => a.is_active !== false)
    .filter((a) => a.situacao === 'offline' || a.situacao === 'impressora_indisponivel')
    .map((a) => {
      const lugar = LUGAR[a.station] ?? `(${a.name})`;
      const desde = desdeQuando(a.situacao_desde, agora);
      const detalhe = (a.situacao_detalhe || '').trim();
      const texto = [
        `Impressora ${lugar} parada${desde ? ` desde ${desde}` : ''}`,
        detalhe,
      ]
        .filter(Boolean)
        .join(' — ');
      return {
        agenteId: a.id,
        tom: a.situacao === 'impressora_indisponivel' ? ('perigo' as const) : ('aviso' as const),
        texto,
      };
    })
    // Vermelho primeiro: é o que está engolindo comanda agora.
    .sort((x, y) => (x.tom === y.tom ? 0 : x.tom === 'perigo' ? -1 : 1));
}
