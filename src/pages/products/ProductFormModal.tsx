import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  PhotoIcon,
  TagIcon,
  CubeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { validarProduto, type AbaDoProduto, type ErroDeProduto } from './validarProduto';
import { FormChecklist, FormSummary, ChoiceCards, FormStepper } from '../../components/ui';
import { Card, Button } from '../../components/ui';
import { Modal } from '../../components/common';
import VariantsManager from '../../components/products/VariantsManager';
import DescriptionEditor from './DescriptionEditor';
import storesApi, {
  StoreProduct as Product,
  StoreProductInput as ProductInput,
  StoreCategory as Category,
  StoreProductType as ProductType,
  CustomField,
} from '../../services/storesApi';
import logger from '../../services/logger';
import { compressImage } from '../../utils/compressImage';
import { PaywallModal } from '../../components/billing/PaywallModal';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Produto a editar, null para criação, ou objeto parcial com `category` para criação pré-categorizada */
  product?: Product | null | { category?: string | null; [key: string]: unknown };
  /** Lista de categorias disponíveis */
  categories: Category[];
  /** Lista achatada e ordenada de todos os produtos — usada para navegação prev/next */
  flatProducts: Product[];
  onSaved: () => void;
  /** storeId necessário para criar/atualizar produtos */
  storeId?: string;
  /** Tipos de produto disponíveis; se omitido, o componente não renderiza campos de tipo */
  productTypes?: ProductType[];
}

