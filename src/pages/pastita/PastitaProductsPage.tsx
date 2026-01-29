// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  ChefHat,
  Beef,
  CircleDot,
  Package,
  Eye,
  EyeOff,
  Star,
  StarOff,
} from 'lucide-react';
import {
  getCatalogo,
  getMolhos,
  getCarnes,
  getRondellis,
  getCombos,
  createMolho,
  updateMolho,
  deleteMolho,
  createCarne,
  updateCarne,
  deleteCarne,
  createRondelli,
  updateRondelli,
  deleteRondelli,
  createCombo,
  updateCombo,
  deleteCombo,
  toggleComboActive,
  toggleComboDestaque,
  type Molho,
  type Carne,
  type Rondelli,
  type Combo,
  type MolhoInput,
  type CarneInput,
  type RondelliInput,
  type ComboInput,
} from '../../services/pastitaApi';
import logger from '../../services/logger';

type ProductType = 'molhos' | 'carnes' | 'rondellis' | 'combos';

interface TabProps {
  active: ProductType;
  onChange: (tab: ProductType) => void;
}

const Tabs: React.FC<TabProps> = ({ active, onChange }) => {
  const tabs: { id: ProductType; label: string; icon: React.ReactNode }[] = [
    { id: 'molhos', label: 'Molhos', icon: <ChefHat className="w-4 h-4" /> },
    { id: 'carnes', label: 'Carnes', icon: <Beef className="w-4 h-4" /> },
    { id: 'rondellis', label: 'Rondellis', icon: <CircleDot className="w-4 h-4" /> },
    { id: 'combos', label: 'Combos', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
              ${active === tab.id
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

// Molho Form Modal
interface MolhoFormProps {
  molho?: Molho | null;
  onSave: (data: MolhoInput) => Promise<void>;
  onClose: () => void;
}

const MolhoForm: React.FC<MolhoFormProps> = ({ molho, onSave, onClose }) => {
  const [formData, setFormData] = useState<MolhoInput>({
    nome: molho?.nome || '',
    tipo: molho?.tipo || 'tradicional',
    descricao: molho?.descricao || '',
    quantidade: Number(molho?.quantidade) || 500,
    preco: Number(molho?.preco) || 0,
    ativo: molho?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save molho', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {molho ? 'Editar Molho' : 'Novo Molho'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="tradicional">Tradicional</option>
              <option value="especial">Especial</option>
              <option value="gourmet">Gourmet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade (ml)</label>
              <input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900 dark:text-white">Ativo</label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Carne Form Modal
interface CarneFormProps {
  carne?: Carne | null;
  molhos: Molho[];
  onSave: (data: CarneInput) => Promise<void>;
  onClose: () => void;
}

const CarneForm: React.FC<CarneFormProps> = ({ carne, molhos, onSave, onClose }) => {
  const [formData, setFormData] = useState<CarneInput>({
    nome: carne?.nome || '',
    tipo: carne?.tipo || 'bovina',
    descricao: carne?.descricao || '',
    quantidade: Number(carne?.quantidade) || 500,
    preco: Number(carne?.preco) || 0,
    molhos_compativeis: carne?.molhos?.map(id => id) || [],
    ativo: carne?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save carne', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {carne ? 'Editar Carne' : 'Nova Carne'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="bovina">Bovina</option>
              <option value="suina">Suína</option>
              <option value="frango">Frango</option>
              <option value="peixe">Peixe</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade (g)</label>
              <input
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Molhos Compatíveis</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {molhos.map((molho) => (
                <label key={molho.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.molhos_compativeis.includes(molho.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          molhos_compativeis: [...formData.molhos_compativeis, molho.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          molhos_compativeis: formData.molhos_compativeis.filter((id) => id !== molho.id),
                        });
                      }
                    }}
                    className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{molho.nome}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900 dark:text-white">Ativo</label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Rondelli Form Modal
interface RondelliFormProps {
  rondelli?: Rondelli | null;
  onSave: (data: RondelliInput) => Promise<void>;
  onClose: () => void;
}

const RondelliForm: React.FC<RondelliFormProps> = ({ rondelli, onSave, onClose }) => {
  const [formData, setFormData] = useState<RondelliInput>({
    nome: rondelli?.nome || '',
    sabor: rondelli?.sabor || '',
    categoria: rondelli?.categoria || 'classico',
    descricao: rondelli?.descricao || '',
    preco: Number(rondelli?.preco) || 0,
    is_gourmet: rondelli?.is_gourmet ?? false,
    ativo: rondelli?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save rondelli', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {rondelli ? 'Editar Rondelli' : 'Novo Rondelli'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sabor</label>
            <input
              type="text"
              value={formData.sabor}
              onChange={(e) => setFormData({ ...formData, sabor: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="classico">Clássico</option>
              <option value="gourmet">Gourmet</option>
              <option value="especial">Especial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_gourmet}
                onChange={(e) => setFormData({ ...formData, is_gourmet: e.target.checked })}
                className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Gourmet</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Ativo</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Combo Form Modal
interface ComboFormProps {
  combo?: Combo | null;
  molhos: Molho[];
  carnes: Carne[];
  rondellis: Rondelli[];
  onSave: (data: ComboInput) => Promise<void>;
  onClose: () => void;
}

const ComboForm: React.FC<ComboFormProps> = ({ combo, molhos, carnes, rondellis, onSave, onClose }) => {
  const [formData, setFormData] = useState<ComboInput>({
    nome: combo?.nome || '',
    descricao: combo?.descricao || '',
    preco: Number(combo?.preco) || 0,
    preco_original: Number(combo?.preco_original) || 0,
    molhos_inclusos: combo?.molhos?.map(id => id) || [],
    carne_inclusa: combo?.carne || null,
    rondelli_incluso: combo?.rondelli || null,
    quantidade_pessoas: combo?.quantidade_pessoas || 2,
    ativo: combo?.ativo ?? true,
    destaque: combo?.destaque ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error('Failed to save combo', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {combo ? 'Editar Combo' : 'Novo Combo'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço Original</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_original}
                onChange={(e) => setFormData({ ...formData, preco_original: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pessoas</label>
              <input
                type="number"
                value={formData.quantidade_pessoas}
                onChange={(e) => setFormData({ ...formData, quantidade_pessoas: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Carne Inclusa</label>
            <select
              value={formData.carne_inclusa || ''}
              onChange={(e) => setFormData({ ...formData, carne_inclusa: e.target.value ? parseInt(e.target.value) : null })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="">Nenhuma</option>
              {carnes.map((carne) => (
                <option key={carne.id} value={carne.id}>{carne.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rondelli Incluso</label>
            <select
              value={formData.rondelli_incluso || ''}
              onChange={(e) => setFormData({ ...formData, rondelli_incluso: e.target.value ? parseInt(e.target.value) : null })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="">Nenhum</option>
              {rondellis.map((rondelli) => (
                <option key={rondelli.id} value={rondelli.id}>{rondelli.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Molhos Inclusos</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {molhos.map((molho) => (
                <label key={molho.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.molhos_inclusos.includes(molho.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          molhos_inclusos: [...formData.molhos_inclusos, molho.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          molhos_inclusos: formData.molhos_inclusos.filter((id) => id !== molho.id),
                        });
                      }
                    }}
                    className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{molho.nome}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Ativo</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.destaque}
                onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                className="h-4 w-4 text-yellow-600 dark:text-yellow-400 focus:ring-yellow-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">Destaque</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Page Component
export const PastitaProductsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProductType>('molhos');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data
  const [molhos, setMolhos] = useState<Molho[]>([]);
  const [carnes, setCarnes] = useState<Carne[]>([]);
  const [rondellis, setRondellis] = useState<Rondelli[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  
  // Modals
  const [showMolhoForm, setShowMolhoForm] = useState(false);
  const [showCarneForm, setShowCarneForm] = useState(false);
  const [showRondelliForm, setShowRondelliForm] = useState(false);
  const [showComboForm, setShowComboForm] = useState(false);
  
  // Edit items
  const [editingMolho, setEditingMolho] = useState<Molho | null>(null);
  const [editingCarne, setEditingCarne] = useState<Carne | null>(null);
  const [editingRondelli, setEditingRondelli] = useState<Rondelli | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [molhosRes, carnesRes, rondellisRes, combosRes] = await Promise.all([
        getMolhos(),
        getCarnes(),
        getRondellis(),
        getCombos(),
      ]);
      setMolhos(molhosRes);
      setCarnes(carnesRes);
      setRondellis(rondellisRes);
      setCombos(combosRes);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
      logger.error('Failed to load products', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // CRUD handlers
  const handleSaveMolho = async (data: MolhoInput) => {
    if (editingMolho) {
      await updateMolho(editingMolho.id, data);
      toast.success('Molho atualizado');
    } else {
      await createMolho(data);
      toast.success('Molho criado');
    }
    setEditingMolho(null);
    fetchData();
  };

  const handleDeleteMolho = async (id: number) => {
    if (!confirm('Deseja excluir este molho?')) return;
    try {
      await deleteMolho(id);
      toast.success('Molho excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir molho');
      logger.error('Failed to delete molho', error);
    }
  };

  const handleSaveCarne = async (data: CarneInput) => {
    if (editingCarne) {
      await updateCarne(editingCarne.id, data);
      toast.success('Carne atualizada');
    } else {
      await createCarne(data);
      toast.success('Carne criada');
    }
    setEditingCarne(null);
    fetchData();
  };

  const handleDeleteCarne = async (id: number) => {
    if (!confirm('Deseja excluir esta carne?')) return;
    try {
      await deleteCarne(id);
      toast.success('Carne excluída');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir carne');
      logger.error('Failed to delete carne', error);
    }
  };

  const handleSaveRondelli = async (data: RondelliInput) => {
    if (editingRondelli) {
      await updateRondelli(editingRondelli.id, data);
      toast.success('Rondelli atualizado');
    } else {
      await createRondelli(data);
      toast.success('Rondelli criado');
    }
    setEditingRondelli(null);
    fetchData();
  };

  const handleDeleteRondelli = async (id: number) => {
    if (!confirm('Deseja excluir este rondelli?')) return;
    try {
      await deleteRondelli(id);
      toast.success('Rondelli excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir rondelli');
      logger.error('Failed to delete rondelli', error);
    }
  };

  const handleSaveCombo = async (data: ComboInput) => {
    if (editingCombo) {
      await updateCombo(editingCombo.id, data);
      toast.success('Combo atualizado');
    } else {
      await createCombo(data);
      toast.success('Combo criado');
    }
    setEditingCombo(null);
    fetchData();
  };

  const handleDeleteCombo = async (id: number) => {
    if (!confirm('Deseja excluir este combo?')) return;
    try {
      await deleteCombo(id);
      toast.success('Combo excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir combo');
      logger.error('Failed to delete combo', error);
    }
  };

  const handleToggleComboActive = async (id: number) => {
    try {
      const result = await toggleComboActive(id);
      toast.success(result.message);
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar status');
      logger.error('Failed to toggle combo active', error);
    }
  };

  const handleToggleComboDestaque = async (id: number) => {
    try {
      const result = await toggleComboDestaque(id);
      toast.success(result.message);
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar destaque');
      logger.error('Failed to toggle combo destaque', error);
    }
  };

  // Filter data by search term
  const filterBySearch = <T extends { nome: string }>(items: T[]): T[] => {
    if (!searchTerm) return items;
    return items.filter((item) =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-green-600 dark:text-green-400" />
        </div>
      );
    }

    switch (activeTab) {
      case 'molhos':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterBySearch(molhos).map((molho) => (
              <div key={molho.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{molho.nome}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{molho.tipo}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${molho.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {molho.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{molho.descricao}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {Number(molho.preco).toFixed(2)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingMolho(molho); setShowMolhoForm(true); }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:text-green-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMolho(molho.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'carnes':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterBySearch(carnes).map((carne) => (
              <div key={carne.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{carne.nome}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{carne.tipo} - {carne.quantidade}g</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${carne.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {carne.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{carne.descricao}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {Number(carne.preco).toFixed(2)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingCarne(carne); setShowCarneForm(true); }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:text-green-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCarne(carne.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'rondellis':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterBySearch(rondellis).map((rondelli) => (
              <div key={rondelli.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{rondelli.nome}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{rondelli.sabor} - {rondelli.categoria}</p>
                  </div>
                  <div className="flex gap-1">
                    {rondelli.is_gourmet && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800">
                        Gourmet
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${rondelli.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rondelli.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{rondelli.descricao}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {Number(rondelli.preco).toFixed(2)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingRondelli(rondelli); setShowRondelliForm(true); }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:text-green-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRondelli(rondelli.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'combos':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterBySearch(combos).map((combo) => (
              <div key={combo.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{combo.nome}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Para {combo.quantidade_pessoas} pessoas</p>
                  </div>
                  <div className="flex gap-1">
                    {combo.destaque && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800">
                        Destaque
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${combo.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {combo.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{combo.descricao}</p>
                <div className="flex justify-between items-center mt-4">
                  <div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      R$ {Number(combo.preco).toFixed(2)}
                    </span>
                    {combo.preco_original && Number(combo.preco_original) > Number(combo.preco) && (
                      <span className="ml-2 text-sm text-gray-400 line-through">
                        R$ {Number(combo.preco_original).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleComboActive(combo.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:text-green-400"
                      title={combo.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {combo.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggleComboDestaque(combo.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:text-yellow-400"
                      title={combo.destaque ? 'Remover destaque' : 'Destacar'}
                    >
                      {combo.destaque ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingCombo(combo); setShowComboForm(true); }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:text-green-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCombo(combo.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  const handleAddNew = () => {
    switch (activeTab) {
      case 'molhos':
        setEditingMolho(null);
        setShowMolhoForm(true);
        break;
      case 'carnes':
        setEditingCarne(null);
        setShowCarneForm(true);
        break;
      case 'rondellis':
        setEditingRondelli(null);
        setShowRondelliForm(true);
        break;
      case 'combos':
        setEditingCombo(null);
        setShowComboForm(true);
        break;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos Pastita</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie os produtos da Pastita Massas Artesanais</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:text-green-400 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Tabs active={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {renderContent()}
      </div>

      {/* Modals */}
      {showMolhoForm && (
        <MolhoForm
          molho={editingMolho}
          onSave={handleSaveMolho}
          onClose={() => { setShowMolhoForm(false); setEditingMolho(null); }}
        />
      )}
      {showCarneForm && (
        <CarneForm
          carne={editingCarne}
          molhos={molhos}
          onSave={handleSaveCarne}
          onClose={() => { setShowCarneForm(false); setEditingCarne(null); }}
        />
      )}
      {showRondelliForm && (
        <RondelliForm
          rondelli={editingRondelli}
          onSave={handleSaveRondelli}
          onClose={() => { setShowRondelliForm(false); setEditingRondelli(null); }}
        />
      )}
      {showComboForm && (
        <ComboForm
          combo={editingCombo}
          molhos={molhos}
          carnes={carnes}
          rondellis={rondellis}
          onSave={handleSaveCombo}
          onClose={() => { setShowComboForm(false); setEditingCombo(null); }}
        />
      )}
    </div>
  );
};

export default PastitaProductsPage;
