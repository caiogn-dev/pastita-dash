/**
 * A coluna lateral: um controle só, no rodapé, e nada por cima do conteúdo.
 *
 * Três defeitos que este arquivo trava:
 *
 *  1. SOBREPOSIÇÃO. O botão mora DENTRO da coluna, então para clicá-lo o
 *     ponteiro está obrigatoriamente sobre ela — `espiando` já é true no
 *     instante do clique. Os testes antigos clicavam sem hover prévio, um
 *     estado que no navegador NÃO EXISTE, e o defeito passava.
 *  2. DOIS BOTÕES em lugares diferentes (um no header, outro solto), que ainda
 *     trocavam de alinhamento conforme o estado. O alvo pulava.
 *  3. A PREFERÊNCIA MORRIA no reload.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../Sidebar';
import { buildNavSections } from '../navSections';
import { useRootStore } from '../../../stores/rootStore';
import { LARGURA_ABERTA, LARGURA_RECOLHIDA } from '../larguraDaColuna';
import { CHAVE_COLUNA } from '../preferenciaDaColuna';

const sections = buildNavSections({
  storeHref: (p) => `/stores/minha-loja/${p}`,
  automationEnabled: false,
});

const DUAS = [
  { id: '1', name: 'Cê Saladas' },
  { id: '2', name: 'Pastita' },
];

function renderizar(pathname = '/') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar sections={sections} />
    </MemoryRouter>,
  );
}

const aColuna = () => screen.getByRole('navigation', { name: /principal/i });
const oBotao = () => screen.getByRole('button', { name: /menu/i });

beforeEach(() => {
  localStorage.clear();
  useRootStore.setState({ stores: DUAS, selectedStoreId: '1' } as never);
});

describe('recolher com o ponteiro em cima — o gesto real', () => {
  it('a coluna recolhe de verdade, não fica flutuando sobre o conteúdo', () => {
    renderizar();
    const nav = aColuna();

    fireEvent.mouseEnter(nav);
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));

    expect(nav.className).not.toMatch(/z-50/);
    expect(nav.className).toMatch(/w-\[72px\]/);
  });

  it('o espaço reservado e a largura pintada contam a mesma história', () => {
    renderizar();
    const nav = aColuna();
    const involucro = nav.parentElement as HTMLElement;

    fireEvent.mouseEnter(nav);
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));

    const estreitos = [nav, involucro].map((e) => /w-\[72px\]/.test(e.className));
    expect(estreitos).toEqual([true, true]);
  });

  it('sair e voltar com o ponteiro volta a espiar — o hover não morreu', async () => {
    renderizar();
    const nav = aColuna();

    fireEvent.mouseEnter(nav);
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));
    fireEvent.mouseLeave(nav);
    fireEvent.mouseEnter(nav);

    // Agora sim: larga E flutuando, porque é espiada, não preferência.
    expect(nav.className).toMatch(/z-50/);
    expect(await screen.findByText('Cardapidex')).toBeInTheDocument();
  });
});

describe('um controle só, no rodapé', () => {
  it('existe UM botão de menu, não dois', () => {
    renderizar();
    expect(screen.getAllByRole('button', { name: /menu/i })).toHaveLength(1);
  });

  it('o botão fica DEPOIS da lista de navegação, no rodapé', () => {
    renderizar();
    const lista = screen.getByRole('navigation', { name: /principal/i }).querySelector('ul');
    const posicao = lista!.compareDocumentPosition(oBotao());
    expect(posicao & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('o rodapé é separado do menu por uma linha', () => {
    renderizar();
    const rodape = oBotao().closest('div');
    expect(rodape!.className).toMatch(/border-t/);
  });

  it('o mesmo botão recolhe e expande — o alvo não muda de lugar', () => {
    renderizar();
    const nav = aColuna();

    fireEvent.mouseEnter(nav);
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));
    expect(nav.className).toMatch(/w-\[72px\]/);

    fireEvent.click(screen.getByRole('button', { name: /expandir menu/i }));
    expect(nav.className).toMatch(/w-64/);
  });
});

describe('a preferência sobrevive ao reload', () => {
  it('recolher grava a escolha', () => {
    renderizar();
    fireEvent.mouseEnter(aColuna());
    fireEvent.click(screen.getByRole('button', { name: /recolher menu/i }));
    expect(localStorage.getItem(CHAVE_COLUNA)).toBe('recolhida');
  });

  it('remontar com a escolha gravada abre recolhida', () => {
    localStorage.setItem(CHAVE_COLUNA, 'recolhida');
    renderizar();
    expect(aColuna().className).toMatch(/w-\[72px\]/);
    expect(screen.getByRole('button', { name: /expandir menu/i })).toBeInTheDocument();
  });

  it('localStorage indisponível não derruba a coluna', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('bloqueado');
    };
    try {
      expect(() => renderizar()).not.toThrow();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe('a loja mora na coluna, junto da marca', () => {
  it('o seletor de loja aparece na coluna', () => {
    renderizar();
    expect(screen.getByRole('button', { name: /trocar de loja/i })).toBeInTheDocument();
  });

  it('recolhida, o seletor vira só o avatar — mas continua alcançável', () => {
    localStorage.setItem(CHAVE_COLUNA, 'recolhida');
    renderizar();
    const seletor = screen.getByRole('button', { name: /trocar de loja/i });
    expect(seletor).toBeInTheDocument();
    // Escondido VISUALMENTE, nunca do leitor de tela: `sr-only` continua no
    // DOM de propósito, senão a coluna vira uma fileira de ícones mudos.
    expect(screen.getByText('Cê Saladas')).toHaveClass('sr-only');
  });
});

describe('a navbar recua exatamente o que a coluna ocupa', () => {
  it('LARGURA_ABERTA casa com a classe w-64 que a coluna pinta', () => {
    // w-64 = 16rem = 256px. Estavam divergindo em 8px: o recuo publicado era
    // 192px onde a coluna ocupava 184px.
    expect(LARGURA_ABERTA).toBe(256);
    expect(LARGURA_RECOLHIDA).toBe(72);
  });
});
