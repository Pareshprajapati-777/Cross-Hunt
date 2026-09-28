export type UserRole = 'USER' | 'CROSS_OWNER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  is_operator: boolean;
  is_admin: boolean;
}

export interface CabinTier {
  id: string;
  name: string;
  multiplier: number;
  description: string;
  price_per_day: number;
  amenities: string[];
}

export interface Review {
  id: number;
  user: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Cruise {
  id: number;
  title: string;
  slug: string;
  description: string;
  destination: string;
  route: string;
  departure_port: string;
  duration_days: number;
  decks_count: number;
  capacity: number;
  category: string;
  price_per_day: number;
  location: string;
  image: string;
  is_available: boolean;
  facilities: string[];
  itinerary: string[];
  dining_venues: string[];
  entertainment: string[];
  average_rating: number;
  review_count: number;
  owner_name?: string;
  cabins?: CabinTier[];
  reviews?: Review[];
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
  booking_type: 'CRUISE_TOUR' | 'PRIVATE_EVENT';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  cruise_id: number;
  cruise_title: string;
  cruise_slug: string;
  destination: string;
  departure_port: string;
  duration_days: number;
  cruise_image: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  passengers_count: number;
  cabin_type?: string;
  cabin_name?: string;
  event_type?: string;
  event_package?: string;
  total_price: number;
  qr_code_hash: string;
  created_at: string;
  special_requests?: string;
  review?: {
    rating: number;
    comment: string;
  } | null;
}
