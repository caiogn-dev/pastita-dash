// ============================================
// CORE TYPES
// ============================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: string;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser?: boolean;
  date_joined: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refresh: string;
}

// ============================================
// WHATSAPP TYPES
// ============================================

export interface WhatsAppAccount {
  id: string;
  name: string;
  phone_number: string;
  display_phone_number?: string;
  phone_number_id: string;
  app_id: string;
  business_account_id: string;
  waba_id?: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  webhook_url: string;
  token_version?: number;
  auto_response_enabled?: boolean;
  human_handoff_enabled?: boolean;
  default_agent?: string;
  default_agent_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsAppAccount {
  name: string;
  phone_number: string;
  app_id: string;
  business_account_id: string;
}

export interface Message {
  id: string;
  whatsapp_message_id: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive' | 'location' | 'contacts';
  text_body?: string;
  content?: string;
  media_url?: string;
  media_caption?: string;
  media_mime_type?: string;
  media_type?: string;
  media_sha256?: string;
  media_filename?: string;
  file_name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  timestamp: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  webhook_event?: string;
  conversation_id?: string;
  account: string;
  account_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  components: unknown[];
  status: string;
  account: string;
}

export interface SendTextMessage {
  to: string;
  body?: string;
  text?: string;
  preview_url?: boolean;
  account_id?: string;
}

export interface SendTemplateMessage {
  to: string;
  template_name: string;
  language_code: string;
  components?: unknown[];
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

export interface SendInteractiveButtons {
  to: string;
  body: string;
  buttons: InteractiveButton[];
  header?: { type: 'text' | 'image' | 'video' | 'document'; text?: string; url?: string };
  footer?: string;
}

export interface SendInteractiveList {
  to: string;
  body: string;
  button: string;
  sections: InteractiveListSection[];
  header?: { type: 'text'; text: string };
  footer?: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface Conversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  account: string;
  status: 'active' | 'archived' | 'blocked' | 'spam';
  mode?: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  labels: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationNote {
  id: string;
  conversation: string;
  content: string;
  created_by: User;
  created_at: string;
}

// ============================================
// ORDER TYPES
// ============================================

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total_price?: number;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  store: string;
  store_name?: string;
  source?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  shipping_address?: string;
  delivery_instructions?: string;
  items: OrderItem[];
  items_count: number;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  shipping_cost?: number;
  discount: number;
  total: number;
  status: 'pending' | 'processing' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'completed' | 'refunded' | 'failed' | 'paid';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'pix' | 'cash' | 'credit_card' | 'debit_card';
  pix_code?: string;
  pix_ticket_url?: string;
  payment_url?: string;
  payment_link?: string;
  init_point?: string;
  access_token?: string;
  payment_preference_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  events: OrderEvent[];
}

export interface CreateOrder {
  store: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  items: Array<{ product_id: string; quantity: number }>;
  payment_method: 'pix' | 'cash' | 'credit_card' | 'debit_card';
  notes?: string;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface Payment {
  id: string;
  order: string;
  gateway: string;
  external_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  paid_at?: string;
  refunded_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardOverview {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  conversion_rate: number;
  timestamp?: string;
  messages?: number;
  conversations?: number;
  orders?: number;
  agents?: number;
  accounts?: number;
  payments?: {
    total: number;
    pix: number;
    credit_card: number;
    debit_card: number;
    cash: number;
    pending?: number;
    completed_today?: number;
  };
  period_comparison: {
    revenue_change: number;
    orders_change: number;
    customers_change: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardCharts {
  sales_over_time: Array<{ date: string; amount: number; orders: number }>;
  orders_by_status: Record<string, number>;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  revenue_by_payment_method: Record<string, number>;
  orders_per_day?: Array<{ date: string; count: number }>;
  conversations_per_day?: Array<{ date: string; count: number }>;
  message_types?: Record<string, number>;
  order_statuses?: Record<string, number>;
}

// ============================================
// AUTOMATION TYPES
// ============================================

export interface AutoMessage {
  id: string;
  account: string;
  name: string;
  event_type: AutoMessageEventType;
  delay_minutes: number;
  message_text: string;
  message_type: 'text' | 'template' | 'interactive';
  template_name?: string;
  interactive_data?: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateCompanyProfile {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  welcome_message?: string;
  business_hours?: Record<string, { open: string; close: string }>;
  is_active?: boolean;
}

export interface AutomationSettings {
  cart_recovery: {
    enabled: boolean;
    reminder_30min: boolean;
    reminder_2h: boolean;
    reminder_24h: boolean;
    discount_code?: string;
  };
  payment_reminders: {
    enabled: boolean;
    reminder_30min: boolean;
    reminder_2h: boolean;
    auto_cancel_after_24h: boolean;
  };
  order_notifications: {
    enabled: boolean;
    on_confirmed: boolean;
    on_preparing: boolean;
    on_ready: boolean;
    on_out_for_delivery: boolean;
    on_delivered: boolean;
  };
  feedback_request: {
    enabled: boolean;
    delay_minutes: number;
  };
}

export interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  welcome_message?: string;
  business_hours?: Record<string, { open: string; close: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyProfile {
  name: string;
  slug?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  welcome_message?: string;
  business_hours?: Record<string, { open: string; close: string }>;
}

export type AutoMessageEventType =
  // Welcome & General
  | 'welcome'
  | 'menu'
  | 'business_hours'
  | 'out_of_hours'
  | 'faq'
  // Cart
  | 'cart_created'
  | 'cart_abandoned'
  | 'cart_reminder'
  | 'cart_reminder_30'
  | 'cart_reminder_2h'
  | 'cart_reminder_24h'
  // Payment
  | 'pix_generated'
  | 'pix_reminder'
  | 'pix_expired'
  | 'payment_reminder_1'
  | 'payment_reminder_2'
  | 'payment_confirmed'
  | 'payment_failed'
  // Order Status
  | 'order_received'
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready'
  | 'order_shipped'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  // Feedback & Support
  | 'feedback_request'
  | 'feedback_received'
  | 'human_handoff'
  | 'human_assigned'
  // Custom
  | 'custom';

export interface AutomationStats {
  period: { start: string; end: string };
  summary: {
    total_messages_sent: number;
    total_automations_triggered: number;
    conversion_rate: number;
    revenue_from_automations: number;
  };
  by_event_type: Partial<Record<AutoMessageEventType, {
    sent: number;
    delivered: number;
    read: number;
    converted: number;
    conversion_rate: number;
  }>>;
  cart_recovery: {
    abandoned_carts: number;
    reminders_sent: number;
    recovered: number;
    recovery_rate: number;
    revenue_recovered: number;
  };
  payment_reminders: {
    pending_payments: number;
    reminders_sent: number;
    paid_after_reminder: number;
    conversion_rate: number;
  };
}

export interface CreateAutoMessage {
  account: string;
  name: string;
  event_type: AutoMessageEventType;
  delay_minutes: number;
  message_text: string;
  message_type: 'text' | 'template' | 'interactive';
  template_name?: string;
  interactive_data?: unknown;
  is_active: boolean;
}

export interface CustomerSession {
  id: string;
  conversation: string;
  session_key: string;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  auto_message?: string;
  conversation: string;
  event_type: AutoMessageEventType;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduled_for?: string;
  sent_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CompanyProfileStats {
  total_conversations: number;
  total_messages: number;
  total_orders: number;
  total_revenue: number;
  avg_response_time: number;
  satisfaction_score?: number;
}

// ============================================
// INTENT DETECTION TYPES
// ============================================

export type IntentType =
  | 'greeting' | 'price_check' | 'business_hours' | 'delivery_info'
  | 'menu_request' | 'track_order' | 'payment_status' | 'location'
  | 'contact' | 'faq' | 'create_order' | 'cancel_order'
  | 'modify_order' | 'confirm_payment' | 'request_pix' | 'add_to_cart'
  | 'product_inquiry' | 'customization' | 'comparison' | 'recommendation'
  | 'complaint' | 'general_question' | 'unknown' | 'human_handoff';

export interface IntentDetectionResult {
  intent: IntentType;
  method: 'regex' | 'llm' | 'none';
  confidence: number;
  entities: Record<string, unknown>;
  original_message: string;
}

export interface IntentStats {
  total_detected: number;
  by_type: Partial<Record<IntentType, number>>;
  by_method: { regex: number; llm: number };
  avg_response_time_ms: number;
  top_intents: Array<{ intent: IntentType; count: number }>;
  period: { start: string; end: string };
}

export interface IntentLog {
  id: string;
  message_id: string;
  conversation_id: string;
  phone_number: string;
  message_text: string;
  intent_type: IntentType;
  method: 'regex' | 'llm' | 'none';
  confidence: number;
  handler_used: string;
  response_text: string;
  response_type: 'text' | 'buttons' | 'list' | 'interactive';
  processing_time_ms: number;
  created_at: string;
}

// ============================================
// INTERACTIVE MESSAGE TYPES
// ============================================

export interface InteractiveMessage {
  type: 'buttons' | 'list';
  body: string;
  buttons?: InteractiveButton[];
  button?: string;
  sections?: InteractiveListSection[];
}

// ============================================
// SCHEDULING TYPES
// ============================================

export interface ScheduledMessage {
  id: string;
  account: string;
  to_number: string;
  contact_name?: string;
  message_type: 'text' | 'template' | 'image' | 'document' | 'interactive';
  message_text?: string;
  template_name?: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledMessage {
  account: string;
  to_number: string;
  contact_name?: string;
  message_type: 'text' | 'template' | 'image' | 'document' | 'interactive';
  message_text?: string;
  template_name?: string;
  scheduled_for: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduledMessageStats {
  total_scheduled: number;
  total_sent: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
}

export interface ReportSchedule {
  id: string;
  name: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_recipients: string[];
  is_active: boolean;
  last_sent_at?: string;
  next_scheduled_at?: string;
  created_at: string;
}

export interface CreateReportSchedule {
  name: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_recipients: string[];
  store?: string;
}

export interface GeneratedReport {
  id: string;
  schedule?: string;
  report_type: string;
  period_start: string;
  period_end: string;
  file_url: string;
  file_size: number;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
}

export interface GenerateReportRequest {
  report_type: string;
  period_start: string;
  period_end: string;
  store?: string;
  format?: 'pdf' | 'csv' | 'xlsx';
}

// ============================================
// EXPORT TYPES
// ============================================

export interface ExportParams {
  model?: string;
  format?: 'csv' | 'json' | 'xlsx';
  store?: string;
  status?: string;
  filters?: Record<string, unknown>;
  fields?: string[];
}

// Alias for backward compatibility
export type AutomationLogStats = AutomationStats;
