import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  campaign_type: z.enum(['broadcast', 'drip', 'triggered', 'promotional', 'transactional']),
  account_id: z.string().min(1, 'ID da conta é obrigatório'),
  template_id: z.string().optional(),
  message_content: z.object({
    text: z.string().min(1, 'Texto é obrigatório'),
    template_name: z.string().optional(),
    template_variables: z.any().optional(),
    media_url: z.string().optional(),
    buttons: z.array(z.object({
      type: z.enum(['reply', 'url', 'phone']),
      title: z.string().min(1, 'Título é obrigatório').max(20, 'Máximo 20 caracteres'),
      payload: z.string().optional(),
    })).optional(),
  }),
  audience_filters: z.object({
    tags: z.array(z.string()).optional(),
    min_orders: z.number().optional(),
    max_orders: z.number().optional(),
  }).optional(),
  scheduled_at: z.string().optional(),
  messages_per_minute: z.number().default(60),
  delay_between_messages: z.number().default(1),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const contactListSchema = z.object({
  account_id: z.string().min(1, 'ID da conta é obrigatório'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  contacts: z.array(z.object({
    phone: z.string().min(10, 'Telefone inválido'),
    name: z.string().optional(),
    variables: z.any().optional(),
  })).min(1, 'Adicione pelo menos um contato'),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ContactListInput = z.infer<typeof contactListSchema>;
