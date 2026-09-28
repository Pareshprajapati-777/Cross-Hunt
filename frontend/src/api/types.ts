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

export interface Cruise {
  id: number;
  title: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  destination: string;
  route: string;
  departure_port: string;
  location: string;
  address?: string;
  price: number;
  price_per_day: number;
  capacity: number;
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
  cabins?: CabinTier[];
  cabin_tiers?: CabinTier[];
  reviews?: Review[];
  extras?: ShipExtra[];
  upcoming_tours?: PublicTour[];
  supports_private_charter?: boolean;
  supports_public_tours?: boolean;
  supports_weddings?: boolean;
  supports_birthdays?: boolean;
  supports_corporate?: boolean;
  supports_conferences?: boolean;
  supports_parties?: boolean;
  supports_dinners?: boolean;
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
  departure_port: string;
  destination: string;
  departure_date: string;
  departure_date_formatted: string;
  departure_time: string;
  return_date: string;
  return_date_formatted: string;
  return_time: string;
  duration_days: number;
  total_capacity: number;
  booked_capacity: number;
  remaining_capacity: number;
  adult_price: number;
  child_price: number;
  itinerary: string;
  itinerary_highlights: string[];
  ports_of_call: string;
  meals_included: string;
  status: string;
  is_published: boolean;
  is_bookable: boolean;
  ship?: Cruise;
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
  cruise_image: string;
  booking_date: string;
  booking_date_formatted?: string;
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
  operator_name?: string;
  public_tour_id?: number | null;
  public_tour_title?: string | null;
  review?: {
    rating: number;
    comment: string;
  } | null;
}
