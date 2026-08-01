/**
 * Reports API Service
 * Endpoints for generating reports and analytics
 */
import api from './api';
import logger from './logger';
import { getStoreSlugWithFallback } from '../hooks/useStore';

const BASE_URL = '/stores/reports';
const getStoreParam = () => getStoreSlugWithFallback() || undefined;

// =============================================================================
// TYPES
// =============================================================================

export interface DateRange {
  start_date?: string;
  end_date?: string;
  period?: '7d' | '30d' | '90d' | '1y';
}

export interface RevenueSummary {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  total_delivery_fees: number;
  total_discounts: number;
}

export interface RevenueDataPoint {
  period: string;
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
  total_delivery_fees: number;
  total_discounts: number;
}

export interface RevenueReport {
  period: {
    start: string;
    end: string;
    group_by: 'day' | 'week' | 'month';
  };
  summary: RevenueSummary;
  data: RevenueDataPoint[];
}

export interface TopProduct {
  product_id: string | null;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  current_stock: number | null;
}

export interface ProductsReport {
  period: {
    start: string;
    end: string;
  };
  top_products: TopProduct[];
}

export interface StockProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number | null;
  price: number;
  status: string;
  category: string | null;
}

export interface StockReport {
  summary: {
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    low_stock_threshold: number;
  };
  low_stock_products: StockProduct[];
  out_of_stock_products: Array<{
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
  }>;
}

export interface TopCustomer {
  email: string;
  name: string;
  phone: string;
  total_spent: number;
  order_count: number;
  avg_order_value: number;
}

export interface CustomersReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_customers: number;
    new_customers: number;
    returning_customers: number;
    retention_rate: number;
  };
  top_customers: TopCustomer[];
}

