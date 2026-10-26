import { buildNavSections } from '../navSections';

const storeHref = (p: string) => `/stores/loja-x/${p}`;
const secoes = (automationEnabled = true) => buildNavSections({ storeHref, automationEnabled });
const acha = (label: string, automationEnabled = true) =>
  secoes(automationEnabled).find((s) => s.label === label)!;
const todosItens = (automationEnabled = true) =>
  secoes(automationEnabled).flatMap((s) => s.items);

it('o menu é dividido em blocos nomeados, não numa lista corrida', () => {
  // Onze seções soltas obrigam a ler tudo para achar uma. Os blocos respondem
  // "isso é coisa de hoje, de catálogo, de crescer ou de ajuste?" antes.
  const grupos = [...new Set(secoes().map((s) => s.grupo))];
  expect(grupos).toEqual(['Operação', 'Catálogo', 'Crescimento', 'Ajustes']);
});

it('toda seção pertence a um bloco', () => {
  for (const s of secoes()) expect(s.grupo).toBeTruthy();
});

it('cada seção tem ícone próprio — ícone repetido faz tudo parecer igual', () => {
  const icones = secoes().map((s) => s.icon);
  expect(new Set(icones).size).toBe(icones.length);
});

it('itens da mesma seção não repetem ícone entre si', () => {
  for (const s of secoes()) {
    const icones = s.items.map((i) => i.icon);
    expect(new Set(icones).size).toBe(icones.length);
  }
});

describe('arquitetura por tarefa (26/10): cada tela mora onde o lojista a procura', () => {
  /**
   * O menu cresceu uma tela por vez, cada uma onde coube no dia: link de
   * pagamento no Balcão, cupom e fidelidade dentro de Cardápio, cozinha e
   * expedição no Balcão, avaliações em Pedidos, impressora (que imprime a
   * COMANDA) dentro de Etiquetas. A régua agora é uma pergunta por seção.
   */
  const hrefs = (label: string, auto = true) => acha(label, auto).items.map((i) => i.href);

  it('Pedidos segue o caminho do pedido: histórico → cozinha → expedição → entrega', () => {
    expect(hrefs('Pedidos')).toEqual([
      '/stores/loja-x/orders/historico',
      '/stores/loja-x/kds',
      '/stores/loja-x/expedicao',
      '/pedidos/equipe',
    ]);
  });

  it('Balcão é só a venda presencial e a gaveta', () => {
    expect(hrefs('Balcão')).toEqual(['/stores/loja-x/pdv', '/stores/loja-x/cash']);
  });

  it('Financeiro junta cobrar e faturar: link de pagamento e notas fiscais', () => {
    expect(acha('Financeiro').items.map((i) => [i.name, i.href])).toEqual([
      ['Link de pagamento', '/payments/link'],
      ['Notas fiscais', '/stores/loja-x/notas-fiscais'],
    ]);
  });

  it('Cardápio é só o que se vende; importar planilha fica por último (é implantação)', () => {
    expect(hrefs('Cardápio')).toEqual([
      '/stores/loja-x/products',
      '/stores/loja-x/combos',
      '/cardapio/importar',
    ]);
  });

  it('Etiquetas é a bancada da etiqueta: tabela nutricional e impressão', () => {
    expect(hrefs('Etiquetas')).toEqual(['/stores/loja-x/ingredientes', '/stores/loja-x/etiquetas']);
  });

  it('Clientes junta quem compra, o que acharam e o que os faz voltar', () => {
    expect(hrefs('Clientes')).toEqual([
      '/stores/loja-x/customers',
      '/avaliacoes',
      '/stores/loja-x/fidelidade',
    ]);
  });

  it('Marketing existe para toda loja (cupom e link na bio); WhatsApp só com WhatsApp', () => {
    expect(hrefs('Marketing', false)).toEqual(['/stores/loja-x/coupons', '/stores/loja-x/link-bio']);
    expect(hrefs('Marketing', true)).toEqual([
      '/stores/loja-x/coupons',
      '/marketing/recuperacao',
      '/marketing/promocao-do-dia',
      '/marketing/whatsapp',
      '/marketing/instagram',
      '/marketing/whatsapp/templates',
      '/stores/loja-x/link-bio',
    ]);
  });
});

// 'Páginas recuperadas' (e-mails automáticos, diagnósticos) ganharam item de
// menu em 19/08 pelo critério de conteúdo ("a tela tem dado"). Em 03/10 o
// critério passou a ser USO MEDIDO nos logs do nginx, e elas saíram do menu
// com as rotas de pé. Ver navSections.enxuto.test.ts.

