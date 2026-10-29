import { Cruise, ActivityItem, Booking, CharterShip } from '../api/types';
import { apiRequest } from '../api/client';

const SHIPS_STORAGE_KEY = 'cruisehunt_custom_ships_v1';
const ACTIVITIES_STORAGE_KEY = 'cruisehunt_custom_activities_v1';
const BOOKINGS_STORAGE_KEY = 'cruisehunt_custom_bookings_v1';

// ============================================================================
// 1. SHIPS / VESSELS PERSISTENCE
// ============================================================================

/**
 * Get custom ships saved in localStorage
 */
export function getCustomShips(): Cruise[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(SHIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read custom ships from localStorage:', err);
    return [];
  }
}

/**
 * Save or update a custom ship in localStorage
 */
export function saveCustomShip(ship: Cruise): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getCustomShips();
    const filtered = existing.filter(
      (s) => s.id !== ship.id && s.name.trim().toLowerCase() !== ship.name.trim().toLowerCase()
    );
    const updated = [ship, ...filtered];
    localStorage.setItem(SHIPS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save custom ship to localStorage:', err);
  }
}

/**
 * Remove a custom ship from localStorage
 */
export function removeCustomShip(shipId: number | string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getCustomShips();
    const updated = existing.filter((s) => String(s.id) !== String(shipId));
    localStorage.setItem(SHIPS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to remove custom ship from localStorage:', err);
  }
}

/**
 * Merges API ships with locally persisted ships, guaranteeing zero-data-loss
 */
export function mergeWithCustomShips(apiShips: Cruise[]): Cruise[] {
  const custom = getCustomShips();
  if (!custom.length) return apiShips;

  const result = [...apiShips];
  for (const c of custom) {
    const index = result.findIndex(
      (s) => s.id === c.id || s.name.trim().toLowerCase() === c.name.trim().toLowerCase()
    );
    if (index >= 0) {
      result[index] = { ...result[index], ...c };
    } else {
      result.unshift(c);
    }
  }
  return result;
}

/**
 * Merges API charter ships for Private Events page with locally persisted ships
 */
export function mergeWithCustomCharterShips(apiCharterShips: CharterShip[]): CharterShip[] {
  const customShips = getCustomShips();
  if (!customShips.length) return apiCharterShips;

  const result: CharterShip[] = [...apiCharterShips];
  for (const cs of customShips) {
    const formatted: CharterShip = {
      id: Number(cs.id) || Date.now(),
      name: cs.name,
      slug: cs.slug || cs.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      category: (cs as any).vessel_type || cs.category || 'Motor Yacht',
      capacity: cs.capacity || 20,
      price: String(cs.price || 50000),
      location: cs.location || 'Goa',
      image: cs.image || (cs as any).image_url || '',
      departure_port: cs.departure_port || cs.location || 'Harbor Terminal',
      whatsapp_number: cs.whatsapp_number || '+919820012345',
      contact_number: cs.contact_number || '+919820012345',
      owner_name: cs.owner_name || (cs as any).management_name || 'Vessel Operator',
    };
    const index = result.findIndex(
      (s) => s.id === formatted.id || s.name.trim().toLowerCase() === formatted.name.trim().toLowerCase()
    );
    if (index >= 0) {
      result[index] = { ...result[index], ...formatted };
    } else {
      result.unshift(formatted);
    }
  }
  return result;
}

// ============================================================================
// 2. ACTIVITIES PERSISTENCE
// ============================================================================

/**
 * Get custom activities saved in localStorage
 */
export function getCustomActivities(): ActivityItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read custom activities from localStorage:', err);
    return [];
  }
}

/**
 * Save or update a custom activity in localStorage
 */
export function saveCustomActivity(act: ActivityItem): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getCustomActivities();
    const filtered = existing.filter(
      (a) => a.id !== act.id && a.title.trim().toLowerCase() !== act.title.trim().toLowerCase()
    );
    const updated = [act, ...filtered];
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save custom activity to localStorage:', err);
  }
}

/**
 * Remove a custom activity from localStorage
 */
export function removeCustomActivity(actId: number | string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getCustomActivities();
    const updated = existing.filter((a) => String(a.id) !== String(actId));
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to remove custom activity from localStorage:', err);
  }
}

/**
 * Merges API activities with locally persisted activities
 */
export function mergeWithCustomActivities(apiActivities: ActivityItem[]): ActivityItem[] {
  const custom = getCustomActivities();
  if (!custom.length) return apiActivities;

  const result = [...apiActivities];
  for (const c of custom) {
    const index = result.findIndex(
      (a) => a.id === c.id || a.title.trim().toLowerCase() === c.title.trim().toLowerCase()
    );
    if (index >= 0) {
      result[index] = { ...result[index], ...c };
    } else {
      result.unshift(c);
    }
  }
  return result;
}

// ============================================================================
// 3. BOOKINGS & TICKETS PERSISTENCE
// ============================================================================

/**
 * Get custom bookings saved in localStorage
 */
