import api from './api';
import { getStoreSlug } from '../hooks/useStore';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'pastita';
const getStoreParam = () => getStoreSlug() || STORE_SLUG;

export type SaladasPeriod = 'today' | '7d' | '30d';

export interface SaladasKpi {
  value: number;
  change_percent: number | null;
}

export interface SaladasOrdersKpi {
  value: number;
  change_abs: number;
}

export interface SaladasReport {
  period: { label: string; start: string; end: string };
  kpis: {
    revenue: SaladasKpi;
    orders: SaladasOrdersKpi;
    avg_ticket: SaladasKpi;
  };
  revenue_chart: { label: string; value: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
  category_revenue: { name: string; revenue: number; percent: number }[];
  customers: { total: number; new: number; returning: number };
  top_customers: {
    name: string;
    phone: string;
    orders: number;
    total_spent: number;
    avg_ticket: number;
  }[];
  top_neighborhoods: { name: string; orders: number }[];
}

export const getSaladasReport = async (period: SaladasPeriod): Promise<SaladasReport> => {
  const response = await api.get('/stores/reports/saladas/', {
    params: { store: getStoreParam(), period },
  });
  return response.data;
};
