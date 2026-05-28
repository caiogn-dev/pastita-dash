// ============================================
// CRM / PDV TYPES
// ============================================

export interface UserAddress {
  id: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

export interface CustomerSearchResult {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order_at?: string;
  addresses: UserAddress[];
}

export interface CustomerProfile extends CustomerSearchResult {
  active_order?: {
    id: string;
    status: string;
    total: number;
  };
}

export interface TeamMember {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: 'owner' | 'manager' | 'operator' | 'viewer';
  is_active: boolean;
}

export type DiscountType = 'percent' | 'fixed';

export interface OrderAdjustment {
  discount_type?: DiscountType;
  discount_value?: number;
  discount_reason?: string;
  surcharge_value?: number;
  surcharge_reason?: string;
}

export interface RouteQuote {
  fee: number;
  distance_km?: number | null;
  duration_minutes?: number | null;
  message?: string;
}

// Payload sent to checkout endpoint
export interface NewOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_method: 'delivery' | 'pickup';
  delivery_address?: string;
  delivery_fee?: number;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
  }>;
  payment_method: 'pix' | 'cash' | 'credit_card' | 'fiado';
  notes?: string;
  created_by_staff?: boolean;
  // Adjustments (backend pending)
  manual_discount_type?: DiscountType;
  manual_discount_value?: number;
  manual_discount_reason?: string;
  surcharge_value?: number;
  surcharge_reason?: string;
}
