export type IntentType =
  | "general_question"
  | "product_discovery"
  | "product_comparison"
  | "product_alternative"
  | "service_discovery"
  | "pricing_question"
  | "availability_question"
  | "policy_question"
  | "booking_request"
  | "quote_request"
  | "contact_request"
  | "lead_capture"
  | "cart_request"
  | "checkout_request"
  | "human_handoff"
  | "unknown";

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  available: boolean;
  rating?: string;
  url?: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  sourceUrl?: string;
}

export interface AssistantAction {
  type:
    | "open_product"
    | "add_to_cart"
    | "checkout"
    | "open_booking"
    | "open_whatsapp"
    | "call_business"
    | "capture_lead"
    | "handoff_to_human";
  target_id?: string;
  label: string;
  payload?: Record<string, unknown>;
}

export interface AIResponseMetadata {
  model?: string | null;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  latencyMs?: number;
  fallbackUsed?: boolean;
  requestId?: string;
  provider: string;
}

export interface AIResponsePayload {
  intent: IntentType;
  answer: string;
  citations: string[];
  actions: AssistantAction[];
  products?: CatalogItem[];
  needsHandoff: boolean;
  metadata?: AIResponseMetadata;
}
