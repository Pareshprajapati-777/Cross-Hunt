export interface PortInfo {
  id: string;
  name: string;
  officialTerminalName: string;
  address: string;
  gate: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  reportingAdvice: string;
  amenities: string[];
  parkingInfo: string;
}

// Comprehensive registry of major maritime ports & cruise terminals
export const PORT_REGISTRY: Record<string, PortInfo> = {
  mumbai_international: {
    id: 'mumbai_international',
    name: 'Mumbai International Cruise Terminal',
    officialTerminalName: 'Mumbai International Cruise Terminal (Green Gate)',
    address: 'Ballard Pier / Green Gate, Indira Dock, Fort, Mumbai, Maharashtra 400001, India',
    gate: 'Gate No. 3 (Passenger Cruise Terminal & Lounge)',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    lat: 18.9482,
    lng: 72.8465,
    reportingAdvice: 'Arrive 90-120 minutes prior to departure for luggage scanning and port security clearance.',
    amenities: ['Air-conditioned Passenger Lounge', 'Duty Free Shop', 'VIP Valet Parking', 'Prepaid Taxi Stand', 'Wheelchair Assistance'],
    parkingInfo: 'Dedicated multi-level cruise passenger parking available at Ballard Pier.',
  },
  mumbai_cruise_terminal: {
    id: 'mumbai_cruise_terminal',
    name: 'Mumbai Cruise Terminal',
    officialTerminalName: 'Mumbai Domestic Cruise Terminal (DCT), Ferry Wharf',
    address: 'Bhaucha Dhakka, Ferry Wharf, Dockyard Road, Mazgaon, Mumbai, Maharashtra 400009, India',
    gate: 'Main Boarding Terminal - Berth 1 & 2',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    lat: 18.9536,
    lng: 72.8489,
    reportingAdvice: 'Arrive 75 minutes before departure. Keep Digital Boarding Pass QR ready for gate access.',
    amenities: ['Passenger Concourse', 'Cafe & Refreshments', 'Taxi & Cab Drop-off Zone', 'Luggage Porter Service'],
    parkingInfo: 'Ferry Wharf municipal parking adjacent to terminal gate.',
  },
  gateway_of_india: {
    id: 'gateway_of_india',
    name: 'Gateway of India Pier 2',
    officialTerminalName: 'Gateway of India Yacht & Speedboat Jetty',
    address: 'Apollo Bandar, Colaba, Mumbai, Maharashtra 400001, India',
    gate: 'Jetty No. 2 (Opposite Taj Mahal Palace Hotel)',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    lat: 18.9220,
    lng: 72.8347,
    reportingAdvice: 'Arrive 30 minutes before boarding. Security clearance at police checkpoint Apollo Bunder.',
    amenities: ['Promenade Viewing Deck', 'Concierge Escort', 'VIP Boarding Tender'],
    parkingInfo: 'Pay & Park available near Regal Cinema and Colaba Causeway (5 min walk).',
  },
  goa_mormugao: {
    id: 'goa_mormugao',
    name: 'Mormugao Port Cruise Terminal, Goa',
    officialTerminalName: 'Mormugao Port International Cruise Terminal',
    address: 'Headland Sada, Mormugao, Vasco da Gama, Goa 403804, India',
    gate: 'Berth No. 10 - International Cruise Lounge',
    city: 'Vasco da Gama / Mormugao',
    state: 'Goa',
    country: 'India',
    lat: 15.4124,
    lng: 73.8016,
    reportingAdvice: 'Arrive 90 minutes before sailing. Port passes verified at Port Police Post.',
    amenities: ['Goa Tourism Information Kiosk', 'Currency Exchange', 'Air-Conditioned Waiting Hall', 'Licensed Tourist Taxis'],
    parkingInfo: 'Passenger parking available directly inside port security perimeter.',
  },
  panaji_santa_monica: {
    id: 'panaji_santa_monica',
    name: 'Santa Monica Jetty, Panaji',
    officialTerminalName: 'GTDC Santa Monica Tourism Jetty',
    address: 'Captain of Ports Jetty, Dayanand Bandodkar Marg, Panaji, Goa 403001, India',
    gate: 'Jetty 1 & 2 (Mandovi Riverfront)',
    city: 'Panaji',
    state: 'Goa',
    country: 'India',
    lat: 15.4989,
    lng: 73.8278,
    reportingAdvice: 'Arrive 30-45 minutes before cruise departure. Boarding queues form on riverside pier.',
    amenities: ['Riverfront Promenade', 'Ticket Verification Counter', 'Snack Bar & Refreshments', 'Live Music Welcome'],
    parkingInfo: 'Open public parking available along DB Marg promenade.',
  },
  panaji_patto: {
    id: 'panaji_patto',
    name: 'Patto Jetty, Panaji, Goa',
    officialTerminalName: 'Patto Bridge Marina Jetty',
    address: 'Near Patto Plaza, Ourem Creek, Panaji, Goa 403001, India',
    gate: 'Berth B (Patto Waterfront)',
    city: 'Panaji',
    state: 'Goa',
    country: 'India',
    lat: 15.4947,
    lng: 73.8340,
    reportingAdvice: 'Arrive 30 minutes before your scheduled charter start.',
    amenities: ['Marina Lounge', 'Direct Walkway to Patto Plaza', 'Cab Stand'],
    parkingInfo: 'Patto Plaza multi-level parking lot within 200m.',
  },
  goa_betim: {
    id: 'goa_betim',
    name: 'Betim Ferry Ramp, Bardez, Goa',
    officialTerminalName: 'Betim Riverside Passenger Jetty',
    address: 'Verem-Betim Road, Mandovi Riverbank, Bardez, Goa 403115, India',
    gate: 'Main Boarding Gangway',
    city: 'Bardez / Betim',
    state: 'Goa',
    country: 'India',
    lat: 15.5036,
    lng: 73.8242,
    reportingAdvice: 'Arrive 30 minutes before sailing.',
    amenities: ['Covered Passenger Pavilion', 'Riverside Deck'],
    parkingInfo: 'Roadside parking along Betim jetty road.',
  },
  cochin_cruise_berth: {
    id: 'cochin_cruise_berth',
    name: 'Cochin Cruise Berth, Willingdon Island, Kochi',
    officialTerminalName: 'Samudrika International Cruise Terminal',
    address: 'Cochin Port Authority, BTP Berth, Willingdon Island, Kochi, Kerala 682009, India',
    gate: 'Gate 1 - Samudrika Cruise Passenger Terminal',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    lat: 9.9678,
    lng: 76.2758,
    reportingAdvice: 'Arrive 90 minutes before embarkation for security checks.',
    amenities: ['Heritage Kerala Lounge', 'Ayurvedic Wellness Counter', 'Prepaid Taxi Counter', 'Wi-Fi Zone'],
    parkingInfo: 'Secure long-stay parking inside Cochin Port Authority complex.',
  },
  kochi_marine_drive: {
    id: 'kochi_marine_drive',
    name: 'Marine Drive Jetty, Kochi',
    officialTerminalName: 'KSINC Marine Drive Tourist Boat Jetty',
    address: 'Marine Drive Walkway, Shanmugham Road, Ernakulam, Kochi, Kerala 682011, India',
    gate: 'Rainbow Bridge Jetty Berth 2',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    lat: 9.9816,
    lng: 76.2753,
    reportingAdvice: 'Arrive 30-45 minutes before departure for scenic seating allocation.',
    amenities: ['Marine Walkway Promenade', 'Restrooms', 'Snack Kiosks', 'Tourist Information'],
    parkingInfo: 'GCDA Marine Drive parking ground right opposite the jetty.',
  },
  port_blair_haddo: {
    id: 'port_blair_haddo',
    name: 'Haddo Cruise Wharf, Port Blair',
    officialTerminalName: 'Haddo Deep Water Wharf & Passenger Terminal',
    address: 'Haddo Wharf, Port Blair, South Andaman, Andaman and Nicobar Islands 744102, India',
    gate: 'Passenger Embarkation Gate A',
    city: 'Port Blair',
    state: 'Andaman and Nicobar Islands',
    country: 'India',
    lat: 11.6743,
    lng: 92.7303,
    reportingAdvice: 'Arrive 2 hours prior to scheduled departure. Island permit & photo ID mandatory.',
    amenities: ['Covered Terminal Hall', 'Security Screening', 'Tuk-Tuk & Taxi Stand', 'Cafeteria'],
    parkingInfo: 'Designated parking outside Haddo Wharf gate.',
  },
  port_blair_phoenix: {
    id: 'port_blair_phoenix',
    name: 'Phoenix Bay Jetty, Port Blair',
    officialTerminalName: 'DSS Phoenix Bay Passenger Jetty',
    address: 'Marine Hill, Phoenix Bay, Port Blair, Andaman and Nicobar Islands 744101, India',
    gate: 'Jetty 1 & 2',
    city: 'Port Blair',
    state: 'Andaman and Nicobar Islands',
    country: 'India',
    lat: 11.6710,
    lng: 92.7380,
    reportingAdvice: 'Arrive 60 minutes before departure for boarding pass verification.',
    amenities: ['Waiting Lounge', 'Ticket Counters', 'Luggage Check'],
    parkingInfo: 'Open public parking near Marine Hill entrance.',
  },
  manhattan_cruise_terminal: {
    id: 'manhattan_cruise_terminal',
    name: 'Manhattan Cruise Terminal, Pier 88',
    officialTerminalName: 'Manhattan Cruise Terminal - Pier 88',
    address: '711 12th Avenue, Pier 88, New York, NY 10019, USA',
    gate: 'Level 2 Passenger Embarkation Concourse',
    city: 'New York',
    state: 'New York',
    country: 'USA',
    lat: 40.7678,
    lng: -73.9996,
    reportingAdvice: 'Arrive 2 hours before departure for customs and luggage drop.',
    amenities: ['Expedited Bag Drop', 'Rooftop Parking', 'VIP Check-in Lounge'],
    parkingInfo: 'Rooftop parking available directly on Pier 88/90.',
  },
  port_of_miami: {
    id: 'port_of_miami',
    name: 'Port of Miami, Terminal A',
    officialTerminalName: 'PortMiami Cruise Terminal A (Crown of Miami)',
    address: '2000 N Cruise Blvd, Miami, FL 33132, USA',
    gate: 'Main Embarkation Hall Gate 1',
    city: 'Miami',
    state: 'Florida',
    country: 'USA',
    lat: 25.7781,
    lng: -80.1783,
    reportingAdvice: 'Arrive during your assigned 30-minute arrival window.',
    amenities: ['Baggage Drop', 'Security Check', 'Terminal Lounge'],
    parkingInfo: 'Garage A located directly opposite Terminal A.',
  },
};

