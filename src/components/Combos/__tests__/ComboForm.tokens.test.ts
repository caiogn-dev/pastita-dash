import * as fs from 'fs';
import * as path from 'path';

/**
 * Guarda de tokens do editor de combos.
 *
 * O tailwind.config.js só define os shades brand DEFAULT/hover/strong/soft/400/500/600.
 * Classes como bg-brand-50 / border-brand-300 / dark:bg-brand-900 NÃO resolvem para
 * cor nenhuma — o estado "selecionado" renderiza sem destaque (bug visual silencioso).
 * Idem para var(--dark-*): essas variáveis não existem em tokens.css, então o valor
 * usado é sempre o fallback hardcoded, ignorando o tema.
 */
const COMBOS_DIR = path.join(__dirname, '..');

const INVALID_BRAND_SHADE = /\bbrand-(?:50|100|200|300|700|800|900)\b/;
const DEAD_DARK_VAR = /var\(--dark-/;

function comboSources(): Array<{ file: string; content: string }> {
  return fs
    .readdirSync(COMBOS_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => ({
      file: f,
      content: fs.readFileSync(path.join(COMBOS_DIR, f), 'utf8'),
    }));
}

describe('Combos — classes de cor devem resolver para tokens reais', () => {
  it('não usa shades brand-* inexistentes no tailwind.config', () => {
    const offenders = comboSources()
      .filter(({ content }) => INVALID_BRAND_SHADE.test(content))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('não referencia variáveis var(--dark-*) inexistentes', () => {
    const offenders = comboSources()
      .filter(({ content }) => DEAD_DARK_VAR.test(content))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
