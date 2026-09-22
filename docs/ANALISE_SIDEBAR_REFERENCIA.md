# Mapa da referência × nosso painel (21/set/2026)

Sidebar completa do `admin.prefirodelivery.com`, categoria por categoria, ao
lado do que o Cardapidex tem hoje. Levantada do DOM, não de memória.

Legenda: ✅ temos · 🟡 temos parcial · ❌ não temos · 💰 vale dinheiro direto

---

## 1. Pedidos
| Eles | Nós | |
|---|---|---|
| Histórico | ✅ Pedidos + Histórico | |
| **Avaliações** (`/pedidos/avaliacoes`) | 🟡 coletamos nota por WhatsApp, **sem tela** | 💰 prova social; hoje a nota morre no banco |

## 2. Clientes
| Eles | Nós | |
|---|---|---|
| Ver clientes | ✅ CRM | |
| Cashback | ✅ | |
| **Programa de pontos** | 🟡 temos carimbo/fidelidade | avaliar se é a mesma coisa |
| **Clube de benefícios** (assinatura do cliente) | ❌ | 💰 receita recorrente DA LOJA: cliente paga mensalidade por frete grátis/desconto |

## 3. Produtos
| Eles | Nós | |
|---|---|---|
| Cardápio | ✅ | |
| **Estoque** (tela própria) | 🟡 campo por produto, sem tela de gestão | |
| Categorias | 🟡 dentro do cardápio | |
| **Acompanhamentos** (adicionais reutilizáveis) | 🟡 grupos de opção por produto | reaproveitar entre produtos economiza horas de cadastro |
| **Embalagens** (custo de embalagem) | ❌ | entra na margem real do prato |

## 4. Relatórios — **a maior diferença**
| Eles | Nós |
|---|---|
| Resumo executivo | 🟡 Visão geral |
| Vendas | ✅ |
| Clientes | ✅ |
| Produtos | ❌ (curva ABC, o que sai junto) |
| Operação | ✅ |
| **Marketing** (retorno por campanha) | ❌ 💰 |
| **Estoque** | ❌ |
| **Inteligência** (recomendações) | 🟡 temos Insights de conversa |

## 5. Marketing — **onde eles são mais fortes**
| Eles | Nós | |
|---|---|---|
| **Recuperador de vendas** | 🟡 lembrete de carrinho existe, **sem painel** | 💰 ver abaixo |
| **Públicos** (segmentos salvos, reutilizáveis) | ❌ | 💰 base de tudo |
| Campanhas | ✅ | |
| Automação (jornadas) | 🟡 Respostas/Mensagens automáticas | |
| Cupons | ✅ | |
| **Afiliados** | ❌ | 💰 indicação paga |
| **Banners** (do cardápio, com IA) | ❌ | |
| Link para bio | ✅ | |
| **Páginas** (institucionais) | ❌ | |
| **Informativos** (avisos no cardápio) | ❌ | |

## 6. Financeiro — **nosso maior buraco**
| Eles | Nós |
|---|---|
| Visão geral | 🟡 espalhado |
| **Lançamentos** (entradas/saídas) | ❌ |
| Caixa | ✅ |
| **Comissões** (entregador/afiliado) | ❌ |
| Notas fiscais | ✅ |
| **Cadastros** (centros de custo, fornecedores) | ❌ |
| **Relatórios financeiros** (DRE simples) | ❌ 💰 |

## 7. Configurações
| Eles | Nós | |
|---|---|---|
| Dados da loja | ✅ Geral | |
| Definições do sistema | 🟡 | |
| **Origem dos clientes** ("como nos conheceu") | ❌ | 💰 diz onde gastar marketing |
| Chatbot | ✅ | |
| **Entregadores** | ❌ | temos Toca Delivery, não entregador próprio |
| **Colaboradores** (usuários + papéis) | 🟡 backend tem StoreTeamMember, **sem tela** | |
| Aparência da loja | ✅ Storefront | |
| Área de entrega | ✅ | |
| Horários e agendamento | ✅ | |
| Formas de pagamento | ✅ | |
| Impressão automática | ✅ | |
| Integrações | ✅ Conexões | |

## Topo (fora das categorias)
Conquistas ✅ · **Chamados** (suporte dentro do painel) ❌ · **Indique e ganhe** ❌ · Central de Pedidos ✅

---

## O Recuperador de vendas, em detalhe

Vale descrever porque é o melhor exemplo de "mesma função, produto melhor".

Nós temos os lembretes de carrinho funcionando e **nenhuma tela**. Eles têm um
painel com seis números: carrinhos abandonados, valor abandonado (com ticket
médio), mensagens enviadas, carrinhos recuperados, valor recuperado e
**oportunidade perdida**. Mais abas: resultado anual, funil do período,
abandono por horário, ticket × recuperação, status dos disparos.

E quando o recurso está desligado, a tela mostra o histórico assim mesmo com
um aviso: "o histórico já aparece abaixo; ative para enviar". Mostra o valor
antes de pedir a adesão — é o padrão `EmptyState variante=ativacao` que nosso
design system já tem.

## Ordem sugerida (valor ÷ esforço)

1. **Públicos com query builder** — destrava campanha de verdade. Backend já
   guarda `audience_filters` em JSON.
2. **Painel do recuperador de vendas** — os dados já existem; falta a tela.
3. **Tela de avaliações** — as notas já chegam e ninguém as vê.
4. **Relatório de produtos** (curva ABC) — dado pronto em `StoreOrderItem`.
5. **Colaboradores** — o backend já tem papéis; a loja não consegue convidar
   ninguém sem nós.
6. **Origem dos clientes** — um campo no checkout responde "onde anunciar".
7. Clube de benefícios, afiliados, financeiro completo — projetos maiores.
