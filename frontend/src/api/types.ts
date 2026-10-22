export type UserRole = 'USER' | 'OWNER' | 'CROSS_OWNER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  phone_number?: string;
  address?: string;
  is_operator: boolean;
  is_owner?: boolean;
  is_admin: boolean;
  is_approved_owner?: boolean;
}

export interface CabinTier {
  id: string;
  name: string;
  multiplier: number;
  description?: string;
  price_per_day?: number;
  price_per_night?: number;
  size?: string;
  features?: string[];
  capacity?: number;
  available?: boolean;
  amenities?: string[];
}

export interface Review {
  id: number;
  author?: string;
  user?: string;
  rating: number;
  comment: string;
  date?: string;
  created_at?: string;
}

export interface ShipExtra {
  id: number;
  name: string;
  description: string;
  price: number;
  pricing_mode: 'FIXED' | 'PER_GUEST';
  is_available: boolean;
}

export interface PrivateCharterRate {
  id: number;
  duration: string;
  price: number | null;
  currency: string;
  price_unit: string;
  is_quote_based: boolean;
  formatted_display: string;
  minimum_guests: number;
  maximum_guests: number | null;
  included: string;
  extra_charges: string;
  validity: string;
  source: string;
}

export interface TourFare {
  id: number;
  cabin_type: string;
  price: number | null;
  currency: string;
  price_unit: string;
  taxes: string;
  validity: string;
  source: string;
}

export interface OperatorSummary {
  id: number;
  name: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  booking_url: string;
  office_address: string;
  verified: boolean;
  source_checked: boolean;
  vessels_count: number;
  routes_count: number;
  vessels?: Array<{
    id: number;
    name: string;
    slug: string;
    category: string;
    capacity: number;
    display_capacity_text: string;
    price: number;
    price_unit: string;
    formatted_price_basis: string;
    is_quote_based: boolean;
    source_url: string;
    verified: boolean;
    active: boolean;
  }>;
}

export interface Cruise {
  id: number;
  title: string;
  name: string;
  slug: string;
  category: string;
  vessel_category?: string;
  listing_type?: 'PRIVATE_CHARTER' | 'PUBLIC_CRUISE' | 'BOTH';
  description: string;
  destination: string;
  route: string;
  departure_port: string;
  location: string;
  address?: string;
  price: number;
  price_per_day: number;
  price_unit?: string;
  is_quote_based?: boolean;
  duration_display?: string;
  formatted_price_basis?: string;
  capacity: number;
  capacity_note?: string;
  has_unknown_capacity?: boolean;
  display_capacity_text?: string;
  tax_note?: string;
  permit_note?: string;
  fuel_surcharge_note?: string;
  included?: string;
  extra_charges?: string;
  source_url?: string;
  source_checked?: boolean;
  last_verified_at?: string;
  availability_status?: string;
  operational_status?: 'AVAILABLE' | 'BOOKED' | 'ON_TOUR' | 'MAINTENANCE';
  duration_days: number;
  ship_length_meters?: number;
  beam_meters?: number;
  decks_count?: number;
  cabin_count?: number;
  image: string;
  image_url?: string;
  display_image_url?: string;
  is_available: boolean;
  is_active?: boolean;
  is_approved?: boolean;
  facilities: string[];
  rules?: string;
  cancellation_policy?: string;
  itinerary?: string[];
  itinerary_timeline?: string[];
  dining_venues?: string[];
  dining_venues_list?: string[];
  entertainment?: string[];
  entertainment_list?: string[];
  average_rating: number;
  review_count: number;
  operator_name?: string;
  operator_id?: number;
  operator_phone?: string;
  operator_email?: string;
  operator_website?: string;
  operator_booking_url?: string;
  whatsapp_number?: string;
  contact_number?: string;
  management_type?: 'OPERATOR' | 'OWNER' | 'PLATFORM';
  management_name?: string;
  is_whatsapp_available?: boolean;
  vessel_model?: string;
  ac_status?: string;
  food_service?: string;
  dj_music?: boolean;
  decoration_service?: boolean;
  photography_service?: boolean;
  water_sports?: boolean;
  extra_services?: string;
  is_external_operator?: boolean;
  source_price?: number;
  valid_from?: string;
  valid_to?: string;
  price_review_flag?: boolean;
  price_review_reason?: string;
  cabins?: CabinTier[];
  cabin_tiers?: CabinTier[];
  reviews?: Review[];
  extras?: ShipExtra[];
  charter_rates?: PrivateCharterRate[];
  upcoming_tours?: PublicTour[];
  supports_private_charter?: boolean;
  supports_public_tours?: boolean;
  supports_weddings?: boolean;
  supports_birthdays?: boolean;
  supports_corporate?: boolean;
  supports_conferences?: boolean;
  supports_parties?: boolean;
  supports_dinners?: boolean;
  gallery_images?: string[];
  maintenance_periods?: Array<{ start_date: string; end_date: string; reason: string }>;
}

export interface TicketVerification {
  valid: boolean;
  status: 'VALID' | 'USED' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | 'INVALID';
  status_display: string;
  booking_id: string;
  ticket_id: string;
  verification_code: string;
  passenger_name: string;
  passenger_email?: string;
  passenger_phone?: string;
  passengers_count: number;
  adults_count: number;
  children_count: number;
  ship_name: string;
  operator_name: string;
  route: string;
  departure_port: string;
  destination: string;
  departure_date: string;
  departure_date_formatted: string;
  departure_time: string;
  cabin_seat: string;
  booking_type: string;
  total_price: number;
  tracking_status?: string;
  can_mark_used: boolean;
  message?: string;
  booking?: Booking;
  duration_days?: number;
  duration_display?: string;
}

