# Edição de Pedido e Endereço de Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir, no painel Cardapidex, editar um pedido existente (desconto, acréscimo, taxa de entrega e itens — adicionar/remover/quantidade) com recálculo de total feito e validado no backend, e cadastrar/editar o endereço de um cliente.

**Architecture:** O backend ganha um único método canônico `StoreOrder.recalculate_totals()` (fonte da verdade do total) e um endpoint atômico `POST /orders/{id}/adjust/` que aplica operações de item + ajustes de dinheiro e recalcula. Endereço de cliente passa a ser gravável via `address_list` aninhado no `StoreCustomerSerializer`, persistindo no model relacional `StoreCustomerAddress` (o mesmo que `get_default_address()` já lê). O frontend reescreve `EditOrderDrawer` para editar itens+dinheiro e `CustomerFormDrawer` para editar endereço, consumindo os contratos novos.

**Tech Stack:** Django 4 + DRF (server2, testes `APITestCase`); React + TypeScript + Vite (pastita-dash, testes Jest + Testing Library).

## Global Constraints

- **Dois repositórios.** Backend: `/home/graco/WORK/server2`. Frontend: `/home/graco/WORK/pastita-dash`. Cada task diz em qual repo roda.
- **Dinheiro real:** o total NUNCA é calculado nem aceito do cliente. O backend sempre recalcula a partir dos itens persistidos + campos de model. Frontend manda intenção (ops e valores de ajuste), nunca `total`/`subtotal`.
- **Fórmula canônica do total:** `total = subtotal - discount + tax + delivery_fee + surcharge_value`, com `subtotal = Σ(item.subtotal)` e piso em `0.00`.
- **Backend tests:** rodar com `python manage.py test apps.stores.tests.<modulo> --settings=config.settings.development` (ou `make test-app APP=apps.stores`). Auth nos testes = Token DRF (`HTTP_AUTHORIZATION='Token <key>'`), mesmo padrão de `apps/stores/tests/test_order_update.py`.
- **Frontend tests:** Jest só descobre testes em `**/__tests__/**/*.test.ts?(x)` (testMatch). Todo teste novo vai dentro de uma pasta `__tests__/`.
- **Frontend gate:** `npm run build` (tsc) + `npm test` + `npm run lint` (`--max-warnings 400`) verdes antes de cada commit final de task. Não introduzir novo warning de lint.
- **Branch:** trabalhar numa branch dedicada (ex.: `feat/edicao-pedido-cliente`) em cada repo; NÃO commitar direto na main do pastita-dash (push na main = deploy Vercel em produção).
- **Commits:** mensagens em português, frequentes, um por task. Co-author conforme padrão do repo.
- **Não inventar campos.** Todos os campos de model/serializer usados abaixo já existem (verificados): `StoreOrder.{discount,tax,delivery_fee,surcharge_value,surcharge_reason,manual_discount_value,manual_discount_type,manual_discount_reason,subtotal,total}`, `StoreOrderItem.{product,product_name,sku,unit_price,quantity,subtotal,options,notes}`, `StoreCustomerAddress.{label,street,number,complement,neighborhood,city,state,zip_code,reference,formatted,is_default}`.

---

## File Structure

**Backend (server2):**
- Modify: `apps/stores/models/order.py` — adiciona `recalculate_totals()` em `StoreOrder`.
- Modify: `apps/stores/api/serializers.py` — `StoreOrderSerializer` expõe campos de acréscimo/desconto (leitura); novos `StoreOrderAdjustSerializer`, `StoreOrderItemOpSerializer`, `StoreCustomerAddressSerializer`; `StoreCustomerSerializer` ganha `address_list` gravável.
- Modify: `apps/stores/api/views/order_views.py` — `@action adjust` no `StoreOrderViewSet`.
- Create: `apps/stores/tests/test_order_adjust.py` — testes do endpoint adjust + recalc.
- Create: `apps/stores/tests/test_customer_address.py` — testes do address_list aninhado.

**Frontend (pastita-dash):**
- Modify: `src/types/index.ts` — campos novos em `Order`; `OrderItemOp`, `OrderAdjustPayload`.
- Modify: `src/services/orders.ts` — `adjustOrder()`.
- Modify: `src/services/storesApi.ts` — interface `StoreCustomerAddress`, `address_list` em `StoreCustomer`, `CustomerWritePayload`.
- Modify: `src/components/orders/EditOrderDrawer.tsx` — UI de dinheiro + itens.
- Modify: `src/pages/customers/CustomersPage.tsx` — campos de endereço no `CustomerFormDrawer`.
- Modify: `src/pages/orders/OrderDetailPage.tsx` — leitura de acréscimo/motivo a partir dos campos de model.
- Create tests: `src/components/orders/__tests__/EditOrderDrawer.test.tsx`, `src/pages/customers/__tests__/CustomerFormDrawer.test.tsx`.

---

## Task 1: `StoreOrder.recalculate_totals()` (backend, fonte da verdade do total)

**Files:**
- Modify: `/home/graco/WORK/server2/apps/stores/models/order.py` (método novo logo após `save()`, ~linha 278)
- Test: `/home/graco/WORK/server2/apps/stores/tests/test_order_adjust.py` (criar)

**Interfaces:**
- Produces: `StoreOrder.recalculate_totals(save: bool = True) -> Decimal` — recomputa `self.subtotal` a partir de `self.items.all()` e `self.total` pela fórmula canônica (piso 0); persiste `subtotal`,`total`,`updated_at` quando `save=True`; retorna `self.total`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `/home/graco/WORK/server2/apps/stores/tests/test_order_adjust.py`:

```python
"""Testes de recálculo de total e do endpoint POST /orders/{id}/adjust/."""
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from apps.stores.models import Store, StoreOrder, StoreOrderItem, StoreProduct

User = get_user_model()


def _make_product(store, price, name='Prod'):
    return StoreProduct.objects.create(
        store=store, name=name, slug=f'{name.lower()}-{price}',
        price=Decimal(price), track_stock=False, stock_quantity=0,
        status=StoreProduct.ProductStatus.ACTIVE,
    )


class RecalculateTotalsTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='o1', email='o1@x.com', password='x')
        self.store = Store.objects.create(name='L1', slug='l1', owner=self.owner, status='active')
        self.order = StoreOrder.objects.create(
            store=self.store, customer_name='C', customer_phone='6300000000',
            subtotal=Decimal('0.00'), total=Decimal('0.00'),
        )
        self.p10 = _make_product(self.store, '10.00', 'P10')
        StoreOrderItem.objects.create(
            order=self.order, product=self.p10, product_name='P10', sku='',
            unit_price=Decimal('10.00'), quantity=2, subtotal=Decimal('20.00'),
        )

    def test_recalc_sums_items_into_subtotal_and_total(self):
        self.order.discount = Decimal('5.00')
        self.order.delivery_fee = Decimal('8.00')
        self.order.surcharge_value = Decimal('3.00')
        total = self.order.recalculate_totals()
        self.order.refresh_from_db()
        self.assertEqual(self.order.subtotal, Decimal('20.00'))
        # 20 - 5 + 0(tax) + 8 + 3 = 26
        self.assertEqual(self.order.total, Decimal('26.00'))
        self.assertEqual(total, Decimal('26.00'))

    def test_recalc_floors_total_at_zero(self):
        self.order.discount = Decimal('999.00')
        self.order.recalculate_totals()
        self.order.refresh_from_db()
        self.assertEqual(self.order.total, Decimal('0.00'))
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.RecalculateTotalsTestCase --settings=config.settings.development`
Expected: FAIL — `AttributeError: 'StoreOrder' object has no attribute 'recalculate_totals'`.

- [ ] **Step 3: Implementar o método**

Em `apps/stores/models/order.py`, logo após o `save()` (depois da linha 278):

