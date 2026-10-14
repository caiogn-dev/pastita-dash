/**
 * Formulário de um jeito só (14/10). Medido em 13/10: 338 campos de texto
 * crus em 93 arquivos e 216 rótulos montados à mão em 57 — cada tela pedia
 * preço, telefone e foto do seu jeito. Estas peças são o jeito.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Campo } from '../Campo';
import { CampoDeDinheiro } from '../CampoDeDinheiro';
import { CampoDeTelefone } from '../CampoDeTelefone';
import { EnvioDeImagem } from '../EnvioDeImagem';
import { Input } from '../input';

describe('Campo', () => {
  it('liga rótulo, dica e erro ao controle', () => {
    render(
      <Campo rotulo="Nome da loja" dica="Aparece no topo" erro="Informe o nome">
        <input />
      </Campo>
    );
    const controle = screen.getByLabelText('Nome da loja');
    expect(controle).toHaveAttribute('aria-invalid', 'true');
    expect(controle).toHaveAccessibleDescription('Informe o nome');
    // Com erro, a dica sai: duas linhas embaixo do campo competem.
    expect(screen.queryByText('Aparece no topo')).not.toBeInTheDocument();
  });

  it('sem erro mostra a dica e não marca inválido', () => {
    render(
      <Campo rotulo="Nome" dica="Aparece no topo">
        <input />
      </Campo>
    );
    const controle = screen.getByLabelText('Nome');
    expect(controle).not.toHaveAttribute('aria-invalid');
    expect(controle).toHaveAccessibleDescription('Aparece no topo');
  });

  it('obrigatório vai no controle e aparece ao lado do rótulo', () => {
    render(
      <Campo rotulo="Preço" obrigatorio>
        <input />
      </Campo>
    );
    expect(screen.getByLabelText(/Preço/)).toBeRequired();
    expect(screen.getByText('obrigatório')).toBeInTheDocument();
  });

  it('funciona com o Input do kit sem rótulo duplicado', () => {
    render(
      <Campo rotulo="Cidade">
        <Input />
      </Campo>
    );
    expect(screen.getAllByText('Cidade')).toHaveLength(1);
    expect(screen.getByLabelText('Cidade').tagName).toBe('INPUT');
  });
});

describe('CampoDeDinheiro', () => {
  const montar = (valor: number | null = null) => {
    const onMudar = jest.fn();
    render(<CampoDeDinheiro rotulo="Preço" valor={valor} onMudar={onMudar} />);
    return { onMudar, campo: screen.getByLabelText('Preço') as HTMLInputElement };
  };

  it('mostra o valor em reais com o R$ fora do campo', () => {
    const { campo } = montar(1234.5);
    expect(campo.value).toBe('1.234,50');
    expect(screen.getByText('R$')).toBeInTheDocument();
    expect(campo).toHaveAttribute('inputmode', 'numeric');
  });

  it('digitar enche pelos centavos, como maquininha', () => {
    const { campo, onMudar } = montar(null);
    fireEvent.change(campo, { target: { value: '1990' } });
    expect(onMudar).toHaveBeenLastCalledWith(19.9);
  });

  it('apagar tudo devolve vazio, não zero', () => {
    const { campo, onMudar } = montar(5);
    fireEvent.change(campo, { target: { value: '' } });
    expect(onMudar).toHaveBeenLastCalledWith(null);
  });

  it('colar "R$ 12,5" ou "12.50" entende reais, não centavos', () => {
    const { campo, onMudar } = montar(null);
    fireEvent.paste(campo, { clipboardData: { getData: () => 'R$ 12,5' } });
    expect(onMudar).toHaveBeenLastCalledWith(12.5);
    fireEvent.paste(campo, { clipboardData: { getData: () => '1.234,56' } });
    expect(onMudar).toHaveBeenLastCalledWith(1234.56);
    fireEvent.paste(campo, { clipboardData: { getData: () => '12.50' } });
    expect(onMudar).toHaveBeenLastCalledWith(12.5);
  });
});

describe('CampoDeTelefone', () => {
  const montar = (valor = '') => {
    const onMudar = jest.fn();
    render(<CampoDeTelefone rotulo="WhatsApp" valor={valor} onMudar={onMudar} />);
    return { onMudar, campo: screen.getByLabelText('WhatsApp') as HTMLInputElement };
  };

  it('celular brasileiro sai com máscara e devolve só dígitos', () => {
    const { campo, onMudar } = montar('11987654321');
    expect(campo.value).toBe('(11) 98765-4321');
    expect(campo).toHaveAttribute('type', 'tel');
    fireEvent.change(campo, { target: { value: '(11) 98765-432' } });
    expect(onMudar).toHaveBeenLastCalledWith('1198765432');
  });

  it('fixo de 10 dígitos', () => {
    const { campo } = montar('1133334444');
    expect(campo.value).toBe('(11) 3333-4444');
  });

  it('com + é estrangeiro: sem DDD inventado', () => {
    const { campo, onMudar } = montar('+34647520824');
    expect(campo.value).toBe('+34647520824');
    fireEvent.change(campo, { target: { value: '+34 647 520 82' } });
    expect(onMudar).toHaveBeenLastCalledWith('+3464752082');
  });

  it('não passa de 11 dígitos no nacional', () => {
    const { campo, onMudar } = montar('');
    fireEvent.change(campo, { target: { value: '119876543219999' } });
    expect(onMudar).toHaveBeenLastCalledWith('11987654321');
  });
});

describe('EnvioDeImagem', () => {
  const foto = new File(['x'], 'salada.png', { type: 'image/png' });
  const pdf = new File(['x'], 'menu.pdf', { type: 'application/pdf' });

  const montar = (previaUrl = '') => {
    const onEscolher = jest.fn();
    const onRemover = jest.fn();
    const onInvalido = jest.fn();
    const r = render(
      <EnvioDeImagem
        rotulo="Logo"
        previaUrl={previaUrl}
        onEscolher={onEscolher}
        onRemover={onRemover}
        onInvalido={onInvalido}
      />
    );
    return { ...r, onEscolher, onRemover, onInvalido };
  };

  it('escolher pelo campo de arquivo', () => {
    const { onEscolher } = montar();
    fireEvent.change(screen.getByLabelText('Logo'), { target: { files: [foto] } });
    expect(onEscolher).toHaveBeenCalledWith(foto);
  });

  it('arrastar e soltar', () => {
    const { onEscolher, container } = montar();
    const area = container.querySelector('[data-area-de-envio]')!;
    fireEvent.dragOver(area, { dataTransfer: { files: [foto], types: ['Files'] } });
    expect(area).toHaveAttribute('data-arrastando', 'true');
    fireEvent.drop(area, { dataTransfer: { files: [foto] } });
    expect(onEscolher).toHaveBeenCalledWith(foto);
    expect(area).not.toHaveAttribute('data-arrastando');
  });

  it('colar uma imagem copiada', () => {
    const { onEscolher, container } = montar();
    const area = container.querySelector('[data-area-de-envio]')!;
    fireEvent.paste(area, { clipboardData: { files: [foto] } });
    expect(onEscolher).toHaveBeenCalledWith(foto);
  });

  it('arquivo que não é imagem avisa e não escolhe', () => {
    const { onEscolher, onInvalido, container } = montar();
    fireEvent.drop(container.querySelector('[data-area-de-envio]')!, { dataTransfer: { files: [pdf] } });
    expect(onEscolher).not.toHaveBeenCalled();
    expect(onInvalido).toHaveBeenCalledWith(pdf);
  });

  it('com imagem: mostra a prévia, troca e remove', () => {
    const { onRemover } = montar('blob:logo');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:logo');
    expect(screen.getByLabelText('Trocar logo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover logo' }));
    expect(onRemover).toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('id estável entre renderizações (rótulo não perde o campo)', () => {
    const { rerender } = render(<Input label="Bairro" />);
    const antes = screen.getByLabelText('Bairro').id;
    rerender(<Input label="Bairro" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Bairro').id).toBe(antes);
  });
});