describe('atendimento deixa de ser um item solto', () => {
  it('primeiro o que se usa conversando, depois o que o bot manda sozinho', () => {
    const at = acha('Atendimento');
    expect(at.items.map((i) => i.href)).toEqual([
      '/inbox/whatsapp',
      '/whatsapp/handover',
      '/atendimento/respostas-rapidas',
      '/atendimento/ensinar-o-bot',
      '/atendimento/avisos-automaticos',
    ]);
  });

  // 26/10: texto (Mensagens prontas) e registro (Avisos enviados) viraram
  // uma tela só, com abas. A busca do Ctrl+K ainda acha pelos nomes antigos.
  it('Avisos automáticos é um item só, achável pelos nomes antigos', () => {
    const item = acha('Atendimento').items.find((i) => i.href === '/atendimento/avisos-automaticos')!;
    expect(item.name).toBe('Avisos automáticos');
    expect(item.tambem).toEqual(expect.arrayContaining(['mensagens prontas', 'fora do horário', 'boas-vindas', 'avisos enviados']));
  });

  it('o badge de não lidas fica no Atendimento', () => {
    const at = buildNavSections({ storeHref, automationEnabled: true, unreadBadge: '3' })
      .find((s) => s.label === 'Atendimento')!;
    expect(at.badge).toBe('3');
  });
});

it('sem automação habilitada, as telas de WhatsApp do Marketing somem — o resto fica', () => {
  const labels = secoes(false).map((s) => s.label);
  expect(labels).not.toContain('Automação');
  const hrefs = todosItens(false).map((i) => i.href);
  expect(hrefs).not.toContain('/marketing/whatsapp');
  expect(hrefs).not.toContain('/marketing/recuperacao');
  expect(labels).toEqual(expect.arrayContaining(['Início', 'Pedidos', 'Atendimento', 'Balcão', 'Cardápio']));
});

it('Configurações: a loja, a entrega, o dinheiro, a vitrine, o equipamento e as pessoas', () => {
  // Colaboradores entrou em 22/09. Impressoras saiu de Etiquetas em 26/10: a
  // mesma tela configura a COMANDA do pedido — morar na bancada de etiqueta
  // escondia o layout da comanda de quem só imprime pedido.
  const cfg = acha('Configurações');
  expect(cfg.items.map((i) => [i.name, i.href])).toEqual([
    ['Geral', '/stores/loja-x/settings'],
    ['Entrega', '/stores/loja-x/delivery'],
    ['Pagamentos', '/stores/loja-x/payments'],
    ['Aparência da loja', '/stores/loja-x/aparencia'],
    ['Impressoras e comanda', '/stores/loja-x/printing'],
    ['Colaboradores', '/colaboradores'],
  ]);
});

it('nenhum link de conta no menu — eles vivem no menu do avatar', () => {
  const hrefs = secoes().flatMap((s) => [s.href, ...s.items.map((i) => i.href)]).filter(Boolean);
  for (const conta of ['/stores', '/accounts', '/connections', '/settings', '/plano']) {
    expect(hrefs).not.toContain(conta);
  }
});

it('não existe href duplicado — dois caminhos para a mesma tela ensinam duas vezes', () => {
  const hrefs = secoes().flatMap((s) => [s.href, ...s.items.map((i) => i.href)]).filter(Boolean);
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

describe('menu não promete tela que nunca teve dado', () => {
  /**
   * Levantamento de 19/08, cruzando as 77 rotas com o banco de produção:
   * AgentFlow 0, FlowSession 0, FlowExecutionLog 0, ScheduledMessage 0,
   * Subscriber 0. O agente de IA nunca rodou em produção (as 14
   * AgentConversation têm 0 mensagens cada), e "Assinantes" lista um modelo
   * paralelo que nada alimenta — o dado real de campanha vive em
   * EmailRecipient (136) e StoreCustomer (100).
   *
   * As ROTAS continuam de pé (link antigo não quebra); só saem do menu, para
   * o painel parar de oferecer o que não entrega. Mesmo tratamento que
   * /automation/logs já recebeu.
   */
  const semDado = ['/automation/flows', '/automation/scheduled', '/marketing/subscribers'];

  it.each(semDado)('%s não aparece no menu', (href) => {
    const todos = secoes().flatMap((s) => s.items.map((i) => i.href));
    expect(todos).not.toContain(href);
  });

  it('Modelos de mensagem CONTINUA no menu — resolve o erro 131047 da janela de 24h', () => {
    const todos = secoes().flatMap((s) => s.items.map((i) => i.href));
    expect(todos).toContain('/marketing/whatsapp/templates');
  });
});

describe('Caixa só aparece para quem usa dinheiro vivo', () => {
  const temCaixa = (opts: { caixaEnabled?: boolean }) =>
    buildNavSections({ storeHref, automationEnabled: true, ...opts })
      .flatMap((s) => s.items)
      .some((i) => i.href === '/stores/loja-x/cash');

  it('sem a preferência dita, o Caixa continua no menu', () => {
    expect(temCaixa({})).toBe(true);
  });

  it('loja que desligou "Uso caixa com dinheiro vivo" não vê o Caixa', () => {
    expect(temCaixa({ caixaEnabled: false })).toBe(false);
  });
});

it('menu sem sigla nem inglês: KDS, TACO, Fila humana e Storefront ganharam nome de balcão', () => {
  const nomes = todosItens().map((i) => i.name);
  expect(nomes).toEqual(expect.arrayContaining(['Tela da cozinha', 'Tabela nutricional', 'Esperando atendente', 'Aparência da loja']));
  for (const velho of ['Cozinha (KDS)', 'Ingredientes e TACO', 'Fila humana', 'Storefront']) {
    expect(nomes).not.toContain(velho);
  }
});
