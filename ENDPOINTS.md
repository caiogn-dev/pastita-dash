# API Endpoints - Cê Saladas

## Ordem de Pedidos

### Criar Pedido
```
POST /api/v1/stores/ce-saladas/orders/
Content-Type: application/json
Authorization: Token {auth_token}

Body: {
  "items": [...],
  "customer_name": "...",
  "customer_email": "...",
  "customer_phone": "...",
  "subtotal": 0.00,
  "total": 0.00
}

Response: 201 Created
```

### Listar Pedidos
```
GET /api/v1/stores/ce-saladas/orders/
Authorization: Token {auth_token}
```

### Detalhe do Pedido
```
GET /api/v1/stores/ce-saladas/orders/{order_id}/
Authorization: Token {auth_token}
```

### Atualizar Pedido
```
PATCH /api/v1/stores/ce-saladas/orders/{order_id}/
PUT /api/v1/stores/ce-saladas/orders/{order_id}/
Authorization: Token {auth_token}
```

### Deletar Pedido
```
DELETE /api/v1/stores/ce-saladas/orders/{order_id}/
Authorization: Token {auth_token}
```

---

## Uber Delivery (Em desenvolvimento)

### Criar Requisição de Entrega
```
POST /api/v1/stores/ce-saladas/orders/{order_id}/create-delivery-request/
Authorization: Token {auth_token}

Response: 202 Accepted
```

### Status da Entrega
```
GET /api/v1/stores/ce-saladas/orders/{order_id}/delivery-request-status/
Authorization: Token {auth_token}

Response: 200 OK
```

### Cancelar Entrega
```
DELETE /api/v1/stores/ce-saladas/orders/{order_id}/delivery-request/
Authorization: Token {auth_token}

Response: 200 OK
```

---

## Nota de Geolocalização
- **Latitude:** -10.1852683
- **Longitude:** -48.3036368
- **Localização:** Brasília/Tocantins (Tucunare)