```python
    def recalculate_totals(self, save=True):
        """Fonte da verdade do total. Soma os itens em subtotal e aplica a
        fórmula canônica: total = subtotal - discount + tax + delivery_fee
        + surcharge_value, com piso em 0. Não aceita total do cliente."""
        from decimal import Decimal
        subtotal = sum((item.subtotal for item in self.items.all()), Decimal('0.00'))
        self.subtotal = subtotal
        total = (
            subtotal
            - (self.discount or Decimal('0.00'))
            + (self.tax or Decimal('0.00'))
            + (self.delivery_fee or Decimal('0.00'))
            + (self.surcharge_value or Decimal('0.00'))
        )
        if total < Decimal('0.00'):
            total = Decimal('0.00')
        self.total = total
        if save:
            self.save(update_fields=['subtotal', 'total', 'updated_at'])
        return self.total
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.RecalculateTotalsTestCase --settings=config.settings.development`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd /home/graco/WORK/server2
git add apps/stores/models/order.py apps/stores/tests/test_order_adjust.py
git commit -m "feat(pedido): recalculate_totals() como fonte da verdade do total"
```

---

## Task 2: Expor acréscimo/desconto-manual na leitura do pedido (backend)

**Files:**
- Modify: `/home/graco/WORK/server2/apps/stores/api/serializers.py` — `StoreOrderSerializer` (~linha 525-555)
- Test: `/home/graco/WORK/server2/apps/stores/tests/test_order_adjust.py` (acrescentar caso)

**Interfaces:**
- Produces: `GET /orders/{id}/` retorna também `surcharge_value`, `surcharge_reason`, `manual_discount_value`, `manual_discount_type`, `manual_discount_reason` (todos leitura).

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao `test_order_adjust.py`:

```python
class OrderReadFieldsTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='o2', email='o2@x.com', password='x')
        self.store = Store.objects.create(name='L2', slug='l2', owner=self.owner, status='active')
        self.token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.order = StoreOrder.objects.create(
            store=self.store, customer_name='C', customer_phone='6300000000',
            subtotal=Decimal('20.00'), total=Decimal('23.00'),
            surcharge_value=Decimal('3.00'), surcharge_reason='taxa',
            manual_discount_reason='promo',
        )

    def test_read_exposes_surcharge_and_discount_reason(self):
        url = f'/api/v1/stores/{self.store.slug}/orders/{self.order.id}/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data['surcharge_value'], Decimal('3.00'))
        self.assertEqual(resp.data['surcharge_reason'], 'taxa')
        self.assertEqual(resp.data['manual_discount_reason'], 'promo')
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.OrderReadFieldsTestCase --settings=config.settings.development`
Expected: FAIL — `KeyError: 'surcharge_value'`.

- [ ] **Step 3: Adicionar os campos ao serializer de leitura**

Em `apps/stores/api/serializers.py`, no `StoreOrderSerializer.Meta.fields`, logo após `'subtotal', 'discount', 'coupon_code', 'tax', 'delivery_fee', 'total',` (linha 529), inserir:

```python
            'surcharge_value', 'surcharge_reason',
            'manual_discount_value', 'manual_discount_type', 'manual_discount_reason',
```

E acrescentar esses cinco nomes ao `read_only_fields` do mesmo serializer (após `'access_token',` na linha 548):

```python
            'surcharge_value', 'surcharge_reason',
            'manual_discount_value', 'manual_discount_type', 'manual_discount_reason',
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.OrderReadFieldsTestCase --settings=config.settings.development`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/graco/WORK/server2
git add apps/stores/api/serializers.py apps/stores/tests/test_order_adjust.py
git commit -m "feat(pedido): expõe acréscimo e motivo de desconto na leitura do pedido"
```

---

## Task 3: Endpoint `adjust` — ajustes de dinheiro (backend)

**Files:**
- Modify: `/home/graco/WORK/server2/apps/stores/api/serializers.py` — novo `StoreOrderAdjustSerializer` (após `StoreOrderUpdateSerializer`, ~linha 923)
- Modify: `/home/graco/WORK/server2/apps/stores/api/views/order_views.py` — import + `@action adjust`
- Test: `/home/graco/WORK/server2/apps/stores/tests/test_order_adjust.py`

**Interfaces:**
- Consumes: `StoreOrder.recalculate_totals()` (Task 1); `StoreOrderSerializer` (Task 2).
- Produces: `POST /api/v1/stores/{slug}/orders/{id}/adjust/` aceitando body parcial `{discount, discount_reason, surcharge_value, surcharge_reason, delivery_fee, item_ops}`. Nesta task só os campos de dinheiro são processados (item_ops entra na Task 4). Resposta 200 = `StoreOrderSerializer(order).data`. Bloqueia pedidos em status `cancelled/refunded/failed` (400). Desconto que zeraria abaixo de 0 → 400.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao `test_order_adjust.py`:

```python
class OrderAdjustMoneyTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='o3', email='o3@x.com', password='x')
        self.store = Store.objects.create(name='L3', slug='l3', owner=self.owner, status='active')
        self.token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.order = StoreOrder.objects.create(
            store=self.store, customer_name='C', customer_phone='6300000000',
            subtotal=Decimal('20.00'), total=Decimal('20.00'),
        )
        self.p = _make_product(self.store, '10.00', 'P10')
        StoreOrderItem.objects.create(
            order=self.order, product=self.p, product_name='P10', sku='',
            unit_price=Decimal('10.00'), quantity=2, subtotal=Decimal('20.00'),
        )
        self.url = f'/api/v1/stores/{self.store.slug}/orders/{self.order.id}/adjust/'

    def test_apply_discount_surcharge_delivery_recalculates_total(self):
        resp = self.client.post(self.url, {
            'discount': '5.00', 'discount_reason': 'fiel',
            'surcharge_value': '3.00', 'surcharge_reason': 'embalagem',
            'delivery_fee': '8.00',
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.discount, Decimal('5.00'))
        self.assertEqual(self.order.manual_discount_reason, 'fiel')
        self.assertEqual(self.order.surcharge_value, Decimal('3.00'))
        self.assertEqual(self.order.surcharge_reason, 'embalagem')
        self.assertEqual(self.order.delivery_fee, Decimal('8.00'))
        # 20 - 5 + 8 + 3 = 26
        self.assertEqual(self.order.total, Decimal('26.00'))

    def test_discount_bigger_than_subtotal_is_rejected(self):
        resp = self.client.post(self.url, {'discount': '999.00'}, format='json')
        self.assertEqual(resp.status_code, 400, resp.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.total, Decimal('20.00'))  # inalterado

    def test_cannot_adjust_cancelled_order(self):
        self.order.status = StoreOrder.OrderStatus.CANCELLED
        self.order.save(update_fields=['status'])
        resp = self.client.post(self.url, {'discount': '1.00'}, format='json')
        self.assertEqual(resp.status_code, 400, resp.content)

    def test_requires_authentication(self):
        self.client.credentials()  # remove token
        resp = self.client.post(self.url, {'discount': '1.00'}, format='json')
        self.assertIn(resp.status_code, (401, 403))
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.OrderAdjustMoneyTestCase --settings=config.settings.development`
Expected: FAIL — 404 (rota `adjust` inexistente).

- [ ] **Step 3: Criar o serializer de validação**

Em `apps/stores/api/serializers.py`, após o `StoreOrderUpdateSerializer` (linha 922), adicionar:

