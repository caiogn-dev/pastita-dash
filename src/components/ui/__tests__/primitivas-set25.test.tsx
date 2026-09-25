/**
 * Primitivas que as páginas reinventavam (medido em 25/09: Toggle, Progresso,
 * Selo, Secao, NumField, StatusIndicator, QuickAction, dois PaymentBadge).
 * Cada uma existe UMA vez aqui; página que redefinir uma delas falha no
 * teste de identidade.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Switch } from '../Switch';
import { Progresso } from '../Progresso';
import { SeloDeEstado } from '../SeloDeEstado';
import { Secao } from '../Secao';
import { NumberField } from '../NumberField';
import { Verificacao } from '../Verificacao';
import { AcaoCard } from '../AcaoCard';
import { estadoDePagamento, estadoDeCampanha } from '../estados';

describe('Switch', () => {
  it('é um switch acessível com o nome do que liga', async () => {
    const onMudar = jest.fn();
    render(<Switch ligado={false} onMudar={onMudar} rotulo="Programa ativo" />);
    const sw = screen.getByRole('switch', { name: 'Programa ativo' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(onMudar).toHaveBeenCalledWith(true);
  });
});

describe('Progresso', () => {
  it('é uma progressbar com valor, limitada a 0–100', () => {
    render(<Progresso pct={140} rotulo="Cartão" />);
    const bar = screen.getByRole('progressbar', { name: 'Cartão' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('SeloDeEstado', () => {
  it('usa só tokens semânticos e tem ponto opcional', () => {
    const { container } = render(<SeloDeEstado tone="success" ponto>Conectado</SeloDeEstado>);
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/bg-(green|red|amber|gray)-/);
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
  });
});

describe('Secao', () => {
  it('título em frase, descrição e ações, dentro de uma superfície', () => {
    render(<Secao titulo="Como o cliente ganha" descricao="Regras do carimbo" acoes={<button>Editar</button>}><p>corpo</p></Secao>);
    expect(screen.getByRole('heading', { name: 'Como o cliente ganha' })).toBeInTheDocument();
    expect(screen.getByText('Regras do carimbo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('heading').className).not.toMatch(/uppercase/);
  });
});

describe('NumberField', () => {
  it('deixa digitar e só corrige a faixa ao sair', async () => {
    const onMudar = jest.fn();
    render(<NumberField rotulo="Largura" valor={33} min={15} max={80} onMudar={onMudar} />);
    const campo = screen.getByLabelText('Largura') as HTMLInputElement;
    await userEvent.clear(campo);
    await userEvent.type(campo, '3');
    expect(campo.value).toBe('3');
    expect(onMudar).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onMudar).toHaveBeenCalledWith(15);
  });
});

describe('Verificacao', () => {
  it('ok e falha com ícone e cor semântica', () => {
    const { container } = render(<><Verificacao ok rotulo="Webhook" /><Verificacao ok={false} rotulo="Token" /></>);
    expect(screen.getByText('Webhook').className).toMatch(/success/);
    expect(screen.getByText('Token').className).toMatch(/danger/);
    expect(container.innerHTML).not.toMatch(/text-(green|red)-/);
  });
});

describe('AcaoCard', () => {
  it('é um botão com título e consequência, sem cor crua', async () => {
    const onClick = jest.fn();
    const { container } = render(<AcaoCard titulo="Nova campanha" descricao="Fale com quem sumiu" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Nova campanha/ }));
    expect(onClick).toHaveBeenCalled();
    expect(container.innerHTML).not.toMatch(/bg-(blue|green|purple|indigo)-/);
  });
});

describe('estados', () => {
  it('pagamento e campanha mapeiam status para rótulo e tom, um lugar só', () => {
    expect(estadoDePagamento('paid')).toEqual({ rotulo: 'Pago', tone: 'success' });
    expect(estadoDePagamento('pending', 'cash')).toEqual({ rotulo: 'Dinheiro', tone: 'warning' });
    expect(estadoDePagamento('xyz').tone).toBe('neutral');
    expect(estadoDeCampanha('sent')).toEqual({ rotulo: 'Enviada', tone: 'success' });
    expect(estadoDeCampanha('scheduled').tone).toBe('info');
  });
});