export interface PublicTour {
  id: number;
  tour_title: string;
  title: string;
  slug: string;
  ship_id: number;
  ship_name: string;
  ship_slug: string;
  ship_image: string;
  tour_image?: string;
  image_url?: string;
  operator_name?: string;
  operator_id?: number;
  departure_port: string;
  destination: string;
  departure_date: string;
  departure_date_formatted: string;
  departure_time: string;
  return_date: string;
  return_date_formatted: string;
  return_time: string;
  duration_days: number;
  duration_display?: string;
  total_capacity: number;
  booked_capacity: number;
  remaining_capacity: number;
  adult_price: number;
  child_price: number;
  price_unit?: string;
  is_live_pricing?: boolean;
  itinerary: string;
  itinerary_highlights: string[];
  ports_of_call: string;
  meals_included: string;
  tax_note?: string;
  source_url?: string;
  source_checked?: boolean;
  last_verified_at?: string;
  status: string;
  is_published: boolean;
  is_bookable: boolean;
  ship?: Cruise;
  fares?: TourFare[];
  cabins?: Array<{
    id: number;
    name: string;
    description: string;
    price_per_person: number;
    total_capacity: number;
    booked_capacity: number;
    remaining_capacity: number;
  }>;
}

export interface Offer {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_booking_amount: number;
  max_discount_amount: number | null;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceData {
  invoice_number: string;
  booking_id: string;
  issue_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  operator_name: string;
  operator_company: string;
  ship_name: string;
  departure_port: string;
  destination: string;
  booking_date: string;
  duration: string;
  currency: string;
  currency_symbol: string;
  line_items: InvoiceItem[];
  subtotal: number;
  extras_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
  status: string;
  payment_status: string;
}

export interface EventPackage {
  id: string;
  tier: string;
  base_fee: number;
  per_guest_fee: number;
  highlights: string[];
  recommended_for: string;
}

export interface EventOption {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export interface CharterShip {
  id: number;
  name: string;
  slug: string;
  category: string;
  capacity: number;
  price: string;
  location: string;
  image?: string;
}

export interface Booking {
  id: number;
  booking_id: string;
  invoice_number?: string;
  booking_type: 'TOUR' | 'EVENT' | 'CRUISE_TOUR' | 'PRIVATE_EVENT';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
  tracking_status?: string;
  cruise_id: number;
  cruise_name: string;
  cruise_title: string;
  cruise_slug: string;
  destination: string;
  departure_port: string;
  route?: string;
  duration_days: number;
  duration_hours?: number;
  duration_display?: string;
  cruise_image: string;
  booking_date: string;
  booking_date_formatted?: string;
  return_date?: string;
  return_date_formatted?: string;
  start_time: string;
  end_time: string;
  passengers_count: number;
  number_of_people: number;
  adults_count?: number;
  children_count?: number;
  cabin_type?: string;
  cabin_name?: string;
  event_type?: string;
  event_package?: string;
  selected_extras?: Array<{ name: string; price: number; mode: string; calculated_cost?: number }>;
  promo_code?: string;
  base_price: number;
  subtotal: number;
  extras_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_price: number;
  qr_code_hash: string;
  created_at: string;
  special_requests?: string;
  special_request?: string;
  cancellation_reason?: string;
  is_cancellable?: boolean;
  can_review?: boolean;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_whatsapp?: string;
  customer_whatsapp_masked?: string;
  whatsapp_reminder_opt_in?: boolean;
  whatsapp_reminder_sent?: boolean;
  whatsapp_reminder_sent_at?: string | null;
  whatsapp_reminder_status?: 'SCHEDULED' | 'SENT' | 'FAILED' | 'OPTED_OUT';
  whatsapp_reminder_message_id?: string;
  whatsapp_reminder_error?: string;
  operator_name?: string;
  public_tour_id?: number | null;
  public_tour_title?: string | null;
  ticket_code?: string;
  ticket_status?: 'VALID' | 'USED' | 'CANCELLED' | 'EXPIRED';
  owner_payout_amount?: number;
  platform_commission_amount?: number;
  net_platform_profit?: number;
  review?: {
    rating: number;
    comment: string;
  } | null;
}

export interface WhatsAppLog {
  id: number;
  booking_id?: string;
  recipient: string;
  recipient_masked?: string;
  customer_name: string;
  message_type: string;
  message_body: string;
  provider: string;
  provider_message_id: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  error_message?: string;
  created_at: string;
}

export interface WhatsAppConfig {
  configured_hours: number;
  provider: string;
  is_live_configured: boolean;
  has_api_token?: boolean;
  masked_token?: string;
  phone_number_id?: string;
  business_account_id?: string;
  total_scheduled: number;
  total_sent: number;
  total_failed: number;
  total_opted_out: number;
}

export interface WhatsAppQueueItem {
  booking_id: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_whatsapp_masked?: string;
  vessel_or_tour: string;
  departure_date: string;
  departure_time: string;
  opt_in: boolean;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'OPTED_OUT';
  sent: boolean;
  sent_at?: string | null;
  in_window: boolean;
  wa_link?: string;
  message_preview?: string;
}

export interface WhatsAppCredentialsPayload {
  api_token: string;
  phone_number_id: string;
  business_account_id?: string;
}

export interface WhatsAppConnectionTestResult {
  success: boolean;
  is_live: boolean;
  message: string;
  details?: any;
}