```python
class StoreOrderItemOpSerializer(serializers.Serializer):
    """Uma operação sobre itens do pedido na edição."""
    op = serializers.ChoiceField(choices=['add', 'update', 'remove'])
    item_id = serializers.UUIDField(required=False)
    product_id = serializers.UUIDField(required=False)
    quantity = serializers.IntegerField(min_value=1, required=False)

    def validate(self, attrs):
        op = attrs['op']
        if op == 'add' and not attrs.get('product_id'):
            raise serializers.ValidationError("op 'add' exige product_id.")
        if op in ('update', 'remove') and not attrs.get('item_id'):
            raise serializers.ValidationError(f"op '{op}' exige item_id.")
        if op in ('add', 'update') and not attrs.get('quantity'):
            raise serializers.ValidationError(f"op '{op}' exige quantity.")
        return attrs


class StoreOrderAdjustSerializer(serializers.Serializer):
    """Valida o corpo do POST /orders/{id}/adjust/ (todos os campos opcionais)."""
    discount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=Decimal('0.00'))
    discount_reason = serializers.CharField(required=False, allow_blank=True)
    surcharge_value = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, min_value=Decimal('0.00'))
    surcharge_reason = serializers.CharField(required=False, allow_blank=True)
    delivery_fee = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=Decimal('0.00'))
    item_ops = StoreOrderItemOpSerializer(many=True, required=False)
```

(`Decimal` já está importado no topo de `serializers.py`.)

- [ ] **Step 4: Criar o action no viewset**

Em `apps/stores/api/views/order_views.py`, no import de serializers (linha 23-26), acrescentar `StoreOrderAdjustSerializer`:

```python
from ..serializers import (
    StoreOrderSerializer, StoreOrderCreateSerializer, StoreOrderUpdateSerializer,
    StoreCustomerSerializer, StorePrintJobSerializer, StoreOrderAdjustSerializer,
)
```

Adicionar o action ao `StoreOrderViewSet` (após `update_status`, ~linha 257). Esta versão trata só dinheiro; a Task 4 acrescenta o bloco de `item_ops`:

