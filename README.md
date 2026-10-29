# 🚢 Cruise Hunt — Luxury Cruise & Maritime Experience Booking Platform

<p align="center">
  <a href="https://cruise-hunt.vercel.app/"><strong>🚀 View Live Demo</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Three.js-3D%20Experience-black?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white" alt="SQLAlchemy">
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Pytest-31%20Passed-449C44?style=for-the-badge&logo=pytest&logoColor=white" alt="Pytest">
</p>

> 🌊 **Cruise-Hunt** is an enterprise-grade, full-stack maritime booking and fleet management ecosystem. It seamlessly bridges ocean cruise travelers, luxury private charter organizers, extreme water sports operators, and platform administrators into a unified, high-performance platform.

---

## 📑 Table of Contents

1. [🌟 Executive Overview](#-executive-overview)
2. [🔑 Demo Test Accounts](#-demo-test-accounts)
3. [🧱 Technology Stack & Architecture](#-technology-stack--architecture)
4. [🧭 Comprehensive Feature Breakdown](#-comprehensive-feature-breakdown)
   - [🧳 1. Traveler & Customer Experience](#1-traveler--customer-experience)
   - [⚓ 2. Ship Owner & Operator Portal](#2-ship-owner--operator-portal)
     - [Fleet & Vessel Registry](#a-fleet--vessel-registry-ships--boats)
     - [Water Sports & Adventure Activities](#b-water-sports--adventure-activities)
     - [Staff & Crew Management](#c-staff--crew-management)
     - [Equipment & Safety Gear Inventory](#d-equipment--safety-gear-inventory)
     - [Multi-Tier Availability Engine](#e-multi-tier-availability-engine)
     - [Booking Lifecycle & Operations](#f-booking-lifecycle--operations)
     - [Owner Earnings & Financial Ledger](#g-owner-earnings--financial-ledger)
     - [Reviews, Complaints & Apology Engine](#h-reviews-complaints--apology-engine)
   - [🛡️ 3. Super Admin Command Center](#3-super-admin-command-center)
   - [🎫 4. Gate Security & Digital Ticket Verification](#4-gate-security--digital-ticket-verification)
5. [🧮 Financial Waterfall & Payout Formula](#-financial-waterfall--payout-formula)
6. [🗄️ Database Directory & Models](#️-database-directory--models)
7. [🚀 Quickstart & Installation](#-quickstart--installation)
8. [🧪 Automated Testing & Verification](#-automated-testing--verification)
9. [🔐 Security & Production Guidelines](#-security--production-guidelines)
10. [👨‍💻 Author & Repository](#-author--repository)

---

## 🌟 Executive Overview

Cruise-Hunt is engineered to solve the complex operational logistics of the maritime tourism and water sports industry:
- **For Travelers**: Intuitive discovery of luxury cruises, private island charters, shared public expeditions, and adrenaline-packed water activities with instant booking, digital boarding passes, and automated WhatsApp trip updates.
- **For Vessel & Activity Owners**: Full fleet custody, crew supervision limits, safety gear auditing, multi-slot availability enforcement, booking schedule/weather rescheduling, and transparent net revenue accounting.
- **For Platform Admins**: Real-time business oversight, fleet compliance review, commission settlement, automated marketing notifications, and customer complaint moderation.

---

## 🔑 Demo Test Accounts

The platform includes a pre-seeded SQLite database (`db.sqlite3`) populated with realistic test accounts, vessels, activities, staff, and historical bookings:

| Role | Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin` | `Admin@12345` | Global oversight, owner approvals, financial settlement, WhatsApp dispatch, user moderation. |
| ⚓ **Fleet & Activity Owner** | `owner1` | `Owner@12345` | Vessel registry, water sports activities, crew/gear management, booking approvals, net earnings dashboard. |
| ⚓ **Fleet Owner 2** | `owner2` | `Owner@12345` | Secondary yacht operator managing sailing charters in Goa. |
| 🧳 **Guest Traveler** | `user1` | `User@12345` | Exploring cruises/activities, booking tickets, downloading invoices, viewing boarding passes. |
| 🧳 **Guest Traveler 2** | `user2` | `User@12345` | Registered customer with booking history and review records. |

*Full directory with all 49 accounts is available in [`DATABASE_DATA.md`](DATABASE_DATA.md).*

---

## 🧱 Technology Stack & Architecture

### Backend Architecture (Python / FastAPI)
- **Framework**: FastAPI (Asynchronous Python 3.10+) with high-throughput routing and automatic OpenAPI generation.
- **ORM**: SQLAlchemy 2.0 with clean declarative models, eager relationship loading (`joinedload`), and relational constraints.
- **Validation**: Pydantic v2 schemas providing strict type-safety, constraint validation, and serialization.
- **Authentication**: Dual session management using HTTP-only cookies and Bearer JWT tokens, salted password hashing via PBKDF2-SHA256 (preserving legacy compatibility).
- **Communication & Notifications**: WhatsApp Cloud API integration with in-app notification routing.

### Frontend Architecture (React / TypeScript / Vite)
- **UI Framework**: React 18 with modern hooks, TypeScript for strict end-to-end typing.
- **Build Engine**: Vite for sub-second hot module replacement and optimized production bundling.
- **Design System**: Vanilla CSS & Tailwind CSS for bespoke glassmorphism, responsive cards, micro-animations, and marine dark-mode accents.
- **3D Visuals**: Three.js WebGL canvas rendering animated ocean waves and dynamic ship models in the hero banner.
- **Icons**: Lucide React icons for crisp and consistent visual language.

```
Cruise-Hunt/
├── backend/
│   ├── app/
│   │   ├── core/           # Security, JWT tokens, PBKDF2 hashing, config
│   │   ├── database/       # SQLAlchemy engine, session maker, base model
│   │   ├── models/         # User, Cruise/Cross, Activity, Staff, Equipment, Booking, Payout, etc.
│   │   ├── schemas/        # Pydantic validation & response contracts
│   │   ├── routers/        # 11 Modular REST endpoints (auth, operator, admin, activities, etc.)
│   │   ├── services/       # WhatsApp gateway, notification engine, serializers
│   │   └── main.py         # App factory, CORS, static media mounts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # Typed API clients & endpoints (dashboards, activities, auth)
│   │   ├── components/     # Specialized UI modules:
│   │   │   ├── activities/ # Activity cards, booking modals, owner management
│   │   │   ├── bookings/   # Booking table, schedule updates, refund processing
│   │   │   ├── finance/    # Owner earnings dashboard, payout ledger, waterfall
│   │   │   ├── ships/      # Vessel registry, capacity limits, maintenance calendar
│   │   │   ├── staff-equipment/ # Instructors, gear inventory, 4-tier simulator
│   │   │   └── ticket/     # Printable boarding pass, QR hash engine, invoices
│   │   ├── pages/          # Full route pages (OperatorDashboard, AdminDashboard, Explore, etc.)
│   │   └── utils/          # Currency formatters (INR ₹), date utils, image helpers
│   └── package.json
├── tests/                  # Automated pytest test suites (31 passing tests)
├── db.sqlite3              # Active SQLite database with seed data
└── README.md               # Project documentation
```

---

## 🧭 Comprehensive Feature Breakdown

---

### 🧳 1. Traveler & Customer Experience

#### A. Discovery & Exploration
- **Voyage & Cruise Search**: Filter by destination (Goa, Mumbai, Lakshadweep, Andaman, Maldives, Mediterranean, Alaska), budget range, duration, and vessel category.
- **Day-by-Day Itineraries**: Interactive visual timeline detailing ports of call, deck activities, gourmet meals, and shore excursions.
- **Cabin Tier Comparison**: Choose between Interior Cabins, Ocean View Staterooms, Balcony Cabins, and Presidential Suites with live pricing calculations.
- **Interactive Port Route Map**: Visual interactive modal displaying nautical routes, nautical miles, departure docks, and arrival times.

#### B. Water Sports & Extreme Adventures
- Dedicated water sports hub covering 10 marine categories:
  - 🤿 **Scuba Diving** (Discover Scuba, PADI reef explorations)
  - 🌊 **Jet Skiing** (High-speed Yamaha & Kawasaki wave-runners)
  - 🐠 **Snorkeling** (Coral reef guided tours)
  - 🪂 **Parasailing** (Tandem ocean winching)
  - 🚣 **White Water Rafting** (River rapids expeditions)
  - 🏄 **Surfing & Kite Surfing** (Certified instructor beach sessions)
  - 🛶 **Sea Kayaking & Rowing** (Mangrove and coastal tours)
  - 🪨 **Cliff Diving & Water Polo** (Supervised extreme athletics)
- Transparent gear lists, required certifications, minimum age limits, safety guidelines, and slot schedules.

#### C. Private Charter & Corporate Events
- Curated private event configurations: Ocean Weddings, Birthday Celebrations, Corporate Conferences, Sunset Cocktail Galas.
- Three tailored packages:
  - 💎 **Diamond Horizon**: Full vessel exclusivity, 5-course gourmet dining, live DJ, drone videography.
  - 🌿 **Emerald Wave**: Premium open deck, catered buffet, sound system, customized branding.
  - ⚓ **Sapphire Anchor**: Intimate sunset cruise with champagne welcome and appetizers.

#### D. Seamless Checkout & Digital Boarding Pass
- **Dynamic Pricing Engine**: Calculates base fare, passenger counts (adults vs children), add-on extras, promotional discounts, and GST taxes.
- **Promo Code Engine**: Real-time discount validation (e.g. `WELCOME20`, `SUMMERVIBES`).
- **Digital Boarding Pass & QR Code**:
  - Instant ticket generation upon booking confirmation.
  - Cryptographic QR code hash encoding ticket reference, passenger names, departure port, and validity.
  - One-click print boarding pass and download itemized PDF/HTML tax invoice.
- **Automated WhatsApp Trip Updates**: Real-time booking confirmations, schedule changes, gate notices, and weather advisories dispatched directly to the traveler's WhatsApp number.

---

### ⚓ 2. Ship Owner & Operator Portal

The Owner Dashboard (`/operator`) is a dedicated mission-control center for vessel operators and maritime adventure companies:

#### A. Fleet & Vessel Registry (Ships & Boats)
- **Dedicated Vessel Profiles**:
  - Official Vessel Registration Number (MMD / IMO / Coast Guard license)
  - Vessel Category (Luxury Cruiser, Motor Yacht, Catamaran, High-Speed Tender, Dive Boat)
  - **Passenger Capacity vs Activity Capacity Separation**: Crucial distinction ensuring a 20-passenger catamaran is not overbooked when diving equipment is only available for 6 participants.
  - Vessel Dimensions: Length, beam, draft, and deck count.
  - High-definition image gallery with direct upload capability.
- **Operational Status Management**:
  - `Available`: Active and open for customer bookings.
  - `Booked`: Reserved for voyages.
  - `Under Maintenance`: Automatically blocks calendar slots during dry-dock or routine inspection.
  - `Inactive`: Temporarily decommissioned.
  - `Pending Approval`: Awaiting platform admin safety audit.
- **Maintenance Schedule & Inspection Records**: Track last drydock date, next scheduled overhaul, and marine surveyor approval certificates.

#### B. Water Sports & Adventure Activities
- Full authoring suite for water experiences:
  - Title, slug, category, difficulty rating (Beginner, Intermediate, Advanced).
  - Duration in minutes and operating slot hours (e.g. 09:00 AM, 11:30 AM, 02:00 PM).
  - Pricing per person or flat group session pricing.
  - **Confirmation Mode Toggle**:
    - **Instant Auto-Confirmation**: Paid bookings are immediately confirmed by the system without owner intervention.
    - **Manual Owner Approval**: Bookings remain in `PENDING` state until the owner manually reviews and approves participant counts and weather suitability.
  - Host vessel linkage and required equipment assignment.

#### C. Staff & Crew Management
- Maintain certified rosters across 4 specialized maritime roles:
  - 🤿 **Instructors** (PADI Master Scuba Diver Trainers, ISA Surf Coaches)
  - ⚓ **Boat Captains** (Master Mariners Class 1 & 2, Inland Vessel Masters)
  - 🧭 **Guides** (IRF Whitewater Guides, Coastal Marine Naturalists)
  - 🛟 **Safety Crew & Lifeguards** (ILS Senior Lifesavers, Marine Medical First Responders)
- **Max Supervision Ratio**: Each instructor has an enforceable ratio (e.g., max 4 divers per scuba instructor, max 6 students per surf coach).
- License numbers, certification transcripts, emergency contact details, and duty status (`ACTIVE`, `ON_DUTY`, `ON_LEAVE`, `INACTIVE`).

#### D. Equipment & Safety Gear Inventory
- Detailed asset registry for:
  - 🦺 Life Jackets (Adult, Child, Infant certified PFDs)
  - 🤿 Scuba Diving Kits (Tanks, BCDs, Regulators, Wetsuits, Pressure Gauges)
  - 🌊 Jet Skis & Wave Runners (Serial tracking, engine hours)
  - 🏄 Surfboards, Paddleboards & Rafts
  - 🤿 Snorkel Sets & Fins
  - 🩹 Marine Medical Trauma & Oxygen Kits
- **Condition States**: `OPERATIONAL`, `IN_USE`, `MAINTENANCE`, `RETIRED`.
- Safety inspection log, mandatory testing intervals, and CE/ISO/SOLAS certifications.

#### E. Multi-Tier Availability Engine
Cruise-Hunt implements a proprietary 4-dimensional constraint solver preventing double-booking and safety violations:
1. **Dimension 1 — Slot Headroom**: Does the time slot have sufficient available spots based on existing active bookings?
2. **Dimension 2 — Vessel Capacity**: Does the assigned boat have sufficient passenger seats for the total group size?
3. **Dimension 3 — Instructor Supervision Limit**: Is the instructor already assigned to a concurrent group? If so, does adding this new group violate their certified maximum participant ratio?
4. **Dimension 4 — Equipment Inventory**: Are sufficient units of operational gear (and life jackets) in stock and not checked out by concurrent sessions?

*Includes an interactive **Availability Simulator** where owners can test date/slot/participant inputs and immediately receive bottleneck audit diagnostics.*

#### F. Booking Lifecycle & Operations
- **Full State Machine**:
  $$\text{Pending} \longrightarrow \text{Confirmed} \longrightarrow \text{In Progress} \longrightarrow \text{Completed}$$
  *(Alternative branches: `Rejected`, `Cancelled`, `Refunded`)*
- **Owner Action Suite**:
  - **Approve / Reject Requests**: Instant one-click confirmation or cancellation with automated customer notification.
  - **Participant Verification**: Update guest headcounts at pier boarding with optional price recalculation.
  - **Schedule Adjustments**: Re-schedule departure dates and times with double-booking collision detection.
  - **Weather-Related Rescheduling**: Marine safety rescheduling tool triggering storm/swell advisories to passengers while preserving ticket validity.
  - **Customer In-App & WhatsApp Messaging**: Dispatch real-time pier updates, gate numbers, and trip instructions.
  - **Partial & Full Refund Processing**: Issue financial refunds directly against booking ledgers.

#### G. Owner Earnings & Financial Ledger
A complete, transparent financial suite giving owners enterprise-grade accounting clarity:
- **8 Core Real-Time Financial Metrics**:
  1. **Gross Booking Value (GBV)**: Total volume paid by customers on confirmed/completed bookings.
  2. **Platform Commission (15%)**: Platform service and marketing fee.
  3. **Payment Processing Fees (2%)**: Third-party banking gateway processing costs.
  4. **Refunds & Cancellations**: Total deductions from customer refund requests.
  5. **Net Earnings (83% Owner Share)**: Total net revenue earned ($GBV - Commission - Processing - Refunds$).
  6. **Pending Payouts**: Mature funds awaiting bank disbursement.
  7. **Completed Payouts**: Funds successfully disbursed to the owner's bank account.
  8. **Payout Rate Guarantee**: Fixed 83% net distribution rate.
- **Itemized Booking-Wise Revenue Ledger**:
  - Every booking is cataloged with ticket code, experience title, customer name, WhatsApp contact, gross amount, 15% platform commission, 2% gateway fee, refund deduction, net owner share, and settlement status (`SETTLED`, `PENDING`, `REFUNDED`).
  - Searchable, filterable by date and status, with itemized waterfall breakdown modal.
- **Disbursement & Transaction History**:
  - Payout records detailing unique payout reference IDs (`PAY-YYYYMM-XXXXXX`), bank names, masked account numbers, IFSC codes, UTR bank clearance numbers, settlement periods, and amounts.
- **Manual Payout Request**:
  - Modal enabling owners to withdraw custom amounts from their pending balance directly to their verified bank accounts.
- **Statement Export**: Download complete booking and payout ledgers in standard `.csv` format with one click.

#### H. Reviews, Complaints & Apology Engine
- Real-time stream of verified passenger ratings and comments.
- **Complaint Ticketing**: Negative reviews are flagged with severity badges (`PENDING`, `WARNING_SENT`, `RESOLVED`).
- **Owner Apology & Resolution Tool**: Operators can respond with tailored official resolutions, which automatically update the complaint status and notify the customer in their dashboard.

---

### 🛡️ 3. Super Admin Command Center

The Super Admin Dashboard (`/admin`) delivers full operational governance:
- **Global Financial Accounting**: System-wide gross volume, total platform commission profit, total owner payouts, and refund monitoring.
- **Fleet & Vessel Oversight**: Review newly submitted ships and boats, audit safety documentation, approve or revoke vessel operation privileges.
- **Promotional Offers & Campaigns**: Create flat or percentage discount promo codes with expiry dates and minimum booking amounts.
- **Automated WhatsApp Dispatcher**:
  - Meta Cloud API configuration with credential validation.
  - Configurable dispatch schedule (e.g. 24 hours prior to voyage).
  - Outbox queue, delivery status tracking (`SENT`, `DELIVERED`, `FAILED`), and audit logs.
- **User & KYC Management**: Verify passenger/operator identities, assign roles (`ADMIN`, `OPERATOR`, `CUSTOMER`), and block abusive accounts.
- **Report Generator**: Export audit-ready reports for financial ledgers, booking manifests, fleet utilization, and customer acquisition.
- **Complaint Moderation**: Issue official administrative warnings to vessel operators with persistent poor ratings.

---

### 🎫 4. Gate Security & Digital Ticket Verification

Located at `/verify`, this dedicated terminal serves harbor gate staff and boat crews:
- **High-Speed Cryptographic Scanning**: Paste or scan ticket QR code hashes or alphanumeric ticket references (e.g. `TKT-CH-10294`).
- **Fraud Prevention**:
  - Checks booking status (`CONFIRMED` / `IN_PROGRESS`).
  - Displays passenger names, adult/child counts, vessel name, departure dock, and scheduled time.
  - **Duplicate Usage Prevention**: Once boarding is approved, the ticket state permanently transitions to `USED` (`can_mark_used: false`), preventing re-entry fraud.

---

## 🧮 Financial Waterfall & Payout Formula

Cruise-Hunt operates on an explicit, transparent 100% distribution waterfall with zero hidden charges:

```mermaid
graph TD
    A[Customer Gross Payment - 100%] --> B[Net Owner Earnings - 83%]
    A --> C[Cruise-Hunt Platform Commission - 15%]
    A --> D[Payment Gateway Processing - 2%]
    B --> E[Less: Approved Customer Refunds]
    E --> F[Disbursable Owner Bank Payout]
```

$$\text{Net Owner Payout} = \text{GBV} - \left(\text{GBV} \times 0.15\right) - \left(\text{GBV} \times 0.02\right) - \text{Refunds}$$

- **Settlement Schedule**: T+2 rolling business days following voyage completion.
- **Disbursement Gateway**: RBI NEFT / RTGS with unique bank UTR tracking.

---

## 🗄️ Database Directory & Models

The SQLite database (`db.sqlite3`) uses clean SQLAlchemy 2.0 relational mappings:

| Table Name | Model Class | Purpose |
| :--- | :--- | :--- |
| `crosses_user` | `User` | Unified user entity with roles (`CUSTOMER`, `OPERATOR`, `ADMIN`), phone, KYC status. |
| `crosses_cross` | `Cross` | Cruise ships, yachts, catamarans, and speedboats with capacities and specifications. |
| `crosses_activity` | `Activity` | Water sports adventures, time slots, difficulty levels, and gear requirements. |
| `crosses_staffmember` | `StaffMember` | Instructors, captains, guides, safety crew with license and supervision limits. |
| `crosses_equipmentitem` | `EquipmentItem` | Life jackets, scuba gear, jet skis, and rafts with condition states. |
| `crosses_booking` | `Booking` | Reservations, passengers, pricing, QR hash, statuses, and refund data. |
| `crosses_ownerpayout` | `OwnerPayout` | Disbursed payout records, bank accounts, IFSC, and UTR reference codes. |
| `crosses_crossreview` | `CrossReview` | Customer star reviews, complaint tickets, and owner resolution messages. |
| `crosses_offer` | `Offer` | Promotional discount coupons with validation rules. |
| `crosses_platformnotification` | `PlatformNotification` | In-app notification center for customers, owners, and administrators. |
| `crosses_whatsappmessagelog` | `WhatsAppMessageLog` | Outbound WhatsApp reminder logs, delivery states, and error handling. |

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **Package Manager**: npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/Pareshprajapati-777/Cruise-Hunt.git
cd Cruise-Hunt
```

### 2. Dual-Service Startup (One Command)
Run from the root directory to simultaneously launch the FastAPI backend and React frontend:
```bash
npm run dev
```
- **React Frontend**: [http://localhost:5173/](http://localhost:5173/)
- **FastAPI API**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Specification**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### Manual Setup (Step-by-Step)

#### Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate environment (macOS / Linux)
source .venv/bin/activate

# Install dependencies
python -m pip install -r requirements.txt

# Start FastAPI development server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend Setup
```bash
# In a separate terminal:
cd frontend
npm install
npm run dev
```

---

## 🧪 Automated Testing & Verification

The codebase includes comprehensive automated test coverage verifying every tier of the application:

```bash
# Run the complete pytest test suite
python -m pytest tests/ -v
```

### Test Suite Coverage (31 Tests Passed)
- `tests/test_auth.py`: User registration, PBKDF2 authentication, JWT session persistence, password resets.
- `tests/test_cruises.py`: Fleet listing, cabin tier pricing formulas, destination queries.
- `tests/test_activities.py`: Water sports exploration, booking calculations, addon handling.
- `tests/test_bookings.py`: Reservation lifecycles, duplicate ticket prevention, QR code generation.
- `tests/test_operator.py`:
  - Vessel management and 30-day availability timelines.
  - Staff supervision limit enforcement and equipment condition state transitions.
  - 4-Tier Availability Simulation engine.
  - Schedule updates, weather-related marine rescheduling, and participant verification.
  - Financial overview KPIs, itemized booking ledger, and manual payout request submission.
- `tests/test_admin.py`: Platform analytics, fleet approval workflows, user review warnings, offer campaigns.
- `tests/test_trip_lifecycle.py`: End-to-end voyage status progressions (`CONFIRMED` $\to$ `BOARDING` $\to$ `DEPARTED` $\to$ `ARRIVED` $\to$ `COMPLETED`).

---

## 🔐 Security & Production Guidelines

- 🛡️ **Authentication**: Secure HTTP-only cookies protect against XSS; JWT tokens with strict expiration enforce authenticated API access.
- 🔒 **Data Sanitization**: Pydantic input models strip dangerous payloads; SQLAlchemy parameterized queries prevent SQL injection.
- 📱 **WhatsApp Credentials**: Store Meta Cloud API tokens in environment variables (`.env`); never commit production secrets.
- 🗄️ **Database Migration**: The SQLite database (`db.sqlite3`) provides zero-configuration local execution. For high-traffic production, set `DATABASE_URL=postgresql://user:password@host/dbname` in `.env` without altering application code.
- 🌐 **CORS Configuration**: Configure `ALLOWED_ORIGINS` in `.env` to restrict API access strictly to your production domain.

---

## 👨‍💻 Author & Repository

**Paresh Prajapati**
- 🐙 **GitHub Profile**: [@Pareshprajapati-777](https://github.com/Pareshprajapati-777)
- 📦 **Project Repository**: [Cruise-Hunt on GitHub](https://github.com/Pareshprajapati-777/Cruise-Hunt)

---

<p align="center">
  🌊 <b>Cruise-Hunt — Discover the Voyage. Reserve the Experience. Celebrate at Sea.</b> 🚢
</p>
