import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('../../../services/agents', () => ({
  PROVIDER_CONFIGS: {
    kimi: { name: 'Kimi', models: ['m1'], defaultModel: 'm1', baseUrl: '', requiresApiKey: false },
  },
  DEFAULT_AGENT_VALUES: {
    name: '', description: '', provider: 'kimi', model_name: '', temperature: 0.7,
    max_tokens: 100, timeout: 30, system_prompt: '', context_prompt: '', status: 'draft',
    use_memory: false, memory_ttl: 60,
  },
  getBackendProviderConfig: jest.fn().mockResolvedValue(null),
}));

import { AgentForm } from '../AgentForm';

describe('AgentForm — selects com nome acessível', () => {
  it('Status e Modelo são achados pelo rótulo visível', () => {
    render(<AgentForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
    const abaModelo = screen.getAllByRole('button').find(b => /modelo|ia/i.test(b.textContent || ''));
    if (abaModelo) fireEvent.click(abaModelo);
    expect(screen.getByRole('combobox', { name: /modelo/i })).toBeInTheDocument();
  });
});