/**
 * Resolves detailed port info from any raw port name or route string.
 */
export function getPortDetails(
  departurePort: string = '',
  destination: string = '',
  location: string = ''
): PortInfo {
  const norm = (departurePort || location || '').toLowerCase().trim();

  // Try exact or substring key matches
  if (norm.includes('international') && norm.includes('mumbai')) {
    return PORT_REGISTRY.mumbai_international;
  }
  if (norm.includes('mumbai') && (norm.includes('cruise') || norm.includes('ferry') || norm.includes('dhakka') || norm.includes('dct'))) {
    return PORT_REGISTRY.mumbai_cruise_terminal;
  }
  if (norm.includes('gateway') || (norm.includes('colaba') && norm.includes('mumbai'))) {
    return PORT_REGISTRY.gateway_of_india;
  }
  if (norm.includes('mumbai') || norm.includes('munbai')) {
    return PORT_REGISTRY.mumbai_cruise_terminal;
  }

  if (norm.includes('mormugao') || (norm.includes('goa') && norm.includes('port'))) {
    return PORT_REGISTRY.goa_mormugao;
  }
  if (norm.includes('santa monica') || (norm.includes('mandovi') && norm.includes('panaji'))) {
    return PORT_REGISTRY.panaji_santa_monica;
  }
  if (norm.includes('patto')) {
    return PORT_REGISTRY.panaji_patto;
  }
  if (norm.includes('betim')) {
    return PORT_REGISTRY.goa_betim;
  }
  if (norm.includes('panaji') || (norm.includes('goa') && !norm.includes('mormugao'))) {
    return PORT_REGISTRY.panaji_santa_monica;
  }

  if (norm.includes('willingdon') || (norm.includes('cochin') && norm.includes('berth'))) {
    return PORT_REGISTRY.cochin_cruise_berth;
  }
  if (norm.includes('marine drive') || norm.includes('kochi') || norm.includes('ernakulam')) {
    return PORT_REGISTRY.kochi_marine_drive;
  }

  if (norm.includes('haddo')) {
    return PORT_REGISTRY.port_blair_haddo;
  }
  if (norm.includes('phoenix') || norm.includes('port blair') || norm.includes('andaman')) {
    return PORT_REGISTRY.port_blair_phoenix;
  }

  if (norm.includes('manhattan') || norm.includes('pier 88') || norm.includes('new york')) {
    return PORT_REGISTRY.manhattan_cruise_terminal;
  }
  if (norm.includes('miami')) {
    return PORT_REGISTRY.port_of_miami;
  }

  // Fallback dynamic port generator
  const cleanPort = departurePort || 'Passenger Cruise Terminal';
  const cleanCity = location || 'Coastal Port City';

  return {
    id: 'generic_port',
    name: cleanPort,
    officialTerminalName: `${cleanPort} Boarding Pier`,
    address: `${cleanPort}, ${cleanCity}, India`,
    gate: 'Passenger Cruise Terminal & Gate Security',
    city: cleanCity,
    state: '',
    country: 'India',
    lat: 18.9482,
    lng: 72.8465,
    reportingAdvice: 'Arrive 60-90 minutes prior to departure with your official Cruise Hunt Boarding Pass.',
    amenities: ['Boarding Concourse', 'Luggage Assistance', 'Tourist Help Desk'],
    parkingInfo: 'Terminal public & valet parking adjacent to the jetty.',
  };
}

