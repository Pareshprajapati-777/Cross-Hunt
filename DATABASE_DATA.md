# 🗄️ Cross Hunt — Complete Database & Accounts Directory

> ℹ️ **Notice for GitHub Viewers:** SQLite database binary files (`db.sqlite3`) cannot be previewed in GitHub's web interface. This document and the associated [`database/database_export.json`](database/database_export.json) / [`database/database_dump.sql`](database/database_dump.sql) files provide full visibility into all database records, user accounts, owner accounts, fleet operators, cruise vessels, and bookings.

---

## 📊 Database High-Level Summary

| Metric | Count / Value |
| :--- | :--- |
| 👥 **Total User Accounts** | **49** |
| 👑 **System Administrators** | **1** |
| ⚓ **Fleet Owners** | **3** |
| 🏢 **Verified Fleet Operators / Partners** | **11** |
| 🚢 **Luxury Cruise Ships & Vessels** | **34** |
| 🎫 **Total Bookings** | **138** |
| ✅ **Confirmed Bookings Revenue** | **₹5,474,552.45** (81 confirmed) |
| 📁 **Primary SQLite DB File** | [`db.sqlite3`](db.sqlite3) (Active & Checkpointed) |
| 📄 **Full JSON Export** | [`database/database_export.json`](database/database_export.json) |
| 📜 **Full SQL Dump** | [`database/database_dump.sql`](database/database_dump.sql) |

---

## 🔑 Demo & Testing Credentials Quick-Fill

| Role | Username | Password | Email | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 👑 **Admin** | `admin` | `Admin@12345` | `admin@crossbooking.com` | Full administrative control & KPI overview |
| ⚓ **Operator / Owner 1** | `owner1` | `Owner@12345` | `owner1@crossbooking.com` | Fleet management, vessel listings & booking approvals |
| ⚓ **Operator / Owner 2** | `owner2` | `Owner@12345` | `owner2@crossbooking.com` | Fleet management for secondary charter routes |
| ⚓ **Owner (Custom)** | `deepak` | *(User created)* | `d1@gmail.com` | Registered fleet owner |
| 🧳 **Standard Traveler** | `user1` | `User@12345` | `user1@crossbooking.com` | Cruise booking, cabin selection & boarding pass |
| 🧳 **Traveler (Custom)** | `paresh` | *(User created)* | `p12@gmail.com` | Registered user account |

---

## 👑 System Administrators & Fleet Owners (`accounts_user`)

| ID | Username | Role | Email | Phone | Approved Owner | Active | Date Joined |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `admin` | **ADMIN** | admin@crossbooking.com | +91 98200 12345 | ✅ Yes | 🟢 Active | 2026-09-27 |
| 2 | `owner1` | **OWNER** | owner1@crossbooking.com | +91 98200 12345 | ✅ Yes | 🟢 Active | 2026-09-27 |
| 3 | `owner2` | **OWNER** | owner2@crossbooking.com | +91 98201 67890 | ✅ Yes | 🟢 Active | 2026-09-27 |
| 24 | `deepak` | **OWNER** | d1@gmail.com | — | ✅ Yes | 🟢 Active | 2026-10-19 |

---

## 🏢 Maritime Operators & Charter Companies (`crosses_operator`)

| ID | Operator Name | Base Location | Contact Email | Phone / WhatsApp | Verified | Type |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | **Navora** | Goa | contact@navoragoa.com | +91 78601 56369 | ✅ Yes | PUBLIC_EXTERNAL |
| 2 | **Andaman Yacht Rentals** | Andaman | info@andamanyachtrentals.com | +91 72900 10354 | ✅ Yes | PUBLIC_EXTERNAL |
| 3 | **Lacadives** | Andaman | info@lacadives.com | +91 96190 33344 | ✅ Yes | PUBLIC_EXTERNAL |
| 4 | **Neo Classic Cruises** | Kochi | mail@classicvoy.com | +91 80864 77720 | ✅ Yes | PUBLIC_EXTERNAL |
| 5 | **Paradise Cruises Goa** | Goa | info@paradisecruises.in | +91 88880 02662 | ✅ Yes | PUBLIC_EXTERNAL |
| 6 | **Cordelia Cruises** | Mumbai | support@cordeliacruises.com | 022-68811111 | ✅ Yes | PUBLIC_EXTERNAL |
| 7 | **Mandovi Cruises** | Goa | contact@mandovicruises.com | +91 98221 00001 | ✅ Yes | PUBLIC_EXTERNAL |
| 8 | **Swastik Cruises** | Goa | info@swastikcruises.in | +91 98221 55555 | ✅ Yes | PUBLIC_EXTERNAL |
| 9 | **Nautika** | Andaman | support@nautika.com | +91 3192 244444 | ✅ Yes | PUBLIC_EXTERNAL |
| 10 | **Green Ocean Seaways** | Andaman | info@greenoceancruise.com | 03192 230777 | ✅ Yes | PUBLIC_EXTERNAL |
| 11 | **Directorate of Shipping Services (DSS)** | Andaman | dss@andaman.gov.in | 03192 232528 | ✅ Yes | PUBLIC_EXTERNAL |

