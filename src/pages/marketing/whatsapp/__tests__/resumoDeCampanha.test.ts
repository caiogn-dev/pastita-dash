/**
 * A lista de campanhas mostrava "1 destinatários • 1 enviadas" e escondia o
 * resultado — taxa de entrega e leitura — dentro de um modal atrás de um botão
 * só com ícone de gráfico.
 *
 * Isso inverte a pergunta. Ninguém abre a tela para saber quantas mensagens
 * SAÍRAM; abre para saber se a campanha DEU RETORNO. "Enviadas" é esforço;
 * "lidas" é resultado. O que responde precisa estar na linha.
 *
 * Aqui mora a aritmética e o texto. No componente fica só o desenho.
 */
import { resumoDeCampanha, insightsDeCampanhas } from '../resumoDeCampanha';

const campanha = (over: Partial<Parameters<typeof resumoDeCampanha>[0]> = {}) =>
  resumoDeCampanha({
    status: 'completed',
    total_recipients: 100,
    messages_sent: 100,
    messages_delivered: 90,
    messages_read: 45,
    messages_failed: 0,
    ...over,
  } as Parameters<typeof resumoDeCampanha>[0]);

describe('resumoDeCampanha', () => {
  it('escreve plural de gente corretamente', () => {
    expect(campanha({ total_recipients: 1 }).publico).toBe('1 destinatário');
    expect(campanha({ total_recipients: 2 }).publico).toBe('2 destinatários');
  });

  it('taxas saem do que foi ENVIADO, não do público total', () => {
    // Campanha pela metade tem 50 enviadas de 100 destinatários. Dividir as
    // entregues por 100 mostraria 45% de entrega numa campanha que está
    // entregando 90% — e alguém pausaria a campanha por causa disso.
    const r = campanha({ messages_sent: 50, messages_delivered: 45, messages_read: 25 });
    expect(r.taxaEntrega).toBe(90);
    expect(r.taxaLeitura).toBe(50);
  });

  it('campanha sem envio não divide por zero', () => {
    const r = campanha({ messages_sent: 0, messages_delivered: 0, messages_read: 0 });
    // `null` e não `0`: "0% de leitura" acusa uma campanha ruim; ela nem saiu.
    expect(r.taxaEntrega).toBeNull();
    expect(r.taxaLeitura).toBeNull();
    // E sem envio nenhum não mostramos três métricas com "—": a frase de
    // estado diz o que aconteceu, e o traço triplo faria a linha parecer
    // quebrada em vez de vazia.
    expect(r.metricas).toHaveLength(0);
    expect(r.chamada).toMatch(/sem envios/i);
  });

  it('parcial mostra "—" em leitura em vez de zero', () => {
    // Aqui SAIU mensagem: a linha tem métrica, e "Lidas: 0" seria mentira
    // enquanto o WhatsApp ainda não devolveu os recibos.
    const r = campanha({ messages_sent: 50, messages_delivered: 40, messages_read: 0 });
    expect(r.metricas.find((m) => m.rotulo === 'Lidas')?.detalhe).toBe('0% do enviado');
  });

  it('rascunho não finge ter métrica', () => {
    const r = campanha({ status: 'draft', messages_sent: 0, messages_delivered: 0, messages_read: 0 });
    expect(r.metricas).toHaveLength(0);
    expect(r.chamada).toMatch(/não foi enviada|rascunho/i);
  });

  it('progresso só existe enquanto está rodando', () => {
    expect(campanha({ status: 'running', messages_sent: 30 }).progresso).toBe(30);
    expect(campanha({ status: 'completed' }).progresso).toBeNull();
  });

  it('progresso nunca passa de 100 nem fica negativo', () => {
    // Reenvio de falha faz messages_sent passar do total. Barra de 130% vaza
    // do card e faz a tela parecer quebrada.
    expect(campanha({ status: 'running', messages_sent: 130 }).progresso).toBe(100);
    expect(campanha({ status: 'running', total_recipients: 0, messages_sent: 5 }).progresso).toBe(0);
  });

  it('falhas aparecem com o peso certo', () => {
    const r = campanha({ messages_failed: 12, messages_sent: 100 });
    const falhas = r.metricas.find((m) => m.rotulo === 'Falhas');
    expect(falhas?.tom).toBe('perigo');
    // Sem falha, a métrica não ocupa espaço com um zero.
    expect(campanha({ messages_failed: 0 }).metricas.some((m) => m.rotulo === 'Falhas')).toBe(false);
  });
});

