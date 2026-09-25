/**
 * O balão é o que o cliente vê no celular. Três coisas precisam ser verdade:
 * o texto aparece como o WhatsApp mostra (negrito, itálico, quebra de linha),
 * variável sem valor salta aos olhos em vez de passar batida, e o balão vazio
 * diz o que fazer em vez de ficar em branco.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BalaoDeWhatsApp } from '../BalaoDeWhatsApp';

describe('BalaoDeWhatsApp', () => {
  it('mostra o remetente e o texto', () => {
    render(<BalaoDeWhatsApp remetente="Cê Saladas" texto="Oi, Ana!" horario="12:30" />);
    expect(screen.getByRole('figure', { name: /prévia da mensagem/i })).toBeInTheDocument();
    expect(screen.getByText('Cê Saladas')).toBeInTheDocument();
    expect(screen.getByText('Oi, Ana!')).toBeInTheDocument();
    expect(screen.getByText('12:30')).toBeInTheDocument();
  });

  it('interpreta *negrito*, _itálico_ e ~riscado~ como o WhatsApp', () => {
    render(<BalaoDeWhatsApp remetente="Loja" texto="*Hoje* _só_ ~amanhã~" />);
    expect(screen.getByText('Hoje').tagName).toBe('STRONG');
    expect(screen.getByText('só').tagName).toBe('EM');
    expect(screen.getByText('amanhã').tagName).toBe('S');
  });

  it('variável sem valor fica marcada', () => {
    render(<BalaoDeWhatsApp remetente="Loja" texto="Seu cupom: {{1}}" />);
    const marca = screen.getByText('{{1}}');
    expect(marca.tagName).toBe('MARK');
  });

  it('rodapé e botões do template aparecem', () => {
    render(
      <BalaoDeWhatsApp
        remetente="Loja"
        texto="Oi"
        rodape="Responda SAIR para sair"
        botoes={['Pedir agora']}
      />
    );
    expect(screen.getByText('Responda SAIR para sair')).toBeInTheDocument();
    expect(screen.getByText('Pedir agora')).toBeInTheDocument();
  });

  it('com imagem, mostra a imagem com texto alternativo', () => {
    render(<BalaoDeWhatsApp remetente="Loja" texto="" imagemUrl="blob:x" />);
    expect(screen.getByRole('img', { name: /imagem da mensagem/i })).toHaveAttribute('src', 'blob:x');
  });

  it('cabeçalho de imagem sem imagem mostra o espaço reservado', () => {
    render(<BalaoDeWhatsApp remetente="Loja" texto="Oi" cabecalhoDeImagem />);
    expect(screen.getByText(/imagem do cabeçalho/i)).toBeInTheDocument();
  });

  it('vazio: diz o que fazer', () => {
    render(<BalaoDeWhatsApp remetente="Loja" texto="" textoVazio="Escreva a mensagem para ver a prévia." />);
    expect(screen.getByText('Escreva a mensagem para ver a prévia.')).toBeInTheDocument();
  });

  it('carregando: não mostra texto, anuncia o carregamento', () => {
    render(<BalaoDeWhatsApp remetente="Loja" texto="Oi" carregando />);
    expect(screen.queryByText('Oi')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i);
  });

  it('não usa cor crua do Tailwind — o balão vive nos dois temas', () => {
    const { container } = render(
      <BalaoDeWhatsApp remetente="Loja" texto="*Oi* {{1}}" rodape="r" botoes={['b']} />
    );
    expect(container.innerHTML).not.toMatch(
      /\b(bg|text|border)-(green|gray|zinc|slate|emerald|white|black)\b/
    );
  });
});
