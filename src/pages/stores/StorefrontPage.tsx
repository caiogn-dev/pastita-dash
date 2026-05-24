import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getStore, updateStore, type Store } from '../../services/storesApi';
import { useStore } from '../../hooks';

type Template = 'fresh' | 'bold' | 'classic';

const TEMPLATES: { id: Template; label: string; description: string; preview: string }[] = [
  { id: 'fresh', label: 'Fresh', description: 'Hero com gradiente + cards. Ideal para saudável, saladas, açaí.', preview: '🥗' },
  { id: 'bold', label: 'Bold', description: 'Dark mode com acento vibrante. Ideal para hambúrgueres, pizzas.', preview: '🍔' },
  { id: 'classic', label: 'Classic', description: 'Tom elegante estilo menu. Ideal para restaurantes, marmitas.', preview: '🍱' },
];

export const StorefrontPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const effectiveStoreId =
    routeStoreId ||
    stores.find(s => s.id === contextStoreId || s.slug === contextStoreId)?.id ||
    contextStoreId ||
    null;

  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [form, setForm] = useState({
    template: 'fresh' as Template,
    primary_color: '#2D6A4F',
    secondary_color: '#1B4332',
    tagline: '',
    custom_domain: '',
  });

  const loadStore = useCallback(async () => {
    if (!effectiveStoreId) return;
    const data = await getStore(effectiveStoreId);
    setStore(data);
    setForm({
      template: (data.template as Template) || 'fresh',
      primary_color: data.primary_color || '#2D6A4F',
      secondary_color: data.secondary_color || '#1B4332',
      tagline: data.tagline || '',
      custom_domain: data.custom_domain || '',
    });
  }, [effectiveStoreId]);

  useEffect(() => { loadStore(); }, [loadStore]);

  const handleSave = async () => {
    if (!effectiveStoreId) return;
    setSaving(true);
    try {
      await updateStore(effectiveStoreId, form);
      toast.success('Storefront salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!store) return <div className="p-6 text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Storefront</h1>
        <p className="text-gray-500 mt-1">Configure a aparência do site da loja.</p>
      </div>

      {/* Template */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Template</h2>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setForm(f => ({ ...f, template: t.id }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.template === t.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{t.preview}</div>
              <div className="font-semibold text-sm text-gray-800">{t.label}</div>
              <div className="text-xs text-gray-500 mt-1">{t.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Cores */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Cores da marca</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Cor primária</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                maxLength={7}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Cor secundária</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={form.secondary_color}
                onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={form.secondary_color}
                onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                maxLength={7}
              />
            </div>
          </label>
        </div>
      </section>

      {/* Tagline */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-700">Tagline</h2>
        <input
          type="text"
          value={form.tagline}
          onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
          placeholder="Ex: Saladas frescas todo dia"
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
        />
      </section>

      {/* Domínio */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-700">Domínio próprio</h2>
        <input
          type="text"
          value={form.custom_domain}
          onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))}
          placeholder="cesaladas.com.br"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono"
        />
        <p className="text-xs text-gray-400">
          Aponte o DNS do domínio para o servidor do storefront antes de salvar.
        </p>
      </section>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar storefront'}
        </button>
        {store && (
          <a
            href={
              store.custom_domain
                ? `https://${store.custom_domain}`
                : `${import.meta.env.VITE_STOREFRONT_BASE_URL || ''}/preview/${store.slug}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl border-2 border-indigo-600 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            Ver prévia
          </a>
        )}
      </div>
    </div>
  );
};

export default StorefrontPage;