---

## 🚢 Luxury Vessels & Cruise Ships Fleet (`crosses_cross`)

| ID | Vessel Name | Category | Capacity | Base Price (INR) | Departure / Port | Owner / Operator | Active |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| 1 | **Apex Oceanic Sovereign** | Mega Cruise Liner | 3200 pax | ₹250,000 | Manhattan Cruise Terminal, Pier 88 | Owner: `owner1` | 🟢 Yes |
| 2 | **Heritage Star Clipper** | Luxury Ocean Cruise | 320 pax | ₹120,000 | Port of Bridgetown, Barbados | Owner: `owner1` | 🟢 Yes |
| 3 | **Aegean Pulse Yacht** | Private Charter Yacht | 50 pax | ₹45,000 | Tourlos New Port, Mykonos | Owner: `owner1` | 🟢 Yes |
| 4 | **Skyline Grandeur Explorer** | Expedition Cruise | 120 pax | ₹75,000 | Puerto Ayora, Santa Cruz | Owner: `owner1` | 🟢 Yes |
| 5 | **Nordic Horizon Navigator** | Expedition Cruise | 480 pax | ₹135,000 | Old Harbour, Reykjavik | Owner: `owner2` | 🟢 Yes |
| 6 | **Artisan Ocean Voyager** | Luxury Ocean Cruise | 850 pax | ₹165,000 | Oceankaj, Copenhagen | Owner: `owner2` | 🟢 Yes |
| 7 | **Emerald Isle Seafarer** | Island Hopper Cruise | 400 pax | ₹150,000 | Dublin Port, North Wall | Owner: `owner2` | 🟢 Yes |
| 8 | **Eastside Odyssey Catamaran** | Private Charter Yacht | 40 pax | ₹35,000 | Miami Beach Marina, Pier B | Owner: `owner2` | 🟢 Yes |
| 9 | **MS Horizon Empress** | Luxury Ocean Cruise | 1850 pax | ₹220,000 | Port of Miami, Terminal A | Owner: `owner1` | 🟢 Yes |
| 10 | **Sovereign of the Aegean** | Luxury Ocean Cruise | 1400 pax | ₹195,000 | Port of Piraeus, Athens | Owner: `owner1` | 🟢 Yes |
| 11 | **Nordic Glacier Explorer** | Expedition Cruise | 650 pax | ₹145,000 | Bergen Cruise Port, Norway | Owner: `owner1` | 🟢 Yes |
| 12 | **Celestia Grand Yacht** | Private Charter Yacht | 180 pax | ₹95,000 | Port Lympia, Nice, France | Owner: `owner2` | 🟢 Yes |
| 13 | **Coral Odyssey Liner** | Island Hopper Cruise | 920 pax | ₹115,000 | Port Autonome de Papeete, Tahiti | Owner: `owner2` | 🟢 Yes |
| 14 | **Pacific Constellation** | Mega Cruise Liner | 2400 pax | ₹210,000 | Port of Seattle, Pier 91 | Owner: `owner2` | 🟢 Yes |
| 15 | **MV Ocean Pearl** | Luxury Ocean Cruise | 180 pax | ₹85,000 | Mumbai International Cruise Terminal | Owner: `owner1` | 🟢 Yes |
| 16 | **Kochi Voyager Empress** | Scenic Coastal Cruise | 120 pax | ₹55,000 | Cochin Cruise Berth, Willingdon Island | Owner: `owner1` | 🟢 Yes |
| 17 | **Arabian Celestial Empress** | Mega Cruise Liner | 350 pax | ₹150,000 | Mormugao Port Cruise Terminal | Owner: `owner2` | 🟢 Yes |
| 18 | **Coral Horizon Yacht Cruiser** | Private Charter Yacht | 45 pax | ₹65,000 | Gateway of India Pier 2 | Owner: `owner2` | 🟢 Yes |
| 19 | **Andaman Explorer Royal** | Expedition Cruise Vessel | 90 pax | ₹95,000 | Haddo Cruise Wharf, Port Blair | Owner: `owner1` | 🟢 Yes |
| 20 | **Navora Luxury Yacht** | YACHT | 15 pax | ₹10,999 | Panaji / Anjuna, Goa | Operator: Navora | 🟢 Yes |
| 21 | **Andaman Yacht Rentals - Private AC Charter** | YACHT | 12 pax | ₹30,000 | Port Blair Marina, Andaman | Operator: Andaman Yacht Rentals | 🟢 Yes |
| 22 | **Lacadives Private Boat Charter** | BOAT | 8 pax | ₹15,000 | Havelock Jetty, Andaman | Operator: Lacadives | 🟢 Yes |
| 23 | **Classic Paradise (Neo Classic)** | SEA_CRUISE | 150 pax | ₹12,500 | Marine Drive Jetty, Kochi | Operator: Neo Classic Cruises | 🟢 Yes |
| 24 | **Classic Imperial (Neo Classic)** | SEA_CRUISE | 150 pax | ₹45,000 | Marine Drive, Kochi | Operator: Neo Classic Cruises | 🟢 Yes |
| 27 | **Mandovi Pride - Sightseeing & Dinner Vessel** | PARTY_BOAT | 180 pax | ₹18,500 | Santa Monica Jetty, Panaji | Operator: Mandovi Cruises | 🟢 Yes |
| 28 | **MV Paradise River Liner** | RIVER_CRUISE | 220 pax | ₹22,000 | Patto Jetty, Panaji, Goa | Operator: Paradise Cruises Goa | 🟢 Yes |
| 29 | **Swastik River Voyager** | RIVER_CRUISE | 120 pax | ₹19,500 | Betim Jetty, Goa | Operator: Swastik Cruises | 🟢 Yes |
| 30 | **Nautika Fast Catamaran** | FERRY | 285 pax | ₹32,000 | Phoenix Bay Jetty, Port Blair | Operator: Nautika | 🟢 Yes |
| 31 | **Green Ocean High-Speed Ferry** | FERRY | 310 pax | ₹28,000 | Phoenix Bay Jetty, Port Blair | Operator: Green Ocean Seaways | 🟢 Yes |
| 32 | **DSS Inter-Island Government Ferry** | FERRY | 400 pax | ₹16,000 | Phoenix Bay / Haddo Wharf, Port Blair | Operator: Directorate of Shipping Services (DSS) | 🟢 Yes |
| 33 | **Zephyr Alpha Royal Yacht** | YACHT | 20 pax | ₹45,000 | Panaji Jetty | Unassigned | 🟢 Yes |
| 37 | **Quick Deletable Vessel** | Luxury Ocean Cruise | 50 pax | ₹50,000 | Mumbai Cruise Terminal | Owner: `owner1` | 🟢 Yes |
| 39 | **Lion Ship** | Luxury Ocean Cruise | 1500 pax | ₹100,000 | Mumbai Cruise Terminal | Owner: `deepak` | 🟢 Yes |
| 40 | **Top 1** | Luxury Ocean Cruise | 5000 pax | ₹80,000 | Munbai | Owner: `deepak` | 🟢 Yes |

