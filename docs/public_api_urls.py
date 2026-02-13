from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import public_views

app_name = 'public_api'

# Router para viewsets (opcional)
router = DefaultRouter()
router.register(r'stores', public_views.PublicStoreViewSet, basename='public-store')

urlpatterns = [
    # Store endpoints
    path('stores/<slug:slug>/', public_views.public_store_detail, name='store-detail'),
    path('stores/<slug:slug>/products/', public_views.public_store_products, name='store-products'),
    path('stores/<slug:slug>/categories/', public_views.public_store_categories, name='store-categories'),
    path('stores/<slug:slug>/catalog/', public_views.public_store_catalog, name='store-catalog'),
    path('stores/<slug:slug>/products/<uuid:product_id>/', 
         public_views.public_product_detail, name='product-detail'),
    
    # Router URLs (opcional)
    # path('', include(router.urls)),
]
