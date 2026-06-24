import api from '../api';
import { createCustomer, updateCustomer } from '../storesApi';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({ data: { id: 'c1', name: 'Maria Souza', phone: '63999990000' } }),
    patch: jest.fn().mockResolvedValue({ data: { id: 'c1', name: 'Updated Name' } }),
    delete: jest.fn(),
  },
}));

jest.mock('../logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockResolvedValue({ data: { id: 'c1', name: 'Maria Souza', phone: '63999990000' } });
  mockPatch.mockResolvedValue({ data: { id: 'c1', name: 'Updated Name' } });
});

describe('createCustomer', () => {
  it('chama POST /stores/customers/ com name+phone e store como query param', async () => {
    await createCustomer('loja-1', { name: 'Maria Souza', phone: '63999990000' });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/customers/'),
      expect.objectContaining({ name: 'Maria Souza', phone: '63999990000' }),
      { params: { store: 'loja-1' } }
    );
  });

  it('envia store como query param e não no body', async () => {
    await createCustomer('loja-1', { name: 'Maria Souza', phone: '63999990000' });
    const bodyArg = mockPost.mock.calls[0][1];
    expect(bodyArg).not.toHaveProperty('store');
  });

  it('funciona sem storeSlug (undefined)', async () => {
    await createCustomer(undefined, { name: 'Teste', phone: '63000000000' });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/customers/'),
      expect.objectContaining({ name: 'Teste' }),
      { params: undefined }
    );
  });
});

describe('updateCustomer', () => {
  it('aceita name no payload', async () => {
    await updateCustomer('c1', { name: 'Novo Nome' });
    expect(mockPatch).toHaveBeenCalledWith(
      expect.stringContaining('/customers/c1/'),
      expect.objectContaining({ name: 'Novo Nome' })
    );
  });
});
