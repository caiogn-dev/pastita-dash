import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Badge, Modal, Loading } from '../../components/common';
import { deliveryService, DeliveryZone, CreateDeliveryZone, UpdateDeliveryZone, DeliveryZoneStats } from '../../services/delivery';

export const DeliveryZonesPage: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stats, setStats] = useState<DeliveryZoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<DeliveryZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateDeliveryZone>({
    name: '',
    zip_code_start: '',
    zip_code_end: '',
    delivery_fee: 0,
    estimated_days: 1,
    is_active: true,
  });

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      const [zonesData, statsData] = await Promise.all([
        deliveryService.getZones({
          search: search || undefined,
          is_active: filterActive,
        }),
        deliveryService.getStats(),
      ]);
      setZones(zonesData.results);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading delivery zones:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterActive]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleOpenModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        zip_code_start: zone.zip_code_start,
        zip_code_end: zone.zip_code_end,
        delivery_fee: zone.delivery_fee,
        estimated_days: zone.estimated_days,
        is_active: zone.is_active,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        zip_code_start: '',
        zip_code_end: '',
        delivery_fee: 0,
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
        await deliveryService.updateZone(editingZone.id, formData as UpdateDeliveryZone);
      } else {
        await deliveryService.createZone(formData);
      }
      handleCloseModal();
      loadZones();
    } catch (error) {
      console.error('Error saving delivery zone:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      await deliveryService.toggleActive(zone.id);
      loadZones();
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
      loadZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatZipCode = (zip: string) => {
    const clean = zip.replace(/\D/g, '');
    if (clean.length === 8) {
      return `${clean.slice(0, 5)}-${clean.slice(5)}`;
    }
    return zip;
  };

  if (loading && zones.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zonas de Entrega</h1>
          <p className="text-gray-500">Gerencie as zonas e taxas de entrega</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Zona
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPinIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total de Zonas</p>
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
                <p className="text-sm text-gray-500">Taxa Média</p>
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
                <p className="text-sm text-gray-500">Prazo Médio</p>
                <p className="text-2xl font-bold">{stats.avg_days?.toFixed(0) || '0'} dias</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nome ou CEP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={filterActive === undefined ? '' : String(filterActive)}
            onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
        </div>
      </Card>

      {/* Zones List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa de CEP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa de Entrega
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prazo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
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
                      {formatZipCode(zone.zip_code_start)} - {formatZipCode(zone.zip_code_end)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-semibold text-green-600">
                      R$ {zone.delivery_fee.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {zone.estimated_days} {zone.estimated_days === 1 ? 'dia útil' : 'dias úteis'}
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma zona encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece criando uma nova zona de entrega.
              </p>
              <div className="mt-6">
                <Button onClick={() => handleOpenModal()}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Nova Zona
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingZone ? 'Editar Zona de Entrega' : 'Nova Zona de Entrega'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Zona *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Centro, Zona Sul, Região Metropolitana"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP Inicial *
              </label>
              <Input
                type="text"
                value={formData.zip_code_start}
                onChange={(e) => setFormData({ ...formData, zip_code_start: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="00000000"
                maxLength={8}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP Final *
              </label>
              <Input
                type="text"
                value={formData.zip_code_end}
                onChange={(e) => setFormData({ ...formData, zip_code_end: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                placeholder="99999999"
                maxLength={8}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa de Entrega (R$) *
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
                Prazo de Entrega (dias) *
              </label>
              <Input
                type="number"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Zona ativa
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name || !formData.zip_code_start || !formData.zip_code_end}
            >
              {saving ? 'Salvando...' : editingZone ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingZone(null);
        }}
        title="Excluir Zona de Entrega"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Tem certeza que deseja excluir a zona <strong>{deletingZone?.name}</strong>?
            Esta ação não pode ser desfeita.
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