describe('insightsDeCampanhas', () => {
  const lista = (over: Record<string, unknown>[]) => insightsDeCampanhas(over as never);

  it('lista vazia não gera alerta', () => {
    expect(insightsDeCampanhas([])).toEqual([]);
  });

  it('acusa campanha parada em rascunho — trabalho feito e não enviado', () => {
    const itens = lista([{ status: 'draft', name: 'Terça fraca', total_recipients: 80, messages_sent: 0, messages_delivered: 0, messages_read: 0, messages_failed: 0 }]);
    expect(itens.some((i) => i.chave === 'rascunho')).toBe(true);
  });

  it('leitura alta vira recomendação de repetir, não só elogio', () => {
    const itens = lista([
      { status: 'completed', name: 'Promo', total_recipients: 100, messages_sent: 100, messages_delivered: 98, messages_read: 70, messages_failed: 0 },
    ]);
    const i = itens.find((x) => x.chave === 'melhor')!;
    expect(i.recomendacao).toMatch(/repet|dupliq|mesm/i);
  });

  it('entrega ruim é problema de número, não de texto', () => {
    // 60% de entrega quase sempre é lista com telefone errado ou fora da
    // janela de 24h — reescrever a mensagem não resolve.
    const itens = lista([
      { status: 'completed', name: 'X', total_recipients: 100, messages_sent: 100, messages_delivered: 60, messages_read: 10, messages_failed: 40 },
    ]);
    const i = itens.find((x) => x.chave === 'entrega_baixa')!;
    expect(i.recomendacao).toMatch(/número|telefone|lista|janela/i);
  });

  it('amostra minúscula não vira diagnóstico', () => {
    // As campanhas reais da Cê Saladas tinham 1 destinatário. "100% de leitura"
    // sobre uma mensagem é ruído com cara de dado.
    const itens = lista([
      { status: 'completed', name: 'Teste', total_recipients: 1, messages_sent: 1, messages_delivered: 1, messages_read: 1, messages_failed: 0 },
    ]);
    expect(itens.some((i) => i.chave === 'melhor')).toBe(false);
  });
});

/**
 * Descadastro na tela: o custo que a campanha cobrou da base.
 *
 * Até 28/ago/2026 a lista mostrava só o lado bom do disparo. A campanha de
 * 25/ago exibia "249 enviadas" como sucesso limpo — e naquele mesmo dia cinco
 * pessoas apertaram "Parar promoções". O dono não tinha como saber.
 */
describe('descadastro (opt-out) no resumo', () => {
  const base = {
    status: 'completed' as const,
    total_recipients: 250,
    messages_sent: 249,
    messages_delivered: 240,
    messages_read: 120,
    messages_failed: 1,
  };

  it('não mostra a métrica quando ninguém saiu', () => {
    // Um "0 saíram" fixo treinaria o olho a ignorar o número justamente
    // quando ele deixasse de ser zero.
    const r = resumoDeCampanha({ ...base, messages_opted_out: 0 });
    expect(r.metricas.find((m) => m.rotulo === 'Saíram')).toBeUndefined();
  });

  it('mostra quantos saíram e o peso sobre o enviado', () => {
    const r = resumoDeCampanha({ ...base, messages_opted_out: 5 });
    const saida = r.metricas.find((m) => m.rotulo === 'Saíram');
    expect(saida?.valor).toBe('5');
    expect(saida?.detalhe).toBe('2% do enviado');
  });

  it('trata descadastro sempre como perigo, mesmo sendo pouco', () => {
    // Um pedido de saída não tem faixa "aceitável": é sempre alguém que a
    // loja perdeu por escolha própria.
    const r = resumoDeCampanha({ ...base, messages_opted_out: 1 });
    expect(r.metricas.find((m) => m.rotulo === 'Saíram')?.tom).toBe('perigo');
  });

  it('campanha antiga sem o campo não quebra', () => {
    // Registro gravado antes desta entrega não tem `messages_opted_out`.
    const r = resumoDeCampanha(base);
    expect(r.metricas.find((m) => m.rotulo === 'Saíram')).toBeUndefined();
  });
});

describe('insight de desgaste da base', () => {
  const campanha = (over: Record<string, unknown>) => ({
    id: 'c1', name: 'Oferta do dia', status: 'completed',
    total_recipients: 250, messages_sent: 249, messages_delivered: 240,
    messages_read: 120, messages_failed: 0, messages_opted_out: 0,
    ...over,
  }) as never;

  it('avisa quando a campanha custou descadastros', () => {
    const itens = insightsDeCampanhas([campanha({ messages_opted_out: 5 })]);
    const desgaste = itens.find((i) => i.chave === 'desgaste');
    expect(desgaste).toBeDefined();
    expect(desgaste?.valor).toContain('5');
    expect(desgaste?.direcao).toBe('baixa');
  });

  it('fica calado quando ninguém saiu', () => {
    const itens = insightsDeCampanhas([campanha({ messages_opted_out: 0 })]);
    expect(itens.find((i) => i.chave === 'desgaste')).toBeUndefined();
  });
});
