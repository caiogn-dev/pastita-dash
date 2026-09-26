import * as fs from 'fs';
import * as path from 'path';

/**
 * Toda página carregada com React.lazy() no App.tsx precisa de um Suspense
 * acima dela — no painel, o PageBoundary.
 *
 * Sem isso, clicar no menu (atualização SÍNCRONA) para uma página que ainda
 * não baixou faz o React 18 estourar o erro #426 ("A component suspended while
 * responding to synchronous input") e a tela inteira cai no ErrorBoundary com
 * "Detalhes técnicos". Parece aleatório porque só acontece na primeira visita
 * de cada sessão àquela página (depois o chunk está em cache).
 *
 * Regressão: /colaboradores e /cardapio/importar entraram sem PageBoundary.
 */
const APP = path.join(__dirname, '..', 'App.tsx');

const semComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('rotas com página lazy', () => {
  const codigo = semComentarios(fs.readFileSync(APP, 'utf8'));
  const lazies = [...codigo.matchAll(/const\s+(\w+)\s*=\s*lazy\(/g)].map((m) => m[1]);

  it('App.tsx tem páginas lazy (sanidade do parse)', () => {
    expect(lazies.length).toBeGreaterThan(20);
  });

  it('cada elemento de rota com página lazy está dentro de PageBoundary ou Suspense', () => {
    // Pega o JSX do `element={...}` de cada <Route>, mesmo quando quebra linha.
    const elementos = [...codigo.matchAll(/element=\{([\s\S]*?)\}\s*(?:\/>|>)/g)].map((m) => m[1]);
    expect(elementos.length).toBeGreaterThan(20);

    const nus = elementos.filter((el) => {
      const usaLazy = lazies.some((nome) => new RegExp(`<${nome}\\b`).test(el));
      const protegido = /<PageBoundary\b|<Suspense\b/.test(el);
      return usaLazy && !protegido;
    });
    expect(nus).toEqual([]);
  });
});
