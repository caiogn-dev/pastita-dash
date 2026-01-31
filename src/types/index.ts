// User types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
}

export interface LoginResponse {
  token: string;
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

// WhatsApp Account types
export interface WhatsAppAccount {
  id: string;
  name: string;
  phone_number_id: string;
  waba_id: string;
  phone_number: string;
  display_phone_number: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  token_version: number;
  default_langflow_flow_id: string | null;
  auto_response_enabled: boolean;
  human_handoff_enabled: boolean;
  metadata: Record<string, unknown>;
  masked_token: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateWhatsAppAccount {
  name: string;
  phone_number_id: string;
  waba_id: string;
  phone_number: string;
  display_phone_number?: string;
  access_token: string;
  webhook_verify_token?: string;
  auto_response_enabled?: boolean;
  human_handoff_enabled?: boolean;
  default_langflow_flow_id?: string;
  metadata?: Record<string, unknown>;
}

// Message types
export interface Message {
  id: string;
  account: string;
  account_name: string;
  conversation: string | null;
  whatsapp_message_id: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  from_number: string;
  to_number: string;
  content: Record<string, unknown>;
  text_body: string;
  media_id: string;
  media_url: string;
  media_mime_type: string;
  template_name: string;
  template_language: string;
  context_message_id: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_code: string;
  error_message: string;
  metadata: Record<string, unknown>;
  processed_by_langflow: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendTextMessage {
  account_id: string;
  to: string;
  text: string;
  preview_url?: boolean;
  reply_to?: string;
  metadata?: Record<string, unknown>;
}

export interface SendTemplateMessage {
  account_id: string;
  to: string;
  template_name: string;
  language_code?: string;
  components?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface SendInteractiveButtons {
  account_id: string;
  to: string;
  body_text: string;
  buttons: Array<{ id?: string; title: string }>;
  header?: Record<string, unknown>;
  footer?: string;
  reply_to?: string;
  metadata?: Record<string, unknown>;
}

export interface SendInteractiveList {
  account_id: string;
  to: string;
  body_text: string;
  button_text: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  header?: string;
  footer?: string;
  reply_to?: string;
  metadata?: Record<string, unknown>;
}

// Conversation types
export interface Conversation {
  id: string;
  account: string;
  phone_number: string;
  contact_name: string;
  mode: 'auto' | 'human' | 'hybrid';
  status: 'open' | 'closed' | 'pending' | 'resolved';
  assigned_agent: number | null;
  langflow_flow_id: string | null;
  langflow_session_id: string;
  context: Record<string, unknown>;
  tags: string[];
  last_message_at: string | null;
  last_customer_message_at: string | null;
  last_agent_message_at: string | null;
  closed_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ConversationNote {
  id: string;
  conversation: string;
  author: number | null;
  content: string;
  created_at: string;
  updated_at: string;
}

// Order types
export interface Order {
  id: string;
  store: string;
  order_number: string;
  access_token?: string;
  customer?: number | null;
  customer_phone: string;
  customer_name: string;
  customer_email: string;
  status: 'pending' | 'confirmed' | 'processing' | 'paid' | 'preparing' | 'ready' | 'shipped' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  status_display?: string;
  payment_status?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  payment_status_display?: string;
  payment_method?: string;
  payment_id?: string;
  payment_preference_id?: string;
  subtotal: number;
  discount: number;
  coupon_code?: string;
  tax: number;
  delivery_fee: number;
  total: number;
  delivery_method?: 'delivery' | 'pickup' | 'digital';
  delivery_method_display?: string;
  delivery_address?: Record<string, unknown>;
  delivery_notes?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  tracking_code?: string;
  tracking_url?: string;
  carrier?: string;
  customer_notes?: string;
  internal_notes?: string;
  metadata: Record<string, unknown>;
  pix_code?: string;
  pix_qr_code?: string;
  pix_ticket_url?: string;
  items_count?: number;
  store_id?: string;
  store_name?: string;
  source?: string;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  items: OrderItem[];
  // Legacy/compat fields (not always present in stores API)
  account?: string;
  conversation?: string | null;
  shipping_cost?: number;
  shipping_address?: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
  notes?: string;
  currency?: string;
  payment_url?: string;
  payment_link?: string;
  init_point?: string;
  confirmed_at?: string | null;
}

export interface OrderItem {
  id: string;
  order?: string;
  product_id?: string;
  product?: string;  // API returns product UUID
  variant?: string;
  product_name: string;
  variant_name?: string;
  product_sku?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  subtotal?: number;
  options?: Record<string, unknown>;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface OrderEvent {
  id: string;
  order: string;
  event_type: string;
  description: string;
  old_status: string;
  new_status: string;
  actor: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateOrder {
  account_id: string;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  items: Array<{
    product_name: string;
    product_id?: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  shipping_address?: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
  shipping_cost?: number;
  discount?: number;
  notes?: string;
}

// Payment types
export interface Payment {
  id: string;
  order: string;
  gateway: string | null;
  payment_id: string;
  external_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  payment_method: string;
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  refunded_amount: number;
  payer_email: string;
  payer_name: string;
  payer_document: string;
  payment_url: string;
  qr_code: string;
  qr_code_base64: string;
  barcode: string;
  expires_at: string | null;
  paid_at: string | null;
  gateway_response: Record<string, unknown>;
  metadata: Record<string, unknown>;
  error_code: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface PaymentGateway {
  id: string;
  name: string;
  gateway_type: 'stripe' | 'mercadopago' | 'pagseguro' | 'pix' | 'custom';
  is_enabled: boolean;
  is_sandbox: boolean;
  endpoint_url: string;
  webhook_url: string;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Langflow types
export interface LangflowFlow {
  id: string;
  name: string;
  description: string;
  flow_id: string;
  endpoint_url: string;
  status: 'active' | 'inactive' | 'testing';
  input_type: string;
  output_type: string;
  tweaks: Record<string, unknown>;
  default_context: Record<string, unknown>;
  timeout_seconds: number;
  max_retries: number;
  accounts: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface LangflowSession {
  id: string;
  flow: string;
  conversation: string | null;
  session_id: string;
  context: Record<string, unknown>;
  history: Array<{ role: string; content: string }>;
  last_interaction_at: string;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface LangflowLog {
  id: string;
  flow: string;
  session: string | null;
  input_message: string;
  output_message: string;
  status: 'success' | 'error' | 'timeout';
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  duration_ms: number | null;
  error_message: string;
  created_at: string;
}

export interface ProcessMessageRequest {
  flow_id: string;
  message: string;
  context?: Record<string, unknown>;
  session_id?: string;
  conversation_id?: string;
}

export interface ProcessMessageResponse {
  response: string;
  session_id: string;
  flow_id: string;
  raw_response: Record<string, unknown>;
}

// Dashboard types
export interface DashboardOverview {
  accounts: {
    total: number;
    active: number;
    inactive: number;
  };
  messages: {
    today: number;
    week: number;
    month: number;
    by_status: Record<string, number>;
    by_direction: Record<string, number>;
  };
  conversations: {
    active: number;
    by_status: Record<string, number>;
    by_mode: Record<string, number>;
    resolved_today: number;
  };
  orders: {
    today: number;
    by_status: Record<string, number>;
    revenue_today: number;
    revenue_month: number;
  };
  payments: {
    pending: number;
    completed_today: number;
  };
  langflow: {
    interactions_today: number;
    avg_duration_ms: number;
    success_rate: number;
  };
  timestamp: string;
}

export interface DashboardActivity {
  activity: Array<{
    id: string;
    type: 'message' | 'order' | 'conversation';
    [key: string]: unknown;
  }>;
  messages: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  conversations: Array<Record<string, unknown>>;
}

export interface DashboardCharts {
  messages_per_day: Array<{
    date: string;
    inbound: number;
    outbound: number;
    total: number;
  }>;
  orders_per_day: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  conversations_per_day: Array<{
    date: string;
    new: number;
    resolved: number;
  }>;
  message_types: Record<string, number>;
  order_statuses: Record<string, number>;
}

// Message Template types
export interface MessageTemplate {
  id: string;
  account: string;
  template_id: string;
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  status: 'pending' | 'approved' | 'rejected';
  components: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Error type
export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

// Automation types
export type BusinessType = 'restaurant' | 'ecommerce' | 'services' | 'retail' | 'healthcare' | 'education' | 'other';

export interface BusinessHours {
  monday?: { open: boolean; start?: string; end?: string };
  tuesday?: { open: boolean; start?: string; end?: string };
  wednesday?: { open: boolean; start?: string; end?: string };
  thursday?: { open: boolean; start?: string; end?: string };
  friday?: { open: boolean; start?: string; end?: string };
  saturday?: { open: boolean; start?: string; end?: string };
  sunday?: { open: boolean; start?: string; end?: string };
}

export interface CompanyProfile {
  id: string;
  account: string;
  account_phone: string;
  account_name: string;
  company_name: string;
  business_type: BusinessType;
  description: string;
  website_url: string;
  menu_url: string;
  order_url: string;
  business_hours: BusinessHours;
  auto_reply_enabled: boolean;
  welcome_message_enabled: boolean;
  menu_auto_send: boolean;
  abandoned_cart_notification: boolean;
  abandoned_cart_delay_minutes: number;
  pix_notification_enabled: boolean;
  payment_confirmation_enabled: boolean;
  order_status_notification_enabled: boolean;
  delivery_notification_enabled: boolean;
  external_api_key: string;
  webhook_secret: string;
  use_langflow: boolean;
  langflow_flow_id: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyProfile {
  account_id: string;
  company_name: string;
  business_type?: BusinessType;
  description?: string;
  website_url?: string;
  menu_url?: string;
  order_url?: string;
  business_hours?: BusinessHours;
}

export interface UpdateCompanyProfile {
  company_name?: string;
  business_type?: BusinessType;
  description?: string;
  website_url?: string;
  menu_url?: string;
  order_url?: string;
  business_hours?: BusinessHours;
  auto_reply_enabled?: boolean;
  welcome_message_enabled?: boolean;
  menu_auto_send?: boolean;
  abandoned_cart_notification?: boolean;
  abandoned_cart_delay_minutes?: number;
  pix_notification_enabled?: boolean;
  payment_confirmation_enabled?: boolean;
  order_status_notification_enabled?: boolean;
  delivery_notification_enabled?: boolean;
  use_langflow?: boolean;
  langflow_flow_id?: string | null;
  settings?: Record<string, unknown>;
}

export type AutoMessageEventType = 
  | 'welcome' | 'menu' | 'business_hours' | 'out_of_hours'
  | 'cart_created' | 'cart_abandoned' | 'cart_reminder'
  | 'pix_generated' | 'pix_reminder' | 'pix_expired'
  | 'payment_confirmed' | 'payment_failed'
  | 'order_confirmed' | 'order_preparing' | 'order_ready'
  | 'order_shipped' | 'order_out_for_delivery' | 'order_delivered' | 'order_cancelled'
  | 'feedback_request' | 'custom';

export interface AutoMessageButton {
  id: string;
  title: string;
}

export interface AutoMessage {
  id: string;
  company: string;
  event_type: AutoMessageEventType;
  event_type_display: string;
  name: string;
  message_text: string;
  media_url: string;
  media_type: 'image' | 'document' | 'video' | '';
  buttons: AutoMessageButton[];
  is_active: boolean;
  delay_seconds: number;
  conditions: Record<string, unknown>;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAutoMessage {
  company_id: string;
  event_type: AutoMessageEventType;
  name: string;
  message_text: string;
  media_url?: string;
  media_type?: 'image' | 'document' | 'video';
  buttons?: AutoMessageButton[];
  is_active?: boolean;
  delay_seconds?: number;
  conditions?: Record<string, unknown>;
  priority?: number;
}

export type SessionStatus = 
  | 'active' | 'cart_created' | 'cart_abandoned' | 'checkout'
  | 'payment_pending' | 'payment_confirmed' | 'order_placed'
  | 'completed' | 'expired';

export interface NotificationSent {
  type: string;
  sent_at: string;
}

export interface CustomerSession {
  id: string;
  company: string;
  company_name: string;
  phone_number: string;
  customer_name: string;
  customer_email: string;
  session_id: string;
  external_customer_id: string;
  status: SessionStatus;
  status_display: string;
  cart_data: Record<string, unknown>;
  cart_total: number;
  cart_items_count: number;
  cart_created_at: string | null;
  cart_updated_at: string | null;
  pix_code: string;
  pix_qr_code: string;
  pix_expires_at: string | null;
  payment_id: string;
  order: string | null;
  external_order_id: string;
  conversation: string | null;
  notifications_sent: NotificationSent[];
  last_notification_at: string | null;
  last_activity_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AutomationActionType = 
  | 'message_received' | 'message_sent' | 'webhook_received'
  | 'session_created' | 'session_updated' | 'notification_sent' | 'error';

export interface AutomationLog {
  id: string;
  company: string;
  company_name: string;
  session: string | null;
  action_type: AutomationActionType;
  action_type_display: string;
  description: string;
  phone_number: string;
  event_type: string;
  request_data: Record<string, unknown>;
  response_data: Record<string, unknown>;
  is_error: boolean;
  error_message: string;
  created_at: string;
}

export interface CompanyProfileStats {
  sessions: {
    total: number;
    active: number;
    cart_created: number;
    cart_abandoned: number;
    payment_pending: number;
    completed: number;
  };
  logs: {
    total: number;
    today: number;
    errors: number;
    messages_sent: number;
    webhooks_received: number;
  };
  auto_messages: {
    total: number;
    active: number;
  };
  cart_recovery: {
    abandoned: number;
    recovered: number;
    recovery_rate: number;
  };
}

export interface AutomationLogStats {
  total: number;
  today: number;
  this_week: number;
  errors: number;
  error_rate: number;
  by_action_type: Array<{ action_type: string; count: number }>;
  by_day: Array<{ date: string; count: number }>;
}

// Scheduled Message types (unified model from automation app)
export type ScheduledMessageStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type ScheduledMessageType = 'text' | 'template' | 'image' | 'document' | 'interactive';
export type ScheduledMessageSource = 'manual' | 'campaign' | 'automation' | 'api';

export interface ScheduledMessage {
  id: string;
  account: string;
  account_name: string;
  to_number: string;
  contact_name: string;
  message_type: ScheduledMessageType;
  message_type_display?: string;
  message_text: string;
  template_name: string;
  template_language: string;
  template_components: unknown[];
  media_url: string;
  buttons: Array<{ id: string; title: string }>;
  content: Record<string, unknown>;
  scheduled_at: string;
  timezone: string;
  status: ScheduledMessageStatus;
  status_display: string;
  sent_at: string | null;
  whatsapp_message_id: string;
  error_code: string;
  error_message: string;
  // Recurrence support
  is_recurring: boolean;
  recurrence_rule: string;
  next_occurrence: string | null;
  // Source tracking
  source: ScheduledMessageSource;
  campaign_id: string | null;
  // Metadata
  created_by: number | null;
  created_by_name?: string;
  notes: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledMessage {
  account_id: string;
  to_number: string;
  contact_name?: string;
  message_type?: ScheduledMessageType;
  message_text?: string;
  template_name?: string;
  template_language?: string;
  template_components?: unknown[];
  media_url?: string;
  buttons?: Array<{ id: string; title: string }>;
  content?: Record<string, unknown>;
  scheduled_at: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  source?: ScheduledMessageSource;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduledMessageStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  recurring?: number;
  scheduled_today?: number;
  sent_today?: number;
}

// Report Schedule types
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportType = 'messages' | 'orders' | 'conversations' | 'automation' | 'payments' | 'full';
export type ReportScheduleStatus = 'active' | 'paused' | 'disabled';

export interface ReportSchedule {
  id: string;
  name: string;
  description: string;
  report_type: ReportType;
  report_type_display: string;
  account: string | null;
  account_name: string;
  company: string | null;
  company_name: string;
  frequency: ReportFrequency;
  frequency_display: string;
  day_of_week: number;
  day_of_month: number;
  hour: number;
  timezone: string;
  recipients: string[];
  status: ReportScheduleStatus;
  status_display: string;
  last_run_at: string | null;
  next_run_at: string | null;
  last_error: string;
  run_count: number;
  created_by: number | null;
  created_by_name: string;
  include_charts: boolean;
  export_format: 'csv' | 'xlsx';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateReportSchedule {
  name: string;
  description?: string;
  report_type?: ReportType;
  account_id?: string | null;
  company_id?: string | null;
  frequency?: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  hour?: number;
  timezone?: string;
  recipients?: string[];
  include_charts?: boolean;
  export_format?: 'csv' | 'xlsx';
  settings?: Record<string, unknown>;
}

export type GeneratedReportStatus = 'generating' | 'completed' | 'failed';

export interface GeneratedReport {
  id: string;
  schedule: string | null;
  schedule_name: string;
  name: string;
  report_type: string;
  period_start: string;
  period_end: string;
  status: GeneratedReportStatus;
  status_display: string;
  file_path: string;
  file_size: number;
  file_format: string;
  records_count: number;
  generation_time_ms: number;
  error_message: string;
  email_sent: boolean;
  email_sent_at: string | null;
  email_recipients: string[];
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateReportRequest {
  report_type?: ReportType;
  period_start?: string;
  period_end?: string;
  account_id?: string | null;
  company_id?: string | null;
  recipients?: string[];
  export_format?: 'csv' | 'xlsx';
}

// Export types
export interface ExportParams {
  account_id?: string;
  company_id?: string;
  store?: string;
  start_date?: string;
  end_date?: string;
  format?: 'csv' | 'xlsx';
  status?: string;
  direction?: string;
  action_type?: string;
  is_error?: boolean;
  mode?: string;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  [key: string]: unknown;
}

export interface AutomationWebSocketEvent extends WebSocketEvent {
  type: 'session_created' | 'session_updated' | 'message_sent' | 'webhook_received' | 
        'automation_error' | 'stats_update' | 'scheduled_message_sent' | 'report_generated';
}

// Coupon types
export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  is_valid_now: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCoupon {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  is_active?: boolean;
  valid_from: string;
  valid_until: string;
}

export interface CouponStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  total_usage: number;
}

// Delivery Zone types
export interface DeliveryZone {
  id: string;
  name: string;
  distance_band?: string | null;
  distance_label?: string | null;
  min_km?: number | null;
  max_km?: number | null;
  delivery_fee: number;
  estimated_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryZone {
  name: string;
  distance_band: string;
  delivery_fee: number;
  estimated_days?: number;
  is_active?: boolean;
}

export interface DeliveryZoneStats {
  total: number;
  active: number;
  inactive: number;
  avg_fee: number;
  avg_days: number;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  image?: string | null;
  image_url?: string | null;
  category?: string | null;
  sku: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateProduct {
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  category?: string | null;
  sku: string;
  is_active?: boolean;
}

// Payment types
export interface Payment {
  id: string;
  order: string;
  gateway: string | null;
  payment_id: string;
  external_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  payment_method: string;
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  refunded_amount: number;
  payer_email: string;
  payer_name: string;
  payer_document: string;
  payment_url: string;
  qr_code: string;
  qr_code_base64: string;
  barcode: string;
  expires_at: string | null;
  paid_at: string | null;
  gateway_response: Record<string, unknown>;
  metadata: Record<string, unknown>;
  error_code: string;
  error_message: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface PaymentGateway {
  id: string;
  name: string;
  gateway_type: 'stripe' | 'mercadopago' | 'pagseguro' | 'pix' | 'custom';
  is_enabled: boolean;
  is_sandbox: boolean;
  endpoint_url: string;
  webhook_url: string;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}
