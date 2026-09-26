/**
 * Regras puras da Fila humana: ordem do balcão (maior espera primeiro), quem
 * já passou do ponto de "resposta rápida" para "cliente abandonado", e os
 * números do topo.
 */
import type { FilaHumana, ItemDaFilaHumana } from '../../services/conversations';
import { segundosDeEspera } from './tempoDeEspera';

const UM_DIA = 24 * 60 * 60;

export interface ItemNoBalcao extends ItemDaFilaHumana {
  /** Espera AGORA, em segundos (o relógio anda entre as buscas). */
  segundos: number;
}

export interface Balcao {
  agora: ItemNoBalcao[];
  semResposta: ItemNoBalcao[];
  emAtendimento: ItemNoBalcao[];
  resumo: { esperando: number; emAtendimento: number; maisAntigaSegundos: number };
}

const comEspera = (itens: ItemDaFilaHumana[], buscadoEm: number, agora: number): ItemNoBalcao[] =>
  itens
    .map((i) => ({ ...i, segundos: segundosDeEspera(i, buscadoEm, agora) }))
    .sort((a, b) => b.segundos - a.segundos);

/** A fila como o balcão lê: ordenada por espera, separada por urgência. */
export function montarBalcao(fila: FilaHumana, buscadoEm: number, agora: number): Balcao {
  const esperando = comEspera(fila.esperando, buscadoEm, agora);
  const emAtendimento = comEspera(fila.em_atendimento, buscadoEm, agora);
  return {
    agora: esperando.filter((i) => i.segundos < UM_DIA),
    semResposta: esperando.filter((i) => i.segundos >= UM_DIA),
    emAtendimento,
    resumo: {
      esperando: fila.resumo?.esperando ?? fila.total_esperando ?? esperando.length,
      emAtendimento: fila.resumo?.em_atendimento ?? fila.total_em_atendimento ?? emAtendimento.length,
      // Do relógio local, não do resumo: o número do topo anda junto com a lista.
      maisAntigaSegundos: esperando[0]?.segundos ?? 0,
    },
  };
}
