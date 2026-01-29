import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { getStore, updateStore, type Store } from '../../services/storesApi';
import logger from '../../services/logger';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';

interface DeliveryConfig {
  delivery_base_fee: number;
  delivery_fee_per_km: number;
  delivery_free_km: number;
  delivery_max_fee: number;
  delivery_max_distance: number;
}

const defaultDeliveryConfig: DeliveryConfig = {
  delivery_base_fee: 5.0,
  delivery_fee_per_km: 1.0,
  delivery_free_km: 2.0,
  delivery_max_fee: 25.0,
  delivery_max_distance: 20.0,
};

export const PastitaSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(defaultDeliveryConfig);
  const [storeForm, setStoreForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    latitude: '',
    longitude: '',
  });

  const loadStore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStore(STORE_SLUG);
      setStore(data);
      
      // Populate form
      setStoreForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        whatsapp_number: data.whatsapp_number || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        latitude: data.latitude?.toString() || '',
        longitude: data.longitude?.toString() || '',
      });

      // Populate delivery config from metadata
      const metadata = data.metadata || {};
      setDeliveryConfig({
        delivery_base_fee: Number(metadata.delivery_base_fee) || defaultDeliveryConfig.delivery_base_fee,
        delivery_fee_per_km: Number(metadata.delivery_fee_per_km) || defaultDeliveryConfig.delivery_fee_per_km,
        delivery_free_km: Number(metadata.delivery_free_km) || defaultDeliveryConfig.delivery_free_km,
        delivery_max_fee: Number(metadata.delivery_max_fee) || defaultDeliveryConfig.delivery_max_fee,
        delivery_max_distance: Number(metadata.delivery_max_distance) || defaultDeliveryConfig.delivery_max_distance,
      });
    } catch (error) {
      logger.error('Error loading store:', error);
      toast.error('Erro ao carregar configurações da loja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const handleSaveStore = async () => {
    setSaving(true);
    try {
      const payload = {
        name: storeForm.name,
        email: storeForm.email,
        phone: storeForm.phone,
        whatsapp_number: storeForm.whatsapp_number,
        address: storeForm.address,
        city: storeForm.city,
        state: storeForm.state,
        zip_code: storeForm.zip_code,
      };
      
      await updateStore(STORE_SLUG, payload);
      toast.success('Informações da loja atualizadas!');
      loadStore();
    } catch (error) {
      logger.error('Error saving store:', error);
      toast.error('Erro ao salvar informações da loja');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeliveryConfig = async () => {
    setSaving(true);
    try {
      const currentMetadata = store?.metadata || {};
      const payload = {
        metadata: {
          ...currentMetadata,
          delivery_base_fee: deliveryConfig.delivery_base_fee,
          delivery_fee_per_km: deliveryConfig.delivery_fee_per_km,
          delivery_free_km: deliveryConfig.delivery_free_km,
          delivery_max_fee: deliveryConfig.delivery_max_fee,
          delivery_max_distance: deliveryConfig.delivery_max_distance,
        },
      };
      
      await updateStore(STORE_SLUG, payload);
      toast.success('Configurações de entrega atualizadas!');
      loadStore();
    } catch (error) {
      logger.error('Error saving delivery config:', error);
      toast.error('Erro ao salvar configurações de entrega');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    const lat = parseFloat(storeForm.latitude);
    const lng = parseFloat(storeForm.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Latitude e longitude devem ser números válidos');
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error('Latitude deve estar entre -90 e 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      toast.error('Longitude deve estar entre -180 e 180');
      return;
    }

    setSaving(true);
    try {
      const currentMetadata = store?.metadata || {};
      const payload = {
        metadata: {
          ...currentMetadata,
          store_latitude: lat,
          store_longitude: lng,
        },
      };
      
      await updateStore(STORE_SLUG, payload);
      toast.success('Localização da loja atualizada!');
      loadStore();
    } catch (error) {
      logger.error('Error saving location:', error);
      toast.error('Erro ao salvar localização');
    } finally {
      setSaving(false);
    }
  };

  // Calculate example delivery fee
  const calculateExampleFee = (distance: number): number => {
    if (distance <= deliveryConfig.delivery_free_km) {
      return deliveryConfig.delivery_base_fee;
    }
    const extraKm = distance - deliveryConfig.delivery_free_km;
    const fee = deliveryConfig.delivery_base_fee + (extraKm * deliveryConfig.delivery_fee_per_km);
    return Math.min(fee, deliveryConfig.delivery_max_fee);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <Cog6ToothIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configurações da Loja</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie informações e configurações de entrega</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Store Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <BuildingStorefrontIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações da Loja</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Loja</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Pastita"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="contato@pastita.com.br"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="(63) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={storeForm.whatsapp_number}
                  onChange={(e) => setStoreForm({ ...storeForm, whatsapp_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="5563999999999"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Quadra 104 Sul, Alameda 01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
                <input
                  type="text"
                  value={storeForm.zip_code}
                  onChange={(e) => setStoreForm({ ...storeForm, zip_code: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="77020-170"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                <input
                  type="text"
                  value={storeForm.city}
                  onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Palmas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                <input
                  type="text"
                  value={storeForm.state}
                  onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="TO"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveStore}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Salvar Informações
              </button>
            </div>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <MapPinIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Localização GPS</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Coordenadas usadas para calcular distância de entrega
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                <input
                  type="text"
                  value={storeForm.latitude}
                  onChange={(e) => setStoreForm({ ...storeForm, latitude: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  placeholder="-10.1857"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                <input
                  type="text"
                  value={storeForm.longitude}
                  onChange={(e) => setStoreForm({ ...storeForm, longitude: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  placeholder="-48.3101"
                />
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 <strong>Dica:</strong> Abra o Google Maps, clique com botão direito no local da loja e copie as coordenadas.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveLocation}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <MapPinIcon className="w-5 h-5" />
                Salvar Localização
              </button>
            </div>
          </div>
        </div>

        {/* Delivery Config Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center gap-3">
              <TruckIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações de Entrega</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Defina a fórmula de cálculo da taxa de entrega
            </p>
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Taxa Base (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={deliveryConfig.delivery_base_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_base_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Valor mínimo cobrado</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Taxa por Km (R$)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={deliveryConfig.delivery_fee_per_km}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_fee_per_km: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Valor adicional por km após o limite grátis</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Km Grátis
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={deliveryConfig.delivery_free_km}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_free_km: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Distância sem cobrança adicional</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Taxa Máxima (R$)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={deliveryConfig.delivery_max_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_max_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Limite máximo da taxa de entrega</p>
              </div>
            </div>

            {/* Formula Preview */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                Fórmula de Cálculo
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-sm border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300">
                  Se distância ≤ {deliveryConfig.delivery_free_km} km: <span className="text-green-600 dark:text-green-400 font-bold">R$ {deliveryConfig.delivery_base_fee.toFixed(2)}</span>
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  Se distância &gt; {deliveryConfig.delivery_free_km} km: <span className="text-amber-600 dark:text-amber-400 font-bold">R$ {deliveryConfig.delivery_base_fee.toFixed(2)} + (distância - {deliveryConfig.delivery_free_km}) × R$ {deliveryConfig.delivery_fee_per_km.toFixed(2)}</span>
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  Máximo: <span className="text-red-600 dark:text-red-400 font-bold">R$ {deliveryConfig.delivery_max_fee.toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Example Calculations */}
            <div className="bg-amber-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Exemplos de Cálculo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[2, 5, 8, 12].map((km) => (
                  <div key={km} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-amber-200">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{km} km</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      R$ {calculateExampleFee(km).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveDeliveryConfig}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <TruckIcon className="w-5 h-5" />
                Salvar Configurações de Entrega
              </button>
            </div>
          </div>
        </div>

        {/* Current Store Status */}
        {store && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status da Loja</h2>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className={`text-lg font-bold ${store.is_open ? 'text-green-600' : 'text-red-600'}`}>
                    {store.is_open ? 'Aberta' : 'Fechada'}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Produtos</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{store.products_count || 0}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{store.orders_count || 0}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Entrega</p>
                  <p className={`text-lg font-bold ${store.delivery_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {store.delivery_enabled ? 'Ativa' : 'Inativa'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PastitaSettingsPage;
