import React from 'react';

import { MessageTemplate, WhatsAppAccount } from '../../../../../types';
import { StoreProduct } from '../../../../../services/storesApi';
import { Card } from '../../../../../components/ui';
import { formatCurrency } from '../../../../../utils/formatters';
import { precoVigenteDoProduto } from '../../../../../utils/precoVigente';

/** O recorte do formulário que a revisão mostra e deixa mexer. */
interface DadosEditaveis {
  name: string;
  description: string;
  messageType: 'template' | 'text';
  textContent: string;
  scheduledAt: string;
  messagesPerMinute: number;
  mediaUrl?: string;
}

interface Props {
  formData: DadosEditaveis;
  /** Só os campos que ESTA tela edita — nome, descrição e velocidade. */
  setFormData: React.Dispatch<React.SetStateAction<DadosEditaveis>>;
  selectedAccount?: WhatsAppAccount;
  selectedTemplate?: MessageTemplate;
  selectedOfferProducts: StoreProduct[];
  mediaPreviewUrl: string;
  recipientCount: number;
}

/**
 * Último passo: a conferência antes de gastar.
 *
 * É a única tela onde o dono vê, junto, POR ONDE sai, O QUE sai, PARA QUANTOS
 * e QUANTO custa em tempo de envio. Depois daqui a mensagem é paga e não
 * volta atrás.
 */
export const PassoDaRevisao: React.FC<Props> = ({
  formData,
  setFormData,
  selectedAccount,
  selectedTemplate,
  selectedOfferProducts,
  mediaPreviewUrl,
  recipientCount,
}) => (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-fg-token mb-2">
              Revise e Envie
            </h2>
            <p className="text-fg-muted-token">
              Confira os detalhes da campanha antes de enviar
            </p>
          </div>

          {/* Summary */}
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-fg-muted-token">Campanha</p>
                <p className="font-medium text-fg-token">
                  {formData.name || 'Sem nome'}
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted-token">Conta</p>
                <p className="font-medium text-fg-token">
                  {selectedAccount?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted-token">Tipo de Mensagem</p>
                <p className="font-medium text-fg-token">
                  {formData.messageType === 'template' ? 'Template' : 'Texto Livre'}
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted-token">Destinatários</p>
                <p className="font-medium text-fg-token">
                  {recipientCount} contatos
                </p>
              </div>
            </div>

            {formData.messageType === 'template' && selectedTemplate && (
              <div className="pt-4 border-t">
                <p className="text-sm text-fg-muted-token mb-1">Template</p>
                <p className="font-medium text-fg-token">
                  {selectedTemplate.name}
                </p>
                {selectedOfferProducts.length > 0 && (
                  <div className="mt-3 rounded-lg bg-surface-2 p-3">
                    <p className="text-sm font-medium text-fg-token mb-2">
                      Produtos da oferta
                    </p>
                    <div className="space-y-2">
                      {selectedOfferProducts.map(product => (
                        <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-fg-token">{product.name}</span>
                          <span className="font-medium text-[var(--success)]">{formatCurrency(precoVigenteDoProduto(product))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(mediaPreviewUrl || formData.mediaUrl) && (
                  <div className="mt-3">
                    <p className="text-sm text-fg-muted-token mb-1">Imagem do cabeçalho</p>
                    <img
                      src={mediaPreviewUrl || formData.mediaUrl}
                      alt="Imagem do template"
                      className="w-48 h-48 rounded-lg object-cover border border-border-token"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
              </div>
            )}

            {formData.messageType === 'text' && (
              <div className="pt-4 border-t">
                <p className="text-sm text-fg-muted-token mb-1">Mensagem</p>
                <p className="text-fg-token whitespace-pre-wrap bg-surface-2 p-3 rounded-lg">
                  {formData.textContent || 'Imagem sem legenda'}
                </p>
                {(mediaPreviewUrl || formData.mediaUrl) && (
                  <div className="mt-3">
                    <p className="text-sm text-fg-muted-token mb-1">Imagem</p>
                    <img
                      src={mediaPreviewUrl || formData.mediaUrl}
                      alt="Card promocional"
                      className="w-48 h-48 rounded-lg object-cover border border-border-token"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Rate Limiting */}
            <div className="pt-4 border-t">
              <label className="block text-sm text-fg-muted-token mb-2">
                Velocidade de Envio
              </label>
              <select
                value={formData.messagesPerMinute}
                onChange={(e) => setFormData(prev => ({ ...prev, messagesPerMinute: Number(e.target.value) }))}
                className="px-3 py-2 border border-border-token rounded-lg bg-surface dark:bg-[var(--dark-bg-hover,#161616)] text-fg-token"
              >
                <option value={30}>30 mensagens/minuto (Conservador)</option>
                <option value={60}>60 mensagens/minuto (Recomendado)</option>
                <option value={120}>120 mensagens/minuto (Rápido)</option>
              </select>
              <p className="text-xs text-fg-muted-token mt-1">
                Tempo estimado: ~{Math.ceil(recipientCount / formData.messagesPerMinute)} minutos
              </p>
            </div>
          </Card>

          {/* O aviso que evita bloqueio da conta. Tokens e não `yellow-*`
              cru: no escuro o par cru precisa ser escrito à mão e, quando
              alguém esquece a metade, o texto some no fundo. */}
          <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4">
            <p className="text-sm text-warning-token">
              ⚠️ <strong>Atenção:</strong> Certifique-se de que todos os contatos consentiram em receber mensagens. 
              O envio de spam pode resultar em bloqueio da sua conta WhatsApp Business.
            </p>
          </div>
        </div>
);
