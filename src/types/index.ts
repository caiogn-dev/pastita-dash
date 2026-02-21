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
  user_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
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
  status: 'active' | 'archived' | 'blocked' | 'spam' | 'open' | 'pending';
  mode?: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  labels: string[];
  tags?: string[];
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
  messages?: number | { today: number; by_status: Record<string, number> };
  conversations?: number | { active: number; new: number; resolved: number };
  orders?: number | { today: number; revenue_today: number };
  agents?: number;
  accounts?: number | { active: number; total: number };
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
  interactions_today?: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardCharts {
  sales_over_time: Array<{ date: string; amount: number; orders: number; revenue?: number; new?: number; resolved?: number }>;
  orders_by_status: Record<string, number>;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  revenue_by_payment_method: Record<string, number>;
  orders_per_day?: Array<{ date: string; count: number }>;
  conversations_per_day?: Array<{ date: string; count: number }>;
  messages_per_day?: Array<{ date: string; count: number; incoming?: number; outgoing?: number }>;
  message_types?: Record<string, number>;
  order_statuses?: Record<string, number>;
}

// ============================================
// AUTOMATION TYPES
// ============================================

export interface AutoMessage {
  id: string;
  account: string;
  company_id?: string;
  name: string;
  event_type: AutoMessageEventType;
  delay_minutes?: number;
  delay_seconds?: number;
  priority?: number;
  message_text: string;
  message_type: 'text' | 'template' | 'interactive';
  template_name?: string;
  interactive_data?: unknown;
  media_url?: string;
  media_type?: string;
  buttons?: Array<{ id: string; title: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessHours = Record<string, { open: boolean; start?: string; end?: string }>;

export interface UpdateCompanyProfile {
  name?: string;
  company_name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  welcome_message?: string;
  business_hours?: BusinessHours;
  is_active?: boolean;
  // Additional automation fields
  business_type?: string;
  website_url?: string;
  menu_url?: string;
  order_url?: string;
  auto_reply_enabled?: boolean;
  welcome_message_enabled?: boolean;
  menu_auto_send?: boolean;
  abandoned_cart_notification?: boolean;
  abandoned_cart_delay_minutes?: number;
  pix_notification_enabled?: boolean;
  payment_confirmation_enabled?: boolean;
  order_status_notification_enabled?: boolean;
  delivery_notification_enabled?: boolean;
  use_ai_agent?: boolean;
  default_agent?: string | null;
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
  company_name?: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  welcome_message?: string;
  business_hours?: BusinessHours;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Account and API fields
  account_phone?: string;
  external_api_key?: string;
  webhook_secret?: string;
  // Business info
  business_type?: string;
  website_url?: string;
  menu_url?: string;
  order_url?: string;
  // Automation settings
  auto_reply_enabled?: boolean;
  welcome_message_enabled?: boolean;
  menu_auto_send?: boolean;
  abandoned_cart_notification?: boolean;
  abandoned_cart_delay_minutes?: number;
  pix_notification_enabled?: boolean;
  payment_confirmation_enabled?: boolean;
  order_status_notification_enabled?: boolean;
  delivery_notification_enabled?: boolean;
  use_ai_agent?: boolean;
  default_agent?: string;
}

export interface CreateCompanyProfile {
  name: string;
  slug?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  welcome_message?: string;
  business_hours?: BusinessHours;
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
  // Additional fields for log stats
  total?: number;
  today?: number;
  this_week?: number;
  error_rate?: number;
  by_action_type?: Array<{ action_type: string; count: number }>;
  by_day?: Array<{ date: string; count: number }>;
}

export interface CreateAutoMessage {
  account: string;
  company_id?: string;
  name: string;
  event_type: AutoMessageEventType;
  delay_minutes?: number;
  delay_seconds?: number;
  priority?: number;
  message_text: string;
  message_type: 'text' | 'template' | 'interactive';
  template_name?: string;
  interactive_data?: unknown;
  media_url?: string;
  media_type?: string;
  buttons?: Array<{ id: string; title: string }>;
  is_active: boolean;
}

export type SessionStatus =
  | 'active'
  | 'cart_created'
  | 'cart_abandoned'
  | 'checkout'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'order_placed'
  | 'completed'
  | 'expired';

export interface CustomerSession {
  id: string;
  conversation: string;
  session_key: string;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Additional fields
  status: SessionStatus;
  customer_name?: string;
  phone_number?: string;
  customer_email?: string;
  company_name?: string;
  cart_items_count?: number;
  cart_total?: number;
  cart_created_at?: string;
  pix_code?: string;
  pix_expires_at?: string;
  notifications_sent?: Array<{ type: string; sent_at: string }>;
  session_id?: string;
  external_customer_id?: string;
  external_order_id?: string;
  last_activity_at?: string;
}

export interface AutomationLog {
  id: string;
  auto_message?: string;
  company_name?: string;
  conversation: string;
  event_type: AutoMessageEventType;
  action_type: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduled_for?: string;
  sent_at?: string;
  phone_number?: string;
  description?: string;
  is_error?: boolean;
  request_data?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
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
  account_name?: string;
  to_number: string;
  contact_name?: string;
  message_type: 'text' | 'template' | 'image' | 'document' | 'interactive';
  message_text?: string;
  template_name?: string;
  scheduled_for: string;
  scheduled_at?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  status_display?: string;
  sent_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledMessage {
  account: string;
  account_id?: string;
  to_number: string;
  contact_name?: string;
  message_type: 'text' | 'template' | 'image' | 'document' | 'interactive';
  message_text?: string;
  template_name?: string;
  scheduled_for: string;
  scheduled_at?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduledMessageStats {
  total_scheduled: number;
  total_sent: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
  // Additional fields
  total?: number;
  pending?: number;
  sent?: number;
  failed?: number;
  cancelled?: number;
  scheduled_today?: number;
  sent_today?: number;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_recipients: string[];
  recipients?: string[];
  is_active: boolean;
  status?: 'active' | 'paused' | 'disabled';
  status_display?: string;
  day_of_week?: number;
  day_of_month?: number;
  hour?: number;
  last_sent_at?: string;
  next_scheduled_at?: string;
  next_run_at?: string;
  last_error?: string;
  created_at: string;
}

export interface CreateReportSchedule {
  name: string;
  description?: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_recipients: string[];
  recipients?: string[];
  store?: string;
  day_of_week?: number;
  day_of_month?: number;
  hour?: number;
  start_date?: string;
  end_date?: string;
  filters?: Record<string, unknown>;
  export_format?: 'csv' | 'xlsx';
}

export interface GeneratedReport {
  id: string;
  name?: string;
  schedule?: string;
  report_type: string;
  file_format?: string;
  period_start: string;
  period_end: string;
  file_url: string;
  file_size: number;
  status: 'generating' | 'completed' | 'failed';
  status_display?: string;
  records_count?: number;
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
  mode?: string;
  filters?: Record<string, unknown>;
  fields?: string[];
}

// Alias for backward compatibility
export type AutomationLogStats = AutomationStats;
