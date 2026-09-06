/**
 * O campo de busca comum ignorava quem o chamava — por isso oito páginas
 * desenharam o seu.
 *
 * `SearchInput` guardava o texto num `useState` interno e passava
 * `value={value}` para o `Input`. O `value` que o chamador mandasse era
 * sobrescrito, e o `onChange` do chamador, substituído: a página só recebia
 * notícia da busca quando o usuário apertava Enter, via `onSearch`.
 *
 * Isso quebra o padrão que TODAS as listas do painel usam — busca que filtra
 * enquanto se digita, com o texto vivendo no estado da página (porque também
 * vai para a URL, para o `debounce` e para a chamada da API). Um componente
 * que não deixa o chamador ser dono do valor não serve para o caso que ele
 * deveria cobrir, então cada tela redesenhou a lupa absoluta com um `input`
 * atrás. Oito vezes.
 *
 * Agora ele é controlado quando recebe `value`, e continua funcionando
 * sozinho quando não recebe.
 */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { SearchInput } from '../input';

describe('campo de busca', () => {
  it('controlado: o valor é o do chamador, e cada tecla avisa', () => {
    const aoDigitar = jest.fn();
    render(<SearchInput value="sal" onChange={(e) => aoDigitar(e.target.value)} />);

    const campo = screen.getByRole('searchbox');
    expect(campo).toHaveValue('sal');

    fireEvent.change(campo, { target: { value: 'sala' } });
    expect(aoDigitar).toHaveBeenCalledWith('sala');
  });

  it('controlado: sem o chamador atualizar, o texto NÃO muda sozinho', () => {
    // A prova de que o estado interno não está mais mandando.
    render(<SearchInput value="sal" onChange={jest.fn()} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'outra coisa' } });

    expect(screen.getByRole('searchbox')).toHaveValue('sal');
  });

  it('não controlado: continua guardando o próprio texto', () => {
    render(<SearchInput onSearch={jest.fn()} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'arroz' } });

    expect(screen.getByRole('searchbox')).toHaveValue('arroz');
  });

  it('Enter dispara a busca com o texto que está na tela', () => {
    const onSearch = jest.fn();
    const Tela = () => {
      const [v, setV] = useState('');
      return <SearchInput value={v} onChange={(e) => setV(e.target.value)} onSearch={onSearch} />;
    };
    render(<Tela />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'suco' } });
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledWith('suco');
  });

  it('o X limpa avisando o chamador — senão a página fica filtrando um texto que sumiu', () => {
    const aoDigitar = jest.fn();
    render(<SearchInput value="sal" onChange={(e) => aoDigitar(e.target.value)} />);

    fireEvent.click(screen.getByRole('button', { name: /limpar/i }));

    expect(aoDigitar).toHaveBeenCalledWith('');
  });
});
