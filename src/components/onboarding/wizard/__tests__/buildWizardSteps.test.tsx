// Os steps importam services que tocam import.meta (logger) — mock para isolar.
jest.mock('../../../../services/storesApi', () => ({ __esModule: true, updateStore: jest.fn(), updateStoreWithFiles: jest.fn() }));
jest.mock('../../../../services/products', () => ({ __esModule: true, default: { createProduct: jest.fn() } }));
jest.mock('../../../../services/delivery', () => ({ __esModule: true, default: { createZone: jest.fn() } }));

import { buildWizardSteps } from '../buildWizardSteps';

describe('buildWizardSteps', () => {
  it('monta os 5 passos na ordem com as keys do checklist', () => {
    const steps = buildWizardSteps('s1');
    expect(steps.map((s) => s.key)).toEqual(['logo', 'product', 'delivery', 'hours', 'whatsapp']);
    expect(steps.every((s) => typeof s.render === 'function' && Boolean(s.title))).toBe(true);
  });
});