---

## 👥 Complete User Directory (`accounts_user` — All Accounts)

| ID | Username | Role | Email | Phone | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `admin` | ADMIN | admin@crossbooking.com | +91 98200 12345 | 🟢 Active |
| 2 | `owner1` | OWNER | owner1@crossbooking.com | +91 98200 12345 | 🟢 Active |
| 3 | `owner2` | OWNER | owner2@crossbooking.com | +91 98201 67890 | 🟢 Active |
| 4 | `user1` | USER | user1@crossbooking.com | +1 (555) 456-7890 | 🟢 Active |
| 5 | `user2` | USER | user2@crossbooking.com | +1 (555) 456-7890 | 🟢 Active |
| 6 | `user3` | USER | user3@crossbooking.com | +1 (555) 456-7890 | 🟢 Active |
| 7 | `user4` | USER | user4@crossbooking.com | +1 (555) 456-7890 | 🟢 Active |
| 8 | `user5` | USER | user5@crossbooking.com | +1 (555) 456-7890 | 🟢 Active |
| 9 | `test_customer_unauthorized` | CUSTOMER | — | — | 🟢 Active |
| 10 | `other_customer_ai_test` | CUSTOMER | — | — | 🟢 Active |
| 11 | `test_8b3ce23c` | USER | test_8b3ce23c@testcruise.com | +919999999999 | 🟢 Active |
| 12 | `test_c6ebfc6b` | USER | test_c6ebfc6b@testcruise.com | +919999999999 | 🟢 Active |
| 13 | `test_26233a2a` | USER | test_26233a2a@testcruise.com | +919999999999 | 🟢 Active |
| 14 | `test_b869b652` | USER | test_b869b652@testcruise.com | +919999999999 | 🟢 Active |
| 15 | `test_5c53c084` | USER | test_5c53c084@testcruise.com | +919999999999 | 🟢 Active |
| 16 | `test_884e06db` | USER | test_884e06db@testcruise.com | +919999999999 | 🟢 Active |
| 17 | `test_fc832ab9` | USER | test_fc832ab9@testcruise.com | +919999999999 | 🟢 Active |
| 18 | `test_eeb6aae3` | USER | test_eeb6aae3@testcruise.com | +919999999999 | 🟢 Active |
| 19 | `test_0b5d9aa6` | USER | test_0b5d9aa6@testcruise.com | +919999999999 | 🟢 Active |
| 20 | `test_735329a0` | USER | test_735329a0@testcruise.com | +919999999999 | 🟢 Active |
| 21 | `test_72469431` | USER | test_72469431@testcruise.com | +919999999999 | 🟢 Active |
| 22 | `test_1e360db5` | USER | test_1e360db5@testcruise.com | +919999999999 | 🟢 Active |
| 23 | `paresh` | USER | p12@gmail.com | +91 7096377561 | 🟢 Active |
| 24 | `deepak` | OWNER | d1@gmail.com | — | 🟢 Active |
| 25 | `test_9966db65` | USER | test_9966db65@testcruise.com | +919999999999 | 🟢 Active |
| 26 | `test_dc1ca5cd` | USER | test_dc1ca5cd@testcruise.com | +919999999999 | 🟢 Active |
| 27 | `test_771d29a4` | USER | test_771d29a4@testcruise.com | +919999999999 | 🟢 Active |
| 28 | `test_12b78db5` | USER | test_12b78db5@testcruise.com | +919999999999 | 🟢 Active |
| 29 | `test_d5d7d79e` | USER | test_d5d7d79e@testcruise.com | +919999999999 | 🟢 Active |
| 30 | `test_015dadf6` | USER | test_015dadf6@testcruise.com | +919999999999 | 🟢 Active |
| 31 | `test_cb73b4e9` | USER | test_cb73b4e9@testcruise.com | +919999999999 | 🟢 Active |
| 32 | `test_c0b503cf` | USER | test_c0b503cf@testcruise.com | +919999999999 | 🟢 Active |
| 33 | `test_027e25f7` | USER | test_027e25f7@testcruise.com | +919999999999 | 🟢 Active |
| 34 | `test_94e9b3ef` | USER | test_94e9b3ef@testcruise.com | +919999999999 | 🟢 Active |
| 35 | `test_04a33fdd` | USER | test_04a33fdd@testcruise.com | +919999999999 | 🟢 Active |
| 36 | `test_8e18c770` | USER | test_8e18c770@testcruise.com | +919999999999 | 🟢 Active |
| 37 | `test_a8f91951` | USER | test_a8f91951@testcruise.com | +919999999999 | 🟢 Active |
| 38 | `test_8592b562` | USER | test_8592b562@testcruise.com | +919999999999 | 🟢 Active |
| 39 | `test_f0c69777` | USER | test_f0c69777@testcruise.com | +919999999999 | 🟢 Active |
| 40 | `test_062a3627` | USER | test_062a3627@testcruise.com | +919999999999 | 🟢 Active |
| 41 | `test_c5f25aa2` | USER | test_c5f25aa2@testcruise.com | +919999999999 | 🟢 Active |
| 42 | `test_38f21621` | USER | test_38f21621@testcruise.com | +919999999999 | 🟢 Active |
| 43 | `test_56347efe` | USER | test_56347efe@testcruise.com | +919999999999 | 🟢 Active |
| 44 | `test_492b4f3e` | USER | test_492b4f3e@testcruise.com | +919999999999 | 🟢 Active |
| 45 | `test_165e4096` | USER | test_165e4096@testcruise.com | +919999999999 | 🟢 Active |
| 46 | `test_443e81fe` | USER | test_443e81fe@testcruise.com | +919999999999 | 🟢 Active |
| 47 | `test_93e5e560` | USER | test_93e5e560@testcruise.com | +919999999999 | 🟢 Active |
| 48 | `test_8ca81ed9` | USER | test_8ca81ed9@testcruise.com | +919999999999 | 🟢 Active |
| 49 | `test_10af467c` | USER | test_10af467c@testcruise.com | +919999999999 | 🟢 Active |

