import json
from decimal import Decimal
from backend.app.database.session import SessionLocal
from backend.app.models.cross import Cross
from backend.app.models.activity import Activity
from backend.app.models.user import User

def seed_activities():
    db = SessionLocal()
    try:
        # Check if activities already exist
        existing_count = db.query(Activity).count()
        if existing_count > 0:
            print(f"Activities already seeded ({existing_count} present). Updating/refreshing...")
            db.query(Activity).delete()
            db.commit()

        # Find host ships
        ships = db.query(Cross).all()
        if not ships:
            print("Error: No ships found in database.")
            return

        # Map ships
        ship_map = {s.id: s for s in ships}
        first_ship = ships[0]

        # Find operators/owners
        owner2 = db.query(User).filter(User.id == 2).first()
        owner3 = db.query(User).filter(User.id == 3).first()
        owner24 = db.query(User).filter(User.id == 24).first()

        def pick_ship(preferred_id, fallback_index=0):
            if preferred_id in ship_map:
                return ship_map[preferred_id]
            return ships[fallback_index % len(ships)]

        activities_data = [
            {
                "title": "Grand Island Coral Reef Scuba Diving",
                "slug": "grand-island-scuba-diving",
                "activity_type": "SCUBA",
                "category_label": "Deep Ocean Diving & Marine Life",
                "description": "Descend into the pristine waters around Grand Island with PADI-certified divemasters. Explore thriving coral gardens, swim alongside parrotfish, sea turtles, and explore sunken naval shipwrecks in crystal clear visibility.",
                "highlights": [
                    "20-30 minute guided dive with 1:1 certified master instructor",
                    "Complete underwater 4K GoPro video and photo package",
                    "Fresh tropical fruits, snacks and refreshments on dive vessel",
                    "Sightseeing boat cruise with dolphin spotting en route",
                    "Full dive gear including wetsuits, tanks and weighted belts"
                ],
                "included_gear": [
                    "PADI Certified Dive Master",
                    "High-Grade Scuba Regulator & 12L Tank",
                    "Full Wetsuit & Silicone Mask",
                    "Underwater 4K GoPro Video Recording",
                    "Onboard Fruit & Refreshment Platter"
                ],
                "safety_guidelines": "Comprehensive medical briefing, shallow water training session before open ocean descent, full safety gear and oxygen kit on boat.",
                "requirements": "Age 10+, no prior swimming certification needed for introductory dive, medical clearance form required.",
                "price": Decimal("3499.00"),
                "duration_minutes": 120,
                "difficulty_level": "MODERATE",
                "capacity_per_slot": 6,
                "location": "Grand Island, South Goa",
                "departure_port": "Dona Paula Jetty, Goa",
                "operating_hours": "07:30 AM - 04:30 PM",
                "time_slots": ["08:00 AM", "10:30 AM", "01:30 PM", "03:30 PM"],
                "image": "/static/images/activities/scuba_diving.jpg",
                "host_ship_id": pick_ship(3, 2).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(3, 2).operator_id,
                "rating": Decimal("4.9"),
                "reviews_count": 38,
                "is_featured": True,
            },
            {
                "title": "Ashwem Beach Pro Wave Surfing Safari",
                "slug": "ashwem-wave-surfing",
                "activity_type": "SURFING",
                "category_label": "Wave Surfing & Coastal Riding",
                "description": "Catch your first wave or carve high performance walls on Goa's premier breaks at Ashwem and Morjim. Supported by a tow-in speedboat to position you into peak peelers with real-time video coaching from ISA instructors.",
                "highlights": [
                    "ISA-certified surf coaching for beginners to advanced rippers",
                    "Speedboat positioning and tow-assist outside the impact zone",
                    "Custom fiberglass & soft-top boards tailored to your height/weight",
                    "Wave analysis and drone photo capture of your best rides",
                    "Beachside warm-up and ocean safety drill"
                ],
                "included_gear": [
                    "Fiberglass & Epoxy Surfboards",
                    "Safety Leash & UV Rash Guard",
                    "ISA Certified Surf Coach",
                    "Wave Tow-in from Support Speedboat",
                    "Beachside Hydration Pack"
                ],
                "safety_guidelines": "Dedicated motorized safety patrol boat in water at all times. Surf leashes and life vests mandatory for beginners.",
                "requirements": "Basic swimming ability required. Recommended minimum age 8 years.",
                "price": Decimal("2199.00"),
                "duration_minutes": 90,
                "difficulty_level": "MODERATE",
                "capacity_per_slot": 8,
                "location": "Ashwem Beach, North Goa",
                "departure_port": "Morjim River Pier",
                "operating_hours": "07:00 AM - 05:30 PM",
                "time_slots": ["07:30 AM", "09:30 AM", "02:30 PM", "04:30 PM"],
                "image": "/static/images/activities/surfing.jpg",
                "host_ship_id": pick_ship(20, 1).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(20, 1).operator_id,
                "rating": Decimal("4.8"),
                "reviews_count": 29,
                "is_featured": True,
            },
            {
                "title": "Arabian Sea Big Game Sport Fishing Charter",
                "slug": "deep-sea-sport-fishing",
                "activity_type": "FISHING",
                "category_label": "High-Sea Angling & Sport Fishing",
                "description": "Venture 15 to 25 nautical miles offshore to the Arabian Sea drop-off. Target trophy Yellowfin Tuna, King Mackerel, Barracuda, and Sailfish using top-tier Shimano trolling reels and high-frequency CHIRP fishfinder radars.",
                "highlights": [
                    "Target Sailfish, Mahi-Mahi, Kingfish, and Cobia offshore",
                    "Full Shimano Tiagra trolling rods and fighting harnesses",
                    "Live well bait tanks and holographic trolling skirts",
                    "Catch-and-release or professional cleaning & vacuum packing",
                    "Air-conditioned saloon and sundeck on host sportfisher vessel"
                ],
                "included_gear": [
                    "Shimano Big Game Trolling Rods",
                    "Sonar Fishfinder & GPS Navigation",
                    "Live Bait & Lures Included",
                    "Catch Cleaning & Packing Service",
                    "Chilled Marine Cooler with Beverages"
                ],
                "safety_guidelines": "Coast Guard satellite EPIRB, twin outboard engines, life raft, and seasoned offshore skipper with 15+ years experience.",
                "requirements": "Suitable for all skill levels from novice anglers to tournament fishermen. Age 12+.",
                "price": Decimal("4999.00"),
                "duration_minutes": 180,
                "difficulty_level": "MODERATE",
                "capacity_per_slot": 6,
                "location": "Mumbai Offshore Continental Shelf",
                "departure_port": "Mumbai Domestic Cruise Terminal (Green Gate)",
                "operating_hours": "06:00 AM - 03:00 PM",
                "time_slots": ["06:30 AM", "10:30 AM", "01:30 PM"],
                "image": "/static/images/activities/deep_sea_fishing.jpg",
                "host_ship_id": pick_ship(18, 0).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(18, 0).operator_id,
                "rating": Decimal("5.0"),
                "reviews_count": 42,
                "is_featured": True,
            },
            {
                "title": "Coastal Winds Kite Surfing High-Fly Expedition",
                "slug": "coastal-kite-surfing",
                "activity_type": "KITE_SURFING",
                "category_label": "Extreme Wind & Ocean Gliding",
                "description": "Harness the steady afternoon sea breezes of Goa's coast. Feel the unmatched exhilaration of flying 15 feet above the waves with 12-meter performance foil kites under the guidance of IKO Level-3 master instructors.",
                "highlights": [
                    "IKO-certified instruction tailored to your aerodynamic progression",
                    "Duotone and Core kites in diverse wind sizes (7m to 14m)",
                    "Two-way Bluetooth radio helmet for real-time aerial coaching",
                    "Fast motorized rescue tender chasing you downwind",
                    "High-definition action reels and drone photography"
                ],
                "included_gear": [
                    "Inflatable Foil Kites (8m-12m)",
                    "Carbon Fiber Control Bar & Harness",
                    "Radio Helmet with Instructor Link",
                    "Twin-Tip Kite Board",
                    "Rescue Boat Support on Standby"
                ],
                "safety_guidelines": "Quick-release safety chicken loop systems on all harnesses. Dedicated motorized rescue boat shadow.",
                "requirements": "Strong swimming capability required. Minimum weight 45kg.",
                "price": Decimal("3850.00"),
                "duration_minutes": 90,
                "difficulty_level": "ADVANCED",
                "capacity_per_slot": 4,
                "location": "Morjim Wind Bay, North Goa",
                "departure_port": "Chapora River Jetty",
                "operating_hours": "11:00 AM - 06:00 PM",
                "time_slots": ["11:30 AM", "01:30 PM", "03:30 PM", "05:00 PM"],
                "image": "/static/images/activities/kite_surfing.jpg",
                "host_ship_id": pick_ship(33, 3).id,
                "owner_id": owner24.id if owner24 else first_ship.owner_id,
                "operator_id": pick_ship(33, 3).operator_id,
                "rating": Decimal("4.9"),
                "reviews_count": 19,
                "is_featured": False,
            },
            {
                "title": "Mandovi Backwaters Scenic Sculling & Team Rowing",
                "slug": "mandovi-backwaters-rowing",
                "activity_type": "ROWING",
                "category_label": "Paddle Sports & Mangrove Eco-Tour",
                "description": "Glide through the glassy mangrove canals of Chorão and Divar islands at sunrise. Experience Olympic-style rowing sculls or relaxed touring boats with rhythm and synchronized blade strokes through serene bird sanctuaries.",
                "highlights": [
                    "Olympic standard Concept2 sculls (single, double, quad)",
                    "Explore secret inland waterways sheltered from sea chop",
                    "Spot kingfishers, flying fish, and resident river otters",
                    "Complete upper-body and cardiovascular morning fitness run",
                    "Support motor tender accompanying with water and gear"
                ],
                "included_gear": [
                    "Racing & Touring Sculls (Double / Quad)",
                    "Carbon Fiber Concept2 Oars",
                    "Hydrodynamic Life Vest",
                    "National Rowing Coach Briefing",
                    "Mangrove Birdwatching Guide"
                ],
                "safety_guidelines": "Sheltered flat water environment with zero waves. Certified life vests and motor escort boat throughout.",
                "requirements": "Open to beginners and enthusiasts of all fitness levels. Age 12+.",
                "price": Decimal("1499.00"),
                "duration_minutes": 60,
                "difficulty_level": "BEGINNER",
                "capacity_per_slot": 8,
                "location": "Chorão Island Mangroves, Goa",
                "departure_port": "Panaji Ferry Wharf",
                "operating_hours": "06:30 AM - 11:30 AM",
                "time_slots": ["06:30 AM", "08:00 AM", "09:30 AM", "10:45 AM"],
                "image": "/static/images/activities/rowing.jpg",
                "host_ship_id": pick_ship(33, 1).id,
                "owner_id": owner24.id if owner24 else first_ship.owner_id,
                "operator_id": pick_ship(33, 1).operator_id,
                "rating": Decimal("4.8"),
                "reviews_count": 25,
                "is_featured": False,
            },
            {
                "title": "Twin-Tandem High Altitude Ocean Parasailing",
                "slug": "ocean-parasailing-safari",
                "activity_type": "PARASAILING",
                "category_label": "High-Altitude Aerial Adrenaline",
                "description": "Ascend 300 feet into the blue skies directly from the hydraulic winch deck of a custom 35ft offshore powerboat. Soak in panoramic 360-degree views of the coastline, forts, and coral bays with a gentle ocean dip on descent.",
                "highlights": [
                    "Take off and land gently right on the boat deck",
                    "Fly tandem or triple with friends and family",
                    "Optional exhilarating warm ocean dip touch-and-go",
                    "Coast Guard certified 12mm synthetic braided towlines",
                    "Drone 4K aerial photography capturing your flight from above"
                ],
                "included_gear": [
                    "Hydraulic Winchboat System",
                    "Double Tandem Parachute Canopy",
                    "Coast Guard Approved Impact Vest",
                    "Water Dip Feature Option",
                    "Drone Photography Aerial Package"
                ],
                "safety_guidelines": "Computer-controlled hydraulic launch & retrieval winch system with zero beach drag risks. Certified crew.",
                "requirements": "Age 6+. Maximum combined tandem weight 190kg.",
                "price": Decimal("1899.00"),
                "duration_minutes": 45,
                "difficulty_level": "BEGINNER",
                "capacity_per_slot": 10,
                "location": "Baga & Calangute Coast, North Goa",
                "departure_port": "Britona Marine Jetty",
                "operating_hours": "08:30 AM - 05:30 PM",
                "time_slots": ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "04:45 PM"],
                "image": "/static/images/activities/parasailing.jpg",
                "host_ship_id": pick_ship(15, 0).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(15, 0).operator_id,
                "rating": Decimal("4.9"),
                "reviews_count": 56,
                "is_featured": True,
            },
            {
                "title": "Floating Ocean Arena Water Polo Championship",
                "slug": "floating-ocean-water-polo",
                "activity_type": "WATER_POLO",
                "category_label": "Team Water Sports & Tournaments",
                "description": "Engage in thrilling 7v7 water polo matches inside a custom floating marine stadium anchored in a calm turquoise bay. Supported by referee timing and refreshing hydration stations on the host yacht.",
                "highlights": [
                    "Regulation floating boundary arena with wave dampening bumpers",
                    "Official anti-slip marine balls and ear-guard caps",
                    "Refereed 4-quarter match with scoreboard on vessel",
                    "Post-game electrolyte mocktails and chef barbecue on yacht deck",
                    "Ideal for corporate teams, family reunions, and friend groups"
                ],
                "included_gear": [
                    "Floating Inflatable Goal Posts",
                    "Official Mikasa Water Polo Balls",
                    "Numbered Team Caps with Ear Guards",
                    "Marine Referee & Scorekeeper",
                    "Post-Match Electrolyte Bar on Deck"
                ],
                "safety_guidelines": "Certified lifeguards in water and on yacht deck. Flotation aids available for casual players.",
                "requirements": "Swimming confidence required. Age 14+.",
                "price": Decimal("1299.00"),
                "duration_minutes": 60,
                "difficulty_level": "MODERATE",
                "capacity_per_slot": 14,
                "location": "Miramar Bay Lagoon, Panaji",
                "departure_port": "Panaji Port Terminal",
                "operating_hours": "09:00 AM - 05:00 PM",
                "time_slots": ["09:30 AM", "11:30 AM", "02:30 PM", "04:00 PM"],
                "image": "/static/images/activities/water_polo.jpg",
                "host_ship_id": pick_ship(3, 2).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(3, 2).operator_id,
                "rating": Decimal("4.7"),
                "reviews_count": 18,
                "is_featured": False,
            },
            {
                "title": "Secret Cove Extreme Cliff Diving & Cave Leap",
                "slug": "secret-cove-cliff-diving",
                "activity_type": "CLIFF_DIVING",
                "category_label": "High-Adrenaline Cliff Jumps",
                "description": "Board a luxury power yacht to hidden volcanic sea cliffs accessible only by sea. Jump from graduated natural platforms ranging from 3 meters to 10 meters into deep, crystal clear 15-meter ocean pools under expert safety supervision.",
                "highlights": [
                    "Graduated jump ledges from 10ft (beginner) to 33ft (extreme)",
                    "Water depth sonar scanned prior to every session",
                    "Professional cliff diving coach teaching pencil and tuck entries",
                    "Safety tender and rescue diver stationed at water entry",
                    "Scenic cave swimming and secret snorkeling pools"
                ],
                "included_gear": [
                    "Safety Spotter & Diver at Water Level",
                    "Impact Floatation Vest",
                    "Grip Reef Shoes",
                    "High Dive Platform Briefing (3m to 10m)",
                    "Action Cam 4K Reel Included"
                ],
                "safety_guidelines": "Trained Red Cross rescue swimmer at water landing zone at all times. Helmets and impact vests provided.",
                "requirements": "Good physical health and swimming ability. Age 16+.",
                "price": Decimal("2499.00"),
                "duration_minutes": 90,
                "difficulty_level": "ADVANCED",
                "capacity_per_slot": 8,
                "location": "Cabo de Rama Secret Cliffs, South Goa",
                "departure_port": "Cavelossim Marina Pier",
                "operating_hours": "08:30 AM - 04:30 PM",
                "time_slots": ["09:00 AM", "11:30 AM", "02:00 PM", "03:45 PM"],
                "image": "/static/images/activities/cliff_diving.jpg",
                "host_ship_id": pick_ship(33, 3).id,
                "owner_id": owner24.id if owner24 else first_ship.owner_id,
                "operator_id": pick_ship(33, 3).operator_id,
                "rating": Decimal("4.9"),
                "reviews_count": 31,
                "is_featured": True,
            },
            {
                "title": "Twin-Turbo SeaDoo Jet Ski High-Speed Safari",
                "slug": "twin-turbo-jet-ski-safari",
                "activity_type": "JET_SKIING",
                "category_label": "High-Speed Personal Watercraft",
                "description": "Take control of a 230-horsepower supercharged SeaDoo GTX personal watercraft. Carve through rolling ocean swells, jump boat wakes, and tour offshore island fortresses with thrilling speeds up to 80 km/h.",
                "highlights": [
                    "Brand new 2026 SeaDoo GTX supercharged Rotax engines",
                    "Intelligent brake & reverse (iBR) system for effortless handling",
                    "Guided high-speed route along scenic coastal forts and beaches",
                    "Solo or tandem riding with friend at no extra charge",
                    "High-definition action camera footage provided"
                ],
                "included_gear": [
                    "SeaDoo 230hp Supercharged Jet Ski",
                    "Emergency Cut-off Lanyard Key",
                    "High-Impact Neoprene Life Jacket",
                    "Wave Jumping Course Markers",
                    "Trained Instructor Guide Rider"
                ],
                "safety_guidelines": "Safety briefing, engine shut-off wrist lanyards, and speed governor limits for first-timers.",
                "requirements": "Driver must be 18+ (passengers 10+). Valid government ID required.",
                "price": Decimal("2299.00"),
                "duration_minutes": 45,
                "difficulty_level": "MODERATE",
                "capacity_per_slot": 6,
                "location": "Gateway of India & Mandwa Waters, Mumbai",
                "departure_port": "Mumbai Domestic Cruise Terminal (Green Gate)",
                "operating_hours": "08:00 AM - 06:00 PM",
                "time_slots": ["08:30 AM", "10:15 AM", "12:00 PM", "02:00 PM", "03:45 PM", "05:15 PM"],
                "image": "/static/images/activities/jet_skiing.jpg",
                "host_ship_id": pick_ship(18, 0).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(18, 0).operator_id,
                "rating": Decimal("4.9"),
                "reviews_count": 64,
                "is_featured": True,
            },
            {
                "title": "Pro Slalom Water Skiing & Wakeboarding",
                "slug": "pro-slalom-water-skiing",
                "activity_type": "WATER_SKIING",
                "category_label": "Boat Tow Water Ski & Wakeboarding",
                "description": "Carve across glassy early morning waters behind a professional MasterCraft tournament ski boat. Experience razor-sharp slalom cuts, wake jumps, and progressive rope lengths for all experience brackets.",
                "highlights": [
                    "Towed behind a tournament MasterCraft direct-drive V8 boat",
                    "Zero-Off GPS cruise control ensuring precision tow speed",
                    "Connelly & Radar slalom skis plus Hyperlite pro wakeboards",
                    "Expert coaching on deepwater starts, balance, and crossing wakes",
                    "Chilled recovery towels and electrolyte refreshments"
                ],
                "included_gear": [
                    "MasterCraft Inboard Tow Boat with V-Drive",
                    "Connelly Slalom Skis & Hyperlite Wakeboard",
                    "Tournament Tow Rope & Grip Handle",
                    "Impact Vest & Headgear",
                    "Smooth Water Morning Run Guarantee"
                ],
                "safety_guidelines": "Dual spotter crew on boat. Tournament impact vests and floating tow lines at all times.",
                "requirements": "Swimming ability and upper body strength. Minimum age 12.",
                "price": Decimal("2799.00"),
                "duration_minutes": 60,
                "difficulty_level": "ADVANCED",
                "capacity_per_slot": 6,
                "location": "Mandovi River Estuary, Goa",
                "departure_port": "Panaji Yacht Club Pier",
                "operating_hours": "06:30 AM - 12:00 PM",
                "time_slots": ["06:45 AM", "08:00 AM", "09:30 AM", "10:45 AM"],
                "image": "/static/images/activities/water_skiing.jpg",
                "host_ship_id": pick_ship(20, 1).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(20, 1).operator_id,
                "rating": Decimal("4.8"),
                "reviews_count": 22,
                "is_featured": False,
            },
            {
                "title": "Valpoi River Grade-IV White Water Rafting",
                "slug": "valpoi-river-white-water-rafting",
                "activity_type": "RAFTING",
                "category_label": "River Rapids & Canyon Expedition",
                "description": "Conquer 10 kilometers of exhilarating Class-III and Class-IV rapids in the lush Western Ghats river valley. Team up on rugged 8-person rafts navigating churning waves, rock gardens, and breathtaking jungle canyons.",
                "highlights": [
                    "Navigate 10 thrilling rapids including 'The Big Daddy' and 'Giant Haystacks'",
                    "International Whitewater Federation certified river guides",
                    "Commercial-grade NRS self-bailing rafts with foot cups",
                    "Calm pool body surfing and cliff side waterfall stop",
                    "Authentic Goan riverbank buffet lunch included after rafting"
                ],
                "included_gear": [
                    "Commercial Self-Bailing Inflatable Raft",
                    "CE Certified River Helmet",
                    "Type-V High Flotation Life Jacket",
                    "Heavy Duty T-Grip Paddles",
                    "White Water Rescue Technician Escort"
                ],
                "safety_guidelines": "Complete safety orientation, rescue throw-bag drills, and kayak safety escort paddling alongside.",
                "requirements": "Age 12+, minimum weight 35kg. No prior rafting experience required.",
                "price": Decimal("2450.00"),
                "duration_minutes": 150,
                "difficulty_level": "MODERATE",
                "capacity_per_slot": 12,
                "location": "Mhadei Wildlife River Basin, Goa",
                "departure_port": "Valpoi River Base Pier",
                "operating_hours": "08:30 AM - 04:00 PM",
                "time_slots": ["09:00 AM", "11:30 AM", "02:00 PM"],
                "image": "/static/images/activities/rafting.jpg",
                "host_ship_id": pick_ship(33, 3).id,
                "owner_id": owner24.id if owner24 else first_ship.owner_id,
                "operator_id": pick_ship(33, 3).operator_id,
                "rating": Decimal("5.0"),
                "reviews_count": 48,
                "is_featured": True,
            },
            {
                "title": "Crystal Lagoon Snorkeling & 100% Clear Glass Kayak",
                "slug": "crystal-lagoon-snorkeling-kayak",
                "activity_type": "SNORKELING",
                "category_label": "Reef Safari & Transparent Kayaking",
                "description": "Paddle completely transparent acrylic kayaks over vibrant coral reefs where every fish and coral formation is visible beneath your seat. Slip into warm shallow waters with dry snorkels to interact with friendly reef life.",
                "highlights": [
                    "100% crystal clear transparent tandem kayaks",
                    "Snorkel over brain coral, sea anemones, and clownfish",
                    "Non-fogging silicone full-face & dry snorkel mask sets",
                    "Floating swim ladder and sun lounge deck on host yacht",
                    "Chilled fresh coconut water and tropical refreshments"
                ],
                "included_gear": [
                    "Full Dry Snorkel & Anti-Fog Tempered Mask",
                    "100% Transparent Acrylic Glass Kayak",
                    "Silicone Diving Fins",
                    "Coral Reef Identification Card",
                    "Underwater Photography Assistance"
                ],
                "safety_guidelines": "Shallow protected cove with zero current. Floating safety line and life jackets for all snorkelers.",
                "requirements": "Suitable for all ages from 6 to 70+. Non-swimmers welcome in kayaks with life vests.",
                "price": Decimal("1699.00"),
                "duration_minutes": 75,
                "difficulty_level": "BEGINNER",
                "capacity_per_slot": 10,
                "location": "Bat Island & Baina Bay, South Goa",
                "departure_port": "Mormugao Harbor Pier",
                "operating_hours": "08:00 AM - 05:00 PM",
                "time_slots": ["08:30 AM", "10:30 AM", "01:00 PM", "03:00 PM", "04:30 PM"],
                "image": "/static/images/activities/snorkeling.jpg",
                "host_ship_id": pick_ship(3, 2).id,
                "owner_id": owner2.id if owner2 else first_ship.owner_id,
                "operator_id": pick_ship(3, 2).operator_id,
                "rating": Decimal("4.9"),
                "reviews_count": 51,
                "is_featured": True,
            },
        ]

        for item in activities_data:
            act = Activity(
                title=item["title"],
                slug=item["slug"],
                activity_type=item["activity_type"],
                category_label=item["category_label"],
                description=item["description"],
                highlights_json=json.dumps(item["highlights"]),
                included_gear_json=json.dumps(item["included_gear"]),
                safety_guidelines=item["safety_guidelines"],
                requirements=item["requirements"],
                price=item["price"],
                duration_minutes=item["duration_minutes"],
                difficulty_level=item["difficulty_level"],
                capacity_per_slot=item["capacity_per_slot"],
                location=item["location"],
                departure_port=item["departure_port"],
                operating_hours=item["operating_hours"],
                time_slots_json=json.dumps(item["time_slots"]),
                image=item["image"],
                gallery_json=json.dumps([item["image"]]),
                host_ship_id=item["host_ship_id"],
                owner_id=item["owner_id"],
                operator_id=item["operator_id"],
                is_active=True,
                is_featured=item.get("is_featured", False),
                rating=item["rating"],
                reviews_count=item["reviews_count"]
            )
            db.add(act)

        db.commit()
        print(f"Successfully seeded {len(activities_data)} water sports activities linked to host ships!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding activities: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_activities()
