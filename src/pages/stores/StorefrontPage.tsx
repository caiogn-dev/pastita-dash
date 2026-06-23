import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getStore, updateStore, updateStoreWithFiles, type Store } from '../../services/storesApi';
import { useStore } from '../../hooks';
import { buildStorefrontUrl } from '../../utils/storefrontUrl';
import { Card, Button } from '../../components/ui';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImageFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Tipo não suportado: ${file.type}. Use JPG, PNG ou WebP.`;
  }
  if (file.size > maxBytes) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: ${maxBytes / 1024 / 1024} MB.`;
  }
  return null;
}

type Template = 'fresh' | 'bold' | 'classic' | 'minimal' | 'dark' | 'elegant';

const TEMPLATES: { id: Template; label: string; description: string; preview: string }[] = [
  { id: 'fresh', label: 'Fresh', description: 'Claro, leve e visual. Ideal para saladas, bowls e comida saudável.', preview: '🥗' },
  { id: 'bold', label: 'Bold', description: 'Promocional, forte e direto. Ideal para salgadinhos, pizza, burger e pastel.', preview: '🍔' },
  { id: 'classic', label: 'Classic', description: 'Tradicional e editorial. Ideal para restaurantes, marmitas e cardápios clássicos.', preview: '🍱' },
  { id: 'minimal', label: 'Minimal', description: 'Compacto e rápido. Ideal para cardápio estilo app de delivery.', preview: '⚡' },
  { id: 'dark', label: 'Dark', description: 'Escuro e contrastado. Ideal para marcas noturnas, adegas e lanches premium.', preview: '🌙' },
  { id: 'elegant', label: 'Elegant', description: 'Cards horizontais, tipografia serifada e fundo aconchegante. Ideal para confeitarias, doces e bolos.', preview: '🍰' },
];

