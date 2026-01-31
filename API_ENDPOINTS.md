# 📡 API Endpoints - Mapeamento Completo

**Base URL:** `https://web-production-3e83a.up.railway.app/api/v1/`  
**Autenticação:** Token-based (`Authorization: Token <token>`)

---

## 🏪 STORES API

### Root
- `GET /stores/` - Lista todos os endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/stores/stores/` | Listar lojas |
| GET | `/stores/stores/{id}/` | Detalhes da loja |
| GET | `/stores/products/` | Listar produtos |
| GET | `/stores/products/{id}/` | Detalhes do produto |
| GET | `/stores/orders/` | Listar pedidos |
| GET | `/stores/orders/{id}/` | Detalhes do pedido |
| GET | `/stores/coupons/` | Listar cupons |
| GET | `/stores/categories/` | Listar categorias |
| GET | `/stores/customers/` | Listar clientes |
| GET | `/stores/delivery-zones/` | Listar zonas de entrega |
| GET | `/stores/combos/` | Listar combos |
| GET | `/stores/integrations/` | Listar integrações |
| GET | `/stores/webhooks/` | Listar webhooks |

---

## 💬 WHATSAPP API

### Root
- `GET /whatsapp/` - Lista endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/whatsapp/accounts/` | Listar contas WhatsApp |
| GET | `/whatsapp/accounts/{id}/` | Detalhes da conta |
| POST | `/whatsapp/accounts/` | Criar conta |
| PUT | `/whatsapp/accounts/{id}/` | Atualizar conta |
| DELETE | `/whatsapp/accounts/{id}/` | Deletar conta |
| POST | `/whatsapp/accounts/{id}/test/` | Testar conexão |

---

## 💬 CONVERSATIONS API

### Root
- `GET /conversations/` - Lista endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/conversations/` | Listar conversas |
| GET | `/conversations/{id}/` | Detalhes da conversa |
| GET | `/conversations/{id}/messages/` | Mensagens da conversa |
| POST | `/conversations/{id}/send_message/` | Enviar mensagem |
| POST | `/conversations/{id}/close/` | Fechar conversa |
| POST | `/conversations/{id}/assign/` | Atribuir agente |

---

## 🤖 AUTOMATION API

### Root
- `GET /automation/` - Lista endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/automation/companies/` | Listar empresas |
| GET | `/automation/companies/{id}/` | Detalhes da empresa |
| GET | `/automation/companies/{id}/stats/` | Estatísticas |
| POST | `/automation/companies/{id}/regenerate_api_key/` | Regenerar API key |
| POST | `/automation/companies/{id}/regenerate_webhook_secret/` | Regenerar webhook secret |
| GET | `/automation/messages/` | Listar mensagens automáticas |
| GET | `/automation/messages/{id}/` | Detalhes da mensagem |
| POST | `/automation/messages/` | Criar mensagem |
| PUT | `/automation/messages/{id}/` | Atualizar mensagem |
| DELETE | `/automation/messages/{id}/` | Deletar mensagem |
| GET | `/automation/sessions/` | Listar sessões |
| GET | `/automation/logs/` | Listar logs |
| GET | `/automation/report-schedules/` | Agendamentos de relatórios |
| GET | `/automation/reports/` | Relatórios gerados |

---

## 📧 MARKETING API

### Root
- `GET /marketing/` - Lista endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/marketing/templates/` | Listar templates |
| GET | `/marketing/campaigns/` | Listar campanhas |
| GET | `/marketing/campaigns/{id}/` | Detalhes da campanha |
| POST | `/marketing/campaigns/` | Criar campanha |
| PUT | `/marketing/campaigns/{id}/` | Atualizar campanha |
| DELETE | `/marketing/campaigns/{id}/` | Deletar campanha |
| POST | `/marketing/campaigns/{id}/send/` | Enviar campanha |
| POST | `/marketing/campaigns/{id}/cancel/` | Cancelar campanha |
| GET | `/marketing/subscribers/` | Listar assinantes |
| GET | `/marketing/customers/` | Listar clientes |
| GET | `/marketing/automations/` | Listar automações |
| GET | `/marketing/stats/` | Estatísticas |

---

## 🔄 LANGFLOW API

### Root
- `GET /langflow/` - Lista endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/langflow/flows/` | Listar flows |
| GET | `/langflow/flows/{id}/` | Detalhes do flow |
| POST | `/langflow/flows/` | Criar flow |
| PUT | `/langflow/flows/{id}/` | Atualizar flow |
| DELETE | `/langflow/flows/{id}/` | Deletar flow |
| POST | `/langflow/flows/{id}/run/` | Executar flow |
| GET | `/langflow/sessions/` | Listar sessões |

---

## 📷 INSTAGRAM API

### Root
- `GET /instagram/` - Lista endpoints disponíveis

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/instagram/accounts/` | Listar contas Instagram |
| GET | `/instagram/accounts/{id}/` | Detalhes da conta |
| POST | `/instagram/accounts/` | Criar conta |
| PUT | `/instagram/accounts/{id}/` | Atualizar conta |
| DELETE | `/instagram/accounts/{id}/` | Deletar conta |
| GET | `/instagram/conversations/` | Listar conversas |
| GET | `/instagram/messages/` | Listar mensagens |
| GET | `/instagram/webhook-events/` | Eventos webhook |

---

## 📊 DASHBOARD API

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/dashboard/overview/` | Visão geral |
| GET | `/dashboard/charts/` | Dados dos gráficos |
| GET | `/dashboard/stats/` | Estatísticas |

---

## 🔑 AUTH API

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login/` | Login |
| POST | `/auth/logout/` | Logout |
| POST | `/auth/register/` | Registro |
| GET | `/auth/user/` | Dados do usuário |
| PUT | `/auth/user/` | Atualizar usuário |
| POST | `/auth/password/change/` | Alterar senha |
| POST | `/auth/password/reset/` | Resetar senha |

---

## 📅 CAMPAIGNS SCHEDULED API

### Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/campaigns/scheduled/` | Listar mensagens agendadas |
| GET | `/campaigns/scheduled/{id}/` | Detalhes |
| POST | `/campaigns/scheduled/` | Criar agendamento |
| PUT | `/campaigns/scheduled/{id}/` | Atualizar |
| DELETE | `/campaigns/scheduled/{id}/` | Deletar |

---

## ✅ STATUS DOS ENDPOINTS TESTADOS

| Endpoint | Status | Observação |
|----------|--------|------------|
| `/stores/stores/` | ✅ OK | Funcionando |
| `/stores/products/` | ✅ OK | Funcionando |
| `/stores/orders/` | ✅ OK | Funcionando |
| `/whatsapp/accounts/` | ✅ OK | Funcionando |
| `/conversations/` | ✅ OK | Funcionando |
| `/automation/companies/` | ✅ OK | Funcionando |
| `/automation/messages/` | ✅ OK | Funcionando |
| `/marketing/campaigns/` | ✅ OK | Funcionando |
| `/langflow/flows/` | ✅ OK | Funcionando |
| `/instagram/accounts/` | ✅ OK | Funcionando |

---

## 📝 NOTAS

1. Todos os endpoints retornam dados paginados no formato:
   ```json
   {
     "count": 0,
     "next": null,
     "previous": null,
     "results": []
   }
   ```

2. Autenticação é obrigatória para todos os endpoints

3. Filtros disponíveis via query params:
   - `?page=` - Paginação
   - `?page_size=` - Tamanho da página
   - `?search=` - Busca
   - `?ordering=` - Ordenação
   - Filtros específicos por endpoint
