/**
 * Status do pedido com UMA fonte (14/10). Havia sete mapas: kit (estados.ts),
 * Badge, formatters, statusColors, detalhe do pedido, relatório e celular —
 * e eles discordavam: "Em entrega" × "Saiu para entrega", "Pendente" ×
 * "Recebido", cancelado vermelho numa tela e neutro na outra.
 *
 * Texto: `utils/rotulosDeEstado.ts` (catraca de completude contra o backend).
 * Cor: `components/ui/estados.ts`. Ninguém mais escreve mapa de status.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from '@jest/globals';

import { estadoDePedido } from '../estados';
import { STATUS_LABELS } from '../../../utils/rotulosDeEstado';
import { formatOrderStatus, ORDER_STATUS_LABELS } from '../../../utils/formatters';
import { STATUS_LABEL as ROTULO_DO_CELULAR } from '../../../mobile/mobileStatus';

const SRC = join(__dirname, '..', '..', '..');
const DONOS = ['utils/rotulosDeEstado.ts', 'components/ui/estados.ts'];
// Tipos de EVENTO de automação ("order_out_for_delivery"), não status.
const OUTRO_ASSUNTO = ['services/automation.ts'];

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue;
      arquivos(caminho, acc);
    } else if (/\.tsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

describe('status do pedido: uma fonte só', () => {
  it('nenhum outro arquivo escreve mapa de status do pedido', () => {
    const intrusos = arquivos(SRC)
      .map((a) => a.split('/src/')[1])
      .filter((rel) => !DONOS.includes(rel) && !OUTRO_ASSUNTO.includes(rel))
      .filter((rel) => /\bout_for_delivery\s*:\s*['"{]/.test(readFileSync(join(SRC, rel), 'utf8')));
    expect(intrusos).toEqual([]);
  });

  it('o selo, o formatador e o celular dizem o MESMO texto', () => {
    for (const [status, rotulo] of Object.entries(STATUS_LABELS)) {
      expect(estadoDePedido(status).rotulo).toBe(rotulo);
      expect(formatOrderStatus(status)).toBe(rotulo);
      expect(ORDER_STATUS_LABELS[status]).toBe(rotulo);
      if (ROTULO_DO_CELULAR[status]) expect(ROTULO_DO_CELULAR[status]).toBe(rotulo);
    }
  });

  it('status que só o kit conhecia também tem texto na fonte', () => {
    for (const status of ['awaiting_payment', 'payment_pending', 'payment_confirmed']) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
