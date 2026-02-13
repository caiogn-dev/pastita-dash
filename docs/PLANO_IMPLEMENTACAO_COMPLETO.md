# PLANO COMPLETO DE IMPLEMENTAÇÃO - ANÁLISE DO CHAT

## ✅ O QUE JÁ FOI FEITO

### Frontend (pastita-dash)
| Módulo | Status | Arquivos |
|--------|--------|----------|
| WhatsApp | 85% | Chat, Templates, Campanhas |
| Instagram Inbox | 100% | DM funcional ✅ |
| Messenger | 100% | Inbox + Accounts ✅ |
| Handover Protocol | 100% | Service + Hooks ✅ |

### Backend
| Módulo | Status | Observação |
|--------|--------|------------|
| WhatsApp | 90% | Funcional, agente com bug |
| Instagram | ? | Endpoints precisam ser verificados |
| Messenger | ? | Endpoints precisam ser verificados |
| Handover | 0% | Documentado, não instalado |
| API Pública | 100% | ✅ Funcionando |

---

## ❌ O QUE ESTÁ FALTANDO

### 1. Backend - Handover Protocol (CRÍTICO)
```
Status: Documentado mas não instalado
Ação: Copiar arquivos docs/backend_handover_*.py para /app/apps/handover/
```

### 2. Backend - Instagram Endpoints
```
Precisa verificar se existem:
- GET /instagram/conversations/?account_id={id}
- GET /instagram/messages/?conversation_id={id}
- POST /instagram/send-message/
- POST /instagram/typing/
- POST /instagram/mark-seen/
```

### 3. Backend - Messenger Endpoints
```
Precisa verificar se existem:
- GET /messenger/conversations/?account={id}
- GET /messenger/conversations/{id}/messages/
- POST /messenger/conversations/{id}/send-message/
- POST /messenger/conversations/{id}/mark-read/
```

### 4. Backend - Agente respondendo inativo (BUG)
```
Problema: Agente responde mesmo quando is_active=False
Solução: Adicionar verificação em webhook e tasks
```

### 5. Frontend - Instagram Stories/Reels/Live (BAIXA PRIORIDADE)
```
Não crítico para operação. Pode ser feito depois.
```

---

## 📋 PLANO DE AÇÃO DETALHADO

### FASE 1: Backend Handover Protocol (2 horas)
1. [ ] Criar estrutura /app/apps/handover/
2. [ ] Copiar models.py, serializers.py, views.py, urls.py, consumers.py
3. [ ] Adicionar a INSTALLED_APPS
4. [ ] Criar migrações
5. [ ] Aplicar migrações
6. [ ] Configurar URLs
7. [ ] Testar endpoints

### FASE 2: Backend Instagram/Messenger Endpoints (1 hora)
1. [ ] Verificar quais endpoints existem
2. [ ] Criar endpoints que faltam
3. [ ] Testar integração

### FASE 3: Backend Fix Agente Inativo (30 min)
1. [ ] Adicionar verificação em webhook
2. [ ] Adicionar verificação em tasks
3. [ ] Adicionar invalidação de cache
4. [ ] Testar

### FASE 4: Frontend Atualizações (1 hora)
1. [ ] Adicionar página de debug do agente
2. [ ] Integrar handover nos componentes de chat
3. [ ] Adicionar indicadores visuais

### FASE 5: Testes Finais (30 min)
1. [ ] Testar fluxo completo
2. [ ] Verificar build
3. [ ] Commit e push

---

## 🚀 IMPLEMENTAÇÃO

Vou começar pela FASE 1.
