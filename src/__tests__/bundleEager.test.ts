import * as fs from 'fs';
import * as path from 'path';

/**
 * O caminho crítico do login não pode voltar a carregar o app inteiro.
 *
 * Regressão (PD-PERF-001): App.tsx e main.tsx importavam `setAuthToken` do
 * BARREL './services', que re-exporta ./automation. Basta UMA aresta estática do
 * entry até qualquer módulo de um manualChunk nomeado para o Rollup transformar
 * o chunk INTEIRO em dependência estática do entry — e o Vite então emite
 * modulepreload. Resultado: a tela de login baixava recharts, as 10 páginas de
 * automação e o BI completo (216 KB gzip que nenhuma delas usa), anulando todo o
 * React.lazy() do App.tsx.
 *
 * Duas defesas, ambas fáceis de desfazer sem querer:
 *   1. nunca importar do barrel de services na raiz da aplicação;
 *   2. não declarar manualChunks de FEATURE (só de vendor) — chunks nomeados de
 *      páginas viram âncoras que arrastam a árvore junto.
 *
 * Este teste é estático de propósito: roda sem build, em milissegundos.
 */
const SRC = path.join(__dirname, '..');
const RAIZ = path.join(SRC, '..');

const semComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('caminho crítico do bundle', () => {
  it.each(['App.tsx', 'main.tsx'])(
    '%s não importa do barrel ./services (arrasta automação + recharts)',
    (arquivo) => {
      const codigo = semComentarios(fs.readFileSync(path.join(SRC, arquivo), 'utf8'));
      // Pega `from './services'` / `from '../services'` mas não `./services/api`.
      const barril = /from\s+['"](\.{1,2}\/)+services['"]/.test(codigo);
      expect(barril).toBe(false);
    },
  );

  it('vite.config não declara manualChunks de feature', () => {
    const cfg = semComentarios(fs.readFileSync(path.join(RAIZ, 'vite.config.ts'), 'utf8'));
    const chaves = [...cfg.matchAll(/'([\w-]+)':\s*\[/g)].map((m) => m[1]);
    expect(chaves.length).toBeGreaterThan(0); // sanidade do parse
    const deFeature = chaves.filter((k) => !k.startsWith('vendor-'));
    expect(deFeature).toEqual([]);
  });

  it('clsx/tailwind-merge têm chunk próprio, fora do vendor-charts', () => {
    // São usados pelo shell (eager) E pelo recharts. Sem chunk próprio o Rollup
    // os aloja dentro de vendor-charts e o entry importa os 375 KB de recharts
    // só para alcançar a função de juntar classes CSS.
    const cfg = fs.readFileSync(path.join(RAIZ, 'vite.config.ts'), 'utf8');
    expect(cfg).toMatch(/'vendor-cn':\s*\[[^\]]*'clsx'/);
    expect(cfg).toMatch(/'vendor-cn':\s*\[[^\]]*'tailwind-merge'/);
  });
});
