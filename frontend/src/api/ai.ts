import { apiRequest } from './client';

export interface AiAction {
  label: string;
  url: string;
  type?: 'navigate' | 'action';
  variant?: 'primary' | 'outline' | 'ghost';
}

export interface AiChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  actions?: AiAction[];
  data?: any;
  isStreaming?: boolean;
}

export interface AiChatResponse {
  success: boolean;
  reply: string;
  actions: AiAction[];
  data?: any;
}

export interface AiSuggestion {
  id: string;
  label: string;
  query: string;
}

export interface AiSuggestionsResponse {
  success: boolean;
  is_authenticated: boolean;
  suggestions: AiSuggestion[];
}

export interface TicketLookupResponse {
  success: boolean;
  ticket?: {
    booking_id: string;
    ticket_code: string;
    passenger_name: string;
    passenger_email: string;
    ship_name: string;
    ship_slug: string;
    ship_category: string;
    operator_name: string;
    booking_type: string;
    route: string;
    departure_port: string;
    destination: string;
    departure_date: string;
    departure_time: string;
    cabin_seat: string;
    total_passengers: number;
    adults_count: number;
    children_count: number;
    extras: string[];
    total_price_inr: number;
    booking_status: string;
    ticket_status: string;
    tracking_status: string;
    is_used: boolean;
  };
  actions?: AiAction[];
  error?: string;
  message?: string;
  requires_login?: boolean;
}

export async function sendAiChatMessage(
  messages: { role: string; content: string }[],
  currentPath: string = window.location.pathname
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/api/ai/chat/', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      current_path: currentPath,
    }),
  });
}

export async function lookupTicketWithAi(code: string): Promise<TicketLookupResponse> {
  return apiRequest<TicketLookupResponse>('/api/ai/ticket-lookup/', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getAiSuggestions(): Promise<AiSuggestionsResponse> {
  return apiRequest<AiSuggestionsResponse>('/api/ai/suggestions/');
}
