# PRODUCT.md — Cruise Hunt Product Specification

## 1. Product Mission & Identity
**Cruise Hunt** (Cross Hunt Fleet) is a luxury, cinematic Cruise Ship Tour, Travel Ticket, and Private Maritime Event Booking Platform.

The platform unites two premier maritime offerings:
1. **Cruise Tour & Travel Tickets**:
   - Voyage discovery across global ocean destinations (Caribbean, Mediterranean, Nordic Fjords, Alaska, Polynesian Isles, Greek Isles).
   - Multi-day itineraries with port-of-call stops, arrival/departure schedules, and excursions.
   - Stateroom & Cabin selection:
     - *Grand Presidential Ocean Suite* (Private veranda, butler service, jacuzzi)
     - *Royal Panoramic Balcony* (Floor-to-ceiling glass, private deck)
     - *Deluxe Oceanview Stateroom* (Oversized ocean view portal)
     - *Signature Interior Stateroom* (Spacious, ambient soundproof retreat)
   - Passenger party configuration (Adults, Children).
   - Real-time server-side fare calculation and authenticated digital ticket issuance with verifiable pass barcodes/QR hashes.

2. **Private Maritime Events at Sea**:
   - Chartering and private venue bookings for extraordinary milestones:
     - Weddings & Vow Renewals at Sea
     - Milestone Birthday & Anniversary Celebrations
     - Corporate Leadership Summits & Conferences
     - Private Gala Dinners & Cocktail Soirees
     - VIP Brand Activations & Executive Retreats
   - Configurable event packages (*Sapphire Anchor*, *Emerald Wave*, *Diamond Horizon*).
   - Service specifications (Banquet Catering, Open Bar, Audio/Visual Rigs, Aerial Drone Video, Themed Floral Decor).
   - Structured operator confirmation & inquiry workflow.

---

## 2. User Roles & Ecosystem

| Role | Persona | Primary Goals & Conversions |
| :--- | :--- | :--- |
| **Guest / Traveler** (`USER`) | Ocean adventurer, couple, family, or event planner | Discover voyage $\rightarrow$ explore ship amenities $\rightarrow$ select departure & cabin $\rightarrow$ book $\rightarrow$ receive authenticated pass $\rightarrow$ manage trip $\rightarrow$ leave verified review. |
| **Ship Operator** (`CROSS_OWNER`) | Cruise line operator, vessel captain, event coordinator | Manage fleet vessels $\rightarrow$ define itineraries, stateroom tiers, and event packages $\rightarrow$ review, accept, or reject incoming reservations $\rightarrow$ track vessel earnings. |
| **System Admin** (`ADMIN`) | Platform executive / operations controller | Supervise all vessels, manage operators, govern user accounts, inspect global bookings, audit revenue metrics, and maintain platform integrity. |

---

## 3. Core Business & Booking Rules

1. **Conflict & Double-Booking Prevention**:
   - No ship or private venue can be booked for conflicting dates and overlapping times.
   - Database transactions (`select_for_update`) ensure zero race condition double bookings.
2. **Server-Side Financial Integrity**:
   - Tour pricing: $\text{Total} = (\text{Base Fare} \times \text{Duration Days/Hours} \times \text{Cabin Multiplier}) \times \text{Passengers}$.
   - Event pricing: $\text{Total} = \text{Base Charter} + \text{Package Fee} + (\text{Per-Guest Catering} \times \text{Guests})$.
   - Frontend values are strictly treated as visual estimates; the backend recalculates and certifies the final charge.
3. **Cancellations & Tickets**:
   - Bookings remain cancellable up to 24 hours prior to departure.
   - Status transitions follow strict state flow: `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `COMPLETED` (or `CANCELLED` / `REJECTED`).
   - Only guests with `COMPLETED` voyages can submit 1–5 star reviews.