export function getCustomBookings(): Booking[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read custom bookings from localStorage:', err);
    return [];
  }
}

/**
 * Save or update a booking in localStorage
 */
export function saveCustomBooking(booking: Booking): void {
  if (typeof window === 'undefined' || !window.localStorage || !booking) return;
  try {
    const existing = getCustomBookings();
    const filtered = existing.filter(
      (b) => b.booking_id !== booking.booking_id && String(b.id) !== String(booking.id)
    );
    const updated = [booking, ...filtered];
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save custom booking to localStorage:', err);
  }
}

/**
 * Remove a booking from localStorage
 */
export function removeCustomBooking(bookingId: string | number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getCustomBookings();
    const updated = existing.filter(
      (b) => b.booking_id !== String(bookingId) && String(b.id) !== String(bookingId)
    );
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to remove custom booking from localStorage:', err);
  }
}

/**
 * Merges API bookings with locally persisted bookings, guaranteeing zero loss
 */
export function mergeWithCustomBookings(apiBookings: Booking[]): Booking[] {
  const custom = getCustomBookings();
  if (!custom.length) return apiBookings;

  const result = [...apiBookings];
  for (const c of custom) {
    const index = result.findIndex(
      (b) => b.booking_id === c.booking_id || String(b.id) === String(c.id)
    );
    if (index >= 0) {
      result[index] = { ...result[index], ...c };
    } else {
      result.unshift(c);
    }
  }
  return result;
}

// ============================================================================
// 4. BACKGROUND RE-SYNC WITH BACKEND
// ============================================================================

let isSyncing = false;
export async function syncCustomItemsToBackend(): Promise<void> {
  if (isSyncing || typeof window === 'undefined' || !navigator.onLine) return;
  isSyncing = true;

  try {
    // 1. Sync custom ships
    const customShips = getCustomShips();
    for (const ship of customShips) {
      if (typeof ship.id === 'number' && ship.id > 1000000000) {
        try {
          const res = await apiRequest('/api/operator/ships/', {
            method: 'POST',
            body: JSON.stringify({
              name: ship.name,
              category: (ship as any).vessel_type || ship.category || 'Motor Yacht',
              vessel_type: (ship as any).vessel_type || 'Motor Yacht',
              price: ship.price,
              capacity: ship.capacity,
              location: ship.location || 'Goa',
              departure_port: ship.departure_port || 'Mandovi Jetty Pier',
              destination: ship.destination || 'Goa & Arabian Sea',
              route: ship.route || 'Goa Coast',
              duration_days: ship.duration_days || 3,
              ship_length_meters: ship.ship_length_meters || 35,
              beam_meters: ship.beam_meters || 8,
              decks_count: ship.decks_count || 2,
              cabin_count: ship.cabin_count || 4,
              description: ship.description || '',
              image_url: ship.image || (ship as any).image_url || '',
              facilities: ship.facilities || ['Wi-Fi', 'Fine Dining', 'Sun Deck'],
            }),
          });
          if (res?.ship?.id) {
            removeCustomShip(ship.id);
            saveCustomShip(res.ship);
          }
        } catch {
          // Keep in localStorage for next retry
        }
      }
    }

    // 2. Sync custom activities
    const customActs = getCustomActivities();
    for (const act of customActs) {
      if (typeof act.id === 'number' && act.id > 1000000000) {
        try {
          const res = await apiRequest('/api/activities/', {
            method: 'POST',
            body: JSON.stringify({
              title: act.title,
              activity_type: act.activity_type,
              category_label: act.category_label,
              category_group: act.category_group || 'Water Sports',
              host_ship_id: act.host_ship_id || null,
              requires_boat: act.requires_boat,
              vessel_requirement_note: act.vessel_requirement_note,
              price: act.price,
              pricing_type: act.pricing_type,
              duration_minutes: act.duration_minutes,
              difficulty_level: act.difficulty_level || 'All Skill Levels',
              min_participants: act.min_participants || 1,
              capacity_per_slot: act.capacity_per_slot || 6,
              location: act.location,
              departure_port: act.departure_port,
              operating_hours: act.operating_hours,
              available_dates_summary: act.available_dates_summary,
              time_slots: act.time_slots || ['09:00 AM', '11:00 AM', '02:00 PM'],
              description: act.description,
              highlights: act.highlights || [],
              included_gear: act.included_gear || [],
              instructor_available: act.instructor_available,
              instructor_details: act.instructor_details,
              age_restrictions: act.age_restrictions,
              requirements: act.requirements,
              weather_conditions: act.weather_conditions,
              cancellation_policy: act.cancellation_policy,
              safety_guidelines: act.safety_guidelines,
              image: act.image,
              auto_confirm: act.auto_confirm !== false,
              is_active: act.is_active !== false,
            }),
          });
          if (res?.id) {
            removeCustomActivity(act.id);
            saveCustomActivity(res);
          }
        } catch {
          // Keep in localStorage for next retry
        }
      }
    }
  } catch (err) {
    console.warn('Background sync error:', err);
  } finally {
    isSyncing = false;
  }
}
