import { z } from 'zod';

// CPF validation
export const cpfSchema = z.string()
  .min(11, 'CPF deve ter 11 dígitos')
  .max(14, 'CPF deve ter no máximo 14 caracteres');

// CNPJ validation  
export const cnpjSchema = z.string()
  .min(14, 'CNPJ deve ter 14 dígitos')
  .max(18, 'CNPJ deve ter no máximo 18 caracteres');

// Phone validation
export const phoneSchema = z.string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .max(15, 'Telefone deve ter no máximo 15 caracteres');

// CEP validation
export const cepSchema = z.string()
  .min(8, 'CEP deve ter 8 dígitos')
  .max(9, 'CEP deve ter no máximo 9 caracteres');

// Email validation
export const emailSchema = z.string()
  .email('Email inválido')
  .min(5, 'Email deve ter pelo menos 5 caracteres');

// Export all
export * from './brasilSchemas';
export * from './campaignSchemas';
export * from './accountSchemas';