export const StorefrontPage: React.FC = () => {
  const { storeId: routeStoreId } = useParams<{ storeId?: string }>();
  const { storeId: contextStoreId, stores } = useStore();

  const storeData = stores.find(s => s.id === contextStoreId || s.slug === contextStoreId);
  const effectiveStoreId =
    routeStoreId ||
    storeData?.slug ||
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

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  // Track blob URLs so we can revoke them to avoid memory leaks
  const logoBlobRef = useRef<string | null>(null);
  const bannerBlobRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
      if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
    };
  }, []);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, MAX_LOGO_SIZE);
    if (err) { toast.error(err); e.target.value = ''; return; }
    if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
    const url = URL.createObjectURL(file);
    logoBlobRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file, MAX_BANNER_SIZE);
    if (err) { toast.error(err); e.target.value = ''; return; }
    if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
    const url = URL.createObjectURL(file);
    bannerBlobRef.current = url;
    setBannerFile(file);
    setBannerPreview(url);
  };

  const clearLogo = () => {
    if (logoBlobRef.current) { URL.revokeObjectURL(logoBlobRef.current); logoBlobRef.current = null; }
    setLogoFile(null);
    setLogoPreview('');
  };

  const clearBanner = () => {
    if (bannerBlobRef.current) { URL.revokeObjectURL(bannerBlobRef.current); bannerBlobRef.current = null; }
    setBannerFile(null);
    setBannerPreview('');
  };

  const handleSave = async () => {
    if (!effectiveStoreId) return;

    if (!HEX_COLOR_RE.test(form.primary_color)) {
      toast.error('Cor primária inválida. Use formato hexadecimal #RRGGBB.');
      return;
    }
    if (!HEX_COLOR_RE.test(form.secondary_color)) {
      toast.error('Cor secundária inválida. Use formato hexadecimal #RRGGBB.');
      return;
    }

    setSaving(true);
    try {
      if (logoFile || bannerFile) {
        await updateStoreWithFiles(effectiveStoreId, {
          ...form,
          ...(logoFile ? { logo: logoFile } : {}),
          ...(bannerFile ? { banner: bannerFile } : {}),
        });
      } else {
        await updateStore(effectiveStoreId, form);
      }
      toast.success('Storefront salvo com sucesso!');
      clearLogo();
      clearBanner();
      await loadStore();
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!store) return <div className="p-6 text-fg-muted-token">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-token">Storefront</h1>
        <p className="text-fg-muted-token mt-1">Configure a aparência do site da loja.</p>
      </div>

      {/* Logo */}
      <Card className="p-6 space-y-3">
        <h2 className="text-base font-semibold text-fg-token">Logo da loja</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full border-2 border-border-token overflow-hidden flex items-center justify-center bg-surface-2 flex-shrink-0">
            {logoPreview || store?.logo_url ? (
              <img src={logoPreview || store?.logo_url || ''} alt="Logo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="text-2xl text-fg-muted-token">🏪</span>
            )}
          </div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center px-4 py-2 rounded border border-border-token text-sm font-medium text-fg-token hover:bg-surface-2 transition-colors">
              {logoFile ? 'Trocar logo' : 'Enviar logo'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
          {logoPreview && (
            <button onClick={clearLogo} className="text-sm text-[var(--danger)] hover:opacity-80">Remover</button>
          )}
        </div>
        <p className="text-xs text-fg-muted-token">PNG ou JPG. Recomendado: 400×400px.</p>
      </Card>

      {/* Banner */}
      <Card className="p-6 space-y-3">
        <h2 className="text-base font-semibold text-fg-token">Banner do cardápio</h2>
        <div className="relative w-full h-32 rounded border-2 border-dashed border-border-token overflow-hidden bg-surface-2">
          {bannerPreview || store?.banner_url ? (
            <img src={bannerPreview || store?.banner_url || ''} alt="Banner" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-fg-muted-token">
              <span className="text-3xl">🖼️</span>
              <span className="text-xs mt-1">Sem banner</span>
            </div>
          )}
        </div>
        <label className="cursor-pointer inline-block">
          <span className="inline-flex items-center px-4 py-2 rounded border border-border-token text-sm font-medium text-fg-token hover:bg-surface-2 transition-colors">
            {bannerFile ? 'Trocar banner' : 'Enviar banner'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </label>
        {bannerPreview && (
          <button onClick={clearBanner} className="ml-3 text-sm text-[var(--danger)] hover:opacity-80">Remover</button>
        )}
        <p className="text-xs text-fg-muted-token">PNG ou JPG. Recomendado: 1200×300px.</p>
      </Card>

      {/* Template */}
      <Card className="p-6 space-y-3">
        <h2 className="text-base font-semibold text-fg-token">Template</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setForm(f => ({ ...f, template: t.id }))}
              className={`p-4 rounded border-2 text-left transition-all ${
                form.template === t.id
                  ? 'border-brand bg-brand-soft'
                  : 'border-border-token hover:bg-surface-2'
              }`}
            >
              <div className="text-2xl mb-2">{t.preview}</div>
              <div className="font-semibold text-sm text-fg-token">{t.label}</div>
              <div className="text-xs text-fg-muted-token mt-1">{t.description}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Cores */}
      <Card className="p-6 space-y-3">
        <h2 className="text-base font-semibold text-fg-token">Cores da marca</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-fg-muted-token">Cor primária</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-border-token"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="flex-1 rounded border border-border-token bg-surface text-fg-token px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                maxLength={7}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-fg-muted-token">Cor secundária</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={form.secondary_color}
                onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-border-token"
              />
              <input
                type="text"
                value={form.secondary_color}
                onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                className="flex-1 rounded border border-border-token bg-surface text-fg-token px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                maxLength={7}
              />
            </div>
          </label>
        </div>
      </Card>

      {/* Tagline */}
      <Card className="p-6 space-y-2">
        <h2 className="text-base font-semibold text-fg-token">Tagline</h2>
        <input
          type="text"
          value={form.tagline}
          onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
          placeholder="Ex: Saladas frescas todo dia"
          maxLength={200}
          className="w-full rounded border border-border-token bg-surface text-fg-token px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </Card>

      {/* Domínio */}
      <Card className="p-6 space-y-2">
        <h2 className="text-base font-semibold text-fg-token">Domínio próprio</h2>
        <input
          type="text"
          value={form.custom_domain}
          onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))}
          placeholder="loja.com.br"
          className="w-full rounded border border-border-token bg-surface text-fg-token px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <p className="text-xs text-fg-muted-token">
          Sem domínio próprio, o cardápio público usa cardapidex.com.br/{store.slug}.
          Com domínio próprio, a loja abre direto no domínio configurado.
        </p>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 justify-center py-3"
        >
          {saving ? 'Salvando...' : 'Salvar storefront'}
        </Button>
        {store && buildStorefrontUrl(store) && (
          <a
            href={buildStorefrontUrl(store)!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-5 py-3 rounded border border-border-token text-fg-token font-semibold hover:bg-surface-2 transition-colors whitespace-nowrap"
          >
            Ver prévia
          </a>
        )}
      </div>
    </div>
  );
};

export default StorefrontPage;
