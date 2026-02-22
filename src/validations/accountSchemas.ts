import { z } from 'zod';
import { phoneSchema } from './brasilSchemas';

export const createWhatsAppAccountSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone_number: phoneSchema,
  app_id: z.string().optional(),
  business_account_id: z.string().optional(),
});

export const sendTextMessageSchema = z.object({
  account_id: z.string().min(1, 'ID da conta é obrigatório'),
  to: phoneSchema,
  body: z.string().min(1, 'Mensagem é obrigatória').max(4096, 'Mensagem muito longa'),
  preview_url: z.boolean().default(false),
});

export const sendTemplateMessageSchema = z.object({
  account_id: z.string().min(1, 'ID da conta é obrigatório'),
  to: phoneSchema,
  template_name: z.string().min(1, 'Nome do template é obrigatório'),
  language_code: z.string().default('pt_BR'),
  components: z.array(z.object({
    type: z.enum(['header', 'body', 'footer']),
    parameters: z.array(z.object({
      type: z.enum(['text', 'currency', 'date_time']),
      text: z.string().optional(),
    })).optional(),
  })).optional(),
});

export const createCustomerSessionSchema = z.object({
  company_id: z.string().min(1, 'ID da empresa é obrigatório'),
  phone_number: phoneSchema,
  customer_name: z.string().optional(),
  cart_data: z.object({
    items: z.array(z.object({
      product_id: z.string(),
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    })).optional(),
    total: z.number().optional(),
  }).optional(),
  metadata: z.any().optional(),
});

export type CreateWhatsAppAccountInput = z.infer<typeof createWhatsAppAccountSchema>;
export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>;
export type SendTemplateMessageInput = z.infer<typeof sendTemplateMessageSchema>;
export type CreateCustomerSessionInput = z.infer<typeof createCustomerSessionSchema>;
