/**
 * A régua de audiência do painel: atalhos, conflitos e o aviso antes do envio.
 */
import {
  ATALHOS,
  atalhoAtivo,
  avisoDaAudiencia,
  conflitoNosFiltros,
  filtrosVazios,
} from '../segmentosDeAudiencia';

describe('atalhos', () => {
  it('todo atalho explica por que vale disparar', () => {
    // Um atalho sem justificativa é só mais um botão. A frase é o que faz o
    // dono escolher em vez de cair no "todos" de sempre.
    ATALHOS.forEach((a) => {
      expect(a.nome.length).toBeGreaterThan(0);
      expect(a.porque.length).toBeGreaterThan(10);
    });
  });

  it('nenhum atalho nasce com filtro vazio', () => {
    // Atalho sem filtro seria "todos" com outro nome — exatamente o que esta
    // entrega existe para acabar.
    ATALHOS.forEach((a) => {
      expect(filtrosVazios(a.filtros)).toBe(false);
    });
  });

  it('reconhece o atalho quando os filtros batem exatamente', () => {
    expect(atalhoAtivo({ recencia: ['inativo'] })).toBe('sumidos');
    expect(atalhoAtivo({ frequencia: ['vip'] })).toBe('vips');
  });

  it('não reconhece atalho quando há filtro extra', () => {
    // O dono partiu do atalho e refinou: destacar o botão como se nada tivesse
    // mudado esconderia o refinamento dele.
    expect(atalhoAtivo({ recencia: ['inativo'], ticket_min: 50 })).toBeNull();
  });
});

describe('conflitos que devolveriam lista vazia', () => {
  it('nunca comprou + VIP é impossível e diz por quê', () => {
    const erro = conflitoNosFiltros({ recencia: ['nunca_comprou'], frequencia: ['vip'] });
    expect(erro).toContain('nunca comprou');
  });

  it('nunca comprou + ticket é impossível', () => {
    expect(conflitoNosFiltros({ recencia: ['nunca_comprou'], ticket_min: 30 })).toBeTruthy();
  });

  it('mínimo acima do máximo é erro de digitação, não segmento', () => {
    expect(conflitoNosFiltros({ ticket_min: 90, ticket_max: 10 })).toBeTruthy();
  });

  it('combinação legítima não acusa conflito', () => {
    expect(conflitoNosFiltros({ recencia: ['inativo'], frequencia: ['vip'] })).toBeNull();
    expect(conflitoNosFiltros({})).toBeNull();
  });
});

describe('aviso antes do disparo', () => {
  it('lista vazia avisa e sugere o conserto', () => {
    const aviso = avisoDaAudiencia(0, 0);
    expect(aviso?.tom).toBe('vazio');
    expect(aviso?.texto).toContain('Afrouxe');
  });

  it('amostra minúscula avisa que o resultado não vai dizer nada', () => {
    // As duas campanhas antigas da Cê Saladas tinham 1 destinatário: "100% de
    // leitura" sobre uma mensagem é ruído com cara de dado.
    expect(avisoDaAudiencia(3, 0)?.tom).toBe('pequena');
    expect(avisoDaAudiencia(1, 0)?.texto).toContain('1 pessoa');
  });

  it('lista saudável sem opt-out não enche a tela de aviso', () => {
    expect(avisoDaAudiencia(250, 0)).toBeNull();
  });

  it('lista saudável informa quem foi excluído por ter pedido para sair', () => {
    const aviso = avisoDaAudiencia(250, 5);
    expect(aviso?.tom).toBe('ok');
    expect(aviso?.texto).toContain('5');
  });
});
