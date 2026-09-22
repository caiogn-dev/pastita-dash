import {
  PAPEIS,
  PAPEIS_ESCOLHIVEIS,
  descricaoDoPapel,
  nomeDoColaborador,
} from '../papeisDaEquipe';

describe('papéis da equipe', () => {
  it('nunca oferece "Dono" como escolha no convite', () => {
    // A loja tem um dono e ele não se define por formulário. E como o backend
    // bloqueia remover o dono, um clique errado aqui ficaria preso.
    expect(PAPEIS_ESCOLHIVEIS.map((p) => p.valor)).not.toContain('owner');
    expect(PAPEIS_ESCOLHIVEIS).toHaveLength(3);
  });

  it('todo papel explica o que a pessoa vai poder fazer', () => {
    for (const papel of PAPEIS) {
      expect(papel.rotulo).not.toBe(papel.valor); // nada de 'operator' na tela
      expect(papel.resumo.length).toBeGreaterThan(10);
    }
  });

  it('papel desconhecido não quebra a tela', () => {
    expect(descricaoDoPapel('inventado').rotulo).toBe('inventado');
  });
});

describe('nome do colaborador', () => {
  it('prefere o nome de verdade', () => {
    expect(nomeDoColaborador({ first_name: 'Maria', last_name: 'Souza' })).toBe('Maria Souza');
  });

  it('nunca mostra e-mail de fachada nem login interno', () => {
    // `{telefone}@pastita.local` e `cliente_...` são preenchimento do sistema.
    expect(nomeDoColaborador({ email: '5563999990001@pastita.local' })).toBe('Sem nome');
    expect(nomeDoColaborador({ username: 'cliente_5563999990001' })).toBe('Sem nome');
  });

  it('e-mail de verdade serve como último recurso', () => {
    expect(nomeDoColaborador({ email: 'maria@gmail.com' })).toBe('maria@gmail.com');
  });
});
