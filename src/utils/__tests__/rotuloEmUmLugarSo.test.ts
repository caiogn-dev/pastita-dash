/**
 * Um dicionário de rótulo mora em UM arquivo (26/10).
 *
 * `formatters.ts` exportava outro `PAYMENT_STATUS_LABELS` — "Aprovado",
 * "Rejeitado", sem "Pago" — com o mesmo nome do de `rotulosDeEstado.ts`.
 * Ninguém o usava; o risco era o autocompletar escolher o errado e o pedido
 * pago aparecer como "paid" na tela.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

it.each(['PAYMENT_STATUS_LABELS', 'PAYMENT_METHOD_LABELS', 'STATUS_LABELS'])(
  '%s é definido em um arquivo só',
  (nome) => {
    const definicao = new RegExp(`export const ${nome}\\b`);
    const onde = arquivos(SRC).filter((f) => definicao.test(readFileSync(f, 'utf8')));
    expect(onde.map((f) => f.replace(SRC, ''))).toEqual(['/utils/rotulosDeEstado.ts']);
  },
);