```python
    _ADJUST_BLOCKED = {'cancelled', 'refunded', 'failed'}

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None, **kwargs):
        """Edita desconto/acréscimo/taxa de entrega e itens de um pedido,
        recalculando o total no backend. Corpo parcial."""
        order = self.get_object()
        if order.status in self._ADJUST_BLOCKED:
            return Response(
                {'error': f'Pedido em status "{order.status}" não pode ser editado.',
                 'code': 'order_not_editable'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = StoreOrderAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            order = StoreOrder.objects.select_for_update().get(pk=order.pk)

            # (Task 4 insere aqui o processamento de item_ops)

            if 'discount' in data:
                order.discount = data['discount']
            if 'discount_reason' in data:
                order.manual_discount_reason = data['discount_reason']
            if 'surcharge_value' in data:
                order.surcharge_value = data['surcharge_value']
            if 'surcharge_reason' in data:
                order.surcharge_reason = data['surcharge_reason']
            if 'delivery_fee' in data:
                order.delivery_fee = data['delivery_fee']

            # Guard: desconto não pode tornar o total negativo
            from decimal import Decimal as _D
            subtotal = sum((i.subtotal for i in order.items.all()), _D('0.00'))
            prospective = (subtotal - (order.discount or _D('0.00'))
                           + (order.tax or _D('0.00')) + (order.delivery_fee or _D('0.00'))
                           + (order.surcharge_value or _D('0.00')))
            if prospective < _D('0.00'):
                return Response(
                    {'error': 'Desconto deixa o total negativo.', 'code': 'total_negative'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            order.save(update_fields=[
                'discount', 'manual_discount_reason', 'surcharge_value',
                'surcharge_reason', 'delivery_fee', 'updated_at',
            ])
            order.recalculate_totals(save=True)

        order.refresh_from_db()
        self._notify_order_update(order, 'order.updated')
        return Response(StoreOrderSerializer(order).data)
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.OrderAdjustMoneyTestCase --settings=config.settings.development`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
cd /home/graco/WORK/server2
git add apps/stores/api/serializers.py apps/stores/api/views/order_views.py apps/stores/tests/test_order_adjust.py
git commit -m "feat(pedido): endpoint adjust aplica desconto/acréscimo/taxa e recalcula total"
```

---

## Task 4: Endpoint `adjust` — operações de item (backend)

**Files:**
- Modify: `/home/graco/WORK/server2/apps/stores/api/views/order_views.py` — bloco `item_ops` dentro do `adjust`
- Test: `/home/graco/WORK/server2/apps/stores/tests/test_order_adjust.py`

**Interfaces:**
- Consumes: `StoreOrderItemOpSerializer` (Task 3).
- Produces: `adjust` processa `item_ops` (lista de `{op, item_id?, product_id?, quantity?}`): `add` cria item a partir de um `StoreProduct` ativo da loja (`unit_price = product.price`), `update` muda quantidade de um item do pedido, `remove` apaga. Subtotal de cada item = `unit_price * quantity`. Guards: produto inexistente/inativo → 400; `item_id` que não é do pedido → 400; pedido não pode ficar com 0 itens → 400.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao `test_order_adjust.py`:

```python
class OrderAdjustItemsTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='o4', email='o4@x.com', password='x')
        self.store = Store.objects.create(name='L4', slug='l4', owner=self.owner, status='active')
        self.token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.order = StoreOrder.objects.create(
            store=self.store, customer_name='C', customer_phone='6300000000',
            subtotal=Decimal('10.00'), total=Decimal('10.00'),
        )
        self.p10 = _make_product(self.store, '10.00', 'P10')
        self.p25 = _make_product(self.store, '25.00', 'P25')
        self.item = StoreOrderItem.objects.create(
            order=self.order, product=self.p10, product_name='P10', sku='',
            unit_price=Decimal('10.00'), quantity=1, subtotal=Decimal('10.00'),
        )
        self.url = f'/api/v1/stores/{self.store.slug}/orders/{self.order.id}/adjust/'

    def test_add_item_recomputes_subtotal_and_total(self):
        resp = self.client.post(self.url, {
            'item_ops': [{'op': 'add', 'product_id': str(self.p25.id), 'quantity': 2}],
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.order.refresh_from_db()
        # 10 (existente) + 25*2 = 60
        self.assertEqual(self.order.subtotal, Decimal('60.00'))
        self.assertEqual(self.order.total, Decimal('60.00'))
        self.assertEqual(self.order.items.count(), 2)

    def test_update_item_quantity(self):
        resp = self.client.post(self.url, {
            'item_ops': [{'op': 'update', 'item_id': str(self.item.id), 'quantity': 3}],
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantity, 3)
        self.assertEqual(self.item.subtotal, Decimal('30.00'))
        self.order.refresh_from_db()
        self.assertEqual(self.order.total, Decimal('30.00'))

    def test_remove_item(self):
        extra = StoreOrderItem.objects.create(
            order=self.order, product=self.p25, product_name='P25', sku='',
            unit_price=Decimal('25.00'), quantity=1, subtotal=Decimal('25.00'),
        )
        resp = self.client.post(self.url, {
            'item_ops': [{'op': 'remove', 'item_id': str(extra.id)}],
        }, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.items.count(), 1)
        self.assertEqual(self.order.total, Decimal('10.00'))

    def test_cannot_remove_last_item(self):
        resp = self.client.post(self.url, {
            'item_ops': [{'op': 'remove', 'item_id': str(self.item.id)}],
        }, format='json')
        self.assertEqual(resp.status_code, 400, resp.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.items.count(), 1)

    def test_add_unknown_product_rejected(self):
        import uuid
        resp = self.client.post(self.url, {
            'item_ops': [{'op': 'add', 'product_id': str(uuid.uuid4()), 'quantity': 1}],
        }, format='json')
        self.assertEqual(resp.status_code, 400, resp.content)

    def test_update_item_from_another_order_rejected(self):
        other = StoreOrder.objects.create(
            store=self.store, customer_name='X', customer_phone='6311112222',
            subtotal=Decimal('10.00'), total=Decimal('10.00'),
        )
        alien = StoreOrderItem.objects.create(
            order=other, product=self.p10, product_name='P10', sku='',
            unit_price=Decimal('10.00'), quantity=1, subtotal=Decimal('10.00'),
        )
        resp = self.client.post(self.url, {
            'item_ops': [{'op': 'update', 'item_id': str(alien.id), 'quantity': 2}],
        }, format='json')
        self.assertEqual(resp.status_code, 400, resp.content)

    def test_failed_op_rolls_back_earlier_ops(self):
        """Um add válido seguido de um op inválido NÃO pode persistir o add
        (rollback do atomic via raise, não return)."""
        import uuid
        resp = self.client.post(self.url, {
            'item_ops': [
                {'op': 'add', 'product_id': str(self.p25.id), 'quantity': 1},
                {'op': 'remove', 'item_id': str(uuid.uuid4())},  # falha → rollback
            ],
        }, format='json')
        self.assertEqual(resp.status_code, 400, resp.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.items.count(), 1)  # add desfeito
        self.assertEqual(self.order.total, Decimal('10.00'))  # total intacto
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust.OrderAdjustItemsTestCase --settings=config.settings.development`
Expected: FAIL — item_ops ignorado (subtotal/total inalterados, contagem de itens errada).

- [ ] **Step 3: Implementar o bloco de item_ops**

Em `apps/stores/api/views/order_views.py`, dentro do `adjust`, substituir o comentário `# (Task 4 insere aqui o processamento de item_ops)` por:

```python
            item_ops = data.get('item_ops', [])
            for op in item_ops:
                kind = op['op']
                if kind == 'add':
                    product = StoreProduct.objects.filter(
                        id=op['product_id'], store=order.store,
                        status=StoreProduct.ProductStatus.ACTIVE,
                    ).first()
                    if not product:
                        raise DRFValidationError(
                            {'error': 'Produto não encontrado ou inativo.',
                             'code': 'product_not_found'})
                    qty = op['quantity']
                    unit_price = product.price or Decimal('0.00')
                    StoreOrderItem.objects.create(
                        order=order, product=product, variant=None,
                        product_name=product.name, variant_name='', sku=product.sku,
                        unit_price=unit_price, quantity=qty,
                        subtotal=unit_price * qty, options={}, notes='',
                    )
                elif kind == 'update':
                    item = order.items.filter(id=op['item_id']).first()
                    if not item:
                        raise DRFValidationError(
                            {'error': 'Item não pertence a este pedido.',
                             'code': 'item_not_found'})
                    item.quantity = op['quantity']
                    item.subtotal = item.unit_price * item.quantity
                    item.save(update_fields=['quantity', 'subtotal'])
                elif kind == 'remove':
                    item = order.items.filter(id=op['item_id']).first()
                    if not item:
                        raise DRFValidationError(
                            {'error': 'Item não pertence a este pedido.',
                             'code': 'item_not_found'})
                    item.delete()

            if not order.items.exists():
                raise DRFValidationError(
                    {'error': 'O pedido precisa manter pelo menos um item.',
                     'code': 'order_empty'})
```

`StoreProduct` precisa estar importado em `order_views.py`. O import atual (linha 18) é `from apps.stores.models import Store, StoreOrder, StoreOrderItem, StoreCustomer`; acrescentar `StoreProduct`:

```python
from apps.stores.models import Store, StoreOrder, StoreOrderItem, StoreCustomer, StoreProduct
```

> **CRÍTICO (rollback):** um `return Response(...)` dentro de `with transaction.atomic()` faz o bloco sair NORMALMENTE → o Django **COMMITA** (não faz rollback). Como agora há escritas de item ANTES dos guards, um `return` deixaria itens persistidos parcialmente num op inválido. Por isso todos os guards dentro do `atomic` usam **`raise DRFValidationError(...)`** (a exceção dispara o rollback e o handler do DRF a converte em 400). `DRFValidationError` JÁ está importado no topo de `order_views.py` (linha 9: `from rest_framework.exceptions import ValidationError as DRFValidationError, PermissionDenied`) — não reimportar.
>
> **Converter também o guard de total-negativo da Task 3:** dentro do mesmo `adjust`, o guard `if prospective < _D('0.00'): return Response(...)` foi escrito na Task 3 com `return Response`. Como o processamento de item_ops agora escreve ANTES dele, troque esse `return Response(...)` por `raise DRFValidationError({'error': 'Desconto deixa o total negativo.', 'code': 'total_negative'})` para garantir rollback das mudanças de item quando o desconto for rejeitado.

- [ ] **Step 4: Rodar e confirmar que passa (suite inteira do arquivo)**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_order_adjust --settings=config.settings.development`
Expected: PASS (todas as classes: recalc, leitura, dinheiro, itens).

- [ ] **Step 5: Commit**

```bash
cd /home/graco/WORK/server2
git add apps/stores/api/views/order_views.py apps/stores/tests/test_order_adjust.py
git commit -m "feat(pedido): adjust processa add/update/remove de itens com recálculo e guards"
```

---

## Task 5: Endereço de cliente gravável via `address_list` aninhado (backend)

**Files:**
- Modify: `/home/graco/WORK/server2/apps/stores/api/serializers.py` — `StoreCustomerAddressSerializer` novo + `address_list` no `StoreCustomerSerializer` (linhas 925-987)
- Test: `/home/graco/WORK/server2/apps/stores/tests/test_customer_address.py` (criar)

**Interfaces:**
- Produces: `StoreCustomerSerializer` lê e grava `address_list` (lista de `{id?, label, street, number, complement, neighborhood, city, state, zip_code, reference, is_default}`), persistindo em `StoreCustomerAddress` (FK `customer`). Estratégia de sync = replace-all por `id`: item com `id` conhecido → update; sem `id` → create; existentes ausentes do payload → delete. Endpoints existentes `POST /api/v1/stores/customers/?store=<slug>` (create) e `PATCH /api/v1/stores/customers/{id}/` (update) passam a aceitar `address_list`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `/home/graco/WORK/server2/apps/stores/tests/test_customer_address.py`:

```python
"""Testes do address_list aninhado no StoreCustomerSerializer."""
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from apps.stores.models import Store, StoreCustomer
from apps.stores.models.customer import StoreCustomerAddress

User = get_user_model()


class CustomerAddressNestedTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='oa', email='oa@x.com', password='x')
        self.store = Store.objects.create(name='LA', slug='la', owner=self.owner, status='active')
        self.token = Token.objects.create(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.list_url = f'/api/v1/stores/customers/?store={self.store.slug}'

    def test_create_customer_with_address(self):
        resp = self.client.post(
            f'/api/v1/stores/customers/?store={self.store.slug}',
            {
                'name': 'Maria', 'phone': '63999990000',
                'address_list': [{
                    'label': 'Casa', 'street': 'Rua A', 'number': '10',
                    'neighborhood': 'Centro', 'city': 'Palmas', 'state': 'TO',
                    'zip_code': '77000000', 'is_default': True,
                }],
            }, format='json',
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        cust = StoreCustomer.objects.get(id=resp.data['id'])
        self.assertEqual(cust.address_list.count(), 1)
        addr = cust.address_list.first()
        self.assertEqual(addr.street, 'Rua A')
        self.assertTrue(addr.is_default)
        # default_address (lido por get_default_address) reflete o novo endereço
        self.assertEqual(resp.data['default_address']['street'], 'Rua A')

    def test_update_replaces_addresses(self):
        resp = self.client.post(
            f'/api/v1/stores/customers/?store={self.store.slug}',
            {'name': 'João', 'phone': '63988880000',
             'address_list': [{'street': 'Rua Velha', 'number': '1'}]},
            format='json',
        )
        cust_id = resp.data['id']
        addr_id = StoreCustomer.objects.get(id=cust_id).address_list.first().id

        # PATCH: atualiza o existente (com id) e adiciona um novo (sem id)
        resp2 = self.client.patch(
            f'/api/v1/stores/customers/{cust_id}/',
            {'address_list': [
                {'id': str(addr_id), 'street': 'Rua Nova', 'number': '2'},
                {'street': 'Trabalho', 'number': '99'},
            ]}, format='json',
        )
        self.assertEqual(resp2.status_code, 200, resp2.content)
        cust = StoreCustomer.objects.get(id=cust_id)
        streets = set(cust.address_list.values_list('street', flat=True))
        self.assertEqual(streets, {'Rua Nova', 'Trabalho'})

    def test_update_with_empty_list_removes_all(self):
        resp = self.client.post(
            f'/api/v1/stores/customers/?store={self.store.slug}',
            {'name': 'Ana', 'phone': '63977770000',
             'address_list': [{'street': 'Rua X', 'number': '5'}]},
            format='json',
        )
        cust_id = resp.data['id']
        resp2 = self.client.patch(
            f'/api/v1/stores/customers/{cust_id}/',
            {'address_list': []}, format='json',
        )
        self.assertEqual(resp2.status_code, 200, resp2.content)
        self.assertEqual(StoreCustomer.objects.get(id=cust_id).address_list.count(), 0)
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_customer_address --settings=config.settings.development`
Expected: FAIL — `address_list` não existe no serializer (campo ignorado; `address_list.count()` = 0).

- [ ] **Step 3: Implementar o serializer aninhado**

Em `apps/stores/api/serializers.py`, antes de `class StoreCustomerSerializer` (linha 925), adicionar o import do model no topo do arquivo se necessário e o serializer de endereço. O model `StoreCustomerAddress` está em `apps.stores.models.customer`; adicionar ao bloco de imports de models (ou importar inline). Adicionar:

```python
class StoreCustomerAddressSerializer(serializers.ModelSerializer):
    """Endereço relacional do cliente (StoreCustomerAddress)."""
    id = serializers.UUIDField(required=False)

    class Meta:
        model = StoreCustomerAddress
        fields = [
            'id', 'label', 'street', 'number', 'complement',
            'neighborhood', 'city', 'state', 'zip_code', 'reference', 'is_default',
        ]
```

`StoreCustomerAddress` precisa estar importado. No topo de `serializers.py`, onde os models de stores são importados, acrescentar `StoreCustomerAddress` (ele é exportável de `apps.stores.models` se estiver no `__init__`; caso contrário usar `from apps.stores.models.customer import StoreCustomerAddress`). Verificar o import existente de `StoreCustomer` e espelhar.

- [ ] **Step 4: Plugar `address_list` no `StoreCustomerSerializer`**

No `StoreCustomerSerializer`, declarar o campo (após a linha 931, junto dos outros declarados):

```python
    address_list = StoreCustomerAddressSerializer(many=True, required=False)
```

Adicionar `'address_list'` ao `Meta.fields` (após `'default_address',` na linha 939).

Adicionar um helper de sync e chamá-lo em `create()` e `update()`:

```python
    def _sync_address_list(self, customer, addresses):
        """Replace-all por id: atualiza os com id, cria os sem id, apaga os ausentes."""
        existing = {str(a.id): a for a in customer.address_list.all()}
        incoming_ids = set()
        for addr in addresses:
            addr_id = addr.get('id')
            if addr_id and str(addr_id) in existing:
                obj = existing[str(addr_id)]
                for field, value in addr.items():
                    if field == 'id':
                        continue
                    setattr(obj, field, value)
                obj.save()
                incoming_ids.add(str(addr_id))
            else:
                payload = {k: v for k, v in addr.items() if k != 'id'}
                StoreCustomerAddress.objects.create(customer=customer, **payload)
        # apaga os que sumiram do payload
        for old_id, obj in existing.items():
            if old_id not in incoming_ids:
                obj.delete()
```

No `create()` (linha 956), capturar `address_list` ANTES do `transaction.atomic()` e sincronizar após criar o customer:

```python
    def create(self, validated_data):
        address_list = validated_data.pop('address_list', None)
        name = validated_data.pop('name', '')
        store = validated_data.get('store')
        phone = validated_data.get('phone', '') or validated_data.get('whatsapp', '')
        with transaction.atomic():
            user, _profile, _created = CustomerIdentityService.resolve_user(
                phone=phone or '', full_name=name or '', create=True,
            )
            validated_data['user'] = user
            customer, _created = StoreCustomer.objects.get_or_create(
                store=store, user=user, defaults=validated_data,
            )
            if address_list is not None:
                self._sync_address_list(customer, address_list)
            return customer
```

No `update()` (linha 978):

```python
    def update(self, instance, validated_data):
        address_list = validated_data.pop('address_list', None)
        name = validated_data.pop('name', None)
        with transaction.atomic():
            if name is not None:
                first, last = CustomerIdentityService.split_name(name)
                instance.user.first_name = first
                instance.user.last_name = last
                instance.user.save(update_fields=['first_name', 'last_name'])
            instance = super().update(instance, validated_data)
            if address_list is not None:
                self._sync_address_list(instance, address_list)
            return instance
```

> O sinal `enforce_single_default_address` já garante um único `is_default` ao salvar. `get_default_address()` lê `address_list`, então `default_address` na resposta reflete o sync.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_customer_address --settings=config.settings.development`
Expected: PASS (3 testes).

- [ ] **Step 6: Garantir que nada quebrou no CRUD de cliente existente**

Run: `cd /home/graco/WORK/server2 && python manage.py test apps.stores.tests.test_customer_crud apps.stores.tests.test_order_update apps.stores.tests.test_order_adjust --settings=config.settings.development`
Expected: PASS (sem regressão).

- [ ] **Step 7: Commit**

```bash
cd /home/graco/WORK/server2
git add apps/stores/api/serializers.py apps/stores/tests/test_customer_address.py
git commit -m "feat(cliente): address_list gravável (StoreCustomerAddress) no serializer de cliente"
```

---

## Task 6: Contratos no frontend — tipos + serviços (pastita-dash)

**Files:**
- Modify: `/home/graco/WORK/pastita-dash/src/types/index.ts` (Order ~319-402)
- Modify: `/home/graco/WORK/pastita-dash/src/services/orders.ts`
- Modify: `/home/graco/WORK/pastita-dash/src/services/storesApi.ts` (StoreCustomer ~401-425; CustomerWritePayload ~1173-1179)

**Interfaces:**
- Consumes: contratos das Tasks 3-5.
- Produces:
  - `ordersService.adjustOrder(id: string, payload: OrderAdjustPayload, storeSlug?: string): Promise<Order>` → `POST {base}/{id}/adjust/`.
  - Tipos `OrderItemOp`, `OrderAdjustPayload` em `types/index.ts`; `Order` ganha `surcharge_value?`, `surcharge_reason?`, `manual_discount_reason?`.
  - `StoreCustomerAddress` em `storesApi.ts`; `StoreCustomer.address_list?`; `CustomerWritePayload.address_list?`.

- [ ] **Step 1: Tipos de pedido**

Em `src/types/index.ts`, no `interface Order` (após `discount: number;`), acrescentar:

```ts
  surcharge_value?: number;
  surcharge_reason?: string;
  manual_discount_reason?: string;
```

Após o `interface CreateOrder` (linha ~402), acrescentar:

```ts
export interface OrderItemOp {
  op: 'add' | 'update' | 'remove';
  item_id?: string;
  product_id?: string;
  quantity?: number;
}

export interface OrderAdjustPayload {
  discount?: number;
  discount_reason?: string;
  surcharge_value?: number;
  surcharge_reason?: string;
  delivery_fee?: number;
  item_ops?: OrderItemOp[];
}
```

- [ ] **Step 2: Serviço adjustOrder**

Em `src/services/orders.ts`, importar os tipos (linha 2) acrescentando `OrderAdjustPayload`:

```ts
import { Order, OrderEvent, CreateOrder, OrderAdjustPayload, PaginatedResponse } from '../types';
```

Adicionar o método ao objeto `ordersService` (após `updateOrder`, linha 94):

```ts
  adjustOrder: async (id: string, payload: OrderAdjustPayload, storeSlug?: string): Promise<Order> => {
    const response = await api.post<Order>(`${getBaseUrl(storeSlug)}/${id}/adjust/`, payload);
    return normalizeOrder(response.data);
  },
```

- [ ] **Step 3: Tipos de endereço de cliente**

Em `src/services/storesApi.ts`, antes da interface `StoreCustomer` (linha ~401), adicionar:

```ts
export interface StoreCustomerAddress {
  id?: string;
  label?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  reference?: string;
  is_default?: boolean;
}
```

No `interface StoreCustomer`, junto de `addresses`, acrescentar:

```ts
  address_list?: StoreCustomerAddress[];
```

No `interface CustomerWritePayload` (linha ~1173), acrescentar:

```ts
  address_list?: StoreCustomerAddress[];
```

- [ ] **Step 4: Verificar compilação**

Run: `cd /home/graco/WORK/pastita-dash && npm run build`
Expected: build verde (tsc sem erros).

- [ ] **Step 5: Commit**

```bash
cd /home/graco/WORK/pastita-dash
git add src/types/index.ts src/services/orders.ts src/services/storesApi.ts
git commit -m "feat(contratos): tipos e adjustOrder/address_list para edição de pedido e cliente"
```

---

## Task 7: EditOrderDrawer — editar desconto/acréscimo/taxa (pastita-dash)

**Files:**
- Modify: `/home/graco/WORK/pastita-dash/src/components/orders/EditOrderDrawer.tsx`
- Test: `/home/graco/WORK/pastita-dash/src/components/orders/__tests__/EditOrderDrawer.test.tsx` (criar)

**Interfaces:**
- Consumes: `ordersService.adjustOrder` (Task 6); `Order.{discount,surcharge_value,surcharge_reason,delivery_fee,manual_discount_reason}`.
- Produces: o drawer passa a ter campos de desconto (valor + motivo), acréscimo (valor + motivo) e taxa de entrega; ao salvar, se algum mudou, chama `adjustOrder` com os campos alterados (além do PATCH de cliente/agendamento já existente).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/components/orders/__tests__/EditOrderDrawer.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditOrderDrawer } from '../EditOrderDrawer';
import { ordersService } from '../../../services/orders';
import type { Order } from '../../../types';

jest.mock('../../../services/orders', () => ({
  ordersService: {
    updateOrder: jest.fn().mockResolvedValue({}),
    adjustOrder: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const baseOrder = {
  id: 'ord-1', customer_name: 'Maria', customer_phone: '6300', customer_notes: '',
  discount: 0, surcharge_value: 0, surcharge_reason: '', delivery_fee: 0,
  manual_discount_reason: '', items: [], subtotal: 20, total: 20,
} as unknown as Order;

it('envia adjustOrder com desconto e acréscimo alterados', async () => {
  render(<EditOrderDrawer order={baseOrder} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/desconto/i), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText(/acréscimo/i), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.adjustOrder).toHaveBeenCalledWith(
    'ord-1', expect.objectContaining({ discount: 5, surcharge_value: 3 }), undefined,
  ));
});

it('não chama adjustOrder quando dinheiro não mudou', async () => {
  render(<EditOrderDrawer order={baseOrder} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(ordersService.adjustOrder).not.toHaveBeenCalled());
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/pastita-dash && npm test -- EditOrderDrawer`
Expected: FAIL — não há campo "Desconto"/"Acréscimo".

- [ ] **Step 3: Implementar os campos e a lógica de save**

Em `src/components/orders/EditOrderDrawer.tsx`:

1. Importar o tipo de payload e o serviço já importado. No topo, ampliar o import de `ordersService` (já presente).
2. Adicionar estado (após linha 21):

```tsx
  const [discount, setDiscount] = useState(String(order.discount ?? 0));
  const [discountReason, setDiscountReason] = useState(order.manual_discount_reason ?? '');
  const [surcharge, setSurcharge] = useState(String(order.surcharge_value ?? 0));
  const [surchargeReason, setSurchargeReason] = useState(order.surcharge_reason ?? '');
  const [deliveryFee, setDeliveryFee] = useState(String(order.delivery_fee ?? 0));
```

3. Construir o payload de ajuste (nova função, após `buildPatch`):

```tsx
  const buildAdjust = (): import('../../types').OrderAdjustPayload | null => {
    const adj: import('../../types').OrderAdjustPayload = {};
    const num = (s: string) => Number(s) || 0;
    if (num(discount) !== (order.discount ?? 0)) { adj.discount = num(discount); adj.discount_reason = discountReason; }
    if (num(surcharge) !== (order.surcharge_value ?? 0)) { adj.surcharge_value = num(surcharge); adj.surcharge_reason = surchargeReason; }
    if (num(deliveryFee) !== (order.delivery_fee ?? 0)) { adj.delivery_fee = num(deliveryFee); }
    return Object.keys(adj).length ? adj : null;
  };
```

4. No `handleSave`, depois do PATCH de cliente/agendamento, chamar adjust se houver mudança:

```tsx
  const handleSave = async () => {
    if (saving) return;
    const patch = buildPatch();
    const adjust = buildAdjust();
    if (Object.keys(patch).length === 0 && !adjust) { onClose(); return; }
    setSaving(true);
    try {
      if (Object.keys(patch).length > 0) await ordersService.updateOrder(order.id, patch);
      if (adjust) await ordersService.adjustOrder(order.id, adjust, undefined);
      toast.success('Pedido atualizado');
      onSaved();
    } catch {
      toast.error('Erro ao salvar pedido');
    } finally {
      setSaving(false);
    }
  };
```

5. Adicionar os inputs no corpo do drawer (antes do bloco de scheduling, ~linha 123), com `aria-label`/`htmlFor` casando com os testes ("Desconto", "Acréscimo", "Taxa de entrega"):

```tsx
          <div className="rounded-xl border border-border-token p-3 space-y-3">
            <div>
              <label htmlFor="edit-discount" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">Desconto (R$)</label>
              <input id="edit-discount" type="number" min="0" step="0.01" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <input aria-label="Motivo do desconto" className={`${inputCls} mt-2`} placeholder="Motivo (opcional)" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
            </div>
            <div>
              <label htmlFor="edit-surcharge" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">Acréscimo (R$)</label>
              <input id="edit-surcharge" type="number" min="0" step="0.01" className={inputCls} value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
              <input aria-label="Motivo do acréscimo" className={`${inputCls} mt-2`} placeholder="Motivo (opcional)" value={surchargeReason} onChange={(e) => setSurchargeReason(e.target.value)} />
            </div>
            <div>
              <label htmlFor="edit-delivery" className="block text-xs font-bold text-fg-muted-token uppercase tracking-widest mb-2">Taxa de entrega (R$)</label>
              <input id="edit-delivery" type="number" min="0" step="0.01" className={inputCls} value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
            </div>
          </div>
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd /home/graco/WORK/pastita-dash && npm test -- EditOrderDrawer`
Expected: PASS (2 testes).

- [ ] **Step 5: Build + lint**

Run: `cd /home/graco/WORK/pastita-dash && npm run build && npm run lint`
Expected: ambos verdes.

- [ ] **Step 6: Commit**

```bash
cd /home/graco/WORK/pastita-dash
git add src/components/orders/EditOrderDrawer.tsx src/components/orders/__tests__/EditOrderDrawer.test.tsx
git commit -m "feat(pedido): editar desconto/acréscimo/taxa de entrega no EditOrderDrawer"
```

---

## Task 8: EditOrderDrawer — editar itens (pastita-dash)

**Files:**
- Modify: `/home/graco/WORK/pastita-dash/src/components/orders/EditOrderDrawer.tsx`
- Test: `/home/graco/WORK/pastita-dash/src/components/orders/__tests__/EditOrderDrawer.test.tsx`

**Interfaces:**
- Consumes: `ordersService.adjustOrder` com `item_ops`; lista de produtos da loja (via `productsService`/hook já usado pelo `NewOrderDrawer`).
- Produces: o drawer lista os itens atuais com stepper de quantidade e botão remover, e um seletor "Adicionar produto"; ao salvar, calcula `item_ops` (diff entre estado inicial e atual) e os inclui no payload de `adjustOrder`.

> **Descoberta exigida ao implementador:** localizar como o `NewOrderDrawer`/`StepItens` lista produtos da loja (provável `productsService.getProducts({ store })` ou `useProducts`). Reusar esse mesmo serviço/hook aqui — NÃO criar fetch novo. Verifique em `src/components/orders/NewOrderDrawer.tsx` e nos steps usados por ele.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao `__tests__/EditOrderDrawer.test.tsx` um caso que cobre quantidade e remoção (mockando o hook/serviço de produtos que o componente passar a usar — o implementador ajusta o mock ao serviço real reusado):

```tsx
it('envia item_ops ao mudar quantidade e remover item', async () => {
  const order = {
    ...baseOrder,
    items: [
      { id: 'it-1', product: 'p1', product_name: 'X', quantity: 1, unit_price: 10, subtotal: 10 },
      { id: 'it-2', product: 'p2', product_name: 'Y', quantity: 1, unit_price: 5, subtotal: 5 },
    ],
  } as unknown as Order;
  render(<EditOrderDrawer order={order} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /aumentar X/i }));   // qty de it-1 → 2
  fireEvent.click(screen.getByRole('button', { name: /remover Y/i }));    // remove it-2
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => {
    const call = (ordersService.adjustOrder as jest.Mock).mock.calls[0][1];
    expect(call.item_ops).toEqual(expect.arrayContaining([
      { op: 'update', item_id: 'it-1', quantity: 2 },
      { op: 'remove', item_id: 'it-2' },
    ]));
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/pastita-dash && npm test -- EditOrderDrawer`
Expected: FAIL — não há botões de item.

- [ ] **Step 3: Implementar a edição de itens**

Em `EditOrderDrawer.tsx`:

1. Estado dos itens — derivar do pedido, guardando o original para diff:

```tsx
  type EditableItem = { id: string; product_name: string; unit_price: number; quantity: number; removed?: boolean };
  const [items, setItems] = useState<EditableItem[]>(
    (order.items ?? []).map((i) => ({
      id: String((i as { id: string }).id),
      product_name: i.product_name,
      unit_price: Number(i.unit_price) || 0,
      quantity: Number(i.quantity) || 1,
    })),
  );
  const [addedOps, setAddedOps] = useState<import('../../types').OrderItemOp[]>([]);
```

2. Handlers de quantidade/remoção:

```tsx
  const incItem = (id: string) => setItems((xs) => xs.map((i) => i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
  const decItem = (id: string) => setItems((xs) => xs.map((i) => i.id === id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i));
  const removeItem = (id: string) => setItems((xs) => xs.map((i) => i.id === id ? { ...i, removed: true } : i));
```

3. Diff → item_ops (estender `buildAdjust` da Task 7 para incluir itens):

```tsx
  const buildItemOps = (): import('../../types').OrderItemOp[] => {
    const ops: import('../../types').OrderItemOp[] = [];
    const original = new Map((order.items ?? []).map((i) => [String((i as { id: string }).id), Number(i.quantity)]));
    for (const it of items) {
      if (it.removed) { ops.push({ op: 'remove', item_id: it.id }); continue; }
      const before = original.get(it.id);
      if (before !== undefined && before !== it.quantity) ops.push({ op: 'update', item_id: it.id, quantity: it.quantity });
    }
    return [...ops, ...addedOps];
  };
```

E em `buildAdjust`, antes do `return`, incluir:

```tsx
    const itemOps = buildItemOps();
    if (itemOps.length) adj.item_ops = itemOps;
```

4. UI da lista de itens (antes do bloco de dinheiro). Cada item com `aria-label`s que casam com o teste (`Aumentar <nome>`, `Diminuir <nome>`, `Remover <nome>`):

```tsx
          <div className="rounded-xl border border-border-token p-3 space-y-2">
            <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">Itens</p>
            {items.filter((i) => !i.removed).map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-fg-token flex-1 truncate">{it.product_name}</span>
                <button type="button" aria-label={`Diminuir ${it.product_name}`} onClick={() => decItem(it.id)} className="px-2 rounded border border-border-token">−</button>
                <span className="w-6 text-center text-sm">{it.quantity}</span>
                <button type="button" aria-label={`Aumentar ${it.product_name}`} onClick={() => incItem(it.id)} className="px-2 rounded border border-border-token">+</button>
                <button type="button" aria-label={`Remover ${it.product_name}`} onClick={() => removeItem(it.id)} className="px-2 rounded text-red-500">×</button>
              </div>
            ))}
            {/* Adicionar produto: reusar o seletor/serviço de produtos do NewOrderDrawer.
                Ao escolher um produto P com quantidade Q, chamar:
                setAddedOps((o) => [...o, { op: 'add', product_id: P.id, quantity: Q }]) */}
          </div>
```

5. Implementar o seletor "Adicionar produto" reusando o serviço/hook de produtos descoberto no Step 0. Cada escolha empilha um `{ op: 'add', product_id, quantity }` em `addedOps` e mostra uma linha provisória na lista. (Sem novo endpoint; só leitura de produtos já existente.)

- [ ] **Step 4: Rodar e confirmar que passa (todos os testes do drawer)**

Run: `cd /home/graco/WORK/pastita-dash && npm test -- EditOrderDrawer`
Expected: PASS (Task 7 + Task 8).

- [ ] **Step 5: Build + lint**

Run: `cd /home/graco/WORK/pastita-dash && npm run build && npm run lint`
Expected: ambos verdes.

- [ ] **Step 6: Commit**

```bash
cd /home/graco/WORK/pastita-dash
git add src/components/orders/EditOrderDrawer.tsx src/components/orders/__tests__/EditOrderDrawer.test.tsx
git commit -m "feat(pedido): adicionar/remover/alterar quantidade de itens na edição do pedido"
```

---

## Task 9: CustomerFormDrawer — campos de endereço (pastita-dash)

**Files:**
- Modify: `/home/graco/WORK/pastita-dash/src/pages/customers/CustomersPage.tsx` (`CustomerFormDrawer`, linhas 77-142)
- Test: `/home/graco/WORK/pastita-dash/src/pages/customers/__tests__/CustomerFormDrawer.test.tsx` (criar)

**Interfaces:**
- Consumes: `createCustomer`/`updateCustomer` com `address_list` (Task 6); `StoreCustomer.address_list`/`default_address`.
- Produces: o formulário ganha campos de endereço (rua, número, complemento, bairro, cidade, UF, CEP); ao salvar, envia `address_list` com um endereço `is_default: true` (ou lista vazia se todos os campos estiverem em branco). Na edição, pré-preenche a partir de `customer.address_list[0]`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/pages/customers/__tests__/CustomerFormDrawer.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerFormDrawer } from '../CustomersPage';
import * as storesApi from '../../../services/storesApi';

jest.mock('../../../services/storesApi', () => ({
  createCustomer: jest.fn().mockResolvedValue({}),
  updateCustomer: jest.fn().mockResolvedValue({}),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

it('cria cliente com endereço', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Maria' } });
  fireEvent.change(screen.getByLabelText(/rua/i), { target: { value: 'Rua A' } });
  fireEvent.change(screen.getByLabelText(/número/i), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => expect(storesApi.createCustomer).toHaveBeenCalledWith(
    'l1', expect.objectContaining({
      name: 'Maria',
      address_list: [expect.objectContaining({ street: 'Rua A', number: '10', is_default: true })],
    }),
  ));
});

it('não envia address_list quando endereço está vazio', async () => {
  render(<CustomerFormDrawer storeSlug="l1" onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'João' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  await waitFor(() => {
    const payload = (storesApi.createCustomer as jest.Mock).mock.calls[0][1];
    expect(payload.address_list).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `cd /home/graco/WORK/pastita-dash && npm test -- CustomerFormDrawer`
Expected: FAIL — não há campo "Rua".

- [ ] **Step 3: Implementar os campos de endereço**

Em `CustomerFormDrawer` (CustomersPage.tsx):

1. Importar o tipo: na linha 25, ampliar para incluir `StoreCustomerAddress`:

```tsx
import { StoreCustomer, StoreCustomerAddress, createCustomer, updateCustomer } from '../../services/storesApi';
```

2. Estado do endereço (após linha 81), pré-preenchendo na edição a partir de `address_list[0]`:

```tsx
  const addr0 = customer?.address_list?.[0];
  const [street, setStreet] = useState(addr0?.street ?? '');
  const [number, setNumber] = useState(addr0?.number ?? '');
  const [complement, setComplement] = useState(addr0?.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(addr0?.neighborhood ?? '');
  const [city, setCity] = useState(addr0?.city ?? '');
  const [uf, setUf] = useState(addr0?.state ?? '');
  const [zip, setZip] = useState(addr0?.zip_code ?? '');
```

3. Montar `address_list` no save:

```tsx
  const buildAddressList = (): StoreCustomerAddress[] | undefined => {
    const filled = street || number || neighborhood || city || zip;
    if (!filled) return undefined;
    const addr: StoreCustomerAddress = {
      street, number, complement, neighborhood, city, state: uf, zip_code: zip, is_default: true,
    };
    if (addr0?.id) addr.id = addr0.id;
    return [addr];
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const address_list = buildAddressList();
      const payload = { name, phone, whatsapp, notes, ...(address_list ? { address_list } : {}) };
      if (isEdit && customer) {
        await updateCustomer(customer.id, payload);
      } else {
        await createCustomer(storeSlug, payload);
      }
      toast.success(isEdit ? 'Cliente atualizado' : 'Cliente criado');
      onSaved();
    } catch {
      toast.error('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };
```

4. Inputs de endereço no corpo (após o campo de notas, antes do `</div>` do corpo). `aria-label`/`htmlFor` casando com o teste ("Rua", "Número"):

```tsx
          <div className="pt-2 border-t border-border-token space-y-3">
            <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">Endereço</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label htmlFor="cf-street" className="sr-only">Rua</label>
                <input id="cf-street" aria-label="Rua" className={inputCls} placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <div>
                <label htmlFor="cf-number" className="sr-only">Número</label>
                <input id="cf-number" aria-label="Número" className={inputCls} placeholder="Nº" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
            </div>
            <input aria-label="Complemento" className={inputCls} placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
            <input aria-label="Bairro" className={inputCls} placeholder="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <input aria-label="Cidade" className={`${inputCls} col-span-2`} placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
              <input aria-label="UF" maxLength={2} className={inputCls} placeholder="UF" value={uf} onChange={(e) => setUf(e.target.value)} />
            </div>
            <input aria-label="CEP" className={inputCls} placeholder="CEP" value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
```

> O label "Nome" existente (linha 117) deve continuar casando com `/^nome$/i`. Se necessário, manter o texto exatamente "Nome".

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd /home/graco/WORK/pastita-dash && npm test -- CustomerFormDrawer`
Expected: PASS (2 testes).

- [ ] **Step 5: Build + lint**

Run: `cd /home/graco/WORK/pastita-dash && npm run build && npm run lint`
Expected: ambos verdes.

- [ ] **Step 6: Commit**

```bash
cd /home/graco/WORK/pastita-dash
git add src/pages/customers/CustomersPage.tsx src/pages/customers/__tests__/CustomerFormDrawer.test.tsx
git commit -m "feat(cliente): cadastrar/editar endereço no formulário de cliente"
```

---

## Task 10: OrderDetailPage — exibir acréscimo/motivo dos campos de model (pastita-dash)

**Files:**
- Modify: `/home/graco/WORK/pastita-dash/src/pages/orders/OrderDetailPage.tsx` (~linhas 583-604)

**Interfaces:**
- Consumes: `Order.{surcharge_value, surcharge_reason, manual_discount_reason}` (Tasks 2 + 6).
- Produces: a página passa a ler o acréscimo de `order.surcharge_value` (preferindo o campo de model; mantém fallback ao metadata legado para pedidos antigos) e exibe o motivo do desconto/acréscimo quando houver.

- [ ] **Step 1: Localizar o cálculo atual de `manualSurcharge`**

Run: `cd /home/graco/WORK/pastita-dash && grep -n "manualSurcharge\|manual_surcharge\|manual_adjustment" src/pages/orders/OrderDetailPage.tsx`
Expected: encontra a derivação atual a partir de `order.metadata`.

- [ ] **Step 2: Preferir o campo de model com fallback ao metadata**

Ajustar a derivação de `manualSurcharge` para preferir `order.surcharge_value`:

```tsx
  const manualSurcharge = Number(
    order.surcharge_value ?? order.metadata?.manual_surcharge ?? 0,
  ) || 0;
```

E onde o acréscimo é exibido (~linha 589-593), acrescentar o motivo quando existir (`order.surcharge_reason`). Onde o desconto é exibido (~linha 583-587), exibir `order.manual_discount_reason` como subtítulo quando presente. Manter o layout/classes existentes.

- [ ] **Step 3: Verificar build + suite de OrderDetail (se existir)**

Run: `cd /home/graco/WORK/pastita-dash && npm run build && npm test -- OrderDetail`
Expected: build verde; testes existentes (se houver) passam. Se não existir teste, apenas o build precisa passar.

- [ ] **Step 4: Lint**

Run: `cd /home/graco/WORK/pastita-dash && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
cd /home/graco/WORK/pastita-dash
git add src/pages/orders/OrderDetailPage.tsx
git commit -m "feat(pedido): exibe acréscimo e motivos a partir dos campos do pedido"
```

---

## Verificação final (após todas as tasks)

**Backend (server2):**

```bash
cd /home/graco/WORK/server2
python manage.py test apps.stores.tests.test_order_adjust apps.stores.tests.test_customer_address apps.stores.tests.test_order_update apps.stores.tests.test_customer_crud --settings=config.settings.development
```
Expected: todos PASS (novos + regressão de cliente/pedido).

**Frontend (pastita-dash):**

```bash
cd /home/graco/WORK/pastita-dash
npm run build && npm test && npm run lint
```
Expected: build verde, todas as suites PASS, lint verde (≤400 warnings).

**Deploy:** o backend (server2) é deploy manual (imagem baked, `bash deploy.sh`) — combinar com o usuário. O frontend (pastita-dash) faz deploy automático no push da `main` (Vercel); só mergear a branch quando o backend correspondente já estiver em produção, senão o painel chama um endpoint `adjust` que ainda não existe.
