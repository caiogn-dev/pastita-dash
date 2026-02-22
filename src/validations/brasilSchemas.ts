import { z } from 'zod';

export const cpfSchema = z.string()
  .min(11, 'CPF deve ter 11 dígitos')
  .max(14, 'CPF deve ter no máximo 14 caracteres');

export const cnpjSchema = z.string()
  .min(14, 'CNPJ deve ter 14 dígitos')
  .max(18, 'CNPJ deve ter no máximo 18 caracteres');

export const phoneSchema = z.string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .max(15, 'Telefone deve ter no máximo 15 caracteres');

export const cepSchema = z.string()
  .min(8, 'CEP deve ter 8 dígitos')
  .max(9, 'CEP deve ter no máximo 9 caracteres');

export const emailSchema = z.string()
  .email('Email inválido')
  .min(5, 'Email deve ter pelo menos 5 caracteres');
