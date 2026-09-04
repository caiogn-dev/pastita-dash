/**
 * A busca de Clientes tem que vir da URL.
 *
 * Sem isso, o link do relatório ("Fulana, em risco") chega em Clientes e cai
 * na lista inteira — a pessoa apontada some no meio de 81 nomes e o dono
 * procura na mão de novo, que é exatamente o trabalho que o link deveria ter
 * eliminado.
 *
 * E vale pelo outro lado também: com a busca na URL, o estado da tela é
 * compartilhável e sobrevive ao F5. Filtro que só existe em `useState` é
 * filtro que se perde ao recarregar.
 */
import { buscaInicialDaUrl, urlDeClienteBuscado } from '../buscaPelaUrl';

describe('busca de clientes pela URL', () => {
  it('lê o termo do parâmetro `busca`', () => {
    expect(buscaInicialDaUrl(new URLSearchParams('busca=63992618115')))
      .toBe('63992618115');
  });

  it('sem parâmetro, começa vazia — a lista inteira é o padrão', () => {
    expect(buscaInicialDaUrl(new URLSearchParams(''))).toBe('');
  });

  it('ignora espaço em volta, que quebra a busca sem dar erro', () => {
    expect(buscaInicialDaUrl(new URLSearchParams('busca=%20%20ana%20%20')))
      .toBe('ana');
  });

  it('monta o link do relatório pelo TELEFONE, não pelo nome', () => {
    // Nome repete e vem sujo do checkout ("ana", "Ana Paula", "ANA P.").
    // O telefone é a chave que o RFM e o cadastro compartilham.
    expect(urlDeClienteBuscado({ phone: '5563992618115', name: 'Leani' }, 'ce-saladas'))
      .toBe('/stores/ce-saladas/customers?busca=5563992618115');
  });

  it('cai no nome quando não há telefone — melhor filtrar mal que não filtrar', () => {
    expect(urlDeClienteBuscado({ phone: '', name: 'Leani Rodrigues' }, 'ce-saladas'))
      .toBe('/stores/ce-saladas/customers?busca=Leani+Rodrigues');
  });

  it('sem telefone e sem nome, não inventa link', () => {
    expect(urlDeClienteBuscado({ phone: '', name: '' }, 'ce-saladas')).toBeNull();
  });

  it('sem loja não monta link — a rota é /stores/:storeId/customers', () => {
    // `/customers?busca=...` é 404. O dono clicava na cliente em risco e caía
    // numa página de erro: a ponte existia e estava quebrada, que é pior que
    // não ter ponte.
    expect(urlDeClienteBuscado({ phone: '5563992618115', name: 'Leani' }, '')).toBeNull();
    expect(urlDeClienteBuscado({ phone: '5563992618115', name: 'Leani' }, null)).toBeNull();
    expect(urlDeClienteBuscado({ phone: '5563992618115', name: 'Leani' })).toBeNull();
  });
});
