/**
 * Mapas de estado por DOMÍNIO — pedido, cliente, segmento RFM, saúde do
 * sistema. Dashboard e Clientes tinham cada um o seu mapa de status de pedido
 * (um com `Badge variant`, outro com oito paletas cruas), e "Preparando" era
 * amarelo numa tela e laranja na outra.
 */
import { describe, expect, it } from '@jest/globals';

import { estadoDeCliente, estadoDePedido, estadoDeSaude, estadoDeSegmento } from '../estados';

describe('estadoDePedido', () => {
  it('traduz e dá o tom pelo significado, não pela tela', () => {
    expect(estadoDePedido('pending')).toEqual({ rotulo: 'Pendente', tone: 'warning' });
    expect(estadoDePedido('confirmed')).toEqual({ rotulo: 'Confirmado', tone: 'info' });
    // tons do quadro de pedidos (um por coluna, testado em estadoDePedido.test.ts)
    expect(estadoDePedido('preparing')).toEqual({ rotulo: 'Preparando', tone: 'brand' });
    expect(estadoDePedido('out_for_delivery')).toEqual({ rotulo: 'Saiu para entrega', tone: 'success' });
    expect(estadoDePedido('delivered')).toEqual({ rotulo: 'Entregue', tone: 'neutral' });
    expect(estadoDePedido('completed')).toEqual({ rotulo: 'Concluído', tone: 'neutral' });
    expect(estadoDePedido('failed')).toEqual({ rotulo: 'Falhou', tone: 'danger' });
  });

  it('cancelado é neutro, como no pagamento: não é falha, é fim', () => {
    expect(estadoDePedido('cancelled').tone).toBe('neutral');
    expect(estadoDePedido('refunded').tone).toBe('neutral');
  });

  it('não diferencia caixa', () => {
    expect(estadoDePedido('DELIVERED').rotulo).toBe('Entregue');
  });

  it('status desconhecido usa o rótulo do backend, depois o próprio status, em tom neutro', () => {
    expect(estadoDePedido('novo_status', 'Novo status')).toEqual({ rotulo: 'Novo status', tone: 'neutral' });
    expect(estadoDePedido('novo_status')).toEqual({ rotulo: 'novo_status', tone: 'neutral' });
    expect(estadoDePedido(null)).toEqual({ rotulo: '—', tone: 'neutral' });
  });

  it('o nosso rótulo ganha do backend: a tela não pode dizer "Delivered"', () => {
    expect(estadoDePedido('delivered', 'Delivered').rotulo).toBe('Entregue');
  });
});

describe('estadoDeCliente', () => {
  it('ativo é sucesso, inativo é neutro', () => {
    expect(estadoDeCliente(true)).toEqual({ rotulo: 'Ativo', tone: 'success' });
    expect(estadoDeCliente(false)).toEqual({ rotulo: 'Inativo', tone: 'neutral' });
    expect(estadoDeCliente(undefined)).toEqual({ rotulo: 'Inativo', tone: 'neutral' });
  });
});

describe('estadoDeSegmento', () => {
  it('dá rótulo, tom e o que o segmento significa em uma linha', () => {
    expect(estadoDeSegmento('campeoes')).toEqual({ rotulo: 'Campeão', tone: 'success', dica: 'compra muito e recente' });
    expect(estadoDeSegmento('em_risco')).toEqual({ rotulo: 'Em risco', tone: 'warning', dica: 'comprava e parou' });
    expect(estadoDeSegmento('perdidos')).toEqual({ rotulo: 'Perdido', tone: 'danger', dica: 'sumiu faz tempo' });
    expect(estadoDeSegmento('sem_pedido')?.tone).toBe('neutral');
  });

  it('segmento desconhecido ou ausente não vira selo', () => {
    expect(estadoDeSegmento('inventado')).toBeNull();
    expect(estadoDeSegmento(null)).toBeNull();
    expect(estadoDeSegmento(undefined)).toBeNull();
  });
});

describe('estadoDeSaude', () => {
  it('mapeia a saúde do sistema', () => {
    expect(estadoDeSaude('ok')).toEqual({ rotulo: 'Estável', tone: 'success' });
    expect(estadoDeSaude('attention')).toEqual({ rotulo: 'Atenção', tone: 'warning' });
    expect(estadoDeSaude('critical')).toEqual({ rotulo: 'Crítico', tone: 'danger' });
  });

  it('sem dado é indefinido, neutro', () => {
    expect(estadoDeSaude(undefined)).toEqual({ rotulo: 'Indefinido', tone: 'neutral' });
    expect(estadoDeSaude('outra')).toEqual({ rotulo: 'Indefinido', tone: 'neutral' });
  });
});
