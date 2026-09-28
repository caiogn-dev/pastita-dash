import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorDeEtiqueta } from '../EditorDeEtiqueta';
import { imprimirGradeDeCalibracao, previewDeEtiquetas, salvarCalibracao, salvarLayout } from '../../../services/printing';
import type { LayoutDeEtiqueta, PrintAgent } from '../../../services/printing';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  normalizePaginatedResponse: (data: { results?: unknown[] }) => data?.results || [],
}));

jest.mock('../../../services/printing', () => ({
  ...jest.requireActual('../../../services/printing'),
  previewDeEtiquetas: jest.fn().mockResolvedValue({ data: { png: 'AAAA', largura_mm: 107, altura_mm: 22 } }),
  salvarLayout: jest.fn(),
  salvarCalibracao: jest.fn().mockResolvedValue({ data: { calibracao: {} } }),
  imprimirGradeDeCalibracao: jest.fn().mockResolvedValue({ data: { job: { id: 'g1' } } }),
}));

// jsdom não tem PointerEvent: sem isto o fireEvent.pointerDown vira Event sem clientX.
class PointerEventFalso extends MouseEvent {
  pointerId: number;
  constructor(tipo: string, init: PointerEventInit = {}) { super(tipo, init); this.pointerId = init.pointerId ?? 1; }
}
beforeAll(() => { (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventFalso; });

const layout = (): LayoutDeEtiqueta => ({
  versao: 1,
  etiqueta: { largura: 33, altura: 22 },
  papel: { largura: 107, colunas: 3, espaco: 2 },
  elementos: [
    { id: 'nome', tipo: 'texto', x: 1.6, y: 1.4, w: 29.8, h: 9, texto: '{name}', tamanho: 2.6, negrito: true, linhas: 3 },
    { id: 'val', tipo: 'texto', x: 1.6, y: 17.6, w: 29.8, h: 3.4, texto: 'Val.: {val}', tamanho: 2.8 },
  ],
});
const elgin = {
  id: 'ag-1', store: 'st-1', name: 'pc desktop validade', printer_name: 'ELGIN L42PRO FULL', is_online: true, is_active: true,
  status: 'active', imprime: ['etiquetas'], metadata: { calibracao: { desloc_x: -1.5, desloc_y: 0.5, escuro: 12 } },
} as unknown as PrintAgent;

const montar = (extra: Partial<React.ComponentProps<typeof EditorDeEtiqueta>> = {}) => {
  const onSalvo = jest.fn();
  render(
    <EditorDeEtiqueta open onClose={jest.fn()} storeUuid="st-1" modelo="validade" layout={layout()} padrao
      agentes={[elgin]} agenteInicial="ag-1" onSalvo={onSalvo} {...extra} />,
  );
  return { onSalvo };
};

describe('EditorDeEtiqueta', () => {
  beforeEach(() => { jest.clearAllMocks(); (salvarLayout as jest.Mock).mockImplementation((_s, _m, l) => Promise.resolve({ data: { layout: l, padrao: l === null } })); });

  it('mostra a prévia real vinda do backend com o layout em edição', async () => {
    montar();
    const img = await screen.findByTestId('editor-preview');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(previewDeEtiquetas).toHaveBeenCalledWith(expect.objectContaining({ store: 'st-1', modelo: 'validade', layout: expect.objectContaining({ papel: expect.objectContaining({ colunas: 3 }) }) }));
  });

  it('arrastar um campo no desenho muda o X/Y em mm e salvar manda o layout mexido', async () => {
    const { onSalvo } = montar();
    const nome = screen.getByTestId('el-nome');
    const canvas = screen.getByTestId('editor-canvas');
    // escala = min(6, 700/107) → 6 px/mm; 6 px para a direita = 1 mm (o campo tem 29,8 de 33 mm: só cabe até x = 3,2)
    fireEvent.pointerDown(nome, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 106, clientY: 112, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect((screen.getByTestId('prop-x') as HTMLInputElement).value).toBe('2.6');
    expect((screen.getByTestId('prop-y') as HTMLInputElement).value).toBe('3.4');
    await userEvent.click(screen.getByTestId('editor-salvar'));
    await waitFor(() => expect(salvarLayout).toHaveBeenCalled());
    const enviado = (salvarLayout as jest.Mock).mock.calls[0][2] as LayoutDeEtiqueta;
    expect(enviado.elementos[0]).toMatchObject({ id: 'nome', x: 2.6, y: 3.4 });
    expect(onSalvo).toHaveBeenCalledWith(expect.objectContaining({ elementos: expect.any(Array) }), false);
  });

  it('papel menor que as colunas trava o salvar e explica', async () => {
    montar();
    const papel = screen.getByTestId('lay-papel');
    await userEvent.clear(papel); await userEvent.type(papel, '90{enter}');
    expect(screen.getByRole('alert').textContent).toMatch(/não cabe/);
    expect(screen.getByTestId('editor-salvar')).toBeDisabled();
  });

  it('calibração nasce da impressora escolhida, imprime a grade e salva no agent', async () => {
    montar();
    expect((screen.getByTestId('cal-x') as HTMLInputElement).value).toBe('-1.5');
    await userEvent.click(screen.getByTestId('cal-imprimir-grade'));
    await waitFor(() => expect(imprimirGradeDeCalibracao).toHaveBeenCalledWith(expect.objectContaining({ store: 'st-1', agent: 'ag-1', modelo: 'validade' })));
    const x = screen.getByTestId('cal-x');
    await userEvent.clear(x); await userEvent.type(x, '-2{enter}');
    await userEvent.click(screen.getByTestId('cal-salvar'));
    await waitFor(() => expect(salvarCalibracao).toHaveBeenCalledWith('ag-1', { desloc_x: -2, desloc_y: 0.5, escuro: 12 }));
  });

  it('rolo contínuo pede o passo entre linhas e salva no papel', async () => {
    montar();
    expect(screen.queryByTestId('lay-passo')).toBeNull();
    await userEvent.selectOptions(screen.getByTestId('lay-modo'), 'continuo');
    const passo = screen.getByTestId('lay-passo');
    await userEvent.clear(passo); await userEvent.type(passo, '25{enter}');
    await userEvent.click(screen.getByTestId('editor-salvar'));
    await waitFor(() => expect(salvarLayout).toHaveBeenCalled());
    const enviado = (salvarLayout as jest.Mock).mock.calls[0][2] as LayoutDeEtiqueta;
    expect(enviado.papel).toMatchObject({ modo_midia: 'continuo', passo: 25 });
  });

  it('adicionar QR cria o elemento e removê-lo some do desenho', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: '+ QR Code' }));
    const qr = screen.getAllByRole('button', { name: /^QR Code qr-/ });
    expect(qr).toHaveLength(1);
    await userEvent.click(screen.getByLabelText('Remover elemento'));
    expect(screen.queryAllByRole('button', { name: /^QR Code qr-/ })).toHaveLength(0);
  });
});
