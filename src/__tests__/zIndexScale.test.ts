import * as fs from 'fs';
import * as path from 'path';

/**
 * Escala única de z-index do painel:
 *   navbar 40 < modal/drawer (overlay z-50 / painel z-[60]) < toasts (9999).
 *
 * z-[9998]/z-[9999] em drawers/modais cobre o Toaster do react-hot-toast
 * (que renderiza com z-index 9999 inline) — toast.error fica invisível
 * durante a edição. Só a camada de toast pode viver em 9xxx.
 */
const SRC = path.join(__dirname, '..');
const HIGH_Z = /z-\[9\d{3}\]/;

/** Única camada autorizada a usar z-index 9xxx (é a própria camada de toast). */
const ALLOWLIST = new Set(['components/ui/toast.tsx']);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

describe('escala de z-index — drawers/modais nunca acima dos toasts', () => {
  it('nenhum arquivo (fora da camada de toast) usa z-[9xxx]', () => {
    const offenders = walk(SRC)
      .filter((f) => HIGH_Z.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f))
      .filter((rel) => !ALLOWLIST.has(rel));
    expect(offenders).toEqual([]);
  });
});