/**
 * Haversine formula to compute distance in KM between two geographic coordinates.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Format distance and estimated driving duration into human readable text.
 */
export function formatDistanceAndDriving(distanceKm: number): {
  distanceStr: string;
  durationStr: string;
} {
  const distanceStr = `${distanceKm.toFixed(1)} km`;
  if (distanceKm <= 5) {
    return { distanceStr, durationStr: '~10–15 mins driving' };
  } else if (distanceKm <= 20) {
    const mins = Math.round((distanceKm / 30) * 60);
    return { distanceStr, durationStr: `~${mins} mins driving` };
  } else if (distanceKm <= 60) {
    const mins = Math.round((distanceKm / 40) * 60);
    return { distanceStr, durationStr: `~${mins} mins via highway` };
  } else {
    const hours = Math.floor(distanceKm / 60);
    const mins = Math.round(((distanceKm % 60) / 60) * 60);
    return {
      distanceStr,
      durationStr: `~${hours}h ${mins > 0 ? `${mins}m` : ''} road transit`,
    };
  }
}

/**
 * Builds Google Maps turn-by-turn live navigation URL with origin (user GPS) and destination.
 */
export function getGoogleMapsLiveRouteUrl(
  port: PortInfo,
  userLocation?: { lat: number; lng: number } | null
): string {
  const destinationQuery = `${port.officialTerminalName}, ${port.address}`;
  const originParam = userLocation
    ? `${userLocation.lat},${userLocation.lng}`
    : 'Current+Location';

  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    originParam
  )}&destination=${encodeURIComponent(
    destinationQuery
  )}&destination_place_id=&travelmode=driving`;
}

/**
 * Builds Apple Maps route URL.
 */
export function getAppleMapsLiveRouteUrl(
  port: PortInfo,
  userLocation?: { lat: number; lng: number } | null
): string {
  const saddr = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
  const daddr = `${port.lat},${port.lng}`;
  return `maps://maps.apple.com/?saddr=${encodeURIComponent(
    saddr
  )}&daddr=${encodeURIComponent(daddr)}&dirflg=d`;
}

/**
 * Builds Google Maps Embed iframe URL for visual port mapping.
 */
export function getGoogleMapsEmbedUrl(port: PortInfo): string {
  const query = `${port.officialTerminalName || port.name}, ${port.city}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(
    query
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}
