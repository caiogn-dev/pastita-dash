import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../Switch';

// O Switch é um primitivo compartilhado (role="switch" + aria-checked) usado em
// telas como Perfil da empresa e Link na bio. Sem `aria-label`/`aria-labelledby`
// os leitores de tela anunciam apenas "switch, ligado/desligado", sem dizer o que
// o controle representa. Estes testes garantem que o primitivo aceita e expõe um
// nome acessível, sem regredir o comportamento de toggle.
describe('Switch — acessibilidade (nome acessível)', () => {
  it('expõe nome acessível via aria-label', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="Aceitar pedidos pelo bot" />);

    const toggle = screen.getByRole('switch', { name: /aceitar pedidos pelo bot/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('expõe nome acessível via aria-labelledby', () => {
    render(
      <>
        <span id="lbl-teste">Ativar link Cardápio</span>
        <Switch checked onChange={() => {}} aria-labelledby="lbl-teste" />
      </>
    );

    const toggle = screen.getByRole('switch', { name: /ativar link cardápio/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('mantém o toggle funcional (onChange com valor invertido)', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<Switch checked={false} onChange={onChange} aria-label="Alternar" />);

    await user.click(screen.getByRole('switch', { name: /alternar/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
