/**
 * Editor de descrição (30/jul): parser espelha o cardapidex-web e o preview
 * renderiza por segmentos React — nunca HTML injetado (segurança primeiro).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DescriptionEditor, { DescriptionPreview } from '../DescriptionEditor';
import { parseDescriptionBlocks, parseInline } from '../productDescription';

describe('parseInline', () => {
  it('reconhece negrito, itálico e riscado estilo WhatsApp', () => {
    expect(parseInline('*a* _b_ ~c~').map((s) => s.style)).toEqual([
      'bold', 'text', 'italic', 'text', 'strike',
    ]);
    expect(parseInline('**forte**')[0]).toEqual({ style: 'bold', text: 'forte' });
  });

  it('asterisco solto não engole o resto do texto', () => {
    expect(parseInline('500g * serve 2')).toEqual([
      { style: 'text', text: '500g * serve 2' },
    ]);
  });
});

describe('parseDescriptionBlocks', () => {
  it('separa parágrafos, listas e rótulos', () => {
    const blocks = parseDescriptionBlocks(
      'Massa artesanal\n\n- Molho\n- Queijo\nServe: 2 pessoas'
    );
    expect(blocks).toEqual([
      { type: 'p', text: 'Massa artesanal' },
      { type: 'ul', items: ['Molho', 'Queijo'] },
      { type: 'p', label: 'Serve', text: '2 pessoas' },
    ]);
  });
});

describe('DescriptionPreview', () => {
  it('renderiza markup como texto React, nunca HTML injetado', () => {
    const xss = '<img src=x onerror=alert(1)> *ok*';
    const { container } = render(<DescriptionPreview text={xss} />);
    // O payload aparece literal (texto), não vira elemento <img>
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.querySelector('strong')?.textContent).toBe('ok');
  });
});

describe('DescriptionEditor', () => {
  it('botão de negrito envolve a seleção com asteriscos', () => {
    const onChange = jest.fn();
    render(<DescriptionEditor value="massa fresca" onChange={onChange} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);
    fireEvent.click(screen.getByTitle('Negrito (*texto*)'));
    expect(onChange).toHaveBeenCalledWith('*massa* fresca');
  });

  it('preview ao vivo reflete o valor', () => {
    render(<DescriptionEditor value="*Rondelli* da casa" onChange={() => {}} />);
    expect(screen.getByText('Rondelli').tagName).toBe('STRONG');
  });
});
