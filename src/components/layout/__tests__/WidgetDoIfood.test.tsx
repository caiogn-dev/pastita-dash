/**
 * Widget oficial do iFood (bolinha: chat com cliente, notificações, tracking,
 * pausa). Regra da doc do iFood: init UMA vez, só com a lista certa — init com
 * lista vazia derruba a sessão autorizada.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

const get = jest.fn();
jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: (...a: unknown[]) => get(...a) } }));

import { CONTEINER_ID, WidgetDoIfood, WIDGET_DO_IFOOD_ID } from '../WidgetDoIfood';

type W = typeof window & { iFoodWidget?: { init: jest.Mock } };

beforeEach(() => {
  get.mockReset();
  document.head.querySelectorAll('script[data-ifood-widget]').forEach((s) => s.remove());
  (window as W).iFoodWidget = { init: jest.fn() };
  delete (window as W & { __ifoodWidgetIniciado?: boolean }).__ifoodWidgetIniciado;
});

const carregarScript = () => {
  const s = document.head.querySelector('script[data-ifood-widget]') as HTMLScriptElement;
  expect(s).not.toBeNull();
  expect(s.src).toBe('https://widgets.ifood.com.br/widget.js');
  s.dispatchEvent(new Event('load'));
};

it('com lojas no iFood: carrega o script e inicia uma vez com os merchants', async () => {
  get.mockResolvedValue({ data: { merchant_ids: ['m-1', 'm-2'] } });
  const { rerender } = render(<WidgetDoIfood />);
  await waitFor(() => expect(document.head.querySelector('script[data-ifood-widget]')).not.toBeNull());
  carregarScript();
  rerender(<WidgetDoIfood />);
  const init = (window as W).iFoodWidget!.init;
  await waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  expect(init).toHaveBeenCalledWith({
    widgetId: WIDGET_DO_IFOOD_ID, merchantIds: ['m-1', 'm-2'], containerSelector: `#${CONTEINER_ID}`,
  });
  // Tema escuro + iframe claro = fundo opaco (tela branca). O contêiner fixa o esquema claro.
  expect(document.getElementById(CONTEINER_ID)?.style.colorScheme).toBe('light');
});

it('sem loja no iFood: nem carrega o script', async () => {
  get.mockResolvedValue({ data: { merchant_ids: [] } });
  render(<WidgetDoIfood />);
  await waitFor(() => expect(get).toHaveBeenCalledWith('/stores/integracoes/ifood/merchants/'));
  expect(document.head.querySelector('script[data-ifood-widget]')).toBeNull();
  expect((window as W).iFoodWidget!.init).not.toHaveBeenCalled();
});

it('falha na API: não inicia (init vazio derruba a sessão)', async () => {
  get.mockRejectedValue(new Error('rede'));
  render(<WidgetDoIfood />);
  await waitFor(() => expect(get).toHaveBeenCalled());
  expect(document.head.querySelector('script[data-ifood-widget]')).toBeNull();
});

it('API lenta/fora no carregamento: tenta de novo sozinho e o widget aparece', async () => {
  jest.useFakeTimers();
  try {
    get.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ data: { merchant_ids: ['m-1'] } });
    render(<WidgetDoIfood />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    expect(document.head.querySelector('script[data-ifood-widget]')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(20_000); });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(document.head.querySelector('script[data-ifood-widget]')).not.toBeNull());
  } finally {
    jest.useRealTimers();
  }
});
