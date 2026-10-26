# Reorganização do painel — 26/10/2026

Dono: "ta tudo meio fragmentado… um monte de feature jogada e mal acabada… ARQUITETA E ORGANIZA
DIREITO COMO UM SENIOR PO". Aprovou as 4 fases e apagar as telas órfãs ("sim e faça tudo").

## Fase 1 — NO AR (dad77fd7, 906f1596)
- Menu por tarefa (navSections.tsx): Pedidos segue o caminho do pedido; Balcão = PDV + Caixa;
  Financeiro = Link de pagamento + Notas fiscais; Clientes vira seção (Lista, Avaliações,
  Fidelidade); Marketing para toda loja (Cupons, Link na Bio); Impressoras e comanda em Configurações.
- Trilha automática ligada (contexto TrilhaAutomatica na casca); títulos = nome do menu.
- Links 404 corrigidos; Tela da cozinha com saída; cifrão do card abre Registrar pagamento;
  texto do Caixa (esperado já soma dinheiro).

## Fase 2 — NO AR (eede4310) — cada configuração no seu lugar
| Configuração | Hoje | Vai para |
|---|---|---|
| Mercado Pago, vale Pagar.me/QR, acréscimo, caixa | Geral → Recebimento | Configurações → Pagamentos |
| Extrato de pagamentos | Configurações → Pagamentos | Financeiro → Pagamentos recebidos |
| Ligar entrega/retirada, prazo (min) | Geral → Entrega e horários | Configurações → Entrega |
| Pedido mínimo | só na criação da loja | Configurações → Entrega |
| Prazo por faixa em "dias úteis" | modal da faixa | remover |
| Aviso de fila humana | Geral → Atendimento | Atendimento → Esperando atendente |
| Link de avaliação do Google | Geral → Avaliações | Clientes → Avaliações |
| Nota fiscal (config) | Geral → Nota fiscal | Financeiro → Notas fiscais |
| Horários/turnos/pausas/agendamento/preparo | Geral → Entrega e horários | Geral → Horários |

## Fase 3 — NO AR (merge 22e73feb) — família de mensagens
- Avisos automáticos = Mensagens prontas + Avisos enviados (abas Textos / Enviados).
- Modelos de mensagem = modelos da Meta (status, sincronizar); sai data/whatsappTemplates.ts.
- Recuperador recebe o texto/liga-desliga dos lembretes de carrinho.
- Chat: sai "Criar Pedido" do painel Ferramentas e a aba "Todas" do inbox; "Templates" → "Modelos".
- Ensinar o bot: "Respostas ensinadas" → "Exemplos de resposta"; Conversão do bot vira aba "Resultado".

## Fase 4 — NO AR (b962848f, 00b2f499, f42207fb) — equipe e limpeza
- Cadastro de entregadores → Configurações (junto de Colaboradores); ranking → Relatórios › Operação.
- Vigias no menu (Relatórios).
- Todas as lojas / StoreDetailPage sem abas e atalhos que repetem o menu; desativar com confirmação.
- Apagar telas órfãs: agents/*, automation/* antigos, conquistas, marketing e-mail/assinantes/
  automações, conversao-do-bot (redirect nas rotas antigas).

## Achados restantes (para depois das fases)
Ver relatórios das 3 frentes resumidos aqui: Início com pedido pendente em 4 blocos e faixa
"Acesso rápido" duplicando menu; Caixa sem confirmação ao fechar e sem histórico; PDV não sabe se o
caixa está aberto; Expedição sem lista de prontos e sem desfazer; Uber Direct visível sem
integração; Link de pagamento com seletor de pedido (duplica cobrança do pedido); Colaboradores sem
mudar papel; Impressoras com dois botões que criam o mesmo agente; Cupons sem "Divulgar";
Avaliações sem ação por linha; Promoção do dia "Enviar agora" sem confirmação; Entrega com 5
mecanismos de preço sem hierarquia.
