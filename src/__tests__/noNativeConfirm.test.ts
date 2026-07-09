import * as fs from 'fs';
import * as path from 'path';

/**
 * Ações destrutivas devem usar useConfirm()/ConfirmModal (design system),
 * nunca o confirm() nativo do browser — sem tema, sem contexto, sem loading.
 */
const SRC = path.join(__dirname, '..');
const NATIVE_CONFIRM = /window\.confirm\(|!confirm\(/;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

describe('sem confirm() nativo em código de produção', () => {
  it('nenhum arquivo usa window.confirm / !confirm(', () => {
    const offenders = walk(SRC)
      .filter((f) => NATIVE_CONFIRM.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