/** Rótulos curtos de status para o resumo — os longos ficam nos cards. */
const ROTULO_STATUS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Pausado',
  out_of_stock: 'Sem estoque',
  discontinued: 'Descontinuado',
};

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  flatProducts,
  onSaved,
  storeId = '',
  productTypes = [],
}) => {
  const isEditing = !!(product && 'id' in product && product.id);
  const editingProduct = isEditing ? (product as Product) : null;

  const [saving, setSaving] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AbaDoProduto>('basic');
  const [errosPorAba, setErrosPorAba] = useState<ErroDeProduto[]>([]);
  /**
   * "Salvar e criar outro" precisa sobreviver ao envio.
   *
   * Um `useState` aqui não serve: o clique no botão e o `submit` do formulário
   * são dois eventos, e o estado só estaria atualizado no render seguinte —
   * o handler leria o valor velho e fecharia o modal do mesmo jeito.
   */
  const manterAbertoRef = useRef(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Internal navigation state
  const [currentId, setCurrentId] = useState<string | undefined>(editingProduct?.id);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentId(editingProduct?.id);
    setActiveTab('basic');
  }, [isOpen, product]);

  // Effective product: navigate within flatProducts when currentId changes
  const effectiveProduct = useMemo(() => {
    if (!currentId) return editingProduct;
    return flatProducts.find((p) => p.id === currentId) ?? editingProduct;
  }, [currentId, flatProducts, editingProduct]);

  const idx = flatProducts.findIndex((p) => p.id === currentId);
  const goto = (d: number) => {
    const n = flatProducts[idx + d];
    if (n) setCurrentId(n.id);
  };

  const [formData, setFormData] = useState<ProductInput>({
    store: storeId,
    name: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    category: null,
    product_type: null,
    type_attributes: {},
    attributes: {},
    track_stock: true,
    stock_quantity: 0,
    low_stock_threshold: 5,
    allow_backorder: false,
    status: 'active',
    featured: false,
    tags: [],
    meta_title: '',
    meta_description: '',
  });

  // Load form from effectiveProduct (re-runs when currentId changes or modal opens)
  useEffect(() => {
    if (!isOpen) return;

    if (effectiveProduct && 'id' in effectiveProduct && effectiveProduct.id) {
      const p = effectiveProduct as Product;
      setFormData({
        store: storeId || p.store || '',
        name: p.name || '',
        description: p.description || '',
        short_description: p.short_description || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        price: p.price || 0,
        compare_at_price: p.compare_at_price,
        cost_price: p.cost_price,
        category: p.category ?? null,
        product_type: p.product_type ?? null,
        type_attributes: p.type_attributes || {},
        attributes: (p as unknown as { attributes?: Record<string, unknown> }).attributes || {},
        track_stock: p.track_stock ?? true,
        stock_quantity: p.stock_quantity || 0,
        low_stock_threshold: p.low_stock_threshold || 5,
        allow_backorder: p.allow_backorder ?? false,
        status: p.status || 'active',
        featured: p.featured ?? false,
        tags: p.tags || [],
        meta_title: p.meta_title || '',
        meta_description: p.meta_description || '',
      });
      setImagePreview(p.main_image_url || p.main_image || null);
    } else {
      // Creation mode — inherit category if passed
      const initialCategory =
        product && 'category' in product && !('id' in product)
          ? (product.category as string | null) ?? null
          : null;
      setFormData({
        store: storeId,
        name: '',
        description: '',
        short_description: '',
        sku: `SKU-${Date.now()}`,
        barcode: '',
        price: 0,
        compare_at_price: undefined,
        cost_price: undefined,
        category: initialCategory,
        product_type: null,
        type_attributes: {},
        attributes: {},
        track_stock: true,
        stock_quantity: 0,
        low_stock_threshold: 5,
        allow_backorder: false,
        status: 'active',
        featured: false,
        tags: [],
        meta_title: '',
        meta_description: '',
      });
      setImagePreview(null);
    }
  }, [isOpen, currentId, effectiveProduct, storeId, product]);

  const selectedProductType = useMemo(() => {
    if (!formData.product_type) return null;
    return productTypes.find((pt) => pt.id === formData.product_type) || null;
  }, [formData.product_type, productTypes]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    let file = original;
    try {
      file = await compressImage(original);
    } catch (error) {
      logger.error('Erro ao comprimir imagem, usando original:', error);
      file = original;
    }
    setFormData((prev) => ({ ...prev, main_image: file }));
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Um erro precisa ser um LUGAR, não uma mensagem que some em 4s. A
    // validação devolve a aba, então pulamos para ela e a marcamos — antes o
    // toast "Preço deve ser maior que zero" aparecia sobre a aba Mídia, onde
    // não existe campo de preço, e o usuário concluía que salvar estava
    // quebrado.
    const erros = validarProduto(formData);
    setErrosPorAba(erros);
    if (erros.length > 0) {
      setActiveTab(erros[0].aba);
      toast.error(erros[0].mensagem);
      return;
    }

    setSaving(true);
    try {
      const targetProduct = effectiveProduct && 'id' in effectiveProduct ? effectiveProduct as Product : null;
      if (targetProduct) {
        await storesApi.updateProduct(targetProduct.id, formData);
        toast.success('Produto atualizado!');
      } else {
        await storesApi.createProduct(formData);
        toast.success('Produto criado!');
      }
      onSaved();

      if (manterAbertoRef.current) {
        // Limpa só o que identifica o item; categoria e status ficam, porque
        // quem cadastra em série está enchendo UMA categoria de cada vez.
        manterAbertoRef.current = false;
        setFormData((prev) => ({
          ...prev,
          name: '',
          description: '',
          short_description: '',
          sku: '',
          barcode: '',
          price: 0,
          compare_at_price: undefined,
        }));
        setErrosPorAba([]);
        setActiveTab('basic');
        return;
      }

      onClose();
    } catch (error) {
      const axiosErr = error as { response?: { status?: number; data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail ?? '';
      if (axiosErr?.response?.status === 400 && /limite do plano/i.test(detail)) {
        setPaywall(detail);
        return;
      }
      logger.error('Error saving product:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = formData.type_attributes?.[field.name] ?? field.default_value ?? '';

    const updateField = (newValue: unknown) => {
      setFormData((prev) => ({
        ...prev,
        type_attributes: {
          ...prev.type_attributes,
          [field.name]: newValue,
        },
      }));
    };

    switch (field.type) {
      case 'select':
        return (
          <select
            value={String(value)}
            onChange={(e) => updateField(e.target.value)}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          >
            <option value="">Selecione...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateField([...selectedValues, opt.value]);
                    } else {
                      updateField(selectedValues.filter((v: string) => v !== opt.value));
                    }
                  }}
                  className="rounded border-border-token text-brand-ink focus:ring-brand"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => updateField(e.target.checked)}
              className="rounded border-border-token text-brand-ink focus:ring-brand"
            />
            <span className="text-sm">{field.label}</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={Number(value) || ''}
            onChange={(e) => updateField(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={String(value)}
            onChange={(e) => updateField(e.target.value)}
            rows={field.rows || 3}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          />
        );

      case 'color':
        return (
          <input
            type="color"
            value={String(value) || '#000000'}
            onChange={(e) => updateField(e.target.value)}
            className="w-full h-10 rounded-lg cursor-pointer"
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => updateField(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
            required={field.required}
          />
        );
    }
  };

  const isCurrentlyEditing = !!(effectiveProduct && 'id' in effectiveProduct && effectiveProduct.id);

  const tabs = [
    { id: 'basic', label: 'Básico', icon: CubeIcon },
    { id: 'pricing', label: 'Preços', icon: TagIcon },
    { id: 'inventory', label: 'Estoque', icon: CubeIcon },
    ...(isCurrentlyEditing ? ([{ id: 'variants', label: 'Variantes', icon: Squares2X2Icon }] as const) : []),
    { id: 'media', label: 'Mídia', icon: PhotoIcon },
    { id: 'seo', label: 'SEO', icon: MagnifyingGlassIcon },
  ] as const;

  const modalTitle = isCurrentlyEditing ? 'Editar Produto' : 'Novo Produto';

  /**
   * As abas viram PASSOS, na criação e na edição.
   *
   * Abas dizem "escolha uma"; passos dizem "faça nesta ordem e acaba aqui".
   * Quem já conhece o formulário não perde nada: a trilha continua clicável,
   * então dá para pular direto ao campo que se quer mexer.
   *
   * `Variações` só existe com produto salvo — variação precisa de um id para
   * pendurar. Mostrar o passo antes disso seria prometer um lugar vazio.
   */
  // O checklist sai da MESMA função que bloqueia o salvar. Duas listas de
  // requisitos — uma para mostrar, outra para validar — divergem no primeiro
  // ajuste, e aí o painel diz "tudo pronto" e o botão recusa.
  const pendencias = useMemo(() => validarProduto(formData), [formData]);

  const passos = useMemo(
    () =>
      tabs
        .filter((t) => t.id !== 'variants' || isCurrentlyEditing)
        .map((t) => ({
          id: t.id,
          rotulo: t.label,
          icone: t.icon,
          pendente: pendencias.some((e) => e.aba === t.id),
        })),
    [tabs, isCurrentlyEditing, pendencias]
  );

  const checklist = useMemo(() => {
    const falta = (campo: string) => pendencias.find((e) => e.campo === campo);
    const linha = (campo: string, rotulo: string) => {
      const erro = falta(campo);
      return {
        rotulo,
        ok: !erro,
        onIr: erro ? () => setActiveTab(erro.aba) : undefined,
      };
    };
    return [
      linha('name', 'Nome do produto'),
      linha('price', 'Preço de venda'),
      linha('compare_at_price', 'Preço promocional coerente'),
      linha('stock_quantity', 'Estoque válido'),
    ];
  }, [pendencias]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      <form onSubmit={handleSubmit}>
        {/* Navegação entre PRODUTOS, não entre passos.
            Ficava como duas setas soltas logo acima da trilha do assistente —
            duas navegações empilhadas, uma de item e outra de etapa, sem nada
            dizendo qual é qual. Agora tem rótulo e fica isolada numa faixa
            própria, alinhada à direita, longe da trilha. */}
        {flatProducts.length > 0 && idx >= 0 && (
          <div className="mb-4 flex items-center justify-end gap-1.5">
            <span className="text-caption text-fg-muted-token">
              Produto {idx + 1} de {flatProducts.length}
            </span>
            <button
              type="button"
              aria-label="Produto anterior"
              disabled={idx <= 0}
              onClick={() => goto(-1)}
              className="rounded-md border border-border-token p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Próximo produto"
              disabled={idx >= flatProducts.length - 1}
              onClick={() => goto(1)}
              className="rounded-md border border-border-token p-1.5 text-fg-muted-token transition-colors hover:bg-surface-2 hover:text-fg-token disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <FormStepper
          passos={passos}
          // Controlado: a validação e o checklist precisam empurrar a pessoa
          // para o passo do erro, e com o passo em estado interno do stepper
          // ninguém de fora consegue.
          passoAtivo={activeTab}
          onMudarPasso={(id) => setActiveTab(id as AbaDoProduto)}
          onCancelar={onClose}
          onConcluir={() => handleSubmit()}
          concluindo={saving}
          rotuloConcluir={isCurrentlyEditing ? 'Salvar alterações' : 'Criar produto'}
          // Segura no passo que tem problema. Deixar avançar faria o erro
          // aparecer só no fim, depois de a pessoa ter preenchido todo o resto.
          podeAvancar={(passo) => {
            const erro = pendencias.find((e) => e.aba === passo);
            if (!erro) return true;
            setErrosPorAba(pendencias);
            toast.error(erro.mensagem);
            return false;
          }}
          acoesExtras={
            // "Salvar e criar outro" só na criação: quem monta cardápio
            // cadastra trinta itens seguidos. Editando, você veio mexer NESTE
            // item, não criar o próximo.
            !isCurrentlyEditing ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => { manterAbertoRef.current = true; handleSubmit(); }}
              >
                Salvar e criar outro
              </Button>
            ) : undefined
          }
        >
        {(passoAtivo) => (
        <>
        {/* Formulário à esquerda, checklist à direita.
            Antes você só descobria o que faltava ao clicar em salvar — e o
            aviso vinha como toast, que some. Agora a lista fica na tela o
            tempo todo, e cada pendência leva ao passo do campo. */}
        {/* `2xl` e não `xl`: o modal tem 896px de largura máxima, então em
            telas de 1280px o breakpoint `xl` já ativava a coluna e espremia o
            checklist em 250px dentro de um modal que não tinha essa folga.
            Abaixo disso, o painel desce e vira uma faixa larga — legível. */}
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_260px]">
        {/* Sem `max-h` nem `overflow` aqui: o corpo do Modal já rola. Dois
             contêineres roláveis aninhados criavam a barra dupla e empurravam
             o rodapé do assistente para fora da tela. */}
        <div className="space-y-5">
          {/* Basic Tab */}
          {passoAtivo === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="Ex: Rondelli 4 Queijos"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Tipo de Produto
                  </label>
                  <select
                    value={formData.product_type || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        product_type: e.target.value || null,
                        type_attributes: {},
                      }))
                    }
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Sem tipo</option>
                    {productTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.icon} {pt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProductType && selectedProductType.custom_fields.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-fg-token mb-3">
                    Campos de {selectedProductType.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProductType.custom_fields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-fg-token mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        {renderCustomField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Descrição Curta
                </label>
                <input
                  type="text"
                  value={formData.short_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="Breve descrição para listagens"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Descrição Completa
                </label>
                <DescriptionEditor
                  value={formData.description || ''}
                  onChange={(description) => setFormData((prev) => ({ ...prev, description }))}
                  rows={5}
                  placeholder={'Massa artesanal de *500g*, serve _2 pessoas_.\n\nAcompanha:\n- Molho da casa\n- Queijo ralado\n\nModo de preparo: aqueça por 10 min'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                    placeholder="Código único"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                    placeholder="EAN/UPC"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                    className="rounded border-border-token text-brand-ink focus:ring-brand"
                  />
                  <span className="text-sm">Produto em destaque</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Selos de fidelidade por unidade
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={(formData.attributes?.loyalty_units as number | undefined) ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setFormData((prev) => {
                      const attrs = { ...(prev.attributes || {}) };
                      const parsed = parseInt(raw, 10);
                      if (!raw || Number.isNaN(parsed) || parsed <= 0) {
                        delete attrs.loyalty_units;
                      } else {
                        attrs.loyalty_units = parsed;
                      }
                      return { ...prev, attributes: attrs };
                    });
                  }}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="Vazio = segue a regra da categoria"
                />
                <p className="mt-1 text-xs text-fg-muted-token">
                  Use em combos que valem mais de 1 selo no cartão fidelidade (ex.: Combo
                  Tilápia com 4 saladas = 4). Produtos com este campo contam mesmo fora das
                  categorias qualificantes.
                </p>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {passoAtivo === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Preço de Venda *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token">R$</span>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full pl-10 pr-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Preço Comparativo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token">R$</span>
                    <input
                      type="number"
                      value={formData.compare_at_price ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          compare_at_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full pl-10 pr-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      step="0.01"
                      min="0"
                      placeholder="Preço original"
                    />
                  </div>
                  <p className="text-xs text-fg-muted-token mt-1">Para mostrar desconto</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-token mb-1">
                    Custo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted-token">R$</span>
                    <input
                      type="number"
                      value={formData.cost_price ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cost_price: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full pl-10 pr-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      step="0.01"
                      min="0"
                      placeholder="Custo do produto"
                    />
                  </div>
                  <p className="text-xs text-fg-muted-token mt-1">Para cálculo de margem</p>
                </div>
              </div>

              {formData.price > 0 && formData.cost_price && formData.cost_price > 0 && (
                <Card className="p-4 bg-surface-2">
                  <h4 className="text-sm font-medium text-fg-token mb-2">Análise de Margem</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.price - formData.cost_price)}
                      </p>
                      <p className="text-xs text-fg-muted-token">Lucro Bruto</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(((formData.price - formData.cost_price) / formData.price) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-fg-muted-token">Margem</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(((formData.price - formData.cost_price) / formData.cost_price) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-fg-muted-token">Markup</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {passoAtivo === 'inventory' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.track_stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, track_stock: e.target.checked }))}
                  className="rounded border-border-token text-brand-ink focus:ring-brand"
                />
                <span className="text-sm font-medium">Controlar estoque</span>
              </label>

              {formData.track_stock && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-token mb-1">
                      Quantidade em Estoque
                    </label>
                    <input
                      type="number"
                      value={formData.stock_quantity || 0}
                      onChange={(e) => setFormData((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-token mb-1">
                      Alerta de Estoque Baixo
                    </label>
                    <input
                      type="number"
                      value={formData.low_stock_threshold || 5}
                      onChange={(e) => setFormData((prev) => ({ ...prev, low_stock_threshold: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                      min="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        checked={formData.allow_backorder}
                        onChange={(e) => setFormData((prev) => ({ ...prev, allow_backorder: e.target.checked }))}
                        className="rounded border-border-token text-brand-ink focus:ring-brand"
                      />
                      <span className="text-sm">Permitir venda sem estoque</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Era um <select> com quatro rótulos secos. "Descontinuado" e
                  "Inativo" somem do cardápio do mesmo jeito — a diferença é o
                  que você pretende fazer depois, e o select não contava isso.
                  Cada opção agora diz a consequência. */}
              <ChoiceCards
                rotulo="Status do produto"
                descricao="Define se o item aparece no cardápio do cliente."
                valor={formData.status ?? 'active'}
                onChange={(v) => setFormData((prev) => ({ ...prev, status: v as ProductInput['status'] }))}
                opcoes={[
                  {
                    valor: 'active',
                    titulo: 'Ativo',
                    descricao: 'Aparece no cardápio e pode ser pedido.',
                  },
                  {
                    valor: 'inactive',
                    titulo: 'Pausado',
                    descricao: 'Sai do cardápio, mas continua cadastrado para voltar depois.',
                  },
                  {
                    valor: 'out_of_stock',
                    titulo: 'Sem estoque',
                    descricao: 'Aparece esgotado — o cliente sabe que existe e volta.',
                  },
                  {
                    valor: 'discontinued',
                    titulo: 'Descontinuado',
                    descricao: 'Saiu do cardápio de vez. O histórico de pedidos é mantido.',
                  },
                ]}
              />
            </div>
          )}

          {/* Variants Tab — only in edit mode */}
          {passoAtivo === 'variants' && isCurrentlyEditing && effectiveProduct && 'id' in effectiveProduct && (
            <VariantsManager productId={(effectiveProduct as Product).id} basePrice={(effectiveProduct as Product).price} />
          )}

          {/* Media Tab */}
          {passoAtivo === 'media' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-2">
                  Imagem Principal
                </label>
                <div className="flex items-start gap-4">
                  <div className="w-40 h-40 bg-surface-2 rounded overflow-hidden flex items-center justify-center border-2 border-dashed border-border-token">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <PhotoIcon className="w-12 h-12 text-fg-muted-token" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="product-image"
                    />
                    <label
                      htmlFor="product-image"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border-token rounded cursor-pointer hover:bg-surface-2 transition-colors"
                    >
                      <PhotoIcon className="w-5 h-5" />
                      Escolher Imagem
                    </label>
                    <p className="text-xs text-fg-muted-token mt-2">
                      Recomendado: 800x800px, JPG ou PNG, máx 2MB
                    </p>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData((prev) => ({ ...prev, main_image: null }));
                        }}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2"
                      >
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  URL da Imagem (alternativo)
                </label>
                <input
                  type="url"
                  value={formData.main_image_url || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, main_image_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {passoAtivo === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Título SEO
                </label>
                <input
                  type="text"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder={formData.name || 'Título para mecanismos de busca'}
                  maxLength={60}
                />
                <p className="text-xs text-fg-muted-token mt-1">
                  {(formData.meta_title || formData.name || '').length}/60 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-token mb-1">
                  Descrição SEO
                </label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border-token rounded bg-surface text-fg-token focus:ring-2 focus:ring-brand"
                  placeholder={formData.short_description || 'Descrição para mecanismos de busca'}
                  maxLength={160}
                />
                <p className="text-xs text-fg-muted-token mt-1">
                  {(formData.meta_description || formData.short_description || '').length}/160 caracteres
                </p>
              </div>

              <Card className="p-4 bg-surface-2 dark:bg-black">
                <h4 className="text-sm font-medium text-fg-token mb-2">Prévia no Google</h4>
                <div className="bg-surface p-3 rounded border border-border-token">
                  <p className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer">
                    {formData.meta_title || formData.name || 'Título do Produto'}
                  </p>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    sualoja.com.br › produtos › {formData.sku || 'sku'}
                  </p>
                  <p className="text-fg-muted-token text-sm line-clamp-2">
                    {formData.meta_description || formData.short_description || formData.description || 'Descrição do produto aparecerá aqui...'}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

          <aside className="flex flex-col gap-3 2xl:sticky 2xl:top-0 2xl:self-start max-2xl:order-first max-2xl:flex-row max-2xl:flex-wrap max-2xl:[&>*]:flex-1">
            <FormChecklist itens={checklist} />
            {/* Seis abas: você marca algo em Preços, passa por Estoque e Mídia
                e ao chegar em salvar não lembra o que escolheu. Conferir custa
                reabrir cada aba — o resumo responde sem sair do lugar. */}
            <FormSummary
              linhas={[
                { rotulo: 'Nome', valor: formData.name },
                { rotulo: 'Preço', valor: formData.price ? `R$ ${Number(formData.price).toFixed(2)}` : '' },
                { rotulo: 'Categoria', valor: categories.find((c) => c.id === formData.category)?.name },
                { rotulo: 'Status', valor: ROTULO_STATUS[formData.status ?? 'active'] },
                { rotulo: 'SKU', valor: formData.sku },
              ]}
            />
          </aside>
        </div>
        </>
        )}
        </FormStepper>

        {/* O rodapé é do FormStepper: ele sabe se está no último passo, e o
            botão de concluir não pode existir em dois lugares com regras
            diferentes. */}
      </form>
      <PaywallModal open={!!paywall} message={paywall ?? ''} onClose={() => setPaywall(null)} />
    </Modal>
  );
};

export default ProductFormModal;
export { ProductFormModal };
