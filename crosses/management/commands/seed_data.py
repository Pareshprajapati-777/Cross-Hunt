from decimal import Decimal
from datetime import date, time, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from crosses.models import Cross, CrossReview, ShipExtra, PublicTour, Offer
from bookings.models import Booking

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds database with Indian-market luxury Cruise Ships, Public Tours, Extras, Offers, and Bookings in INR (₹)."

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seeding for Cross-Hunt (Cruise Ship Platform)...")

        # 1. Admin User
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@crosshunt.com',
                'first_name': 'Eleanor',
                'last_name': 'Vance',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'phone': '+91 98200 12345',
            }
        )
        admin_user.set_password('Admin@12345')
        admin_user.role = 'ADMIN'
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.phone = '+91 98200 12345'
        admin_user.save()

        # 2. Cruise Operators (Ship Owners)
        owner1, _ = User.objects.get_or_create(
            username='owner1',
            defaults={
                'email': 'owner1@crosshunt.com',
                'first_name': 'Captain Rajesh',
                'last_name': 'Sharma',
                'role': 'OWNER',
                'phone': '+91 98210 23456',
                'is_approved_owner': True,
            }
        )
        owner1.set_password('Owner@12345')
        owner1.role = 'OWNER'
        owner1.is_approved_owner = True
        owner1.save()

        owner2, _ = User.objects.get_or_create(
            username='owner2',
            defaults={
                'email': 'owner2@crosshunt.com',
                'first_name': 'Vikramaditya',
                'last_name': 'Singhania',
                'role': 'OWNER',
                'phone': '+91 98220 34567',
                'is_approved_owner': True,
            }
        )
        owner2.set_password('Owner@12345')
        owner2.role = 'OWNER'
        owner2.is_approved_owner = True
        owner2.save()

        # 3. Regular Voyage Travelers (Customers)
        user1, _ = User.objects.get_or_create(
            username='user1',
            defaults={
                'email': 'user1@crosshunt.com',
                'first_name': 'Aarav',
                'last_name': 'Mehta',
                'role': 'USER',
                'phone': '+91 98330 45678',
            }
        )
        user1.set_password('User@12345')
        user1.role = 'USER'
        user1.save()

        user2, _ = User.objects.get_or_create(
            username='user2',
            defaults={
                'email': 'user2@crosshunt.com',
                'first_name': 'Priya',
                'last_name': 'Nair',
                'role': 'USER',
                'phone': '+91 98440 56789',
            }
        )
        user2.set_password('User@12345')
        user2.role = 'USER'
        user2.save()

        self.stdout.write(self.style.SUCCESS("[OK] Users created/updated (admin, owner1, owner2, user1, user2)"))

        # 4. Indian-Market Luxury Cruise Ships
        ships_data = [
            {
                'owner': owner1,
                'name': 'MV Ocean Pearl',
                'slug': 'mv-ocean-pearl',
                'category': 'Luxury Ocean Cruise',
                'description': 'The flagship of the Arabian Sea fleet. MV Ocean Pearl features 12 sun decks, crystal glass observatory lounge, infinity swimming pool, and fine international dining. Ideal for grand weddings, executive corporate conclaves, and scheduled Mumbai-Goa voyages.',
                'location': 'Mumbai',
                'address': 'Terminal 1, Mumbai International Cruise Terminal, Green Gate, Mumbai, Maharashtra 400001',
                'price': Decimal('85000.00'),  # Private charter base / starting rate
                'capacity': 180,
                'supports_private_charter': True,
                'supports_public_tours': True,
                'supports_weddings': True,
                'supports_birthdays': True,
                'supports_corporate': True,
                'supports_conferences': True,
                'supports_parties': True,
                'supports_dinners': True,
                'destination': 'Goa & Arabian Sea Coastal Route',
                'route': 'Mumbai - Murud Janjira - Goa (Mormugao) - Mumbai',
                'departure_port': 'Mumbai International Cruise Terminal',
                'duration_days': 4,
                'ship_length_meters': 260,
                'beam_meters': 32,
                'decks_count': 10,
                'cabin_count': 120,
                'itinerary_highlights': "Day 1: Sunset Welcome Cocktails & Live Sitar Ensemble\nDay 2: Coastal Anchorage near Ratnagiri & Ocean Deck Buffet\nDay 3: Mormugao Port Excursions & Starlight Gala Dinner\nDay 4: Dawn Yoga & Return Cruise to Mumbai",
                'dining_venues': "The Captain's Table, Konkan Spice Deck, Sapphire Panorama Lounge, Blue Lagoon Bistro",
                'entertainment': "Grand Ballroom, Starlight Jazz Amphitheatre, Open Deck Cinema, Ayurvedic Ocean Spa",
                'image_url': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80',
                'facilities': "Wi-Fi, Swimming Pool, Heliport, Fine Dining, DJ Audio Rigs, Theatre, Spa, Conference Hall, Bar Lounge",
            },
            {
                'owner': owner1,
                'name': 'Kochi Voyager Empress',
                'slug': 'kochi-voyager-empress',
                'category': 'Scenic Coastal Cruise',
                'description': 'Experience the emerald waterways and Arabian Sea coastline aboard the Kochi Voyager Empress. Custom built with panoramic double-glazed observation saloons and heritage wood craftsmanship.',
                'location': 'Kochi',
                'address': 'Ernakulam Wharf, Cochin Port Trust, Willingdon Island, Kochi, Kerala 682009',
                'price': Decimal('55000.00'),
                'capacity': 120,
                'supports_private_charter': True,
                'supports_public_tours': True,
                'supports_weddings': True,
                'supports_birthdays': True,
                'supports_corporate': True,
                'supports_conferences': False,
                'supports_parties': True,
                'supports_dinners': True,
                'destination': 'Lakshadweep & Malabar Coast',
                'route': 'Kochi - Kavaratti - Kadmat Island - Kochi',
                'departure_port': 'Cochin Cruise Berth, Willingdon Island',
                'duration_days': 3,
                'ship_length_meters': 185,
                'beam_meters': 26,
                'decks_count': 6,
                'cabin_count': 65,
                'itinerary_highlights': "Day 1: Embarkation from historic Cochin Port & Kerala Kathakali reception\nDay 2: Turquoise Lagoon Cruise & Coral Snorkeling at Kadmat\nDay 3: Return voyage along scenic Malabar horizons",
                'dining_venues': "Malabar Coastal Kitchen, Spice Route Promenade, Sunset Deck Bar",
                'entertainment': "Traditional Cultural Amphitheatre, Sundowner Deck with Acoustic Music, Coral Glass-bottom view",
                'image_url': 'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?auto=format&fit=crop&w=1600&q=80',
                'facilities': "Swimming Pool, Wi-Fi, Seafood Restaurant, Sun Deck, Live Music, Scuba Briefing Suite",
            },
            {
                'owner': owner2,
                'name': 'Arabian Celestial Empress',
                'slug': 'arabian-celestial-empress',
                'category': 'Mega Cruise Liner',
                'description': 'A monumental floating palace with 14 passenger decks, 4 specialty fine-dining restaurants, an open-air amphitheatre, and 240 luxury sea-facing staterooms. The premier venue for ultra-luxury weddings and pan-India corporate summits.',
                'location': 'Goa',
                'address': 'Berth 11, Mormugao Cruise Terminal, Vasco da Gama, Goa 403803',
                'price': Decimal('150000.00'),
                'capacity': 350,
                'supports_private_charter': True,
                'supports_public_tours': True,
                'supports_weddings': True,
                'supports_birthdays': True,
                'supports_corporate': True,
                'supports_conferences': True,
                'supports_parties': True,
                'supports_dinners': True,
                'destination': 'Mumbai - Goa - Mangalore High Seas',
                'route': 'Goa (Mormugao) - Mangalore - Mumbai',
                'departure_port': 'Mormugao Port Cruise Terminal',
                'duration_days': 5,
                'ship_length_meters': 310,
                'beam_meters': 38,
                'decks_count': 14,
                'cabin_count': 240,
                'itinerary_highlights': "Day 1: Royal Goan Carnival departure & Champagne reception\nDay 2: High Seas Day at Leisure & International Casino\nDay 3: Coastal Mangalore heritage tour\nDay 4: Starlight Gala Ball with Masterchef banquet\nDay 5: Arrival at Mumbai Harbour",
                'dining_venues': "Grand Emperor Dining Hall, Goa Sunset Grill, Mediterranean Deck, Vedic Fine Dining",
                'entertainment': "Casino Royale, 800-seat Imperial Theatre, 3 Infinity Pools, 5 Whirlpools, Helipad",
                'image_url': 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=1600&q=80',
                'facilities': "Wi-Fi, 3 Swimming Pools, Casino, Heliport, Luxury Spa, 4 Specialty Restaurants, Conference Theatre, Nightclub",
            },
            {
                'owner': owner2,
                'name': 'Coral Horizon Yacht Cruiser',
                'slug': 'coral-horizon-yacht-cruiser',
                'category': 'Private Charter Yacht',
                'description': 'An intimate, high-speed luxury megayacht dedicated strictly to elite private charters, private birthday bashes, anniversary voyages, and high-level corporate negotiations.',
                'location': 'Mumbai',
                'address': 'Gateway of India Yacht Jetty, Colaba, Mumbai, Maharashtra 400001',
                'price': Decimal('65000.00'),
                'capacity': 45,
                'supports_private_charter': True,
                'supports_public_tours': False,  # Private only!
                'supports_weddings': False,
                'supports_birthdays': True,
                'supports_corporate': True,
                'supports_conferences': False,
                'supports_parties': True,
                'supports_dinners': True,
                'destination': 'Mumbai Harbour & Alibaug Coastal Strip',
                'route': 'Gateway of India - Mandwa - Khanderi Island - Gateway',
                'departure_port': 'Gateway of India Pier 2',
                'duration_days': 1,
                'ship_length_meters': 52,
                'beam_meters': 11,
                'decks_count': 3,
                'cabin_count': 6,
                'itinerary_highlights': "Private yacht excursion across Mumbai skyline, anchoring off Mandwa for exclusive cocktail dinner and jet ski watersports.",
                'dining_venues': "Chef On-Board Teppanyaki Bar, Sky Deck Cocktail Saloon",
                'entertainment': "Bose Surround Sound, Sunken Jacuzzi on Bow, Jet Skis, Water Seabobs",
                'image_url': 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1600&q=80',
                'facilities': "Wi-Fi, Private Jacuzzi, Jet Skis, High-End Sound System, Private Chef Kitchen, Bar Lounge",
            },
            {
                'owner': owner1,
                'name': 'Andaman Explorer Royal',
                'slug': 'andaman-explorer-royal',
                'category': 'Expedition Cruise Vessel',
                'description': 'Built for island exploration across the Andaman Archipelago. Stabilized hull with twin zodiac launch decks, marine biology observatory, and dive center.',
                'location': 'Port Blair',
                'address': 'Haddo Wharf, Port Blair, Andaman and Nicobar Islands 744102',
                'price': Decimal('95000.00'),
                'capacity': 90,
                'supports_private_charter': True,
                'supports_public_tours': True,
                'supports_weddings': True,
                'supports_birthdays': True,
                'supports_corporate': True,
                'supports_conferences': False,
                'supports_parties': False,
                'supports_dinners': True,
                'destination': 'Havelock, Neil Island & Ross Island Archipelago',
                'route': 'Port Blair - Havelock Island - Neil Island - Baratang - Port Blair',
                'departure_port': 'Haddo Cruise Wharf, Port Blair',
                'duration_days': 4,
                'ship_length_meters': 140,
                'beam_meters': 20,
                'decks_count': 5,
                'cabin_count': 45,
                'itinerary_highlights': "Day 1: Embarkation Port Blair & Sunset at Chidiya Tapu\nDay 2: Radhanagar Beach anchorage & Marine Snorkel Expedition\nDay 3: Neil Island coral reef cruise & Beach Bonfire\nDay 4: Historic Ross Island exploration & Return to port",
                'dining_venues': "Andaman Reef Grill, Emerald Horizon Bistro",
                'entertainment': "Expedition Lecture Theatre, Scuba Dive Deck, Stargazing Telescope Observatory",
                'image_url': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
                'facilities': "Wi-Fi, Dive Gear Deck, Zodiac Boats, Marine Biologist Lab, Panoramic Library, Sun Deck",
            }
        ]

        ships = {}
        for s_data in ships_data:
            ship, created = Cross.objects.update_or_create(
                slug=s_data['slug'],
                defaults=s_data
            )
            ships[ship.slug] = ship

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(ships)} Indian Luxury Cruise Ships populated in database"))

        # 5. Ship Extras (Customization Services)
        extras_data = [
            # For Ocean Pearl
            {'ship': ships['mv-ocean-pearl'], 'name': 'Grand Floral & Thematic Deck Decoration', 'price': Decimal('15000.00'), 'pricing_mode': 'FIXED', 'description': 'Bespoke fresh floral archways, maritime table centerpieces, fairy lighting and red carpet entrance.'},
            {'ship': ships['mv-ocean-pearl'], 'name': 'Professional DJ Rig & Concert Sound System', 'price': Decimal('12000.00'), 'pricing_mode': 'FIXED', 'description': 'Pioneer CDJ console, JBL line array sound system, laser lighting and haze effects.'},
            {'ship': ships['mv-ocean-pearl'], 'name': 'Royal Multi-Cuisine Gourmet Buffet', 'price': Decimal('1200.00'), 'pricing_mode': 'PER_GUEST', 'description': '5-course Indian, Oriental, and Continental banquet with live cooking stations and seafood grill.'},
            {'ship': ships['mv-ocean-pearl'], 'name': 'Master of Ceremonies & Event Coordinator', 'price': Decimal('8000.00'), 'pricing_mode': 'FIXED', 'description': 'Dedicated bilingual event manager and host for seamless timeline execution.'},
            {'ship': ships['mv-ocean-pearl'], 'name': 'Drone & 4K Cinematic Photography Package', 'price': Decimal('20000.00'), 'pricing_mode': 'FIXED', 'description': 'High-definition aerial drone footage and full day candid photography with edited video.'},
            {'ship': ships['mv-ocean-pearl'], 'name': 'Pre-Cruise Welcome Cocktail & Canapes', 'price': Decimal('600.00'), 'pricing_mode': 'PER_GUEST', 'description': 'Artisanal cocktails, mocktails, and chef-curated passed hors d’oeuvres on the observation deck.'},

            # For Arabian Celestial Empress
            {'ship': ships['arabian-celestial-empress'], 'name': 'Palace Wedding Decor & Royal Mandap', 'price': Decimal('45000.00'), 'pricing_mode': 'FIXED', 'description': 'Glass-floor mandap on the open helipad with imported flowers, ambient LED chandeliers and royal seating.'},
            {'ship': ships['arabian-celestial-empress'], 'name': 'Celebrity Live Band & Acoustic Ensemble', 'price': Decimal('35000.00'), 'pricing_mode': 'FIXED', 'description': 'Live 5-piece fusion band playing pop, Bollywood classics and international jazz.'},
            {'ship': ships['arabian-celestial-empress'], 'name': 'Imperial 7-Course Gala Dinner', 'price': Decimal('2200.00'), 'pricing_mode': 'PER_GUEST', 'description': 'Caviar, lobster, Awadhi slow-cooked biryanis, French patisserie and gold-leaf desserts.'},
            {'ship': ships['arabian-celestial-empress'], 'name': 'Conference Theatre AV & High-Speed Uplink', 'price': Decimal('25000.00'), 'pricing_mode': 'FIXED', 'description': '4K LED video wall (20x10 ft), simultaneous translation booths, and enterprise satellite internet.'},

            # For Coral Horizon Yacht Cruiser
            {'ship': ships['coral-horizon-yacht-cruiser'], 'name': 'Sunset Birthday Cake & Champagne Toast', 'price': Decimal('6000.00'), 'pricing_mode': 'FIXED', 'description': 'Custom designer tiered cake with French Moët champagne bottles.'},
            {'ship': ships['coral-horizon-yacht-cruiser'], 'name': 'Private On-Board Sushi & Teppanyaki Chef', 'price': Decimal('1800.00'), 'pricing_mode': 'PER_GUEST', 'description': 'Personalized live culinary showcase with fresh sashimi, wagyu skewers and tempura.'},
            {'ship': ships['coral-horizon-yacht-cruiser'], 'name': 'Jet Ski & Seabob Watersport Package', 'price': Decimal('10000.00'), 'pricing_mode': 'FIXED', 'description': '2 Sea-Doo jet skis and 2 Seabob water scooters with certified safety instructors.'},
        ]

        for ed in extras_data:
            ShipExtra.objects.update_or_create(
                ship=ed['ship'],
                name=ed['name'],
                defaults=ed
            )

        self.stdout.write(self.style.SUCCESS("[OK] Ship Extras configured in INR"))

        # 6. Scheduled Public Cruise Tours (Product B)
        today = date.today()
        tours_data = [
            {
                'ship': ships['mv-ocean-pearl'],
                'tour_title': 'Mumbai to Goa Coastal Carnival Cruise',
                'slug': 'mumbai-to-goa-coastal-carnival-cruise',
                'departure_port': 'Mumbai International Cruise Terminal',
                'destination': 'Goa (Mormugao)',
                'departure_date': today + timedelta(days=7),
                'departure_time': time(16, 0),
                'return_date': today + timedelta(days=10),
                'return_time': time(11, 0),
                'duration_days': 3,
                'total_capacity': 120,
                'booked_capacity': 18,
                'adult_price': Decimal('14999.00'),
                'child_price': Decimal('7999.00'),
                'itinerary': "Day 1: 4:00 PM Boarding at Mumbai. Sunset cocktail party and gala buffet.\nDay 2: Coastal navigation past Konkan fortresses. Poolside sundowner & live musical show.\nDay 3: Arrival at Mormugao Port Goa. Optional guided Old Goa spice plantation excursion.\nDay 4: Morning cruise arrival back in Mumbai Harbour.",
                'ports_of_call': 'Mumbai, Murud-Janjira, Mormugao (Goa)',
                'meals_included': 'All Gourmet Buffet Meals, High Tea & Midnight Snacks',
                'status': 'SCHEDULED',
                'is_published': True,
            },
            {
                'ship': ships['mv-ocean-pearl'],
                'tour_title': 'Diwali Starlight Arabian Sea Weekend Voyage',
                'slug': 'diwali-starlight-arabian-sea-weekend-voyage',
                'departure_port': 'Mumbai International Cruise Terminal',
                'destination': 'Arabian Sea High Seas Anchorage',
                'departure_date': today + timedelta(days=18),
                'departure_time': time(17, 30),
                'return_date': today + timedelta(days=20),
                'return_time': time(10, 0),
                'duration_days': 2,
                'total_capacity': 150,
                'booked_capacity': 42,
                'adult_price': Decimal('11500.00'),
                'child_price': Decimal('5999.00'),
                'itinerary': "Day 1: Embarkation & Starlight Deck Lantern Festival.\nDay 2: International Casino Night, Sundowner DJ deck party, and Chef's Special Fireworks Dinner.\nDay 3: Sunrise ocean meditation and return docking.",
                'ports_of_call': 'Mumbai, International Maritime Waters',
                'meals_included': 'Festive Indian & International Grand Buffet',
                'status': 'SCHEDULED',
                'is_published': True,
            },
            {
                'ship': ships['kochi-voyager-empress'],
                'tour_title': 'Lakshadweep Coral Archipelago Odyssey',
                'slug': 'lakshadweep-coral-archipelago-odyssey',
                'departure_port': 'Cochin Cruise Berth, Willingdon Island, Kochi',
                'destination': 'Kadmat & Kavaratti Islands',
                'departure_date': today + timedelta(days=12),
                'departure_time': time(14, 0),
                'return_date': today + timedelta(days=16),
                'return_time': time(12, 0),
                'duration_days': 4,
                'total_capacity': 80,
                'booked_capacity': 12,
                'adult_price': Decimal('24500.00'),
                'child_price': Decimal('12999.00'),
                'itinerary': "Day 1: Depart historic Kochi harbor.\nDay 2: Anchor at Kadmat Island lagoon. Scuba diving, kayaking, and white sand exploration.\nDay 3: Sail to Kavaratti. Marine life aquarium tour and glass bottom reef rides.\nDay 4: Open sea cruise back along the Malabar sunset.",
                'ports_of_call': 'Kochi, Kadmat Island, Kavaratti Island',
                'meals_included': 'Seafood Specialties & Traditional Kerala Thali + Continental',
                'status': 'SCHEDULED',
                'is_published': True,
            },
            {
                'ship': ships['arabian-celestial-empress'],
                'tour_title': 'Grand Goa & Karnataka Coastal Odyssey',
                'slug': 'grand-goa-karnataka-coastal-odyssey',
                'departure_port': 'Mormugao Port Cruise Terminal, Goa',
                'destination': 'Karwar, Mangalore & Goa',
                'departure_date': today + timedelta(days=25),
                'departure_time': time(15, 0),
                'return_date': today + timedelta(days=29),
                'return_time': time(9, 30),
                'duration_days': 4,
                'total_capacity': 200,
                'booked_capacity': 65,
                'adult_price': Decimal('18999.00'),
                'child_price': Decimal('9999.00'),
                'itinerary': "Day 1: Sail from Goa amidst carnival dancers and sunset cocktails.\nDay 2: Anchor at Karwar bay, watersports and secluded beach BBQ.\nDay 3: Dock at Mangalore, optional temple & coffee heritage tours.\nDay 4: Gala night at sea with Broadway-style musical performance.\nDay 5: Return to Mormugao.",
                'ports_of_call': 'Goa, Karwar, Mangalore',
                'meals_included': 'All Meals, Specialty Diners, 24/7 Room Service Buffet',
                'status': 'SCHEDULED',
                'is_published': True,
            },
            {
                'ship': ships['andaman-explorer-royal'],
                'tour_title': 'Andaman Island Hopper & Coral Reef Expedition',
                'slug': 'andaman-island-hopper-coral-reef-expedition',
                'departure_port': 'Haddo Cruise Wharf, Port Blair',
                'destination': 'Havelock, Neil & Ross Islands',
                'departure_date': today + timedelta(days=14),
                'departure_time': time(10, 0),
                'return_date': today + timedelta(days=18),
                'return_time': time(16, 0),
                'duration_days': 4,
                'total_capacity': 60,
                'booked_capacity': 24,
                'adult_price': Decimal('28500.00'),
                'child_price': Decimal('15000.00'),
                'itinerary': "Day 1: Embark Port Blair, cruise past Ross Island light and sound history.\nDay 2: Havelock Radhanagar beach & Elephant beach private boat snorkel.\nDay 3: Neil Island natural bridge and sea turtle sanctuary.\nDay 4: Coastal exploration and return to Port Blair.",
                'ports_of_call': 'Port Blair, Havelock Island, Neil Island',
                'meals_included': 'Fresh Island Catch, Organic Continental & Indian Buffets',
                'status': 'SCHEDULED',
                'is_published': True,
            }
        ]

        tours = {}
        for td in tours_data:
            tour, _ = PublicTour.objects.update_or_create(
                slug=td['slug'],
                defaults=td
            )
            tours[tour.slug] = tour

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(tours)} Scheduled Public Cruise Tours populated"))

        # 7. Promotional Offers & Coupons
        offers_data = [
            {
                'code': 'VOYAGE10',
                'title': '10% Inaugural Voyage Discount',
                'description': 'Enjoy 10% instant discount on any ship booking or cruise tour above ₹20,000.',
                'discount_type': 'PERCENTAGE',
                'discount_value': Decimal('10.00'),
                'min_booking_amount': Decimal('20000.00'),
                'max_discount_amount': Decimal('10000.00'),
                'valid_from': today - timedelta(days=30),
                'valid_to': today + timedelta(days=180),
                'is_active': True,
            },
            {
                'code': 'MONSOON2000',
                'title': 'Flat ₹2,000 Off Milestone Events',
                'description': 'Flat ₹2,000 discount on private ship charter events (Weddings, Birthdays, Corporate).',
                'discount_type': 'FIXED',
                'discount_value': Decimal('2000.00'),
                'min_booking_amount': Decimal('25000.00'),
                'max_discount_amount': Decimal('2000.00'),
                'valid_from': today - timedelta(days=15),
                'valid_to': today + timedelta(days=90),
                'is_active': True,
            },
            {
                'code': 'ROYAL5000',
                'title': 'Flat ₹5,000 Off Luxury Megayachts',
                'description': 'Exclusive flat ₹5,000 discount on bookings exceeding ₹75,000.',
                'discount_type': 'FIXED',
                'discount_value': Decimal('5000.00'),
                'min_booking_amount': Decimal('75000.00'),
                'max_discount_amount': Decimal('5000.00'),
                'valid_from': today - timedelta(days=10),
                'valid_to': today + timedelta(days=120),
                'is_active': True,
            }
        ]

        for od in offers_data:
            Offer.objects.update_or_create(
                code=od['code'],
                defaults=od
            )

        self.stdout.write(self.style.SUCCESS("[OK] Promotional Offers & Discount Coupons registered"))

        # 8. Sample Bookings (Both Product A: Private Charter & Product B: Public Tour Ticket)
        # Booking 1: User1 Private Charter on MV Ocean Pearl (Wedding Celebration)
        b1_date = today + timedelta(days=35)
        Booking.objects.filter(booking_id='CRS-2026-DEMO01').delete()
        b1 = Booking.objects.create(
            booking_id='CRS-2026-DEMO01',
            invoice_number='INV-2026-000101',
            user=user1,
            cross=ships['mv-ocean-pearl'],
            booking_date=b1_date,
            start_time=time(16, 0),
            end_time=time(22, 0),
            booking_type='EVENT',
            event_type='Wedding',
            event_package='Sapphire Royal Ceremony',
            cabin_type='Captain Penthouse Suite',
            number_of_people=120,
            adults_count=100,
            children_count=20,
            duration_hours=Decimal('6.0'),
            base_price=Decimal('85000.00'),
            subtotal=Decimal('85000.00'),
            extras_amount=Decimal('35000.00'),
            discount_amount=Decimal('5000.00'),
            tax_amount=Decimal('20700.00'),
            total_price=Decimal('135700.00'),
            promo_code='ROYAL5000',
            selected_extras=[
                {'name': 'Grand Floral & Thematic Deck Decoration', 'price': 15000, 'mode': 'FIXED'},
                {'name': 'Drone & 4K Cinematic Photography Package', 'price': 20000, 'mode': 'FIXED'},
            ],
            special_request="Mandap to be erected on deck 9 observatory. Jain food options requested for 25 guests.",
            status='CONFIRMED',
            tracking_status='CONFIRMED'
        )

        # Booking 2: User1 Public Cruise Tour Ticket on Mumbai-to-Goa Cruise
        mumbai_goa_tour = tours['mumbai-to-goa-coastal-carnival-cruise']
        Booking.objects.filter(booking_id='CRS-2026-DEMO02').delete()
        b2 = Booking.objects.create(
            booking_id='CRS-2026-DEMO02',
            invoice_number='INV-2026-000102',
            user=user1,
            cross=mumbai_goa_tour.ship,
            public_tour=mumbai_goa_tour,
            booking_date=mumbai_goa_tour.departure_date,
            start_time=mumbai_goa_tour.departure_time,
            end_time=mumbai_goa_tour.return_time,
            booking_type='TOUR',
            cabin_type='Oceanview Balcony Stateroom',
            number_of_people=3,
            adults_count=2,
            children_count=1,
            duration_hours=Decimal('72.0'),
            base_price=mumbai_goa_tour.adult_price * 2 + mumbai_goa_tour.child_price,  # 14999*2 + 7999 = 37997
            subtotal=Decimal('37997.00'),
            extras_amount=Decimal('0.00'),
            discount_amount=Decimal('3799.70'),
            tax_amount=Decimal('6155.51'),
            total_price=Decimal('40352.81'),
            promo_code='VOYAGE10',
            selected_extras=[],
            special_request="Anniversary celebration onboard. Requesting floral bouquet in stateroom.",
            status='CONFIRMED',
            tracking_status='CONFIRMED'
        )

        # Booking 3: User2 Private Charter Birthday on Coral Horizon Yacht
        b3_date = today + timedelta(days=15)
        Booking.objects.filter(booking_id='CRS-2026-DEMO03').delete()
        b3 = Booking.objects.create(
            booking_id='CRS-2026-DEMO03',
            invoice_number='INV-2026-000103',
            user=user2,
            cross=ships['coral-horizon-yacht-cruiser'],
            booking_date=b3_date,
            start_time=time(17, 0),
            end_time=time(21, 0),
            booking_type='EVENT',
            event_type='Birthday',
            event_package='Starlight Horizon Bash',
            cabin_type='VIP Bow Saloon',
            number_of_people=30,
            adults_count=28,
            children_count=2,
            duration_hours=Decimal('4.0'),
            base_price=Decimal('65000.00'),
            subtotal=Decimal('65000.00'),
            extras_amount=Decimal('16000.00'),
            discount_amount=Decimal('2000.00'),
            tax_amount=Decimal('14220.00'),
            total_price=Decimal('93220.00'),
            promo_code='MONSOON2000',
            selected_extras=[
                {'name': 'Sunset Birthday Cake & Champagne Toast', 'price': 6000, 'mode': 'FIXED'},
                {'name': 'Jet Ski & Seabob Watersport Package', 'price': 10000, 'mode': 'FIXED'},
            ],
            special_request="High energy party playlist. 30th birthday celebration.",
            status='PENDING',
            tracking_status='BOOKED'
        )

        # 9. Reviews
        CrossReview.objects.update_or_create(
            booking=b1,
            defaults={
                'cross': ships['mv-ocean-pearl'],
                'user': user1,
                'rating': 5,
                'comment': 'Unbelievable experience! We hosted our wedding reception on the MV Ocean Pearl in Mumbai. The team executed the decorations, catering, and sunset gala beyond our expectations. All 120 guests were spellbound!',
            }
        )

        self.stdout.write(self.style.SUCCESS("[OK] Demo Bookings (Private + Public Tour) and Reviews seeded in database"))
        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
