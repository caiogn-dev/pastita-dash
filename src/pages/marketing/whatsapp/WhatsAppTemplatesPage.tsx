import React, { useState } from 'react';
import { whatsappTemplates, getTemplatesByCategory, WhatsAppTemplate } from '../../../data/whatsappTemplates';
import { Badge } from '../../../components/common';
import { PageShell, KpiGrid } from '../../../components/ui';
import {
  // Ícones escolhidos pelo QUE A CATEGORIA FAZ, não por serem bonitos:
  // Squares2X2  → a coleção inteira de templates
  // TruckIcon   → transacional é o pedido andando (confirmado → entregue)
  // MegaphoneIcon → marketing é anúncio para muitos
  // ChatBubbleLeftRight → suporte é conversa de ida e volta
  Squares2X2Icon,
  TruckIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import type { BadgeProps } from '../../../components/common/Badge';

const WhatsAppTemplatesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'transactional' | 'marketing' | 'support'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  const filteredTemplates = selectedCategory === 'all' 
    ? whatsappTemplates 
    : getTemplatesByCategory(selectedCategory);

  const getCategoryVariant = (category: WhatsAppTemplate['category']): BadgeProps['variant'] => {
    switch (category) {
      case 'transactional': return 'info';
      case 'marketing': return 'purple';
      case 'support': return 'success';
      default: return 'gray';
    }
  };

  const getCategoryLabel = (category: WhatsAppTemplate['category']) => {
    switch (category) {
      case 'transactional': return 'Transacional';
      case 'marketing': return 'Marketing';
      case 'support': return 'Suporte';
      default: return category;
    }
  };

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    const vars: Record<string, string> = {};
    template.variables.forEach(v => {
      vars[v] = '';
    });
    setPreviewVariables(vars);
  };

  const getPreviewContent = () => {
    if (!selectedTemplate) return '';
    let content = selectedTemplate.content;
    Object.entries(previewVariables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    });
    return content;
  };

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas', href: '/marketing' }, { rotulo: 'Templates' }]}
      titulo="Templates WhatsApp"
      descricao="Mensagens pré-aprovadas pela Meta. Fora da janela de 24h, só template chega ao cliente."
      className="mx-auto max-w-7xl"
    >
      {/* Os quatro cards eram <div> com sombra e cor crua (blue-600,
          purple-600, green-600), fora dos tokens e sem dizer o que cada
          categoria significa. Categoria de template não é enfeite: ela decide
          se a Meta deixa você disparar. */}
      <KpiGrid
        itens={[
          {
            label: 'Total',
            value: whatsappTemplates.length,
            definicao: 'Todos os templates cadastrados nesta conta.',
            icone: <Squares2X2Icon />,
          },
          {
            label: 'Transacionais',
            value: getTemplatesByCategory('transactional').length,
            definicao: 'Confirmação, status do pedido, entrega. Podem ser enviados a qualquer momento.',
            icone: <TruckIcon />,
            tone: 'success',
          },
          {
            label: 'Marketing',
            value: getTemplatesByCategory('marketing').length,
            definicao: 'Promoção e reativação. Exigem opt-in e contam no limite da Meta.',
            icone: <MegaphoneIcon />,
            tone: 'brand',
          },
          {
            label: 'Suporte',
            value: getTemplatesByCategory('support').length,
            definicao: 'Atendimento e resposta a dúvida do cliente.',
            icone: <ChatBubbleLeftRightIcon />,
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-8">
        {/* Templates List */}
        <div>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            {(['all', 'transactional', 'marketing', 'support'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-surface-2 text-fg-token hover:bg-brand-soft'
                }`}
              >
                {cat === 'all' ? 'Todos' : getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.id === template.id
                    ? 'border-brand bg-brand-soft'
                    : 'border-border-token bg-surface'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-fg-token">{template.name}</h3>
                  <Badge variant={getCategoryVariant(template.category)}>
                    {getCategoryLabel(template.category)}
                  </Badge>
                </div>
                <p className="text-sm text-fg-muted-token mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="text-xs px-2 py-1 bg-surface-2 text-fg-muted-token rounded"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          {selectedTemplate ? (
            <div className="bg-surface rounded-lg shadow-lg border border-border-token sticky top-6">
              <div className="p-4 border-b border-border-token bg-surface-2 rounded-t-lg">
                <h2 className="font-semibold text-fg-token">Preview</h2>
                <p className="text-sm text-fg-muted-token">{selectedTemplate.name}</p>
              </div>

              {/* Variables Input */}
              <div className="p-4 border-b border-border-token">
                <h3 className="text-sm font-medium text-fg-token mb-3">Variáveis</h3>
                <div className="space-y-3">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable}>
                      <label className="block text-xs text-fg-muted-token mb-1 capitalize">
                        {variable}
                      </label>
                      <input
                        type="text"
                        value={previewVariables[variable] || ''}
                        onChange={(e) => setPreviewVariables(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                        className="w-full px-3 py-2 bg-surface-2 text-fg-token border border-border-token rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        placeholder={`Valor para {{${variable}}}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Preview */}
              <div className="p-4 bg-[#e5ddd5] min-h-[300px]">
                <div className="bg-white rounded-lg rounded-tl-none shadow-sm p-3 max-w-[90%] relative">
                  <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-transparent border-r-[10px] border-r-white border-b-[10px] border-b-transparent"></div>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                    {getPreviewContent()}
                  </pre>
                  <div className="text-right mt-1">
                    <span className="text-xs text-gray-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border-token flex gap-3">
                <button className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 transition-colors">
                  Usar Template
                </button>
                <button className="px-4 py-2 border border-border-token rounded-lg font-medium text-fg-token hover:bg-surface-2 transition-colors">
                  Editar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface-2 rounded-lg border-2 border-dashed border-border-token p-12 text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-fg-token mb-2">Selecione um template</h3>
              <p className="text-fg-muted-token">Clique em um template à esquerda para visualizar</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default WhatsAppTemplatesPage;
