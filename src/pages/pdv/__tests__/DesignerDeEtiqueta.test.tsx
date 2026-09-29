import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DesignerDeEtiqueta from '../DesignerDeEtiqueta';
import { imprimirGradeDeCalibracao, salvarCalibracao, salvarLayout, enviarEtiquetasParaAgente } from '../../../services/printing';
import type { LayoutDeEtiqueta } from '../../../services/printing';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  normalizePaginatedResponse: (data: { results?: unknown[] } | unknown[]) => (Array.isArray(data) ? data : (data as { results?: unknown[] })?.results || []),
}));
const layout = (): LayoutDeEtiqueta => ({
  versao: 1,
  etiqueta: { largura: 33, altura: 22 },
  papel: { largura: 107, colunas: 3, espaco: 2 },
  elementos: [
    { id: 'nome', tipo: 'texto', x: 1.6, y: 1.4, w: 20, h: 9, texto: '{name}', tamanho: 2.6, negrito: true, linhas: 3 },
    { id: 'val', tipo: 'texto', x: 1.6, y: 17.6, w: 20, h: 3.4, texto: 'Val.: {val}', tamanho: 2.8 },
  ],
});
jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn().mockResolvedValue({ results: [{ id: 'st-1', slug: 'ce-saladas', name: 'Cê Saladas' }] }),
}));
jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  listPrintAgents: jest.fn().mockResolvedValue({ data: { results: [
    { id: 'ag-1', store: 'st-1', name: 'pc desktop validade', printer_name: 'ELGIN L42PRO FULL', is_online: true, is_active: true, status: 'active', imprime: ['etiquetas'], metadata: { calibracao: { desloc_x: -1.5 } } },
  ] } }),
  carregarLayouts: jest.fn(),
  previewDeEtiquetas: jest.fn().mockResolvedValue({ data: { png: 'AAAA', largura_mm: 107, altura_mm: 22 } }),
  salvarLayout: jest.fn(),
  salvarCalibracao: jest.fn().mockResolvedValue({ data: { calibracao: {} } }),
  imprimirGradeDeCalibracao: jest.fn().mockResolvedValue({ data: { job: { id: 'g1' } } }),
  enviarEtiquetasParaAgente: jest.fn().mockResolvedValue({ data: { job: { id: 'j1' } } }),
}));
jest.mock('../../../components/common', () => ({ Loading: () => <div>carregando</div> }));

