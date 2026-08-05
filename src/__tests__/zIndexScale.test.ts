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

/**
 * O <main> do MainLayout não pode ter z-index.
 *
 * `main` é flex item (pai `flex flex-col`), e pela spec do Flexbox um z-index
 * em flex item cria stacking context mesmo com position static. Com `z-10`, a
 * navbar irmã (sticky z-40, opaca, com backdrop-blur) pintava acima de TODA a
 * subárvore da página: nenhum drawer adiantava declarar z-50 ou z-[60]. Os 64px
 * do topo — título e botão X — ficavam invisíveis e não clicáveis em 11
 * superfícies (CustomersPage, AddCategoryModal, NewConversationModal, campanhas,
 * automação, EditOrderDrawer...).
 *
 * A escala acima só significa alguma coisa se todos os overlays estiverem no
 * mesmo contexto de empilhamento que a navbar.
 */
describe('MainLayout — main sem stacking context próprio', () => {
  it('o <main> não declara z-index', () => {
    const arquivo = path.join(SRC, 'components/layout/MainLayout.tsx');
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const tagsMain = conteudo.match(/<main[^>]*>/g) ?? [];
    expect(tagsMain.length).toBeGreaterThan(0);
    const comZ = tagsMain.filter((tag) => /\bz-\[?-?\d/.test(tag));
    expect(comZ).toEqual([]);
  });
});
