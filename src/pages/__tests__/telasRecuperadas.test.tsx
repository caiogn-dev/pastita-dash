/**
 * As cinco telas que voltaram ao menu precisam MONTAR, não só rotear.
 *
 * Em 12/ago descobri 5 páginas funcionais (2.335 linhas) sem rota nenhuma:
 * renderizavam em lugar nenhum. Religuei as rotas e conferi que os endpoints
 * existem — mas conferir rota e endpoint não é a mesma coisa que conferir que
 * a tela abre. Se alguma quebrar no primeiro render, eu teria trocado cinco
 * telas invisíveis por cinco telas com erro, que é pior: a invisível ninguém
 * clica, a quebrada quebra na frente do dono.
 *
 * O teste monta cada uma com as dependências externas silenciadas. Não afirma
 * que a tela está boa — afirma que ela não explode ao abrir.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
  Toaster: () => null,
}));

jest.mock('../../hooks', () => ({
  __esModule: true,
  useStore: () => ({
    storeId: 'loja-1', storeSlug: 'loja-1', storeName: 'Loja Teste',
    isStoreSelected: true, stores: [],
  }),
  useConfirm: () => [null, jest.fn().mockResolvedValue(true)],
  useAutomationEnabled: () => true,
}));

// A rede não é o objeto do teste: qualquer chamada devolve lista vazia, que é
// o estado mais hostil ao render (nada para exibir, tudo para tratar).
const respostaVazia = { data: { count: 0, next: null, previous: null, results: [] } };
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve(respostaVazia)),
    post: jest.fn(() => Promise.resolve(respostaVazia)),
    patch: jest.fn(() => Promise.resolve(respostaVazia)),
    delete: jest.fn(() => Promise.resolve(respostaVazia)),
  },
  getErrorMessage: (e: unknown) => String(e),
  normalizePaginatedResponse: () => [],
}));

jest.mock('../../services/marketingService', () => ({
  __esModule: true,
  automationsApi: {
    list: jest.fn().mockResolvedValue([]),
    getTriggerTypes: jest.fn().mockResolvedValue([]),
    toggle: jest.fn(), delete: jest.fn(), create: jest.fn(), get: jest.fn(),
  },
  subscribersApi: { list: jest.fn().mockResolvedValue({ results: [], count: 0 }) },
}));

const montar = (Componente: React.ComponentType) =>
  render(
    <MemoryRouter>
      <Componente />
    </MemoryRouter>,
  );

// Cinco páginas grandes num arquivo só: dá folga pra importação sob carga.
jest.setTimeout(30000);

describe('telas recuperadas montam sem explodir', () => {
  const erroDoConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => erroDoConsole.mockRestore());

  it.each([
    ['E-mails automáticos', () => import('../marketing/AutomationsPage')],
    ['Assinantes',          () => import('../marketing/SubscribersPage')],
    ['Fluxos do agente',    () => import('../automation/AgentFlowsPage')],
    ['Diagnóstico webhook', () => import('../whatsapp/WebhookDiagnosticsPage')],
    ['Diagnóstico do chat', () => import('../whatsapp/DebugDashboardPage')],
  ])('%s', async (_nome, carregar) => {
    const mod = (await carregar()) as Record<string, unknown>;
    const Componente = (mod.default
      ?? Object.values(mod).find((v) => typeof v === 'function')) as React.ComponentType;

    expect(Componente).toBeTruthy();
    // Render do RTL é síncrono: se o componente estourasse no primeiro render,
    // a exceção subiria aqui. Sem `waitFor` — o polling por timers só somava
    // pressão numa suíte que já sofre com concorrência, e não provava nada a
    // mais do que isto prova.
    const { container } = montar(Componente);

    expect(container.firstChild).toBeTruthy();
  });
});
