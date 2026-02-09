# ANÁLISE COMPLETA - Meta de Implementação

## 📊 CONTEXTO GERAL

### Projetos Envolvidos:
1. **pastita-dash** (Dashboard Admin) - Frontend React para gestão
2. **pastita-3d** (Cardápio 3D) - Frontend público para clientes fazerem pedidos
3. **Backend API** (Django) - API que serve ambos

---

## ✅ O QUE JÁ FOI IMPLEMENTADO

### 1. Backend Fixes (08/02/2026)
| Fix | Arquivo | Status |
|-----|---------|--------|
| WhatsApp Import Error | `/app/apps/conversations/api/views.py` | ✅ |
| Duplicate Message Processing | `/app/apps/whatsapp/webhooks/views.py` | ✅ |
| Phone Number Formatting | `/app/apps/whatsapp/tasks/__init__.py` | ✅ |
| Coupon Stats 500 Error | `/app/apps/stores/api/views/coupon_views.py` | ✅ |

### 2. WhatsApp Module (Dashboard)
| Feature | Status | Arquivo |
|---------|--------|---------|
| Lista de Contas | ✅ | `WhatsAppAccounts.tsx` |
| Chat Interface | ✅ | `WhatsAppChatPage.tsx` |
| Envio de Texto | ✅ | `whatsapp.ts` |
| Envio de Mídia | ✅ | `whatsapp.ts` |
| Templates | ✅ | `WhatsAppTemplatesPage.tsx` |
| WebSocket | ✅ | `WhatsAppWsContext` |
| Webhook Diagnostics | ✅ | `WebhookDiagnosticsPage.tsx` |
| Campanhas | ✅ | `WhatsAppCampaignsPage.tsx` |

### 3. Instagram Module (Dashboard)
| Feature | Status | Arquivo |
|---------|--------|---------|
| Lista de Contas | ✅ | `InstagramAccounts.tsx` |
| Inbox/DM | ✅ (corrigido) | `InstagramInbox.tsx` |
| Serviço API | ✅ (corrigido) | `instagram.ts` |
| Stories | ❌ | Não implementado |
| Reels | ❌ | Não implementado |
| Live | ❌ | Não implementado |
| Shopping/Catálogo | ❌ | Não implementado |

### 4. Messenger Module (Dashboard)
| Feature | Status | Observação |
|---------|--------|------------|
| Serviço API | ✅ | `messenger.ts` existe |
| Páginas | ❌ | NÃO EXISTEM |
| Rotas | ❌ | NÃO CONFIGURADAS |
| Navegação | ❌ | NÃO APARECE NO SIDEBAR |

**🚨 CRÍTICO: Messenger está 100% inacessível no dashboard!**

### 5. Conversations Module
| Feature | Status | Arquivo |
|---------|--------|---------|
| Lista Unificada | ✅ | `ConversationsPage.tsx` |
| Handover Status | ⚠️ Parcial | Mostra badge mas não tem ação |
| Bot ↔ Human Transfer | ❌ | Não implementado botão de transferência |

### 6. AI Agents Module
| Feature | Status |
|---------|--------|
| Lista de Agentes | ✅ |
| Criar/Editar | ✅ |
| Testar | ✅ |
| Integração WhatsApp | ✅ (configurado) |

---

## ❌ O QUE ESTÁ FALTANDO (CRÍTICO)

### 1. Messenger Platform - 0% ACESSÍVEL
```
Problema: O serviço messenger.ts existe mas NÃO TEM:
- Páginas de inbox/contas/broadcast
- Rotas no App.tsx
- Menu no Sidebar
```

**Arquivos necessários:**
- `src/pages/messenger/MessengerInbox.tsx`
- `src/pages/messenger/MessengerAccounts.tsx`
- `src/pages/messenger/MessengerBroadcast.tsx`
- `src/pages/messenger/index.ts`

**Configurações necessárias:**
- Adicionar rotas em `App.tsx`
- Adicionar menu no `Sidebar.tsx`

### 2. Handover Protocol - 30%
```
Problema: Visual existe mas funcionalidade não
```

**O que falta:**
- Botão "Transferir para Humano" no chat
- Botão "Transferir para Bot" no chat
- API endpoint para handover no backend
- WebSocket eventos para handover realtime

### 3. Instagram Completo - 40%
```
O que falta:
- Stories management
- Reels management  
- Live streaming
- Shopping/Catálogo
- Comments management
```

### 4. API Pública para Cardápio (pastita-3d)
```
Problema reportado: 
"/catalog só está acessível quando eu estou logado... 
para meu cardapio não é bom"

Solução necessária:
- Criar endpoints públicos (AllowAny permission)
- Separar API de admin vs API pública
- Endpoint: GET /api/v1/public/catalog/<store_slug>/
```

---

## 🔧 ENDPOINTS QUE PRECISAM EXISTIR

### API Pública (Sem Autenticação)
```python
# Para o cardápio 3D funcionar
GET /api/v1/public/stores/<slug>/           # Info da loja
GET /api/v1/public/stores/<slug>/products/  # Lista de produtos
GET /api/v1/public/stores/<slug>/catalog/   # Catálogo completo
GET /api/v1/public/products/<id>/           # Detalhe do produto
POST /api/v1/public/orders/                 # Criar pedido (público)
```

### Handover Protocol
```python
# Backend endpoints necessários
POST /api/v1/conversations/<id>/handover/bot/    # Transferir para bot
POST /api/v1/conversations/<id>/handover/human/  # Transferir para humano
GET /api/v1/conversations/<id>/handover/status/  # Status atual
```

---

## 📋 PLANO DE AÇÃO COMPLETO

### FASE 1: Messenger (Prioridade Máxima)
- [ ] Criar páginas do Messenger
- [ ] Adicionar rotas no App.tsx
- [ ] Adicionar menu no Sidebar
- [ ] Testar integração com backend

### FASE 2: Handover Protocol
- [ ] Criar botões de transferência no chat
- [ ] Implementar endpoints no backend
- [ ] WebSocket para atualização em tempo real
- [ ] Testar fluxo bot ↔ humano

### FASE 3: API Pública (pastita-3d)
- [ ] Criar viewsets públicos no Django
- [ ] Configurar permissões AllowAny
- [ ] Criar serializers específicos (sem dados sensíveis)
- [ ] Testar acesso sem autenticação

### FASE 4: Instagram Complementar
- [ ] Stories management
- [ ] Reels management
- [ ] Comments

---

## 🎯 STATUS ATUAL GERAL

| Módulo | Progresso | Status |
|--------|-----------|--------|
| WhatsApp | 90% | ✅ Quase completo |
| Instagram | 50% | ⚠️ Inbox ok, falta resto |
| Messenger | 10% | 🚨 CRÍTICO - Inacessível |
| Handover | 30% | ⚠️ Visual apenas |
| Conversations | 70% | ⚠️ Falta handover actions |
| AI Agents | 80% | ✅ Funcional |
| API Pública | 0% | 🚨 Necessária para pastita-3d |

**Nota Geral: 5.5/10** (conforme avaliação anterior)

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

1. **IMEDIATO**: Implementar páginas do Messenger (2-3 horas)
2. **HOJE**: Criar API pública para cardápio (2-3 horas)
3. **AMANHÃ**: Implementar Handover Protocol completo (3-4 horas)
4. **DEPOIS**: Completar Instagram (stories, reels, etc)
