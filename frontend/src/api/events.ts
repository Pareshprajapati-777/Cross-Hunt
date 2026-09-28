import { apiRequest } from './client';
import { EventPackage, EventOption, CharterShip } from './types';

export interface EventPackagesResponse {
  event_types: EventOption[];
  packages: EventPackage[];
  charter_ships: CharterShip[];
}

export async function getEventPackages(): Promise<EventPackagesResponse> {
  return apiRequest<EventPackagesResponse>('/api/events/packages/');
}
