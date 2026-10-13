/**
 * Código de verificação (13/10): o painel tinha seis <Input> soltos no login
 * por WhatsApp — colar caía numa caixa só, o celular não preenchia sozinho e
 * o envio automático lia o código ANTES do último dígito (closure velha).
 * Agora: UM campo de verdade por baixo, seis caixas em 3 + 3 por cima.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CampoDeCodigo } from '../CampoDeCodigo';

const montar = (props: Partial<React.ComponentProps<typeof CampoDeCodigo>> = {}) => {
  const onMudar = jest.fn();
  const onCompleto = jest.fn();
  const r = render(<CampoDeCodigo valor="" onMudar={onMudar} onCompleto={onCompleto} {...props} />);
  return { ...r, onMudar, onCompleto, campo: screen.getByLabelText('Código de 6 dígitos') };
};

describe('CampoDeCodigo', () => {
  it('campo numérico pronto para o preenchimento automático', () => {
    const { campo } = montar();
    expect(campo).toHaveAttribute('inputmode', 'numeric');
    expect(campo).toHaveAttribute('autocomplete', 'one-time-code');
    expect(campo).toHaveAttribute('maxlength', '6');
  });

  it('seis caixas em 3 + 3 mostrando os dígitos', () => {
    const { container } = montar({ valor: '1234' });
    const caixas = container.querySelectorAll('[data-caixa]');
    expect(caixas).toHaveLength(6);
    expect(Array.from(caixas).map((c) => c.textContent).join('')).toBe('1234');
    expect(container.querySelectorAll('[data-separador]')).toHaveLength(1);
  });

  it('colar "12 34-56" vira 123456 e confirma com o código NOVO', () => {
    const { campo, onMudar, onCompleto } = montar();
    fireEvent.change(campo, { target: { value: '12 34-56' } });
    expect(onMudar).toHaveBeenCalledWith('123456');
    expect(onCompleto).toHaveBeenCalledWith('123456');
  });

  it('menos de 6 não confirma; Enter com 6 confirma', () => {
    const { campo, onCompleto, rerender } = montar();
    fireEvent.change(campo, { target: { value: '12' } });
    expect(onCompleto).not.toHaveBeenCalled();
    rerender(<CampoDeCodigo valor="654321" onMudar={() => {}} onCompleto={onCompleto} />);
    fireEvent.keyDown(screen.getByLabelText('Código de 6 dígitos'), { key: 'Enter' });
    expect(onCompleto).toHaveBeenCalledWith('654321');
  });

  it('erro marca inválido', () => {
    const { campo } = montar({ erro: true });
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });
});
