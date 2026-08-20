import * as fs from 'fs';
import * as path from 'path';

/**
 * Ninguém pode voltar a MOSTRAR ou COBRAR usando `product.price`.
 *
 * `price` é o valor de CADASTRO. A promoção por dia da semana vive em
 * `preco_vigente`, resolvida pelo backend. Em 20/08 o mesmo defeito apareceu em
 * cinco telas diferentes, uma de cada vez, porque cada uma lia o campo cru:
 * vitrine, modal, PDV (3 telas), ferramentas do chat e campanha de WhatsApp.
 *
 * Duas delas doem além da tela: o catálogo enviado ao cliente pelo WhatsApp
 * manda o preço POR ESCRITO, e a etiqueta é IMPRESSA e vai pra prateleira.
 *
 * Este teste varre o código e falha se aparecer leitura nova. Arquivos de
 * CADASTRO ficam de fora de propósito: quem edita o produto tem que ver e
 * gravar o `price`, não o preço do dia.
 */
const RAIZ = path.resolve(__dirname, '../..');

/** Onde ler `price` é correto: telas de cadastro e análise de cadastro. */
const PERMITIDOS = [
  'pages/products/components/ProductRow.tsx',   // edição inline do preço cadastrado
  'pages/products/ProductFormModal.tsx',        // formulário do produto
  'pages/products/insightsDeCardapio.ts',       // acha produto SEM preço cadastrado
  'services/storesApi.ts',                      // definição de tipo
  'utils/precoVigente.ts',                      // o próprio helper
  // Recebe um objeto de IMPRESSÃO já montado pela EtiquetasPage, não o produto
  // cru: o `price` que chega aqui já é o valor resolvido. Nem todo
  // `product.price` é o defeito — este é o dado certo com o nome parecido.
  'utils/labelPrint.ts',
];

const arquivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });

describe('cobertura do preço vigente', () => {
  it('nenhuma tela nova lê product.price para mostrar ou cobrar', () => {
    const infratores: string[] = [];
    for (const abs of arquivos(RAIZ)) {
      const rel = path.relative(RAIZ, abs).split(path.sep).join('/');
      if (PERMITIDOS.includes(rel)) continue;
      const linhas = fs.readFileSync(abs, 'utf8').split('\n');
      linhas.forEach((linha, i) => {
        // `unit_price`, `price_override` e `compare_at_price` são outros campos.
        if (/\b(product|produto|prod)\.price\b/.test(linha)
            && !/unit_price|price_override|compare_at/.test(linha)) {
          infratores.push(`${rel}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });
});
