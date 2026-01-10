import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Badge, Modal, Loading } from '../../components/common';
import {
  deliveryService,
  DeliveryZone,
  CreateDeliveryZone,
  UpdateDeliveryZone,
  DeliveryZoneStats,
  StoreLocation,
  UpdateStoreLocation,
} from '../../services/delivery';

const formatKm = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '0.00';
  return value.toFixed(2);
};

const formatMoney = (value?: number | string | null) => {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  if (Number.isNaN(numeric)) return '0.00';
  return numeric.toFixed(2);
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const buildMapUrls = ({
  lat,
  lng,
  query,
}: {
  lat?: number | string | null;
  lng?: number | string | null;
  query?: string;
}) => {
  const parsedLat = typeof lat === 'string' ? Number.parseFloat(lat) : lat;
  const parsedLng = typeof lng === 'string' ? Number.parseFloat(lng) : lng;
  const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
  if (hasCoords && parsedLat != null && parsedLng != null) {
    const coords = `${parsedLat},${parsedLng}`;
    return {
      mapUrl: `https://www.google.com/maps?q=${coords}&output=embed`,
      externalUrl: `https://www.google.com/maps?q=${coords}`,
    };
  }
  if (query) {
    const encoded = encodeURIComponent(query);
    return {
      mapUrl: `https://www.google.com/maps?q=${encoded}&output=embed`,
      externalUrl: `https://www.google.com/maps?q=${encoded}`,
    };
  }
  return null;
};

export const DeliveryZonesPage: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stats, setStats] = useState<DeliveryZoneStats | null>(null);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);
  const [storeForm, setStoreForm] = useState<UpdateStoreLocation>({
    name: '',
    zip_code: '',
    address: '',
    city: '',
    state: '',
  });
  const [storeError, setStoreError] = useState('');
  const [savingStore, setSavingStore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<DeliveryZone | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateDeliveryZone>({
    name: '',
    min_km: 0,
    max_km: 0,
    delivery_fee: 0,
    min_fee: 0,
    estimated_days: 1,
    is_active: true,
  });

  const mapInfo = useMemo(() => {
    if (!storeLocation) return null;
    const queryParts = [
      storeLocation.address,
      storeLocation.city,
      storeLocation.state,
      storeLocation.zip_code,
      'Brasil',
    ].filter(Boolean);
    return buildMapUrls({
      lat: storeLocation.latitude,
      lng: storeLocation.longitude,
      query: queryParts.join(', '),
    });
  }, [storeLocation]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [zonesData, statsData, storeData] = await Promise.all([
        deliveryService.getZones({
          search: search || undefined,
          is_active: filterActive,
        }),
        deliveryService.getStats(),
        deliveryService.getStoreLocation(),
      ]);
      setZones(zonesData.results);
      setStats(statsData);
      if (storeData) {
        setStoreLocation(storeData);
        setStoreForm({
          name: storeData.name || '',
          zip_code: storeData.zip_code || '',
          address: storeData.address || '',
          city: storeData.city || '',
          state: storeData.state || '',
        });
      }
    } catch (error) {
      console.error('Error loading delivery zones:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterActive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        min_km: zone.min_km ?? 0,
        max_km: zone.max_km ?? 0,
        delivery_fee: zone.delivery_fee,
        min_fee: zone.min_fee ?? 0,
        estimated_days: zone.estimated_days,
        is_active: zone.is_active,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        min_km: 0,
        max_km: 0,
        delivery_fee: 0,
        min_fee: 0,
        estimated_days: 1,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingZone) {
        const payload: UpdateDeliveryZone = {
          ...formData,
          name: formData.name.trim(),
          min_km: Number.isFinite(formData.min_km) ? formData.min_km : 0,
          max_km: Number.isFinite(formData.max_km) ? formData.max_km : 0,
          min_fee: Number.isFinite(formData.min_fee) ? formData.min_fee : 0,
        };
        await deliveryService.updateZone(editingZone.id, payload);
      } else {
        const payload: CreateDeliveryZone = {
          ...formData,
          name: formData.name.trim(),
          min_km: Number.isFinite(formData.min_km) ? formData.min_km : 0,
          max_km: Number.isFinite(formData.max_km) ? formData.max_km : 0,
          min_fee: Number.isFinite(formData.min_fee) ? formData.min_fee : 0,
        };
        await deliveryService.createZone(payload);
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving delivery zone:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      await deliveryService.toggleActive(zone.id);
      loadData();
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingZone) return;
    try {
      setSaving(true);
      await deliveryService.deleteZone(deletingZone.id);
      setIsDeleteModalOpen(false);
      setDeletingZone(null);
      loadData();
    } catch (error) {
      console.error('Error deleting zone:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStoreLocation = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setStoreError('');
    if (!storeForm.zip_code) {
      setStoreError('Informe o CEP da loja.');
      return;
    }

    try {
      setSavingStore(true);
      const payload: UpdateStoreLocation = {
        ...storeForm,
        zip_code: storeForm.zip_code.replace(/\D/g, '').slice(0, 8),
      };
      const updated = await deliveryService.updateStoreLocation(payload);
      setStoreLocation(updated);
      setStoreForm({
        name: updated.name || '',
        zip_code: updated.zip_code || '',
        address: updated.address || '',
        city: updated.city || '',
        state: updated.state || '',
      });
    } catch (error) {
      console.error('Error updating store location:', error);
      setStoreError('Não foi possível salvar o CEP da loja.');
    } finally {
      setSavingStore(false);
    }
  };

  if (loading && zones.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zonas de Entrega</h1>
          <p className="text-gray-500">Calcule frete por quilometragem e gerencie faixas de pre?o</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Faixa
        </Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSaveStoreLocation} className="space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-lg font-semibold text-gray-900">Localização da Loja</h2>
              <p className="text-sm text-gray-500">
                Informe o CEP e pressione Enter para carregar os dados da loja.
              </p>
            </div>
            <div className="flex-1 min-w-[260px]">
              <Input
                type="text"
                placeholder="Nome da loja"
                value={storeForm.name || ''}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP *</label>
              <Input
                type="text"
                value={formatCep(storeForm.zip_code)}
                onChange={(e) => setStoreForm({
                  ...storeForm,
                  zip_code: e.target.value.replace(/\D/g, '').slice(0, 8),
                })}
                placeholder="77020-170"
                maxLength={9}
                inputMode="numeric"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={savingStore}>
                {savingStore ? 'Salvando...' : 'Buscar dados'}
              </Button>
            </div>
          </div>

          {storeError && (
            <p className="text-sm text-red-600">{storeError}</p>
          )}
        </form>

        {storeLocation && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Endereço"
                value={storeLocation.address || ''}
                disabled
              />
              <Input
                label="Cidade"
                value={storeLocation.city || ''}
                disabled
              />
              <Input
                label="Estado"
                value={storeLocation.state || ''}
                disabled
              />
            </div>

            {mapInfo && (
              <div>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    title="Mapa da loja"
                    src={mapInfo.mapUrl}
                    className="w-full h-64"
                    loading="lazy"
                  />
                </div>
                <a
                  href={mapInfo.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center mt-2"
                >
                  Ver no Google Maps
                </a>
              </div>
            )}
          </div>
        )}
      </Card>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPinIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total de Faixas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Ativas</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TruckIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Pre?o M?dio/KM</p>
                <p className="text-2xl font-bold">R$ {stats.avg_fee?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TruckIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Prazo M?dio</p>
                <p className="text-2xl font-bold">{stats.avg_days?.toFixed(0) || '0'} dias</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={filterActive === undefined ? '' : String(filterActive)}
            onChange={(e) => setFilterActive(e.target.value == '' ? undefined : e.target.value === 'true')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distancia (KM)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pre?o por KM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa M?nima
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prazo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  A??es
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPinIcon className="w-5 h-5 text-gray-400 mr-2" />
                      <div className="font-medium text-gray-900">{zone.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm text-gray-600">
                      {formatKm(zone.min_km)} - {zone.max_km !== null && zone.max_km !== undefined ? formatKm(zone.max_km) : '?'} km
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-green-600">
                      R$ {formatMoney(zone.delivery_fee)} / km
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {zone.min_fee ? `R$ ${formatMoney(zone.min_fee)}` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {zone.estimated_days} {zone.estimated_days === 1 ? 'dia ?til' : 'dias ?teis'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(zone)}
                      className="focus:outline-none"
                    >
                      <Badge variant={zone.is_active ? 'success' : 'danger'}>
                        {zone.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(zone)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingZone(zone);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {zones.length === 0 && (
            <div className="text-center py-12">
              <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma faixa encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Cadastre faixas de quilometragem para calcular o frete.
              </p>
              <div className="mt-6">
                <Button onClick={() => handleOpenModal()}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Nova Faixa
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingZone ? 'Editar Faixa de Entrega' : 'Nova Faixa de Entrega'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Faixa *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Ate 5km, Zona Metropolitana"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KM Inicial *
              </label>
              <Input
                type="number"
                value={formData.min_km ?? ''}
                onChange={(e) => setFormData({ ...formData, min_km: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KM Final *
              </label>
              <Input
                type="number"
                value={formData.max_km ?? ''}
                onChange={(e) => setFormData({ ...formData, max_km: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pre?o por KM (R$) *
              </label>
              <Input
                type="number"
                value={formData.delivery_fee}
                onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa M?nima (R$)
              </label>
              <Input
                type="number"
                value={formData.min_fee ?? ''}
                onChange={(e) => setFormData({ ...formData, min_fee: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prazo de Entrega (dias) *
              </label>
              <Input
                type="number"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Faixa ativa
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name}
            >
              {saving ? 'Salvando...' : editingZone ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingZone(null);
        }}
        title="Excluir Faixa de Entrega"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Tem certeza que deseja excluir a faixa <strong>{deletingZone?.name}</strong>?
            Esta a??o nao pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingZone(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeliveryZonesPage;
