import * as fs from 'fs';
import * as path from 'path';

/**
 * O painel é usado por quem vende comida, não por quem escreve o software.
 * Algumas telas falavam do SISTEMA em vez de falar com o lojista: "Execução de
 * Handlers Recentes", "Detecção de Intenções", "Pipeline de pedidos",
 * "Nenhum log de handler encontrado".
 *
 * Quem lê isso precisa saber o que fazer com o negócio, não como o programa
 * está organizado por dentro. Este teste guarda o vocabulário: se uma palavra
 * de implementação voltar para um texto de tela, ele quebra.
 */

// Palavras que descrevem a máquina, não o negócio.
const JARGAO = [
  'handler',
  'Handler',
  'endpoint',
  'payload',
  'pipeline',
  'Pipeline',
  'intent',
  'Intenções',
  'middleware',
  'webhook interno',
];

const PASTA = path.join(__dirname, '..');

/**
 * Só as telas que o lojista alcança. Páginas de bancada — as que não têm rota
 * em App.tsx — falam com quem desenvolve, e ali o termo técnico é o certo.
 */
const rotas = fs.readFileSync(path.join(PASTA, '..', 'App.tsx'), 'utf8');
const ehAlcancavel = (arquivo: string) =>
  rotas.includes(path.basename(arquivo, '.tsx'));

const arquivosDeTela = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivosDeTela(p);
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [p] : [];
  });

/** Só o que aparece na tela: texto entre tags e valores de prop de texto. */
const textosVisiveis = (fonte: string): string[] => {
  const semComentarios = fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const entreTags = [...semComentarios.matchAll(/>([^<>{}\n]{4,160})</g)].map((m) => m[1]);
  const props = [...semComentarios.matchAll(
    /(?:titulo|descricao|title|description|label|placeholder)="([^"]{4,160})"/g,
  )].map((m) => m[1]);

  return [...entreTags, ...props].map((t) => t.trim()).filter(Boolean);
};

describe('vocabulário das telas', () => {
  const arquivos = arquivosDeTela(PASTA).filter(ehAlcancavel);

  it('encontra as telas para inspecionar', () => {
    expect(arquivos.length).toBeGreaterThan(20);
  });

  it('nenhum texto de tela fala em termo de implementação', () => {
    const achados: string[] = [];

    for (const arquivo of arquivos) {
      const fonte = fs.readFileSync(arquivo, 'utf8');
      for (const texto of textosVisiveis(fonte)) {
        for (const termo of JARGAO) {
          if (texto.includes(termo)) {
            achados.push(`${path.relative(PASTA, arquivo)} → "${texto}"`);
          }
        }
      }
    }

    expect(achados).toEqual([]);
  });
});
