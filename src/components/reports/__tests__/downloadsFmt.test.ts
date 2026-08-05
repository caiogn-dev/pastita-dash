import * as fs from 'fs';
import * as path from 'path';

/**
 * O parâmetro de formato dos downloads é `fmt`, nunca `format`.
 *
 * `format` é reservado pelo DRF para content negotiation (URL_FORMAT_OVERRIDE):
 * ao receber `?format=csv` ele procura um renderer chamado "csv", não encontra e
 * levanta Http404 — a view nem chega a rodar. O sintoma é cruel de diagnosticar,
 * porque 404 num endpoint que existe parece problema de rota ou de permissão.
 *
 * Custou uma rodada inteira de debug; este teste evita a segunda.
 */
const SRC = path.join(__dirname, '..', '..', '..');

const arquivos = [
  path.join(SRC, 'services', 'reports.ts'),
  path.join(SRC, 'components', 'reports', 'MenuDownloads.tsx'),
];

describe('downloads — parâmetro de formato', () => {
  it.each(arquivos)('%s não envia `format:` nos params', (arquivo) => {
    const codigo = fs
      .readFileSync(arquivo, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // `format: 'csv'` ou `format: formato` dentro de um objeto de params.
    expect(/\bformat\s*:/.test(codigo)).toBe(false);
  });

  it('reports.ts expõe os três downloads e o cardápio', () => {
    const codigo = fs.readFileSync(arquivos[0], 'utf8');
    expect(codigo).toContain('exportarPedidos');
    expect(codigo).toContain('exportarVendasPorItem');
    expect(codigo).toContain('exportarFaturamento');
    expect(codigo).toContain('abrirCardapioPdf');
    expect(codigo).toMatch(/fmt\?:\s*'csv'\s*\|\s*'xlsx'/);
  });
});
