/**
 * A paleta do "/" tem que APARECER na tela.
 *
 * Reportado pelo dono em 14/ago: "ao colocar '/' não aparece uma lista ou
 * componente para facilitar os '/' existentes".
 *
 * A paleta renderizava — o defeito era CSS. Ela é
 * `position: absolute; bottom: 100%`, e nenhum ancestral era posicionado:
 * `bottom: 100%` passou a medir a partir do bloco inicial da página e jogou a
 * lista inteira acima da viewport. Componente montado, invisível, sem erro
 * nenhum no console.
 *
 * É o tipo de defeito que teste de componente não pega — jsdom não calcula
 * layout. Por isso a trava aqui é sobre o CSS em si, no mesmo espírito do
 * teste que proíbe `confirm()` nativo neste repo.
 */
import * as fs from 'fs';
import * as path from 'path';

import { sugestoes, interpretar } from '../comandos';

const CSS = fs.readFileSync(
  path.join(__dirname, '..', 'WhatsAppInbox.css'),
  'utf8',
);
const PAGINA = fs.readFileSync(
  path.join(__dirname, '..', 'WhatsAppInboxPage.tsx'),
  'utf8',
);

describe('a paleta tem onde ancorar', () => {
  it('a paleta é posicionada de forma absoluta', () => {
    const bloco = CSS.slice(CSS.indexOf('.paleta-comandos {'));
    expect(bloco).toMatch(/position:\s*absolute/);
  });

  it('existe um contêiner posicionado em volta dela', () => {
    const bloco = CSS.slice(
      CSS.indexOf('.area-de-digitacao {'),
      CSS.indexOf('.paleta-comandos {'),
    );
    expect(bloco).toMatch(/position:\s*relative/);
  });

  it('a página usa esse contêiner', () => {
    expect(PAGINA).toContain('className="area-de-digitacao"');
  });

  it('o contêiner envolve TAMBÉM o campo de digitação', () => {
    // Ancorar num contêiner que não contém o input colocaria a lista longe de
    // onde a pessoa está digitando.
    const abre = PAGINA.indexOf('className="area-de-digitacao"');
    const fecha = PAGINA.indexOf('</form>', abre);
    expect(abre).toBeGreaterThan(-1);
    expect(fecha).toBeGreaterThan(abre);
    expect(PAGINA.slice(abre, fecha)).toContain('className="input-area"');
  });
});

describe('o que a paleta oferece', () => {
  it('só a barra já lista todos os atalhos', () => {
    expect(sugestoes('/').length).toBeGreaterThan(0);
  });

  it('filtra conforme se digita', () => {
    expect(sugestoes('/pi').map((c) => c.nome)).toEqual(['pix']);
  });

  it('texto normal não abre paleta nenhuma', () => {
    expect(sugestoes('boa noite')).toEqual([]);
    expect(sugestoes('5/5 estrelas')).toEqual([]);
  });

  it('cada atalho vem com descrição — sem ela vira adivinhação', () => {
    for (const c of sugestoes('/')) {
      expect(c.descricao.length).toBeGreaterThan(5);
    }
  });

  it('barra no início nunca vira mensagem para a cliente', () => {
    expect(interpretar('/pixx')?.enviarAoCliente).toBe(false);
  });
});
