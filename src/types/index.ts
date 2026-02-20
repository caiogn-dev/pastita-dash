

// ============================================
// INTENT DETECTION TYPES (NOVO SISTEMA)
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
  by_type: Record<IntentType, number>;
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

export interface InteractiveMessage {
  type: 'buttons' | 'list';
  body: string;
  buttons?: InteractiveButton[];
  button?: string;  // Texto do botão para abrir lista
  sections?: InteractiveListSection[];
}

// ============================================
// AUTOMATION DASHBOARD TYPES
// ============================================

export interface AutomationStats {
  period: { start: string; end: string };
  summary: {
    total_messages_sent: number;
    total_automations_triggered: number;
    conversion_rate: number;
    revenue_from_automations: number;
  };
  by_event_type: Record<AutoMessageEventType, {
    sent: number;
    delivered: number;
    read: number;
    converted: number;
    conversion_rate: number;
  }>;
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
