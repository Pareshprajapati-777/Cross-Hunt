# -*- coding: utf-8 -*-
"""Build improved Cross-Hunt research docx (v2) with verified real 2026 data."""
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

NAVY = RGBColor(0x0B, 0x2E, 0x4F)
TEAL = RGBColor(0x0E, 0x7C, 0x7B)
GREY = RGBColor(0x55, 0x5F, 0x6B)

doc = Document()

# Base style
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(10)

def set_cell_bg(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = NAVY if level == 1 else TEAL
    return h

def para(text, bold=False, italic=False, size=10, color=None, space_after=6):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    r.font.size = Pt(size)
    if color:
        r.font.color.rgb = color
    p.paragraph_format.space_after = Pt(space_after)
    return p

def bullet(text):
    return doc.add_paragraph(text, style='List Bullet')

def make_table(headers, rows, col_widths=None, font_size=8):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = True
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ''
        run = hdr[i].paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(font_size)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_bg(hdr[i], '0B2E4F')
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            run = cells[i].paragraphs[0].add_run(str(val))
            run.font.size = Pt(font_size)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in t.rows:
                row.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

# ---------------- COVER ----------------
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run('\nINDIA SHIP & CRUISE RENTAL RESEARCH')
r.bold = True; r.font.size = Pt(24); r.font.color.rgb = NAVY
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run('Project-ready operator, route, pricing & contact database for Cross-Hunt')
r.font.size = Pt(12); r.font.color.rgb = TEAL
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = meta.add_run('Version 2.0  |  Compiled 2 October 2026  |  Verified against public operator sources (1–2 Oct 2026)\n'
                 'Replaces v1.0 (1 Oct 2026). Original file preserved unchanged.')
r.font.size = Pt(9); r.font.color.rgb = GREY

heading('0. What Changed in v2.0', 1)
bullet('Expanded operator coverage: +9 new operators/vessels — Makruzz (full fleet & class fares), Minar Cruise Cochin, Sagararani (KSINC), Costa Cruises India, Accretion Aviation Goa, Triplina Goa, plus class-level Andaman ferry fare bands.')
bullet('Cordelia Cruises: 2026 route-by-route published starting fares added (Mumbai–Goa one-way from ₹13,724 pp; Mumbai high-seas 2N from ₹34,050 pp; Lakshadweep sectors from ₹48,320 pp).')
bullet('Andaman ferry section now differentiates 4 vessel classes with GST + Passenger Service Fee handling (Makruzz: 18% GST, ₹50 PSF, foreign-national differential pricing ~15–20%).')
bullet('Data model extended to match the Cross-Hunt import spec: operator_type, source_price, price_unit, valid_from/to, last_verified_at, source_url, availability_status.')
bullet('Added Appendix A — JSON-ready import records matching the field list in "Existing Cross-Hunt.txt".')
bullet('Goa private charter market price bands added by vessel class (₹10k–2L+ per charter) to prevent unrealistic low-price listings.')

heading('1. Project Scope', 1)
para('The Indian marine-tourism market separates into two products: '
     '(A) PRIVATE CHARTER — the customer hires an entire boat/yacht/vessel; and '
     '(B) PUBLIC / SHARED TOUR — customers purchase individual seats or cabins. '
     'Large ocean-going cruise ships (Cordelia, Costa) are sold per passenger/cabin; '
     'they must never be represented as ordinary hourly boat rentals. '
     'Inter-island ferries (Makruzz, Nautika, Green Ocean, DSS) are a third inventory class — transport, not tours.')

heading('2. Recommended Data Model for Cross-Hunt', 1)
para('Every listing row must carry the fields below. External/public operators are stored as '
     'PUBLIC OPERATOR / EXTERNAL OPERATOR — never auto-created as platform owner accounts.', italic=True)
make_table(
    ['Field', 'Purpose'],
    [
        ['listing_type', 'PRIVATE_CHARTER / PUBLIC_CRUISE / FERRY_TRANSPORT'],
        ['operator', 'Company / operator name'],
        ['operator_type', 'REGISTERED_OWNER (onboarded on platform) / PUBLIC_OPERATOR (external, catalogue-only)'],
        ['vessel_name', 'Ship / yacht / boat name (e.g. MV Makruzz Gold, Ambassador 47)'],
        ['vessel_category', 'Small / Medium / Large / Cruise Ship / Fast Ferry / Government Ferry'],
        ['capacity', 'Maximum passenger capacity'],
        ['departure', 'Boarding port / jetty'],
        ['destinations', 'Ports, islands or sightseeing points'],
        ['duration', 'Hours / nights / days'],
        ['source_price', 'Published starting price (numeric, as published)'],
        ['currency', 'INR (default)'],
        ['price_unit', 'PER_PERSON / PER_BOAT / PER_HOUR / PER_DAY / PER_CHARTER / QUOTE — mandatory'],
        ['included', 'Fuel, crew, food, guide, equipment, etc.'],
        ['extra_charges', 'GST 18%, permit fees, passenger service fee, fuel surcharge, decoration, etc.'],
        ['contact_phone / whatsapp / email', 'Official contact channels (mark unverified numbers clearly)'],
        ['website / booking_url / source_url', 'Official pages used for verification'],
        ['valid_from / valid_to', 'Price validity window if published'],
        ['last_verified_at', 'Date this row was last checked against the source'],
        ['availability_status', 'AVAILABLE / ON_REQUEST / SOLD_OUT / WEATHER_HOLD / NOT_SCHEDULED'],
    ],
    col_widths=[2.2, 4.8], font_size=9)

# ---------------- PART A ----------------
heading('3. PART A — PRIVATE SHIP / BOAT / YACHT RENTAL', 1)
para('Rule: if the customer hires the whole vessel, store price_unit as PER_BOAT, PER_HOUR, PER_DAY, PER_CHARTER or QUOTE. '
     'Never convert a package into a per-person price unless the operator explicitly publishes one.', italic=True)
make_table(
    ['Location', 'Operator', 'Product / Vessel', 'Type', 'Capacity', 'Route / Area', 'Published Price (2026)', 'Price Unit', 'Extras / Charges', 'Contact', 'Source'],
    [
        ['Goa', 'Navora', 'Private yacht charter', 'Private yacht', 'Varies by vessel', 'North & South Goa; itinerary by enquiry', 'From ₹10,999', 'PER_CHARTER (starting)', 'Date + headcount + itinerary quoted', '+91 78601 56369; contact@navoragoa.com', 'navoragoa.com'],
        ['Goa', 'Accretion Aviation', 'Blue Fin / Aquamarine / Ambassador 47 / Ahilo Catamaran', 'Private yacht / catamaran', 'Up to 19 (Ahilo)', 'Britona Jetty → Salim Ali Bird Sanctuary, Penha de França Church, Atal Setu', '₹10,000–15,000 (small, 2h); Ambassador 47 ₹34,000; Ahilo Catamaran ₹41,500 (2h)', 'PER_BOAT / 2-hour package', '1h cruise + 1h anchorage; decor, cake, alcohol, drone photography extra', 'Via website enquiry', 'accretionaviationblogs (Jan 2026)'],
        ['Goa', 'Triplina (yacht rental)', 'MV Rare, MV Tara, AquaMarine, Blue Diamond, MV Sea Eagle', 'Private yacht', '5–6 seats', 'Mandovi River & Arabian Sea', 'From ₹10,000 / 2-hour slot', 'PER_BOAT / slot', 'Extra hours chargeable; juices/water complimentary; drone photo, alcohol, decor, cake, snacks extra', 'Online booking portal', 'triplina.com'],
        ['Goa (market band)', 'Multiple operators', 'Market reference bands', 'Speed boat → catamaran', '4–8 / 10–15 / 15–30 / 30–180', 'Goa coastline & rivers', 'Speed boat ₹10–15k/2h; mid-size motor yacht ₹25–45k; luxury ₹45–90k; catamaran/mega ₹90k–2L+; full-day ₹1L–10L', 'PER_BOAT / duration', 'Crew, fuel (standard route), jetty fees usually included; catering & extras quoted', '—', 'luxuryyachtgoa.com (Apr 2026)'],
        ['Andaman', 'Andaman Yacht Rentals', 'Private AC charter', 'Yacht / charter boat', 'Up to 12', 'Port Blair: Ross Island, Corbyn\'s Cove; Havelock: Elephant Beach, Turtle Beach', '₹30,000 / 2.5h; ₹50,000 / 4h; ₹75,000 / full day', 'PER_BOAT package (base up to 6, max 12)', 'GST 18%; permits ₹500 Indian / ₹2,500 foreign', '+91 72900 10354 / +91 89292 97441; info@andamanyachtrentals.com', 'andamanyachtrentals.com'],
        ['Andaman', 'Lacadives', 'Private boat charter', 'Boat', 'Not stated', 'Havelock / CT; bespoke sea trips', '₹15,000/1h; ₹20,000/1.5h; ₹25,000/2h; ₹40,000/3h; ₹50,000/4h', 'PER_BOAT / PER_HOUR tiers', 'Sunset per-person products may have minimum capacity', 'Booking via official site', 'lacadives.com'],
        ['Kochi', 'Neo Classic Cruises', 'Classic Paradise private charter', 'Sea cruise vessel', 'Up to 150', 'Kochi Marine Drive / Kochi harbour', 'School/college packages ₹12,500–13,750/h; standard charter quote-based', 'PER_HOUR (package) / QUOTE', 'Food and entertainment vary by package', '+91 80864 77720; mail@classicvoy.com', 'cruiseneo.com'],
        ['Kochi', 'Neo Classic Cruises', 'Classic Imperial private charter', 'Sea cruise vessel', 'Up to 150', 'Kochi harbour', 'Quote on request (whole vessel)', 'QUOTE', 'Date, headcount, occasion determine quote', '+91 80864 77720; mail@classicvoy.com', 'cruiseneo.com'],
        ['Goa', 'Paradise Cruises', 'Private boat / event charter', 'River cruise boat', 'Not published', 'Mandovi River, Panaji', 'Quote on request', 'QUOTE (whole boat)', 'Private event customizable', '8888002662 / 8888278381; 8888884951 / 8888884953', 'paradisecruises.in'],
        ['Chennai', 'Yacht/boat charter market', 'Multiple operators', 'Yacht / boat', 'Varies', 'Marina Beach coast, Chennai harbour area', 'Not consistently published — treat as QUOTE_ON_REQUEST', 'QUOTE', 'Verify capacity & permits before listing', '—', 'Field research note'],
    ],
    font_size=7)

# ---------------- PART B ----------------
heading('4. PART B — PUBLIC / SHARED TOURS & CRUISES', 1)
heading('4.1 Ocean cruise lines (per-person, date & cabin dependent)', 2)
make_table(
    ['Operator', 'Vessel', 'Route (2026 sailings)', 'Published Starting Fare (2026)', 'Price Unit', 'Extras', 'Contact', 'Source'],
    [
        ['Cordelia Cruises', 'Empress (2nd ship planned)', 'Mumbai→Goa one-way 2N (31 Aug, 14 Sep 2026); Mumbai–At Sea–Mumbai 2N; Mumbai–At Sea–Goa 2N; Mumbai–Goa–Mumbai 3N; Goa/Kochi–Lakshadweep–Mumbai 3N; Mumbai–Lakshadweep 4N; Chennai–Sri Lanka seasonal', 'One-way 2N from ₹13,724 (Inside, excl. port fees & taxes); Mumbai–Goa 2N from ₹28,380; High-seas 2N from ₹34,050; 3N Lakshadweep sectors from ₹48,320; 3N Mumbai–Goa return from ₹51,067; 4N Lakshadweep from ₹62,509 (all pp, double occupancy)', 'PER_PERSON / PER_CABIN', 'Port taxes, gratuities, Wi-Fi, alcohol, specialty dining extra; kids <12 often 30–50% off', '022-68811111; group desk 022-65545206', 'cordeliacruises.com; cruisebay.com; mercurytravels.co.in'],
        ['Costa Cruises India', 'Costa Serena', 'Mumbai–Goa–Lakshadweep itineraries, Oct–Apr season', 'Premium segment — approx ₹1.2–2 lakh pp (8N Maldives-style itineraries); verify per sailing', 'PER_PERSON / PER_CABIN', 'Mandatory tips ~₹500–1,000/day; drinks & excursions extra', 'Via official site/agents', 'happyfares.in cruise guide (Jul 2026)'],
    ],
    font_size=7)

heading('4.2 River & sea day cruises — per-person tickets', 2)
make_table(
    ['Location', 'Operator', 'Product', 'Capacity', 'Route / Area', 'Published Price', 'Price Unit', 'Inclusions / Extras', 'Contact', 'Source'],
    [
        ['Goa', 'Mandovi Cruises', 'Dolphin / Sunset / Party / Family Dinner / VIP Dinner', 'Not published', 'Mandovi River; Fort Aguada / dolphin products', 'Dolphin ₹400; sunset ₹500–600; party boat ₹1,099; family dinner ₹1,200; VIP dinner ₹3,800 (site examples)', 'PER_PERSON / ticket', 'Product-specific inclusions', 'Official site contact', 'mandovicruises.com'],
        ['Goa', 'Paradise Cruises', 'Evening / Dinner Cruise', 'Not published', 'Mandovi River, Panaji', '1h evening & 2h dinner cruise; check live price at booking', 'PER_TICKET', 'Dinner: entertainment, buffet, specified drinks (FAQ)', '8888002662 / 8888278381', 'paradisecruises.in'],
        ['Goa', 'Swastik Cruises', 'Sunset / Dinner Cruise', 'Not published', 'Mandovi River / Betim', 'Sunset ₹600 (1h); Dinner ₹1,260 (advance booking)', 'PER_PERSON / ticket', '—', 'Official site contact', 'swastikcruises.in'],
        ['Kochi', 'Neo Classic Cruises', 'Classic Imperial — Lunch / Dinner', 'Up to 150', 'Marine Drive, Kochi', 'Lunch from ₹1,700; Dinner from ₹2,300', 'PER_PERSON / ticket', 'Live entertainment / lounge-bar by sailing', '+91 80864 77720; mail@classicvoy.com', 'cruiseneo.com'],
        ['Kochi', 'Neo Classic Cruises', 'Classic Paradise — Evening / Sunset / Dinner', 'Up to 150', 'Marine Drive, Kochi', 'Evening ₹500; Sunset ₹600; Dinner ₹650 (published examples)', 'PER_PERSON / ticket', 'Dinner includes meal', '+91 80864 77720', 'cruiseneo.com'],
        ['Kochi', 'Minar Cruise (Cochin Cruise Line)', 'Breakfast / Lunch / Sunset / Dinner catamaran cruises', 'Catamaran', 'Marine Drive, Kochi (2h sea cruise)', 'Breakfast ₹750 (child ₹400); Lunch ₹1,000 (₹500); Sunset ₹750 (₹400); Dinner ₹1,000 (₹500)', 'PER_PERSON / ticket', 'Buffet meals; live music; entertainment; DJ on sunset/dinner', 'cochincruiseline.com', 'cochincruiseline.com'],
        ['Kochi', 'Sagararani (KSINC)', 'Sunset / Sea cruise packages', 'Cruise vessel', 'Marine Drive, Kochi harbour', 'Sunset ~₹350–500 historical listing; current sea-cruise packages ₹999–2,700 pp via Kerala govt portal; weekend/holiday adult ₹2,400, child ₹500 (portal example)', 'PER_PERSON / ticket', 'Monsoon offers have been advertised (adult ₹500 / child ₹250)', '+91 9846211143', 'sagararani.in; mycruise.kerala.gov.in'],
    ],
    font_size=7)

heading('4.3 Andaman inter-island ferries (transport class — never merge with tour cruises)', 2)
para('Makruzz fare structure (verified Oct 2026): Premium ₹1,250–1,775; Deluxe ₹2,180–2,300; Royal ₹2,940–3,150; '
     'plus ₹50 Passenger Service Fee + 18% GST. Peak season (15 Dec–15 Jan) adds ~₹100. Foreign nationals pay ~15–20% more. '
     'A fuel surcharge of ₹300–325 pp applied in March 2026 — always store surcharges separately.', italic=True)
make_table(
    ['Operator', 'Vessel / Class detail', 'Route', 'Published Fare (2026)', 'Price Unit', 'Contact / Booking', 'Source'],
    [
        ['Makruzz', 'MV Makruzz (Premium 208 / Deluxe 64 / Royal 8 seats); MV Makruzz Gold (262/63/8); MV Makruzz Pearl (250, Premium-only); MV Makruzz Ruby joins 1 Oct 2026 — PB→Havelock 08:45, Havelock→Neil 10:45, Neil→PB 12:15', 'Port Blair ↔ Swaraj Dweep (Havelock) ↔ Shaheed Dweep (Neil); Pearl moves to Baratang route from 1 Oct 2026; ~13 daily departures fleet-wide', 'Premium ₹1,250–1,775; Deluxe ₹2,180–2,300; Royal ₹2,940–3,150; + ₹50 PSF + 18% GST (Ruby Premium: PB→HV ₹1,950; HV→Neil ₹1,800; Neil→PB ₹1,850)', 'PER_PASSENGER / class', 'makruzz.com; UPI/cards via Razorpay', 'bookyourferry.com (Jul 2026); andamanferrytickets.com'],
        ['Nautika', 'Fast catamaran (Nautika Pro luxury class)', 'Port Blair ↔ Havelock; Havelock ↔ Neil; regular service suspended Jun–Aug (off-season)', '~₹1,650–1,805 starting (luxury class); verify live', 'PER_PASSENGER / class', 'nautika.com / agents', 'adventureandaman.com; ferrybooking.in'],
        ['Green Ocean Seaways', 'Green Ocean 1/2; economy class', 'Port Blair ↔ Havelock; Havelock ↔ Neil', 'Economy from ~₹1,000–1,282 before surcharge; upper classes to ~₹1,900', 'PER_PASSENGER / class', '03192 230777 / 9932080959; info@greenoceancruise.com; tickets portal', 'tickets.greenoceanseaways.com'],
        ['ITT Majestic', 'Silver class listing', 'Port Blair ↔ Havelock', 'Silver ~₹1,552–1,800', 'PER_PASSENGER / class', 'Agent portals', 'ferrybooking.in; dekhoandaman.com'],
        ['DSS, A&N Administration', 'Government passenger/vehicle ferries (STARS portal)', 'Port Blair ↔ Havelock/Neil and nearby islands', 'Seat ~₹770 (tourist allocation limited; ~70% seats reserved for islanders; tickets open ~1 week ahead)', 'PER_PASSENGER / class', 'STARS e-ticketing via dss.andaman.gov.in', 'dss.andaman.gov.in; adventureandaman.com'],
        ['Andaman local boat tours', 'Ross Island / North Bay combo boats', 'Port Blair → Ross Island / North Bay', 'Ross ~₹470; Ross+North Bay combo ~₹870', 'PER_PERSON', 'jetty counters / agents', 'ferrybooking.in'],
    ],
    font_size=7)

heading('5. Route Map for the Project', 1)
bullet('Goa: Panaji / Mandovi River → sunset, dinner, dolphin, Aguada sightseeing; private yachts from Britona Jetty & marina operators; itineraries operator-dependent.')
bullet('Mumbai: Mumbai cruise terminal → round trips, Mumbai→Goa, Mumbai→Kochi; Cordelia/Costa seasonal ocean sectors.')
bullet('Kochi: Marine Drive → Kochi harbour; public lunch/sunset/dinner cruises (Neo Classic, Minar, Sagararani); private charter up to 150 guests; Cordelia sectors to Lakshadweep.')
bullet('Andaman: Port Blair → Swaraj Dweep (Havelock) → Shaheed Dweep (Neil) ferry network; private charters to Ross Island, Corbyn\'s Cove, Elephant Beach, Turtle Beach; govt ferries via STARS.')
bullet('Lakshadweep: Agatti/Kavaratti access via Cordelia cruise sectors (permit required; cruise line assists).')
bullet('Chennai: Cordelia Chennai–Sri Lanka seasonal sailings; local yacht charter market exists but published pricing is sparse — treat unverified listings as QUOTE_ON_REQUEST.')
bullet('Sri Lanka / Malé / Colombo: international sectors appearing in scheduled 2026 sailings — flag as INTERNATIONAL_ROUTE with visa/permit notes.')

heading('6. Pricing & Booking Logic', 1)
bullet('PRIVATE: display total boat price first. Example: ₹30,000 / 2.5 hours for an Andaman charter — never ₹2,500 per person.')
bullet('PUBLIC: per-person or per-cabin pricing. Cordelia fares depend on sailing date + cabin; always fetch live fare or show indicative range + "verify at booking".')
bullet('Taxes & fees stored separately: Makruzz adds ₹50 PSF + 18% GST; Andaman Yacht Rentals states 18% GST + permits (₹500 Indian / ₹2,500 foreign); Cordelia quotes exclude port fees & taxes.')
bullet('Surcharges are dynamic (e.g. Makruzz ₹300–325 fuel surcharge, Mar 2026) — never bake them into base price.')
bullet('Low-price validation: before displaying, check price_unit + duration + capacity; a ₹5,000 PER_PERSON fare must never render as a ₹5,000 whole-boat price. Flag suspicious entries for Admin Review.')
bullet('Never hard-code a price permanently: store source_price, currency, price_unit, valid_from, valid_to, last_verified_at, source_url.')
bullet('Quote-based operators: show "Price on Request" — never invent a rate.')
bullet('Availability without a real-time API: show "Availability on Request". Never fake live availability.')

heading('7. Product UI Recommendation for Cross-Hunt', 1)
bullet('Search mode 1 — PRIVATE CHARTER: city, date, passengers, duration, vessel size → matched vessels.')
bullet('Search mode 2 — PUBLIC TOUR: departure, destination, date, passengers → available sailings/tickets.')
bullet('Card badges: PRIVATE, PUBLIC, FERRY, PER PERSON, WHOLE BOAT, PER HOUR, GST EXTRA, PERMIT EXTRA, LIVE AVAILABILITY, ON REQUEST.')
bullet('Filters: capacity, price, duration, departure port, destination, vessel size, AC, food, music/DJ, fishing, sightseeing, overnight, class (ferry).')
bullet('Booking states: AVAILABLE, REQUEST_QUOTE, SOLD_OUT, WEATHER_HOLD, NOT_SCHEDULED.')
bullet('Public catalogue (search, ships, companies, locations, tours, prices, capacity, facilities) open without login; login required only at checkout.')

heading('8. Important Accuracy Rules', 1)
para('Prices and schedules are dynamic. Figures here were captured from public operator sources on 1–2 October 2026 and are planning references, '
     'not guaranteed booking quotes. Re-check the operator source before displaying a final payable price.')
para('Inventory classes must stay separate in the database: CRUISE_SHIP (ocean), FERRY (inter-island transport), RIVER_CRUISE (day tour), '
     'YACHT/BOAT (private charter). Do not merge them into one generic "ship" category.')

heading('9. Appendix A — JSON-Ready Import Records (sample)', 1)
para('Ready to paste into the Cross-Hunt importer. All records are PUBLIC_OPERATOR (external, catalogue-only).', italic=True)
records = '''[
  {
    "listing_type": "FERRY_TRANSPORT",
    "operator": "Makruzz", "operator_type": "PUBLIC_OPERATOR",
    "vessel_name": "MV Makruzz Gold", "vessel_category": "Fast Ferry",
    "capacity": 333, "departure": "Haddo Jetty, Port Blair",
    "destinations": ["Swaraj Dweep (Havelock)"],
    "duration": "1h 25m - 1h 30m",
    "source_price": 1250, "currency": "INR", "price_unit": "PER_PERSON",
    "included": "AC reserved seat; Premium class",
    "extra_charges": "Passenger Service Fee Rs 50 + 18% GST; peak season +Rs 100 (15 Dec-15 Jan); fuel surcharge may apply",
    "contact_phone": "", "email": "", "website": "https://www.makruzz.com",
    "booking_url": "https://www.makruzz.com", "source_url": "https://www.bookyourferry.com/makruzz-ferry",
    "valid_from": "2026-09-16", "valid_to": "2026-12-14",
    "last_verified_at": "2026-10-02", "availability_status": "AVAILABLE"
  },
  {
    "listing_type": "PUBLIC_CRUISE",
    "operator": "Cordelia Cruises", "operator_type": "PUBLIC_OPERATOR",
    "vessel_name": "Empress", "vessel_category": "Cruise Ship",
    "capacity": 1900, "departure": "Mumbai Cruise Terminal",
    "destinations": ["Goa (Mormugao)"],
    "duration": "2 Nights",
    "source_price": 13724, "currency": "INR", "price_unit": "PER_PERSON",
    "included": "Inside cabin, double occupancy; buffet meals; entertainment",
    "extra_charges": "Port fees & taxes excluded; gratuities, Wi-Fi, alcohol, specialty dining extra",
    "contact_phone": "022-68811111", "email": "",
    "website": "https://www.cordeliacruises.com",
    "booking_url": "https://www.cordeliacruises.com/cruise-packages?start=Mumbai",
    "source_url": "https://www.cruisebay.com/view-itinerary/2-nights-mumbai-goa-one-way-cruise-31482",
    "valid_from": "2026-08-31", "valid_to": "2026-09-14",
    "last_verified_at": "2026-10-02", "availability_status": "AVAILABLE"
  },
  {
    "listing_type": "PRIVATE_CHARTER",
    "operator": "Andaman Yacht Rentals", "operator_type": "PUBLIC_OPERATOR",
    "vessel_name": "Private AC Charter Boat", "vessel_category": "Yacht",
    "capacity": 12, "departure": "Port Blair / Havelock jetty",
    "destinations": ["Ross Island", "Corbyn's Cove", "Elephant Beach", "Turtle Beach"],
    "duration": "2.5 hours",
    "source_price": 30000, "currency": "INR", "price_unit": "PER_CHARTER",
    "included": "Whole boat up to 6 guests (max 12), crew, fuel",
    "extra_charges": "GST 18%; permits Rs 500 (Indian) / Rs 2,500 (foreign) per guest; extras possible",
    "contact_phone": "+91 72900 10354", "whatsapp": "+91 89292 97441",
    "email": "info@andamanyachtrentals.com",
    "website": "https://www.andamanyachtrentals.com",
    "booking_url": "https://www.andamanyachtrentals.com/private-charter-boat-at-andaman-islands",
    "source_url": "https://www.andamanyachtrentals.com/private-charter-boat-at-andaman-islands",
    "valid_from": null, "valid_to": null,
    "last_verified_at": "2026-10-01", "availability_status": "ON_REQUEST"
  },
  {
    "listing_type": "PUBLIC_CRUISE",
    "operator": "Minar Cruise (Cochin Cruise Line)", "operator_type": "PUBLIC_OPERATOR",
    "vessel_name": "Minar Cruise Catamaran", "vessel_category": "River Cruise",
    "capacity": null, "departure": "Marine Drive, Kochi",
    "destinations": ["Kochi harbour"],
    "duration": "2 hours",
    "source_price": 750, "currency": "INR", "price_unit": "PER_PERSON",
    "included": "Tea & snacks; live music; DJ (sunset/dinner)",
    "extra_charges": "Child (approx 5-10 yrs) Rs 400",
    "contact_phone": "", "email": "",
    "website": "https://www.cochincruiseline.com",
    "booking_url": "https://www.cochincruiseline.com",
    "source_url": "https://www.cochincruiseline.com/",
    "valid_from": null, "valid_to": null,
    "last_verified_at": "2026-10-02", "availability_status": "AVAILABLE"
  }
]'''
p = doc.add_paragraph()
r = p.add_run(records)
r.font.name = 'Consolas'
r.font.size = Pt(7)

heading('10. Primary Sources (all checked 1–2 October 2026)', 1)
srcs = [
    'Cordelia Cruises — cordeliacruises.com/cruise-packages · routes — cordeliacruises.com/routes',
    'Cordelia 2026 fares — cruisebay.com itinerary 31482; mercurytravels.co.in Cordelia page; theticketprice.com/cordelia-cruise-ticket-price',
    'Costa Cruises India season — happyfares.in cruise guides (Jul 2026)',
    'Navora Goa — navoragoa.com',
    'Accretion Aviation Goa 2026 pricing — accretionaviationblogs.blogspot.com (Jan 2026)',
    'Goa market price bands — luxuryyachtgoa.com/yacht-cost-in-goa-pricing-guide (Apr 2026)',
    'Andaman Yacht Rentals — andamanyachtrentals.com/private-charter-boat-at-andaman-islands',
    'Lacadives — lacadives.com/activities/boat-charters',
    'Neo Classic Cruises — cruiseneo.com/cruises/sea-cruise',
    'Minar Cruise Cochin — cochincruiseline.com',
    'Sagararani (KSINC) — sagararani.in · mycruise.kerala.gov.in',
    'Paradise Cruises Goa — paradisecruises.in/online-bookings',
    'Mandovi Cruises Goa — mandovicruises.com',
    'Swastik Cruises Goa — swastikcruises.in/products/list',
    'Makruzz fleet & fares — bookyourferry.com/makruzz-ferry; andamanferrytickets.com; makruzz.com',
    'Nautika / Green Ocean / ITT Majestic fares — adventureandaman.com; ferrybooking.in; dekhoandaman.com',
    'Green Ocean booking — tickets.greenoceanseaways.com/portal',
    'DSS A&N Government ferries — dss.andaman.gov.in',
]
for s in srcs:
    bullet(s)

para('')
para('End of document. Cross-Hunt research v2.0 — compile date 2 October 2026. '
     'Re-verify prices against source_url before every production price display.', italic=True, size=9, color=GREY)

out = r'C:\Users\Paresh\Desktop\Cross Hunt\Cross_Hunt_India_Ship_Cruise_Rental_Research_2026_v2.docx'
doc.save(out)
print('Saved:', out)
