import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EtiquetasPage from '../EtiquetasPage';
import { getStores, getProducts, gerarCodigosInternos } from '../../../services/storesApi';
import { printHtmlDocument } from '../../../utils/labelPrint';
import { enviarEtiquetasParaAgente, listPrintAgents } from '../../../services/printing';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue({ data: { results: [] } }) },
  normalizePaginatedResponse: (data: { results?: unknown[] }) => data?.results || [],
}));

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  getProducts: jest.fn(),
  gerarCodigosInternos: jest.fn(),
}));

jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listPrintAgents: jest.fn().mockResolvedValue({ data: { results: [] } }),
  enviarEtiquetasParaAgente: jest.fn().mockResolvedValue({ data: { job: { id: 'j1' } } }),
}));

jest.mock('../../../utils/labelPrint', () => ({
  ...jest.requireActual('../../../utils/labelPrint'),
  printHtmlDocument: jest.fn().mockResolvedValue(undefined),
}));

// Os modelos de nutrição são o adicional Etiqueta ANVISA; os outros testes
// rodam com ele liberado.
const liberado = { estado: 'contratado', liberado: true, adicional: null, ocupado: false, erro: null,
  contratar: jest.fn(), cancelar: jest.fn() };
const mockUseAdicional = jest.fn(() => liberado);
jest.mock('../../../hooks/useAdicional', () => ({
  __esModule: true,
  useAdicional: () => mockUseAdicional(),
}));

const mockedGetStores = getStores as jest.Mock;
const mockedGetProducts = getProducts as jest.Mock;
const mockedGerarCodigos = gerarCodigosInternos as jest.Mock;
const mockedPrint = printHtmlDocument as jest.Mock;
const mockedListAgents = listPrintAgents as jest.Mock;
const mockedEnviar = enviarEtiquetasParaAgente as jest.Mock;

const zebra = { id: 'ag-zebra', name: 'pc desktop', printer_name: 'ZDesigner ZD220-203dpi ZPL',
  is_active: true, status: 'active', is_online: true, imprime: ['etiquetas'] };
const epson = { id: 'ag-epson', name: 'Caixa', printer_name: 'EPSON TM-T20',
  is_active: true, status: 'active', is_online: true, imprime: ['comanda', 'recibo'] };
// Zebra que ainda está marcada só como comanda: o dono precisa marcar "etiquetas" nela
const zebraSemPapel = { ...zebra, id: 'ag-zebra-2', name: 'zebra sem papel', imprime: ['comanda'] };

