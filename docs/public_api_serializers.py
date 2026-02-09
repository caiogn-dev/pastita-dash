"""
Serializers para API Pública (Cardápio)

Estes serializers expõem apenas dados necessários e seguros
para o cardápio público (pastita-3d).
"""

from rest_framework import serializers
from apps.stores.models import Store
from apps.products.models import Product, Category


class PublicStoreSerializer(serializers.ModelSerializer):
    """Serializer público para loja (apenas dados visíveis)."""
    
    class Meta:
        model = Store
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'logo_url',
            'banner_url',
            'phone',
            'whatsapp',
            'address',
            'opening_hours',
            'primary_color',
            'secondary_color',
            'instagram_url',
            'facebook_url',
            'is_open',
        ]


class PublicProductSerializer(serializers.ModelSerializer):
    """Serializer público para produto (sem dados sensíveis)."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'short_description',
            'price',
            'compare_at_price',
            'image_url',
            'gallery_urls',
            'category_name',
            'category_slug',
            'is_available',
            'allows_pickup',
            'allows_delivery',
            'preparation_time_minutes',
            'tags',
        ]


class PublicCategorySerializer(serializers.ModelSerializer):
    """Serializer público para categoria com produtos."""
    
    products = PublicProductSerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(source='products.count', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'image_url',
            'sort_order',
            'product_count',
            'products',
        ]


class PublicCatalogItemSerializer(serializers.Serializer):
    """Serializer para item de catálogo (produto em catálogo)."""
    
    product_id = serializers.UUIDField()
    product_name = serializers.CharField()
    product_slug = serializers.CharField()
    description = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    image_url = serializers.URLField()
    is_available = serializers.BooleanField()
    position = serializers.IntegerField()


class PublicCatalogSerializer(serializers.Serializer):
    """Serializer para catálogo completo organizado por categoria."""
    
    categories = PublicCategorySerializer(many=True)
    total_products = serializers.IntegerField()
    last_updated = serializers.DateTimeField()