class PointerEventFalso extends MouseEvent {
  pointerId: number;
  constructor(tipo: string, init: PointerEventInit = {}) { super(tipo, init); this.pointerId = init.pointerId ?? 1; }
}
beforeAll(() => { (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventFalso; });

const montar = async () => {
  const { carregarLayouts } = jest.requireMock('../../../services/printing');
  (carregarLayouts as jest.Mock).mockResolvedValue({ data: {
    validade: { layout: layout(), padrao: true }, 'nutricao-qr': { layout: layout(), padrao: true }, produto: { layout: layout(), padrao: true },
  } });
  (salvarLayout as jest.Mock).mockImplementation((_s, _m, l) => Promise.resolve({ data: { layout: l ?? layout(), padrao: l === null } }));
  render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/etiquetas/desenho/validade']}>
      <Routes><Route path="/stores/:storeId/etiquetas/desenho/:modelo" element={<DesignerDeEtiqueta />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByTestId('des-papel');
};

describe('DesignerDeEtiqueta — nutrição', () => {
  it('no modelo Nutrição a barra oferece Tabela, Ingredientes e Alergênicos e o layout traz a tabela', async () => {
    const { carregarLayouts } = jest.requireMock('../../../services/printing');
    const nutri: LayoutDeEtiqueta = { versao: 1, etiqueta: { largura: 100, altura: 80 }, papel: { largura: 100, colunas: 1, espaco: 0 },
      elementos: [{ id: 'tabela', tipo: 'tabela', x: 3, y: 8, w: 60, h: 62 }] };
    (carregarLayouts as jest.Mock).mockResolvedValue({ data: { validade: { layout: layout(), padrao: true }, 'nutricao-qr': { layout: layout(), padrao: true }, produto: { layout: layout(), padrao: true }, nutricao: { layout: nutri, padrao: true } } });
    render(
      <MemoryRouter initialEntries={['/stores/ce-saladas/etiquetas/desenho/nutricao']}>
        <Routes><Route path="/stores/:storeId/etiquetas/desenho/:modelo" element={<DesignerDeEtiqueta />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('des-papel');
    expect(screen.getByTestId('tool-tabela')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingredientes' })).toBeInTheDocument();
    expect(screen.getByTestId('el-tabela').textContent).toContain('INFORMAÇÃO NUTRICIONAL');
    expect(screen.getByTestId('des-camadas').textContent).toContain('Tabela nutricional');
  });
});

describe('DesignerDeEtiqueta', () => {
  beforeEach(() => jest.clearAllMocks());

  it('abre com o layout da loja, réguas e camadas', async () => {
    await montar();
    expect(screen.getByTestId('el-nome')).toBeInTheDocument();
    expect(screen.getByTestId('des-camadas').textContent).toContain('Val.: {val}');
    expect(screen.getByTestId('des-salvar')).toBeDisabled();       // nada mudou ainda
  });

  it('arrastar move em mm com encaixe de 0,5 e fica no histórico para desfazer', async () => {
    await montar();
    const nome = screen.getByTestId('el-nome');
    // zoom inicial = 6 px/mm; 13 px → 2,17 mm → 1,6 + 2,17 = 3,77 → grade de 0,5 mm = 4,0
    fireEvent.pointerDown(nome, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 113, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect((screen.getByTestId('prop-x') as HTMLInputElement).value).toBe('4');
    expect(screen.getByTestId('des-salvar')).not.toBeDisabled();
    await userEvent.click(screen.getByTestId('des-desfazer'));
    expect((screen.getByTestId('prop-x') as HTMLInputElement).value).toBe('1.6');
  });

  it('a alça da direita estica a largura sem mexer no X', async () => {
    await montar();
    fireEvent.pointerDown(screen.getByTestId('el-val'), { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    fireEvent.pointerDown(screen.getByTestId('alca-l'), { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 230, clientY: 200, pointerId: 1 });   // +30 px = +5 mm
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect((screen.getByTestId('prop-w') as HTMLInputElement).value).toBe('25');
    expect((screen.getByTestId('prop-x') as HTMLInputElement).value).toBe('1.6');
  });

  it('encaixa na guia: soltar perto da borda esquerda cola em 0', async () => {
    await montar();
    fireEvent.pointerDown(screen.getByTestId('el-nome'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 100 - 1.6 * 6 + 2, clientY: 100, pointerId: 1 });  // 0,33 mm da borda
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect((screen.getByTestId('prop-x') as HTMLInputElement).value).toBe('0');
  });

  it('"Ver como sai" troca o desenho pela prévia real do backend', async () => {
    await montar();
    await userEvent.click(screen.getByTestId('des-ver-como-sai'));
    const img = await screen.findByTestId('des-preview');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.queryByTestId('el-nome')).toBeNull();
  });

  it('barra de formatação: fonte, negrito e uma linha que encolhe', async () => {
    await montar();
    fireEvent.pointerDown(screen.getByTestId('el-nome'), { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    await userEvent.selectOptions(screen.getByTestId('fmt-fonte'), 'estreita');
    await userEvent.click(screen.getByTestId('fmt-negrito'));   // era negrito → desliga
    await userEvent.click(screen.getByTestId('fmt-encolher'));
    await userEvent.click(screen.getByTestId('des-salvar'));
    await waitFor(() => expect(salvarLayout).toHaveBeenCalled());
    const enviado = (salvarLayout as jest.Mock).mock.calls[0][2] as LayoutDeEtiqueta;
    expect(enviado.elementos[0]).toMatchObject({ fonte: 'estreita', negrito: false, ajuste: 'encolher', linhas: 1 });
  });

  it('salvar manda o layout mexido; teste e grade vão para a impressora escolhida; calibração salva no agent', async () => {
    await montar();
    await userEvent.click(screen.getByRole('button', { name: 'QR Code' }));
    await userEvent.click(screen.getByTestId('des-salvar'));
    await waitFor(() => expect(salvarLayout).toHaveBeenCalled());
    const enviado = (salvarLayout as jest.Mock).mock.calls[0][2] as LayoutDeEtiqueta;
    expect(enviado.elementos.some((e) => e.tipo === 'qr')).toBe(true);
    await userEvent.click(screen.getByTestId('des-teste'));
    await waitFor(() => expect(enviarEtiquetasParaAgente).toHaveBeenCalledWith(expect.objectContaining({ agent: 'ag-1', motor: 'bitmap', modelo: 'validade' })));
    await userEvent.click(screen.getByTestId('cal-imprimir-grade'));
    await waitFor(() => expect(imprimirGradeDeCalibracao).toHaveBeenCalledWith(expect.objectContaining({ agent: 'ag-1' })));
    expect((screen.getByTestId('cal-x') as HTMLInputElement).value).toBe('-1.5');
    await userEvent.click(screen.getByTestId('cal-salvar'));
    await waitFor(() => expect(salvarCalibracao).toHaveBeenCalledWith('ag-1', expect.objectContaining({ desloc_x: -1.5 })));
  });
});
