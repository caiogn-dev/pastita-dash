import { aiService, AiDailySummary, ConversationInsights } from '../services/ai';
import api from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockGet = api.get as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('aiService.getDailySummary', () => {
  const summary: AiDailySummary = {
    stats: {
      date: '2026-07-14',
      orders: 12,
      revenue: 480.5,
      avg_ticket: 40.04,
      orders_prev_day: 9,
      revenue_prev_day: 350,
      top_products: [{ name: 'Salada Caesar', qty: 5, total: 150 }],
      peak_hour: 19,
      cancelled: 1,
    },
    summary: 'Ontem a loja vendeu bem.',
    source: 'llm',
    cached: true,
  };

  it('calls /stores/ai/daily-summary/ with the store param', async () => {
    mockGet.mockResolvedValueOnce({ data: summary });

    const result = await aiService.getDailySummary('ce-saladas');

    expect(mockGet).toHaveBeenCalledWith('/stores/ai/daily-summary/', {
      params: { store: 'ce-saladas' },
    });
    expect(result).toEqual(summary);
  });

  it('adds refresh=1 when forcing regeneration', async () => {
    mockGet.mockResolvedValueOnce({ data: summary });

    await aiService.getDailySummary('ce-saladas', true);

    expect(mockGet).toHaveBeenCalledWith('/stores/ai/daily-summary/', {
      params: { store: 'ce-saladas', refresh: 1 },
    });
  });
});

describe('aiService.getConversationInsights', () => {
  const insights: ConversationInsights = {
    days: 7,
    message_count: 42,
    insights: {
      faqs: ['Qual o horário?'],
      complaints: [],
      opportunities: ['Oferecer combo de bebidas'],
      sentiment: 'positivo',
      summary: 'Clientes satisfeitos.',
    },
    summary: 'Clientes satisfeitos.',
    source: 'llm',
    cached: false,
  };

  it('calls /stores/ai/conversation-insights/ with store and days params', async () => {
    mockGet.mockResolvedValueOnce({ data: insights });

    const result = await aiService.getConversationInsights('ce-saladas', 7);

    expect(mockGet).toHaveBeenCalledWith('/stores/ai/conversation-insights/', {
      params: { store: 'ce-saladas', days: 7 },
    });
    expect(result).toEqual(insights);
  });

  it('omits days when not provided and adds refresh=1 when forced', async () => {
    mockGet.mockResolvedValueOnce({ data: insights });

    await aiService.getConversationInsights('ce-saladas', undefined, true);

    expect(mockGet).toHaveBeenCalledWith('/stores/ai/conversation-insights/', {
      params: { store: 'ce-saladas', refresh: 1 },
    });
  });
});
