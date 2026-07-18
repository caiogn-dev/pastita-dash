import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  getStore,
  updateStore,
  getStoreMetaTracking,
  updateStoreMetaTracking,
  type Store,
  type StoreMetaTracking,
} from '../../services/storesApi';
import { useStore } from '../../hooks';
import logger from '../../services/logger';
import { Card, Button, StatCard } from '../../components/ui';

interface DeliveryConfig {
  delivery_base_fee: number;
  delivery_fee_per_km: number;
  delivery_free_km: number;
  delivery_max_fee: number;
  delivery_max_distance: number;
}

const DAYS = [
  { key: 'monday',    label: 'Segunda' },
  { key: 'tuesday',   label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday',  label: 'Quinta' },
  { key: 'friday',    label: 'Sexta' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
];

type DayHours = { is_open: boolean; open: string; close: string };
type OperatingHours = Record<string, DayHours>;

const DEFAULT_HOURS: DayHours = { is_open: true, open: '08:00', close: '22:00' };

const defaultDeliveryConfig: DeliveryConfig = {
  delivery_base_fee: 5.0,
  delivery_fee_per_km: 1.0,
  delivery_free_km: 2.0,
  delivery_max_fee: 25.0,
  delivery_max_distance: 20.0,
};

const defaultMetaTracking: StoreMetaTracking = {
  meta_pixel_id: '',
  meta_pixel_enabled: false,
  meta_capi_enabled: false,
  meta_capi_access_token: '',
  meta_capi_token_configured: false,
  meta_capi_test_event_code: '',
};

export const StoreSettingsPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const effectiveStoreId = useMemo(() => {
    if (!routeStoreId) return contextStoreId || null;
    const match = stores.find((store) => store.id === routeStoreId || store.slug === routeStoreId);
    return match?.slug || routeStoreId;
  }, [routeStoreId, contextStoreId, stores]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(defaultDeliveryConfig);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({});
  const [metaTracking, setMetaTracking] = useState<StoreMetaTracking>(defaultMetaTracking);
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
    if (!effectiveStoreId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [data, tracking] = await Promise.all([
        getStore(effectiveStoreId),
        getStoreMetaTracking(effectiveStoreId),
      ]);
      setStore(data);
      setMetaTracking({ ...tracking, meta_capi_access_token: '' });

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

      const metadata = data.metadata || {};
      setDeliveryConfig({
        delivery_base_fee: Number(metadata.delivery_base_fee) || defaultDeliveryConfig.delivery_base_fee,
        delivery_fee_per_km: Number(metadata.delivery_fee_per_km) || defaultDeliveryConfig.delivery_fee_per_km,
        delivery_free_km: Number(metadata.delivery_free_km) || defaultDeliveryConfig.delivery_free_km,
        delivery_max_fee: Number(metadata.delivery_max_fee) || defaultDeliveryConfig.delivery_max_fee,
        delivery_max_distance: Number(metadata.delivery_max_distance) || defaultDeliveryConfig.delivery_max_distance,
      });

      const stored = (data.operating_hours as OperatingHours) || {};
      const initialized: OperatingHours = {};
      DAYS.forEach(d => {
        initialized[d.key] = stored[d.key] || { ...DEFAULT_HOURS, is_open: d.key !== 'sunday' };
      });
      setOperatingHours(initialized);
    } catch (error) {
      logger.error('Error loading store:', error);
      toast.error('Erro ao carregar configurações da loja');
    } finally {
      setLoading(false);
    }
  }, [effectiveStoreId]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const handleSaveStore = async () => {
    if (!effectiveStoreId) return;
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

      await updateStore(effectiveStoreId, payload);
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
    if (!effectiveStoreId) return;
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

      await updateStore(effectiveStoreId, payload);
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
    if (!effectiveStoreId) return;
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
        // Campos do modelo (o form recarrega a partir destes; antes só gravava em
        // metadata.store_* e a localização "sumia" no reload). Mantém metadata como
        // fallback legado lido por geo/service.py e maps_views.py.
        latitude: lat,
        longitude: lng,
        metadata: {
          ...currentMetadata,
          store_latitude: lat,
          store_longitude: lng,
        },
      };

      await updateStore(effectiveStoreId, payload);
      toast.success('Localização da loja atualizada!');
      loadStore();
    } catch (error) {
      logger.error('Error saving location:', error);
      toast.error('Erro ao salvar localização');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOperatingHours = async () => {
    if (!effectiveStoreId) return;
    setSaving(true);
    try {
      await updateStore(effectiveStoreId, { operating_hours: operatingHours });
      toast.success('Horários de funcionamento atualizados!');
      loadStore();
    } catch (error) {
      logger.error('Error saving operating hours:', error);
      toast.error('Erro ao salvar horários de funcionamento');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMetaTracking = async () => {
    if (!effectiveStoreId) return;
    setSaving(true);
    try {
      const payload: Partial<StoreMetaTracking> = {
        meta_pixel_id: metaTracking.meta_pixel_id.trim(),
        meta_pixel_enabled: metaTracking.meta_pixel_enabled,
        meta_capi_enabled: metaTracking.meta_capi_enabled,
        meta_capi_test_event_code: metaTracking.meta_capi_test_event_code.trim(),
      };
      if (metaTracking.meta_capi_access_token?.trim()) {
        payload.meta_capi_access_token = metaTracking.meta_capi_access_token.trim();
      }
      const saved = await updateStoreMetaTracking(effectiveStoreId, payload);
      setMetaTracking({ ...saved, meta_capi_access_token: '' });
      toast.success('Rastreamento da Meta atualizado!');
    } catch (error) {
      logger.error('Error saving Meta tracking:', error);
      toast.error('Erro ao salvar rastreamento da Meta');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 text-fg-muted-token animate-spin mx-auto mb-3" />
          <p className="text-fg-muted-token">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!effectiveStoreId) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center max-w-md">
          <BuildingStorefrontIcon className="w-12 h-12 text-fg-muted-token mx-auto mb-3" />
          <p className="text-fg-muted-token">Selecione uma loja para configurar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BuildingStorefrontIcon className="w-6 h-6 text-brand" />
          <div>
            <h1 className="text-2xl font-bold text-fg-token">Configurações da Loja</h1>
            <p className="text-sm text-fg-muted-token">{store?.name || 'Loja'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BuildingStorefrontIcon className="w-5 h-5 text-fg-muted-token" />
              <h2 className="text-lg font-semibold text-fg-token">Informações da Loja</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Nome</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Email</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Telefone</label>
                <input
                  type="text"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">WhatsApp</label>
                <input
                  type="text"
                  value={storeForm.whatsapp_number}
                  onChange={(e) => setStoreForm({ ...storeForm, whatsapp_number: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <Button
                onClick={handleSaveStore}
                disabled={saving}
                className="w-full justify-center"
              >
                {saving ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="w-5 h-5 text-fg-muted-token" />
              <h2 className="text-lg font-semibold text-fg-token">Localização</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Endereço</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-fg-muted-token">Cidade</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-fg-muted-token">Estado</label>
                  <input
                    type="text"
                    value={storeForm.state}
                    onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                    className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">CEP</label>
                <input
                  type="text"
                  value={storeForm.zip_code}
                  onChange={(e) => setStoreForm({ ...storeForm, zip_code: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-fg-muted-token">Latitude</label>
                  <input
                    type="text"
                    value={storeForm.latitude}
                    onChange={(e) => setStoreForm({ ...storeForm, latitude: e.target.value })}
                    className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-fg-muted-token">Longitude</label>
                  <input
                    type="text"
                    value={storeForm.longitude}
                    onChange={(e) => setStoreForm({ ...storeForm, longitude: e.target.value })}
                    className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveLocation}
                disabled={saving}
                className="w-full justify-center"
              >
                {saving ? 'Salvando...' : 'Salvar Localização'}
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TruckIcon className="w-5 h-5 text-fg-muted-token" />
            <h2 className="text-lg font-semibold text-fg-token">Entrega</h2>
          </div>
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Taxa Base</label>
                <input
                  type="number"
                  value={deliveryConfig.delivery_base_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_base_fee: parseFloat(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Taxa por KM</label>
                <input
                  type="number"
                  value={deliveryConfig.delivery_fee_per_km}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_fee_per_km: parseFloat(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">KM Grátis</label>
                <input
                  type="number"
                  value={deliveryConfig.delivery_free_km}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_free_km: parseFloat(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Taxa Máxima</label>
                <input
                  type="number"
                  value={deliveryConfig.delivery_max_fee}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_max_fee: parseFloat(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-fg-muted-token">Distância Máxima</label>
                <input
                  type="number"
                  value={deliveryConfig.delivery_max_distance}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_max_distance: parseFloat(e.target.value) })}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="bg-surface-2 rounded p-4">
                <div className="flex items-center gap-2 text-fg-muted-token mb-2">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Exemplo</span>
                </div>
                <div className="flex items-center justify-between text-sm text-fg-token">
                  <span>5 km</span>
                  <span className="font-semibold">R$ {calculateExampleFee(5).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSaveDeliveryConfig}
            disabled={saving}
            className="mt-6 w-full justify-center"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações de Entrega'}
          </Button>
        </Card>

        {/* Horários de Funcionamento */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-fg-muted-token" />
            <h3 className="text-base font-semibold text-fg-token">Horários de funcionamento</h3>
          </div>
          <div className="space-y-3">
            {DAYS.map(day => {
              const h = operatingHours[day.key] || DEFAULT_HOURS;
              return (
                <div key={day.key} className="flex items-center gap-3">
                  <div className="w-24 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setOperatingHours(prev => ({
                        ...prev,
                        [day.key]: { ...h, is_open: !h.is_open }
                      }))}
                      className={`w-full text-xs font-semibold px-2 py-1.5 rounded transition-colors ${
                        h.is_open
                          ? 'bg-brand-soft text-brand hover:bg-brand-soft/80'
                          : 'bg-surface-2 text-fg-muted-token hover:bg-surface-2/80'
                      }`}
                    >
                      {h.is_open ? '✓ ' : ''}{day.label}
                    </button>
                  </div>
                  {h.is_open ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={h.open}
                        onChange={e => setOperatingHours(prev => ({
                          ...prev,
                          [day.key]: { ...h, open: e.target.value }
                        }))}
                        className="border border-border-token bg-surface rounded px-2 py-1.5 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <span className="text-fg-muted-token text-sm">até</span>
                      <input
                        type="time"
                        value={h.close}
                        onChange={e => setOperatingHours(prev => ({
                          ...prev,
                          [day.key]: { ...h, close: e.target.value }
                        }))}
                        className="border border-border-token bg-surface rounded px-2 py-1.5 text-sm text-fg-token focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-fg-muted-token italic">Fechado</span>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            onClick={handleSaveOperatingHours}
            disabled={saving}
            className="mt-6 w-full justify-center"
          >
            {saving ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="w-5 h-5 text-fg-muted-token" />
            <h3 className="text-base font-semibold text-fg-token">Meta Pixel e Conversions API</h3>
          </div>
          <p className="text-sm text-fg-muted-token mb-5">
            Configuração exclusiva desta loja. Cole somente o ID numérico do Pixel; nenhum script é necessário.
          </p>
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg-muted-token">ID do Meta Pixel</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={metaTracking.meta_pixel_id}
                  onChange={e => setMetaTracking(prev => ({
                    ...prev,
                    meta_pixel_id: e.target.value.replace(/\D/g, ''),
                  }))}
                  placeholder="Ex.: 123456789012345"
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <label className="flex items-center gap-3 text-sm text-fg-token cursor-pointer">
                <input
                  type="checkbox"
                  checked={metaTracking.meta_pixel_enabled}
                  onChange={e => setMetaTracking(prev => ({ ...prev, meta_pixel_enabled: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Ativar Meta Pixel na vitrine
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-fg-muted-token">
                  Token da Conversions API {metaTracking.meta_capi_token_configured && '• configurado'}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={metaTracking.meta_capi_access_token || ''}
                  onChange={e => setMetaTracking(prev => ({ ...prev, meta_capi_access_token: e.target.value }))}
                  placeholder={metaTracking.meta_capi_token_configured ? 'Deixe vazio para manter o token atual' : 'Token gerado no Gerenciador de Eventos'}
                  className="w-full mt-1 px-4 py-2 bg-surface text-fg-token border border-border-token rounded focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <label className="flex items-center gap-3 text-sm text-fg-token cursor-pointer">
                <input
                  type="checkbox"
                  checked={metaTracking.meta_capi_enabled}
                  onChange={e => setMetaTracking(prev => ({ ...prev, meta_capi_enabled: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Enviar compras pela Conversions API
              </label>
            </div>
          </div>
          <Button onClick={handleSaveMetaTracking} disabled={saving} className="mt-6 w-full justify-center">
            {saving ? 'Salvando...' : 'Salvar Meta Pixel'}
          </Button>
        </Card>

        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4">
          <StatCard
            label="Status"
            value={store?.status === 'active' ? 'Ativa' : 'Inativa'}
            tone={store?.status === 'active' ? 'brand' : 'default'}
          />
          <StatCard label="Pedidos" value={store?.orders_count ?? 0} />
          <StatCard label="Produtos" value={store?.products_count ?? 0} />
        </div>
      </div>
    </div>
  );
};

export default StoreSettingsPage;