---

## 🎫 Recent Bookings Sample (`bookings_booking`)

| Booking Ref | Customer / User | Vessel / Cruise | Date | Status | Total Price (INR) | WhatsApp Reminder |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `CRS-2026-7D3B64` | `user1` | MV Ocean Pearl | 2027-07-25 | **PENDING** | ₹85,000.00 | ⏳ Pending |
| `CRS-2026-0F0665` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-30E81C` | `user1` | Lion Ship | 2026-11-05 | **CANCELLED** | ₹100,000.00 | ⏳ Pending |
| `CRS-2026-06F375` | `user1` | MV Ocean Pearl | 2027-07-24 | **PENDING** | ₹85,000.00 | ⏳ Pending |
| `CRS-2026-DD0892` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-CCE5B2` | `user1` | MV Ocean Pearl | 2027-07-23 | **PENDING** | ₹85,000.00 | ⏳ Pending |
| `CRS-2026-2C2EF8` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-041873` | `admin` | Apex Oceanic Sovereign | 2026-11-20 | **PENDING** | ₹360,000.00 | ⏳ Pending |
| `CRS-2026-4F6552` | `paresh` | Top 1 | 2026-10-26 | **CONFIRMED** | ₹17,698.82 | ⏳ Pending |
| `CRS-2026-123FC1` | `paresh` | Top 1 | 2026-10-26 | **CONFIRMED** | ₹53,096.46 | ⏳ Pending |
| `CRS-2026-067329` | `paresh` | Lion Ship | 2026-10-22 | **PENDING** | ₹112,100.00 | ✅ Sent |
| `CRS-2026-259CF7` | `paresh` | Top 1 | 2026-10-22 | **CONFIRMED** | ₹88,500.00 | ✅ Sent |
| `CRS-2026-7C4A9A` | `paresh` | Lion Ship | 2026-10-21 | **CONFIRMED** | ₹118,000.00 | ✅ Sent |
| `CRS-2026-313E36` | `user1` | MV Ocean Pearl | 2027-07-22 | **CONFIRMED** | ₹100,300.00 | ⏳ Pending |
| `CRS-2026-B26F97` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-E700B2` | `user1` | MV Ocean Pearl | 2027-07-21 | **CONFIRMED** | ₹100,300.00 | ⏳ Pending |
| `CRS-2026-8587FB` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-8BE825` | `user1` | MV Ocean Pearl | 2027-07-20 | **CONFIRMED** | ₹100,300.00 | ⏳ Pending |
| `CRS-2026-151CCB` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-5C6F9F` | `user1` | Zephyr Alpha Royal Yacht | 2026-11-03 | **CONFIRMED** | ₹18,880.00 | ⏳ Pending |
| `CRS-2026-96CCFC` | `user1` | MV Ocean Pearl | 2027-07-19 | **CONFIRMED** | ₹100,300.00 | ⏳ Pending |
| `CRS-2026-4837E6` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-D731BA` | `user1` | MV Ocean Pearl | 2027-07-18 | **CONFIRMED** | ₹100,300.00 | ⏳ Pending |
| `CRS-2026-1B65BE` | `user1` | Arabian Celestial Empress | 2026-10-23 | **CANCELLED** | ₹50,972.81 | ⏳ Pending |
| `CRS-2026-B2999E` | `user1` | MV Ocean Pearl | 2027-07-17 | **CONFIRMED** | ₹100,300.00 | ⏳ Pending |

---

## 🛠️ How to Use & Inspect Locally

### 1. Directly in Python / SQLite
```python
import sqlite3

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute('SELECT username, role, email FROM accounts_user WHERE role = "OWNER"')
print(cur.fetchall())
```

### 2. Loading the SQL Dump into Postgres or New SQLite
```bash
# To import into a new SQLite database:
sqlite3 new_database.db < database/database_dump.sql
```

### 3. Reading the JSON Export in JavaScript / Node
```javascript
const dbData = require('./database/database_export.json');
console.log('Total Users:', dbData.accounts_user.length);
console.log('Owners:', dbData.accounts_user.filter(u => u.role === 'OWNER'));
```
