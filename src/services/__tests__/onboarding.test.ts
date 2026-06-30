import api from '../api';
import { getChecklist, markWizardSeen } from '../onboarding';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
// onboarding.ts importa storesApi (para saveStoreBranding), que por sua vez
// importa logger.ts (usa import.meta.env, não transformado fora de src/mobile
// pelo jest — ver jestViteEnvTransform.cjs). Mock para isolar o teste deste
// service sem depender de infra alheia ao escopo desta task.
jest.mock('../storesApi', () => ({
  __esModule: true,
  updateStore: jest.fn(),
}));

const mockGet = (api as unknown as { get: jest.Mock }).get;

beforeEach(() => { jest.clearAllMocks(); });

describe('getChecklist', () => {
  it('chama o endpoint certo e retorna o checklist', async () => {
    mockGet.mockResolvedValue({
      data: {
        steps: [{ key: 'account', label: 'Conta criada', done: true }],
        completed: 1,
        total: 6,
        all_done: false,
      },
    });
    const res = await getChecklist('loja');
    expect(mockGet).toHaveBeenCalledWith('/stores/loja/onboarding/checklist/');
    expect(res.total).toBe(6);
    expect(res.steps[0].key).toBe('account');
  });

  it('markWizardSeen faz POST no endpoint seen', async () => {
    const mockPost = (api as unknown as { post: jest.Mock }).post;
    mockPost.mockResolvedValue({ data: { wizard_seen: true } });
    await markWizardSeen('loja');
    expect(mockPost).toHaveBeenCalledWith('/stores/loja/onboarding/seen/');
  });
});
