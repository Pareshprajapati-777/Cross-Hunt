# Cross Hunt — Luxury Cruise Ship & Private Maritime Event Platform

A high-end, cinematic **Cruise Ship Tour + Travel Ticket + Private Maritime Event Booking Platform** built with a preserved **Python / Django / SQLite** backend and a modern **React + TypeScript + Vite + Three.js** frontend.

---

## 1. Product Definition

**Cross Hunt** is a dedicated maritime vessel reservation platform engineered for two primary booking products:

### A. Cruise Tour / Travel Tickets
- **Discover Flagship Ships**: Explore liners, expedition vessels, and island hoppers with rich specs (length, decks, passenger capacities).
- **Global Destinations**: Caribbean Seas, Greek Isles, Norwegian Arctic Fjords, French Riviera, South Pacific, Alaska Glacier Bay.
- **Day-by-Day Itineraries**: Interactive visual timeline with ports of call and dining/entertainment highlights.
- **Stateroom & Cabin Tiers**: Select between Presidential Sea Suite (with private veranda & butler), Royal Ocean Balcony, Premium Oceanview, or Deluxe Interior Haven.
- **Server-Side Financial Accuracy**: Server recalculates rates dynamically based on stateroom tier multipliers, passenger count, and voyage duration.
- **Digital Maritime Boarding Pass**: Printable ticket pass equipped with tamper-evident cryptographic QR verification hash and terminal security barcode.

### B. Private Maritime Charters & Events
- **Host Your Moment at Sea**: Private ocean celebrations including Weddings, Milestone Birthdays, Corporate Summits, Board Meetings, Conferences, and Black-Tie Dinner Galas.
- **Three Curated Packages**:
  1. *Diamond Horizon (Ultra-Luxury)*: Top-deck charter, 5-course plated dinner, open bar, drone videography, butler team.
  2. *Emerald Wave (Executive Class)*: Panorama salon, gourmet buffet, live acoustic duo, ambient uplighting.
  3. *Sapphire Anchor (Signature)*: Sunset terrace, welcome punch bar, charcuterie stations, voyage coordinator.
- **Vessel Matching**: Capacity-aware charter selection from 10 to 2,400 attendees.

---

## 2. Technology Architecture

### Backend (Preserved Source of Truth)
- **Framework**: Python 3.10+ / Django 6.0 / Django ORM
- **Database**: SQLite3 (`db.sqlite3`) with zero external service dependencies
- **Concurrency & Security**: `select_for_update()` and `transaction.atomic()` anti-double booking locks
- **CORS & Credentials**: `django-cors-headers` configured for seamless Vite development with session cookies
- **RESTful API**: Centralized endpoints at `/api/` (Auth, Cruises, Events, Bookings, Dashboards)

### Frontend (Cinematic Luxury React App)
- **Core**: React 19, TypeScript, Vite 8, Tailwind CSS v4
- **3D Oceanic Graphics**: Three.js WebGL canvas (`OceanHeroScene.tsx`) featuring real-time undulating ocean waves, stylized floating multi-tier cruise liner geometry, and smooth mouse parallax. Graceful 2D/low-power fallback for mobile.
- **Aesthetic Surfaces**: Selective liquid glass docks, blurred navigational panels, and high-contrast typography following `DESIGN.md`.
- **Iconography**: Lucide React
- **Celebrations**: Canvas Confetti on reservation confirmation

---

## 3. Design System & Product Truth

- Detailed design tokens, Emil Kowalski animation timings, typography pairings ('Outfit' + 'Plus Jakarta Sans'), and accessibility guidelines are documented in [`DESIGN.md`](./DESIGN.md).
- User personas, conversion journeys, anti-double booking rules, and database schema mappings are documented in [`PRODUCT.md`](./PRODUCT.md).

---

## 4. Default Seed & Test Accounts

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Guest Traveler** | `user1` | `User@12345` | Stateroom bookings, event requests, digital boarding passes |
| **Cruise Operator** | `owner1` | `Owner@12345` | Fleet liner management, guest reservation approvals |
| **Cruise Operator** | `owner2` | `Owner@12345` | Additional vessel charters |
| **Platform Administrator**| `admin` | `Admin@12345` | Complete platform governance, vessel approvals, GMV ledger |

---

## 5. How to Run Locally

### 1. Run Django Backend
```powershell
# In project root
python manage.py runserver 127.0.0.1:8000
```

### 2. Run React Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173/`** in your browser.

---

## 6. End-to-End Test Suite

Run the automated end-to-end integration script to verify authentication, cruise discovery, atomic reservation, operator approval, and admin governance:
```powershell
python test_e2e.py
```
Expected output:
```text
Login Status: 200 True
Me Status: 200 user1
Selected Cruise: Sovereign of the Aegean (ID: 10)
Booking Response Body: {'success': True, 'message': 'Booking created successfully!', ...}
User Bookings Count: 7
Operator Total Ships: 7
Operator Approval Response: 200 {'success': True, 'message': 'Booking status updated to CONFIRMED.'}
Admin Total Bookings: 15 Total GMV: $ 15720.0
=== CRITICAL USER JOURNEY TEST PASSED 100% ===
```
