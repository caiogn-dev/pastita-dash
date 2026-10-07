import * as fs from 'fs';
import * as path from 'path';

/**
 * O cromo do painel pinta com token, não com paleta crua.
 *
 * O caso que doía: o botão "Ver planos" do aviso de trial era `bg-brand
 * text-white`. O ouro da marca com texto branco dá ~2,3:1 no claro e ~1,8:1
 * no escuro — ilegível nos dois temas. `--on-brand` existe exatamente para a
 * tinta sobre a marca. O resto (ponto de conexão em emerald/amber, gradiente
 * com o ouro em rgba, toast em zinc) não trocava com o tema nem com a loja.
 */
const raiz = path.resolve(__dirname, '..');
const ler = (rel: string) => fs.readFileSync(path.resolve(raiz, rel), 'utf8');

const ARQUIVOS = [
  'Sidebar.tsx',
  'Navbar.tsx',
  'MainLayout.tsx',
  'CommandPalette.tsx',
  'StoreSelector.tsx',
  'AccountMenu.tsx',
  'TrialBanner.tsx',
  '../../main.tsx',
];

// Classe de paleta do Tailwind (bg-red-500, text-zinc-800…) ou cor literal.
// Preto/branco translúcido de véu (`bg-black/60`) fica de fora: é escurecer,
// não cor.
const CRUA = /\b(?:bg|text|border|ring|from|to|via)-(?:red|green|emerald|amber|yellow|zinc|gray|slate|neutral|stone|blue|orange|rose|lime|teal|sky|indigo|violet|purple|pink|fuchsia|cyan)-\d{2,3}\b|rgba?\(\s*\d/;

const semComentario = (fonte: string) =>
  fonte
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

describe('cromo sem cor crua', () => {
  it.each(ARQUIVOS)('%s não usa paleta crua', (arquivo) => {
    expect(semComentario(ler(arquivo))).not.toMatch(CRUA);
  });

  it('o "Ver planos" do trial usa a tinta da marca, não branco sobre ouro', () => {
    const linha = ler('TrialBanner.tsx')
      .split('\n')
      .find((l) => /bg-brand px-3/.test(l));
    expect(linha).toMatch(/text-on-brand/);
    expect(linha).not.toMatch(/text-white/);
  });
});
