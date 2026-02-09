"""
API Pública para Cardápio (pastita-3d)

Estes endpoints são acessíveis SEM autenticação para permitir
que o cardápio 3D funcione para clientes não logados.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.stores.models import Store
from apps.products.models import Product, Category
from apps.catalog.models import Catalog, CatalogItem
from .serializers import (
    PublicStoreSerializer,
    PublicProductSerializer,
    PublicCategorySerializer,
    PublicCatalogSerializer,
    PublicCatalogItemSerializer,
)


class AllowAny(permissions.BasePermission):
    """Permissão que permite acesso a qualquer um."""
    def has_permission(self, request, view):
        return True


@api_view(['GET'])
@permission_classes([AllowAny])
def public_store_detail(request, slug):
    """
    Retorna informações públicas de uma loja.
    
    GET /api/v1/public/stores/<slug>/
    """
    store = get_object_or_404(Store, slug=slug, is_active=True)
    serializer = PublicStoreSerializer(store)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_store_products(request, slug):
    """
    Retorna produtos públicos de uma loja.
    
    GET /api/v1/public/stores/<slug>/products/
    Query params:
        - category: filtrar por categoria
        - search: busca por nome
    """
    store = get_object_or_404(Store, slug=slug, is_active=True)
    
    products = Product.objects.filter(
        store=store,
        is_active=True,
        is_available=True
    ).select_related('category')
    
    # Filtros
    category = request.query_params.get('category')
    if category:
        products = products.filter(category__slug=category)
    
    search = request.query_params.get('search')
    if search:
        products = products.filter(name__icontains=search)
    
    serializer = PublicProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_store_categories(request, slug):
    """
    Retorna categorias públicas de uma loja.
    
    GET /api/v1/public/stores/<slug>/categories/
    """
    store = get_object_or_404(Store, slug=slug, is_active=True)
    
    categories = Category.objects.filter(
        store=store,
        is_active=True
    ).prefetch_related('products')
    
    serializer = PublicCategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_store_catalog(request, slug):
    """
    Retorna o catálogo completo de uma loja (produtos organizados por categoria).
    
    GET /api/v1/public/stores/<slug>/catalog/
    """
    store = get_object_or_404(Store, slug=slug, is_active=True)
    
    # Busca categorias com produtos ativos
    categories = Category.objects.filter(
        store=store,
        is_active=True,
        products__is_active=True,
        products__is_available=True
    ).distinct().prefetch_related('products')
    
    response_data = {
        'store': PublicStoreSerializer(store).data,
        'categories': PublicCategorySerializer(categories, many=True).data,
    }
    
    return Response(response_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_product_detail(request, slug, product_id):
    """
    Retorna detalhes de um produto específico.
    
    GET /api/v1/public/stores/<slug>/products/<product_id>/
    """
    store = get_object_or_404(Store, slug=slug, is_active=True)
    product = get_object_or_404(
        Product,
        id=product_id,
        store=store,
        is_active=True
    )
    
    serializer = PublicProductSerializer(product)
    return Response(serializer.data)


# ViewSets paraDRF (opcional, se preferir usar router)

class PublicStoreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para lojas públicas.
    Apenas lojas ativas e visíveis.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicStoreSerializer
    lookup_field = 'slug'
    
    def get_queryset(self):
        return Store.objects.filter(is_active=True)


class PublicProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para produtos públicos.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicProductSerializer
    
    def get_queryset(self):
        store_slug = self.kwargs.get('store_slug')
        store = get_object_or_404(Store, slug=store_slug, is_active=True)
        return Product.objects.filter(
            store=store,
            is_active=True,
            is_available=True
        )


class PublicCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para categorias públicas.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicCategorySerializer
    
    def get_queryset(self):
        store_slug = self.kwargs.get('store_slug')
        store = get_object_or_404(Store, slug=store_slug, is_active=True)
        return Category.objects.filter(store=store, is_active=True)
