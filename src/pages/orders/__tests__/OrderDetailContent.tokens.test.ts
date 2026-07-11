import * as fs from 'fs';
import * as path from 'path';

/**
 * Guarda de identidade do detalhe de pedido (modal + página).
 *
 * O tema do painel é o Dark Luxe (carvão + ouro, tokens em tokens.css /
 * tailwind.config). O detalhe de pedido foi escrito numa linguagem paralela:
 * hex soltos (#c97a36 laranja, #171717, #f5f1e8...), paleta genérica do
 * Tailwind (bg-blue-500, bg-orange-500, text-purple-700...) e var(--dark-*)
 * inexistente. Nada disso segue o tema — este guard impede a volta.
 *
 * Regras para OrderDetailContent.tsx e OrderDetailModal.tsx:
 *  - zero cor hex arbitrária em className (`[#...`)
 *  - zero classe de cor da paleta genérica do Tailwind — estados usam os
 *    tokens semânticos (success/warning/danger/info) e marca usa brand-*
 *  - zero var(--dark-*)
 */
const FILES = [
  path.join(__dirname, '..', 'OrderDetailContent.tsx'),
  path.join(__dirname, '..', '..', '..', 'components', 'orders', 'OrderDetailModal.tsx'),
];

const ARBITRARY_HEX = /\[#[0-9a-fA-F]{3,8}\]/;
const GENERIC_PALETTE =
  /\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const DEAD_DARK_VAR = /var\(--dark-/;

function sources(): Array<{ file: string; content: string }> {
  return FILES.map((f) => ({
    file: path.basename(f),
    content: fs.readFileSync(f, 'utf8'),
  }));
}

describe('Detalhe de pedido — identidade Dark Luxe via tokens', () => {
  it('não usa cores hex arbitrárias em classes', () => {
    const offenders = sources()
      .filter(({ content }) => ARBITRARY_HEX.test(content))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('não usa a paleta genérica do Tailwind (estados = tokens semânticos)', () => {
    const offenders = sources()
      .filter(({ content }) => GENERIC_PALETTE.test(content))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('não referencia variáveis var(--dark-*) inexistentes', () => {
    const offenders = sources()
      .filter(({ content }) => DEAD_DARK_VAR.test(content))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
