# API Pública para Cardápio (pastita-3d)

## Problema
O endpoint `/catalog` atual requer autenticação, impedindo que o cardápio 3D funcione para clientes não logados.

## Solução
Criar endpoints públicos (`/api/v1/public/...`) que não requerem autenticação e retornam apenas dados seguros para exibição pública.

## Endpoints

### 1. Detalhes da Loja
```
GET /api/v1/public/stores/<slug>/
```
Retorna informações básicas da loja (nome, descrição, cores, contato).

### 2. Lista de Produtos
```
GET /api/v1/public/stores/<slug>/products/
Query params:
  - category: slug da categoria
  - search: termo de busca
```
Retorna produtos ativos e disponíveis.

### 3. Categorias
```
GET /api/v1/public/stores/<slug>/categories/
```
Retorna categorias com seus produtos.

### 4. Catálogo Completo
```
GET /api/v1/public/stores/<slug>/catalog/
```
Retorna estrutura completa: loja + categorias + produtos.

### 5. Detalhe do Produto
```
GET /api/v1/public/stores/<slug>/products/<product_id>/
```
Retorna detalhes completos de um produto.

## Arquivos para Criar no Backend

1. `apps/public_api/__init__.py`
2. `apps/public_api/views.py` (copiar de docs/public_api_views.py)
3. `apps/public_api/serializers.py` (copiar de docs/public_api_serializers.py)
4. `apps/public_api/urls.py` (copiar de docs/public_api_urls.py)
5. Adicionar em `config/urls.py`:
   ```python
   path('api/v1/public/', include('apps.public_api.urls')),
   ```

## Permissões
Todos os endpoints usam `AllowAny` - não requerem autenticação.

## Dados Expostos
- Apenas lojas ativas (`is_active=True`)
- Apenas produtos ativos e disponíveis
- Sem dados de custo, margem, estoque real
- Sem dados de clientes ou pedidos

## Integração com pastita-3d
O cardápio 3D deve usar:
```javascript
const API_BASE = 'https://api.pastita.com/api/v1/public';

// Buscar catálogo completo
fetch(`${API_BASE}/stores/pastita/catalog/`)
  .then(res => res.json())
  .then(data => {
    // data.store - info da loja
    // data.categories - categorias com produtos
  });
```