export interface DashboardStats {
  today: {
    orders: number;
    revenue: number;
    revenue_change: number;
    revenue_change_percent: number;
  };
  week: {
    orders: number;
    revenue: number;
    avg_daily_revenue: number;
  };
  month: {
    orders: number;
    revenue: number;
    avg_daily_revenue: number;
  };
  alerts: {
    pending_orders: number;
    low_stock_products: number;
  };
  generated_at?: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get revenue report with aggregations
 */
export const getRevenueReport = async (
  params: DateRange & { group_by?: 'day' | 'week' | 'month' } = {}
): Promise<RevenueReport> => {
  try {
    const response = await api.get(`${BASE_URL}/revenue/`, {
      params: { store: getStoreParam(), ...params }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch revenue report', error);
    throw error;
  }
};

/**
 * Get products performance report
 */
export const getProductsReport = async (params: DateRange = {}): Promise<ProductsReport> => {
  try {
    const response = await api.get(`${BASE_URL}/products/`, {
      params: { store: getStoreParam(), ...params }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch products report', error);
    throw error;
  }
};

/**
 * Get stock/inventory report
 */
export const getStockReport = async (low_stock_threshold?: number): Promise<StockReport> => {
  try {
    const response = await api.get(`${BASE_URL}/stock/`, {
      params: { store: getStoreParam(), low_stock: low_stock_threshold }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch stock report', error);
    throw error;
  }
};

/**
 * Get customers report
 */
export const getCustomersReport = async (params: DateRange = {}): Promise<CustomersReport> => {
  try {
    const response = await api.get(`${BASE_URL}/customers/`, {
      params: { store: getStoreParam(), ...params }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch customers report', error);
    throw error;
  }
};

/**
 * Get dashboard stats overview
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await api.get(`${BASE_URL}/dashboard/`, {
      params: { store: getStoreParam() }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', error);
    throw error;
  }
};

/**
 * Export orders as CSV (returns blob)
 */
export const exportOrdersCSV = async (params: DateRange = {}): Promise<Blob> => {
  try {
    const response = await api.get(`${BASE_URL}/orders/export/`, {
      params: { store: getStoreParam(), ...params },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to export orders', error);
    throw error;
  }
};

/**
 * Download helper - triggers file download
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// =============================================================================
// ANALYTICS/BI FASE 1 — 15 endpoints novos (server2 analytics_views.py)
// =============================================================================

export interface HeatmapCell { weekday: number; hour: number; orders: number; revenue: number }
export interface HeatmapReport { cells: HeatmapCell[]; peak: HeatmapCell | null }

export interface AbcProduct {
  product_name: string; quantity: number; revenue: number; order_count: number;
  revenue_pct: number; cumulative_pct: number; abc_class: 'A' | 'B' | 'C';
}
export interface AbcReport {
  products: AbcProduct[];
  summary: { total_revenue: number; a_count: number; b_count: number; c_count: number };
}

export interface ChannelRow { channel: string; orders: number; revenue: number; avg_ticket: number }
export interface DimensionRow { [key: string]: string | number }
export interface ChannelsReport {
  by_source: ChannelRow[]; by_payment_method: DimensionRow[]; by_delivery_method: DimensionRow[];
}

export interface GeographyReport {
  neighborhoods: Array<{ name: string; city: string; orders: number; revenue: number }>;
  distance_bands: Array<{ band: string; orders: number; revenue: number }>;
  points: Array<{ lat: number; lng: number; total: number }>;
  zones: Array<{ name: string; orders: number; revenue: number }>;
}

export interface SlaStage { stage: string; count: number; avg_minutes: number | null; p90_minutes: number | null }
export interface SlaReport { stages: SlaStage[] }

export interface FinanceReport {
  summary: { gross: number; fees: number; net: number; refunded: number };
  by_gateway: DimensionRow[]; by_method: DimensionRow[];
  timeline: Array<{ date: string; gross: number; net: number }>;
}

export interface RfmSegment { segment: string; label: string; count: number; revenue: number }
export interface InactiveCustomer {
  name: string; phone: string; days_since: number; total_orders: number; total_spent: number;
}
export interface RfmReport { segments: RfmSegment[]; inactive: InactiveCustomer[] }

export interface BotFunnelReport {
  funnel: Array<{ status: string; count: number }>;
  conversion: { sessions: number; with_order: number; rate: number };
  response_time: { avg_minutes: number | null; conversations: number };
}

export interface ReviewsReport {
  summary: { avg_rating: number | null; count: number };
  distribution: Array<{ rating: number; count: number }>;
  recent: Array<{ rating: number; comment: string; customer_name: string; created_at: string }>;
}

export interface CouponsReport {
  coupons: Array<{ code: string; orders: number; discount_total: number; revenue: number; avg_ticket: number }>;
  summary: { orders_with_coupon: number; total_orders: number; coupon_usage_pct: number; total_discount: number };
}

export interface BasketReport {
  pairs: Array<{ product_a: string; product_b: string; orders_together: number }>;
  orders_analyzed: number;
}

export interface CancellationsReport {
  summary: { cancelled: number; total_orders: number; rate: number; lost_value: number };
  by_status: Array<{ status: string; count: number; lost_value: number }>;
  timeline: Array<{ date: string; cancelled: number; lost_value: number }>;
}

export interface SchedulingReport {
  by_date: Array<{ date: string; orders: number; revenue: number }>;
  by_slot: Array<{ slot: string; orders: number }>;
  total: number;
}

export interface CashHistoryReport {
  sessions: Array<{
    id: string; opened_at: string; closed_at: string | null; opened_by: string | null;
    closed_by: string | null; opening_amount: number; expected_amount: number | null;
    counted_amount: number | null; difference: number | null; reinforcement: number; withdrawal: number;
  }>;
  summary: { count: number; total_difference: number; with_shortage: number };
}

export interface StaffReport {
  staff: Array<{
    username: string; name: string; orders: number; revenue: number;
    avg_ticket: number; manual_discounts: number;
  }>;
}

export interface MenuMatrixReport {
  products: Array<{
    product_name: string; quantity: number; revenue: number;
    unit_margin: number; margin_pct: number;
    quadrant: 'estrela' | 'burro_de_carga' | 'enigma' | 'abacaxi';
  }>;
  missing_cost: Array<{ product_name: string; quantity: number; revenue: number }>;
  summary: { analyzed: number; missing_cost: number };
}

export interface CohortReport {
  cohorts: Array<{ cohort: string; size: number; retention: Array<number | null> }>;
  horizon: number;
}

/** Fetcher genérico dos relatórios de analytics (todos GET store+período). */
export const getAnalyticsReport = async <T>(path: string, params: DateRange = {}): Promise<T> => {
  try {
    const response = await api.get(`${BASE_URL}/${path}/`, {
      params: { store: getStoreParam(), ...params },
    });
    return response.data as T;
  } catch (error) {
    logger.error(`Failed to fetch analytics report ${path}`, error);
    throw error;
  }
};

// Export all functions
export const reportsService = {
  getRevenueReport,
  getProductsReport,
  getStockReport,
  getCustomersReport,
  getDashboardStats,
  exportOrdersCSV,
  downloadBlob,
  getAnalyticsReport,
};

export default reportsService;