const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stores/loja-1/etiquetas']}>
      <Routes>
        <Route path="/stores/:storeId/etiquetas" element={<EtiquetasPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('EtiquetasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedListAgents.mockResolvedValue({ data: { results: [] } });
    mockedGetStores.mockResolvedValue(page([
      { id: 's1', slug: 'loja-1', name: 'Loja Um', status: 'active' },
    ]));
    mockedGetProducts.mockResolvedValue(page([
      {
        id: 'p1', store: 's1', name: 'Marmita P', slug: 'marmita-p', sku: '',
        barcode: '', price: 20, status: 'active', description: '', short_description: '',
      },
      {
        id: 'p2', store: 's1', name: 'Suco', slug: 'suco', sku: '',
        barcode: '7891000000014', price: 8, status: 'active', description: '', short_description: '',
      },
    ]));
    mockedGerarCodigos.mockResolvedValue({ gerados: { p1: '2010000000015' }, total: 1 });
  });

  it('imprimir etiqueta de produto PEDE AO BACKEND o EAN-13 de quem não tem código', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '2');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    // Antes o código era sorteado no navegador: sem identidade de loja e com
    // risco de dois operadores tirarem o mesmo número. Agora quem gera é o
    // backend, que conhece todos os códigos já usados.
    await waitFor(() => {
      expect(mockedGerarCodigos).toHaveBeenCalledWith('s1', ['p1']);
    });
    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('Marmita P');
    // duas cópias = duas páginas, cada uma com o código novo
    expect(doc.match(/class="page"/g)).toHaveLength(2);
    const code = mockedGerarCodigos.mock.results[0].value as Promise<{ gerados: Record<string,string> }>;
    expect(doc).toContain('@page { size: 100mm 80mm; margin: 0; }');
    // barcode entra como SVG gerado a partir do código salvo
    expect(mockedPrint).toHaveBeenCalledTimes(1);
    expect((await code).gerados.p1).toMatch(/^2\d{12}$/);
  });

  it('sem o adicional, os modelos de nutrição mostram o bloqueio com o contratar — produto segue livre', async () => {
    mockUseAdicional.mockReturnValue({ ...liberado, estado: 'disponivel', liberado: false });
    renderPage();
    await screen.findByText('Marmita P');
    expect(screen.getByTestId('etq-imprimir')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Nutrição 100×80'));

    expect(screen.getByText(/fazem parte do adicional Etiqueta ANVISA/)).toBeInTheDocument();
    expect(screen.queryByTestId('etq-imprimir')).not.toBeInTheDocument();
    mockUseAdicional.mockReturnValue(liberado);
  });

  it('produto que já tem código não é alterado ao imprimir', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    expect(mockedGerarCodigos).not.toHaveBeenCalled();
  });

  it('exporta folha A4 organizada sem gerar código para produto vazio', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByRole('button', { name: /^Folha de códigos/ }));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('@page { size: A4 portrait;');
    expect(doc).toContain('Loja Um');
    expect(doc).toContain('Marmita P');
    expect(doc).toContain('Sem código');
    expect(doc).toContain('Suco');
    expect(doc).toContain('7891000000014');
    expect(mockedGerarCodigos).not.toHaveBeenCalled();
  });

  it('modo validade imprime linhas de 3 colunas com página do tamanho do papel', async () => {
    renderPage();
    await screen.findByText('Marmita P');

    await userEvent.click(screen.getByText('Validade (Elgin)'));
    expect(screen.getByTestId('etq-shelf-days')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '4');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    expect(mockedGerarCodigos).not.toHaveBeenCalled();

    const doc = mockedPrint.mock.calls[0][0] as string;
    // bobina padrão 107mm (3×33 + 2×3 = 105 centralizado), 4 etiquetas → 2 páginas (3+1)
    expect(doc).toContain('@page { size: 107mm 22mm; margin: 0; }');
    expect(doc.match(/class="page"/g)).toHaveLength(2);
    expect(doc.match(/class="cell"/g)).toHaveLength(4);
    // margem automática de 1mm por lado → colunas em 1/37/73 mm
    expect(doc).toContain('left:1mm');
    expect(doc).toContain('left:37mm');
    expect(doc).toContain('left:73mm');
    expect(doc).toContain('Manip.:');
    expect(doc).toContain('Val.:');
  });

  it('borda retângulo entra no CSS da etiqueta quando selecionada', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.click(screen.getByText('Validade (Elgin)'));
    await userEvent.selectOptions(screen.getByTestId('etq-border'), 'solid');
    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('border: 0.4mm solid #000');
  });

  it('girar 90° troca a orientação da página da etiqueta de produto', async () => {
    renderPage();
    await screen.findByText('Suco');

    await userEvent.click(screen.getByTestId('etq-rotate'));
    await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Suco'));
    await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Suco'), '1');
    await userEvent.click(screen.getByTestId('etq-imprimir'));

    await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
    const doc = mockedPrint.mock.calls[0][0] as string;
    expect(doc).toContain('@page { size: 80mm 100mm; margin: 0; }');
    expect(doc).toContain('rotate(90deg)');
  });

  describe('impressora remota (Zebra pelo print agent)', () => {
    it('sem agent com Zebra, o bloco remoto não aparece e o navegador segue igual', async () => {
      mockedListAgents.mockResolvedValue({ data: { results: [epson] } });
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      expect(screen.queryByTestId('etq-remoto')).toBeNull();
      expect(screen.getByTestId('etq-imprimir')).toBeInTheDocument();
    });

    it('validade: manda os mesmos dados do navegador para o agent escolhido, com a loja e a config', async () => {
      mockedListAgents.mockResolvedValue({ data: { results: [epson, zebraSemPapel, zebra] } });
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
      await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '2');

      const bloco = await screen.findByTestId('etq-remoto');
      // só quem imprime etiquetas é opção — ZPL na Epson sai como lixo, e a
      // Zebra sem o papel marcado ainda receberia comanda
      // um agent só: sem dropdown, o botão já diz o nome dele
      expect(bloco.querySelectorAll('option')).toHaveLength(0);
      expect(bloco.textContent).toContain('pc desktop');
      expect(bloco.textContent).not.toContain('Caixa');
      expect(bloco.textContent).not.toContain('zebra sem papel');
      await userEvent.click(screen.getByTestId('etq-enviar-remoto'));

      await waitFor(() => expect(mockedEnviar).toHaveBeenCalledTimes(1));
      const body = mockedEnviar.mock.calls[0][0];
      expect(body.store).toBe('s1');
      expect(body.agent).toBe('ag-zebra');
      expect(body.modelo).toBe('validade');
      expect(body.etiquetas).toHaveLength(2);
      expect(body.etiquetas[0].name).toBe('Marmita P');
      expect(body.etiquetas[0].val).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(body.config.cols).toBeGreaterThan(0);
      expect(mockedPrint).not.toHaveBeenCalled();
    });

    it('etiqueta de produto também vai para a impressora remota, gerando o código de quem não tem', async () => {
      mockedListAgents.mockResolvedValue({ data: { results: [zebra] } });
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
      await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '2');
      await userEvent.click(await screen.findByTestId('etq-enviar-remoto'));
      await waitFor(() => expect(mockedEnviar).toHaveBeenCalledTimes(1));
      expect(mockedGerarCodigos).toHaveBeenCalledWith('s1', ['p1']);
      const body = mockedEnviar.mock.calls[0][0];
      expect(body.modelo).toBe('produto');
      expect(body.etiquetas).toHaveLength(2);
      expect(body.etiquetas[0].barcode).toBe('2010000000015');
      expect(body.config.width).toBeGreaterThan(0);
    });

    it('lembra a impressora escolhida por modelo: Elgin para validade, Zebra para produto', async () => {
      const elgin = { ...zebra, id: 'ag-elgin', name: 'pc desktop · Elgin', printer_name: 'ELGIN L42PRO FULL' };
      mockedListAgents.mockResolvedValue({ data: { results: [zebra, elgin] } });
      const { unmount } = renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      const seletor = (await screen.findByLabelText('Impressora de etiquetas')) as HTMLSelectElement;
      await userEvent.selectOptions(seletor, 'ag-elgin');
      expect(seletor.value).toBe('ag-elgin');
      await userEvent.click(screen.getByText('Produto (Zebra)'));
      expect((screen.getByLabelText('Impressora de etiquetas') as HTMLSelectElement).value).toBe('ag-zebra');
      unmount();

      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      expect(((await screen.findByLabelText('Impressora de etiquetas')) as HTMLSelectElement).value).toBe('ag-elgin');
    });
  });

  describe('campos numéricos e escolhas', () => {
    it('dá para digitar um número inteiro no teclado: 12 fica 12, não vira 1 e depois 112', async () => {
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      const dias = screen.getByTestId('etq-shelf-days') as HTMLInputElement;
      await userEvent.clear(dias);
      await userEvent.type(dias, '12');
      expect(dias.value).toBe('12');
      await userEvent.tab();
      expect(dias.value).toBe('12');
    });

    it('valor fora da faixa só é corrigido ao sair do campo, não a cada tecla', async () => {
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      const largura = screen.getByLabelText('Etiqueta (largura)') as HTMLInputElement;
      await userEvent.clear(largura);
      await userEvent.type(largura, '3');
      expect(largura.value).toBe('3');
      await userEvent.tab();
      expect(Number(largura.value)).toBeGreaterThanOrEqual(15);
    });

    it('a escolha de borda é o Select do painel (fundo próprio, legível no escuro)', async () => {
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      const borda = screen.getByTestId('etq-border');
      expect(borda.tagName).toBe('SELECT');
      expect(borda.className).not.toMatch(/bg-transparent/);
      expect(screen.getByLabelText('Borda')).toBe(borda);
    });
  });

  describe('trabalho de todo dia: lotes recentes, produtos recentes, impressora da loja', () => {
    it('depois de imprimir, o lote fica em "Lotes recentes" e "Imprimir de novo" restaura as quantidades', async () => {
      const { unmount } = renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
      await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '3');
      await userEvent.click(screen.getByTestId('etq-imprimir'));
      await waitFor(() => expect(mockedPrint).toHaveBeenCalled());
      unmount();

      renderPage();
      await screen.findByText('Marmita P');
      const lotes = await screen.findByTestId('etq-lotes');
      expect(lotes.textContent).toContain('Marmita P');
      expect(lotes.textContent).toContain('3 etiquetas');
      // quantidade zera entre sessões; o lote devolve
      expect((screen.getByLabelText('Quantidade de etiquetas de Marmita P') as HTMLInputElement).value).toBe('0');
      await userEvent.click(screen.getByRole('button', { name: /imprimir de novo/i }));
      expect((screen.getByLabelText('Quantidade de etiquetas de Marmita P') as HTMLInputElement).value).toBe('3');
      expect(screen.getByTestId('etq-imprimir').textContent).toContain('3 etiquetas');
    });

    it('produto impresso recentemente sobe para o topo da lista', async () => {
      localStorage.setItem('cdx-etiquetas-lotes-v1:loja-1', JSON.stringify([
        { quando: '2026-09-25T10:00:00Z', template: 'validade', itens: [{ id: 'p2', nome: 'Suco', qtd: 2 }] },
      ]));
      renderPage();
      await screen.findByText('Marmita P');
      const nomes = Array.from(screen.getByTestId('etq-produtos').querySelectorAll('li .font-medium')).map((e) => e.textContent);
      expect(nomes[0]).toBe('Suco');
    });

    it('com Zebra na loja, imprimir na Zebra é o botão principal e o navegador vira secundário', async () => {
      mockedListAgents.mockResolvedValue({ data: { results: [zebra] } });
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      await userEvent.clear(screen.getByLabelText('Quantidade de etiquetas de Marmita P'));
      await userEvent.type(screen.getByLabelText('Quantidade de etiquetas de Marmita P'), '1');
      const remoto = await screen.findByTestId('etq-enviar-remoto');
      expect(remoto.textContent).toMatch(/Imprimir 1 etiqueta na pc desktop/);
      expect(remoto.className).toMatch(/primary|bg-brand/);
      expect(screen.getByTestId('etq-imprimir').textContent).toMatch(/navegador/i);
    });

    it('a validade aparece por extenso no lote, não só como número de dias', async () => {
      renderPage();
      await screen.findByText('Marmita P');
      await userEvent.click(screen.getByText('Validade (Elgin)'));
      expect(screen.getByTestId('etq-validade-frase').textContent).toMatch(/Produzido hoje.*vence/i);
    });
  });
});
