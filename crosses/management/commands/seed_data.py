from decimal import Decimal
from datetime import date, time, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from crosses.models import Cross, CrossReview
from bookings.models import Booking

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds database with realistic demo users, Cruise Ships, tour/event bookings, and reviews."

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seeding for Cruise Hunt...")

        # 1. Create Superuser / Admin
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@crosshunt.com',
                'first_name': 'Eleanor',
                'last_name': 'Vance (Fleet Admin)',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'phone': '+1 (555) 019-2831',
            }
        )
        admin_user.set_password('Admin@12345')
        admin_user.role = 'ADMIN'
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        # 2. Create Cruise Operators
        owner1, _ = User.objects.get_or_create(
            username='owner1',
            defaults={
                'email': 'owner1@crosshunt.com',
                'first_name': 'Captain Marcus',
                'last_name': 'Sterling',
                'role': 'CROSS_OWNER',
                'phone': '+1 (555) 234-5678',
                'is_approved_owner': True,
            }
        )
        owner1.set_password('Owner@12345')
        owner1.save()

        owner2, _ = User.objects.get_or_create(
            username='owner2',
            defaults={
                'email': 'owner2@crosshunt.com',
                'first_name': 'Seraphina',
                'last_name': 'Chen (Fleet Director)',
                'role': 'CROSS_OWNER',
                'phone': '+1 (555) 345-6789',
                'is_approved_owner': True,
            }
        )
        owner2.set_password('Owner@12345')
        owner2.save()

        # 3. Create Regular Guests / Customers
        users_data = [
            ('user1', 'user1@crosshunt.com', 'Alex', 'Rivera'),
            ('user2', 'user2@crosshunt.com', 'Jessica', 'Taylor'),
            ('user3', 'user3@crosshunt.com', 'David', 'Kim'),
            ('user4', 'user4@crosshunt.com', 'Priya', 'Patel'),
            ('user5', 'user5@crosshunt.com', 'Liam', 'O’Connor'),
        ]
        user_objs = []
        for uname, uemail, ufirst, ulast in users_data:
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults={
                    'email': uemail,
                    'first_name': ufirst,
                    'last_name': ulast,
                    'role': 'USER',
                    'phone': '+1 (555) 456-7890',
                }
            )
            u.set_password('User@12345')
            u.save()
            user_objs.append(u)

        # 4. Create Luxury Cruise Ships
        cruise_ships = [
            {
                'owner': owner1,
                'name': 'MS Horizon Empress',
                'category': 'Luxury Ocean Cruise',
                'destination': 'Caribbean Paradise',
                'route': 'Miami - Nassau (Bahamas) - St. Thomas - San Juan - Miami',
                'departure_port': 'Port of Miami, Terminal A',
                'location': 'Miami, Florida',
                'address': 'Port of Miami, 1015 North America Way, Miami, FL 33132',
                'price': Decimal('320.00'),
                'capacity': 1850,
                'duration_days': 7,
                'ship_length_meters': 345,
                'decks_count': 18,
                'image_url': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=80',
                'facilities': 'Helipad, Infinity Glass Pool, Broadway Theatre, Full-Service Ocean Spa, Casino Royale, 12 Specialty Restaurants, Star Gazing Observatory, Butler Stateroom Concierge',
                'rules': 'Formal evening attire for Captain’s Gala. Valid international passport required. Non-smoking in all staterooms and balconies.',
                'description': 'The flagship of the Cross Hunt fleet. Featuring revolutionary architectural glass facades, panoramic sky lounges, and Michelin-inspired culinary experiences across the azure waters of the Caribbean.',
                'itinerary_highlights': "Day 1: Embarkation in Miami & Sunset Champagne Sail-Away\nDay 2: At Sea – Spa Wellness & Broadway Theatre Gala\nDay 3: Nassau, Bahamas – Private Island Catamaran Excursion\nDay 4: St. Thomas – Magens Bay Coral Reef Snorkel\nDay 5: San Juan, Puerto Rico – Historic Fortress Twilight Tour\nDay 6: At Sea – Captain's Grand Gala Dinner\nDay 7: Disembarkation at Port of Miami",
                'dining_venues': "The Grand Sovereign Dining Room, Chef's Atelier Tasting Menu, Le Cirque French Bistro, Ocean Horizon Lido Market, Wave Bar & Grill",
                'entertainment': "West End Musical Production, Cirque de la Mer Acrobatic Show, Starlight Jazz Speakeasy, Ocean Cinema under the Stars",
            },
            {
                'owner': owner1,
                'name': 'Sovereign of the Aegean',
                'category': 'Luxury Ocean Cruise',
                'destination': 'Greek Isles & Mediterranean',
                'route': 'Athens (Piraeus) - Santorini - Mykonos - Rhodes - Crete - Athens',
                'departure_port': 'Port of Piraeus, Athens',
                'location': 'Athens, Greece',
                'address': 'Piraeus Port Terminal 2, Akti Miaouli 10, Athens, Greece',
                'price': Decimal('290.00'),
                'capacity': 1400,
                'duration_days': 6,
                'ship_length_meters': 298,
                'decks_count': 15,
                'image_url': 'https://images.unsplash.com/photo-1517400508447-88cca5574293?auto=format&fit=crop&w=1200&q=80',
                'facilities': 'Marble Atrium, Thalassotherapy Pool, Wine Tasting Cellar, Amphitheatre, Solarium, VIP Cabana Deck, Water Sports Marina',
                'rules': 'Passport validity minimum 6 months. Casual elegant resort wear in dining venues after 6 PM.',
                'description': 'Sail through classical mythology and sun-bleached coastal villages aboard a vessel designed for intimate Mediterranean grandeur and unforgettable sunsets.',
                'itinerary_highlights': "Day 1: Depart Athens Historic Harbor\nDay 2: Santorini Caldera Cruise & Oia Sunset Dinner\nDay 3: Mykonos Windmills & Beach Club Access\nDay 4: Medieval Old Town of Rhodes Exploration\nDay 5: Heraklion, Crete & Palace of Knossos\nDay 6: Return to Athens",
                'dining_venues': "Olympus Prime Dining, Aegean Seafood Market, Taverna Akropolis, Mediterranean Wine Terrace",
                'entertainment': "Greek Sirtaki Live Orchestra, Classical Strings at Sunset, Starlight Amphitheatre",
            },
            {
                'owner': owner1,
                'name': 'Nordic Glacier Explorer',
                'category': 'Expedition Cruise',
                'destination': 'Norwegian Fjords & Arctic',
                'route': 'Bergen - Geirangerfjord - Flam - Alesund - Tromso - Bergen',
                'departure_port': 'Bergen Cruise Port, Norway',
                'location': 'Bergen, Norway',
                'address': 'Skoltegrunskaien 1, 5003 Bergen, Norway',
                'price': Decimal('410.00'),
                'capacity': 650,
                'duration_days': 8,
                'ship_length_meters': 210,
                'decks_count': 10,
                'image_url': 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
                'facilities': 'Polar Class 1A Ice Hull, Forward Observation Lounge, Heated Horizon Jacuzzis, Expedition Zodiac Boats, Science Lab, Saunas',
                'rules': 'Expedition parkas provided on board. Strict environmental wildlife proximity regulations apply.',
                'description': 'An ice-strengthened luxury expedition vessel carrying naturalists and polar guides into mystical glacial fjords, thunderous waterfalls, and the Aurora Borealis.',
                'itinerary_highlights': "Day 1: Embarkation in Historic Bryggen, Bergen\nDay 2: Sailing the UNESCO Geirangerfjord & Seven Sisters\nDay 3: Flam Alpine Railway Scenic Excursion\nDay 4: Alesund Art Nouveau Architecture & Kayaking\nDay 5: Arctic Circle Crossing & Midnight Sun Viewing\nDay 6: Tromso Husky Sledding & Aurora Science Lab\nDay 7: Southward Glacier Passage\nDay 8: Disembarkation in Bergen",
                'dining_venues': "Fjord & Forest Fine Dining, Arctic Catch Seafood Bar, Aurora Observation Grill",
                'entertainment': "Marine Biologist Lectures, Northern Lights Stargazing, Acoustic Folk Performances",
            },
            {
                'owner': owner2,
                'name': 'Celestia Grand Yacht',
                'category': 'Private Charter Yacht',
                'destination': 'French Riviera & Monaco',
                'route': 'Nice - Cannes - Saint-Tropez - Monaco - Nice',
                'departure_port': 'Port Lympia, Nice, France',
                'location': 'Cote d’Azur, France',
                'address': 'Quai Amiral Infernet, 06300 Nice, France',
                'price': Decimal('550.00'),
                'capacity': 180,
                'duration_days': 3,
                'ship_length_meters': 140,
                'decks_count': 6,
                'image_url': 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
                'facilities': 'Hydraulic Teak Swim Platform, SeaBobs, Jet Skis, Champagne Bar, Helipad, Master Penthouse Suite, Private Cinema',
                'rules': 'Barefoot or white boat shoes only on exterior teak decks. Maximum 180 guests for private charters.',
                'description': 'Exclusive mega-yacht crafted for private weddings, high-society galas, corporate leadership summits, and VIP harbor charters along the Cote d’Azur.',
                'itinerary_highlights': "Day 1: Welcome Champagne in Nice & Twilight Cruise to Cannes\nDay 2: Private Anchor in Saint-Tropez Bay & Beach Club Party\nDay 3: Grand Prix Harbor Mooring in Monaco & Gala Reception",
                'dining_venues': "Le Riviera Private Salon, Top-Deck Caviar & Champagne Lounge, Teppanyaki at Sea",
                'entertainment': "Private DJ Rig, Live Saxophone Trio, Aerial Drone Video Experience",
            },
            {
                'owner': owner2,
                'name': 'Coral Odyssey Liner',
                'category': 'Island Hopper Cruise',
                'destination': 'South Pacific & Tahiti',
                'route': 'Papeete (Tahiti) - Moorea - Bora Bora - Raiatea - Papeete',
                'departure_port': 'Port Autonome de Papeete, Tahiti',
                'location': 'French Polynesia',
                'address': 'Boulevard Pomare, Papeete 98713, French Polynesia',
                'price': Decimal('360.00'),
                'capacity': 920,
                'duration_days': 7,
                'ship_length_meters': 260,
                'decks_count': 12,
                'image_url': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
                'facilities': 'Overwater Lagoon Platform, Glass-Bottom Observation Bar, Polynesian Spa, Scuba Diving Center, Outdoor Cinema',
                'rules': 'Reef-safe sunscreen required. Lifejackets mandatory on lagoon tenders.',
                'description': 'Experience the turquoise lagoons and volcanic peaks of French Polynesia with over-lagoon balconies, Polynesian cultural masters, and pristine scuba diving.',
                'itinerary_highlights': "Day 1: Embarkation in Papeete & Tahitian Ukulele Welcome\nDay 2: Moorea Island Snorkeling with Manta Rays\nDay 3: Bora Bora Lagoon Cruise & Private Motu Picnic\nDay 4: Bora Bora Sunset Romantic Sailing\nDay 5: Raiatea Sacred Temple of Taputapuatea Excursion\nDay 6: At Sea – Polynesian Craft Workshop & Luau\nDay 7: Disembarkation in Papeete",
                'dining_venues': "Lagon Bleu Polynesian Gourmet, Moana Fish Grill, Vanilla Terrace",
                'entertainment': "Traditional Polynesian Fire Dancers, Starlight Acoustic Ukulele, Island Storytelling",
            },
            {
                'owner': owner2,
                'name': 'Pacific Constellation',
                'category': 'Mega Cruise Liner',
                'destination': 'Alaska Glacier Bay',
                'route': 'Seattle - Juneau - Skagway - Glacier Bay - Ketchikan - Victoria - Seattle',
                'departure_port': 'Port of Seattle, Pier 91',
                'location': 'Seattle, Washington',
                'address': '2001 W Garfield St, Seattle, WA 98119',
                'price': Decimal('275.00'),
                'capacity': 2400,
                'duration_days': 7,
                'ship_length_meters': 360,
                'decks_count': 20,
                'image_url': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
                'facilities': 'Enclosed Glass Atrium, Glacier Viewing Promenade, Thermal Suite, Ice Skating Rink, Laser Tag, 16 Lounges',
                'rules': 'Layered cold-weather gear advised for glacier decks. Binoculars available at concierge desk.',
                'description': 'A magnificent floating resort designed to sail right alongside calving glaciers, towering fjords, and breaching whales in Alaska’s untamed wilderness.',
                'itinerary_highlights': "Day 1: Depart Seattle Waterfront\nDay 2: Scenic Inside Passage Sailing\nDay 3: Juneau Mendenhall Glacier & Whale Watching\nDay 4: Skagway Gold Rush Heritage Train\nDay 5: Full Day Glacier Bay National Park Cruising\nDay 6: Ketchikan Totem Bight & Salmon Tasting\nDay 7: Victoria, BC Butchart Gardens & Return to Seattle",
                'dining_venues': "Great North Dining Hall, Glacier Steakhouse, Alaskan Crab Shack, Cascade Coffee Bar",
                'entertainment': "Broadway on Ice Spectacular, National Park Ranger Talks, Live Rock Tribute Bands",
            },
        ]

        created_ships = []
        for sdata in cruise_ships:
            ship, _ = Cross.objects.update_or_create(
                name=sdata['name'],
                defaults=sdata
            )
            created_ships.append(ship)
        self.stdout.write(self.style.SUCCESS(f"{len(created_ships)} Cruise Ships configured and verified."))

        # 5. Seed Tour and Event Bookings
        today = date.today()

        # Tour Booking 1 (Completed)
        b1, _ = Booking.objects.update_or_create(
            booking_id='CRS-2026-CRZ001',
            defaults={
                'user': user_objs[0],
                'cross': created_ships[0],
                'booking_type': 'TOUR',
                'cabin_type': 'Grand Presidential Ocean Suite',
                'booking_date': today - timedelta(days=12),
                'start_time': time(14, 0),
                'end_time': time(18, 0),
                'duration_hours': Decimal('72.00'),
                'base_price': created_ships[0].price,
                'total_price': Decimal('2240.00'),
                'number_of_people': 2,
                'status': 'COMPLETED',
                'special_request': 'Anniversary bottle of Dom Perignon in suite upon embarkation.',
            }
        )

        # Private Event Booking 2 (Confirmed)
        b2, _ = Booking.objects.update_or_create(
            booking_id='CRS-2026-EVT002',
            defaults={
                'user': user_objs[1],
                'cross': created_ships[3],
                'booking_type': 'EVENT',
                'event_type': 'Ocean Wedding Ceremony & Gala',
                'event_package': 'Diamond Horizon (Ultra-Luxury)',
                'cabin_type': 'Master Penthouse Suite',
                'booking_date': today + timedelta(days=15),
                'start_time': time(16, 0),
                'end_time': time(23, 0),
                'duration_hours': Decimal('7.00'),
                'base_price': created_ships[3].price,
                'total_price': Decimal('5850.00'),
                'number_of_people': 95,
                'status': 'CONFIRMED',
                'special_request': 'Floral arch on top deck at 17:30 sunset. Harpist and cocktail reception.',
            }
        )

        # Tour Booking 3 (Pending)
        b3, _ = Booking.objects.update_or_create(
            booking_id='CRS-2026-CRZ003',
            defaults={
                'user': user_objs[2],
                'cross': created_ships[1],
                'booking_type': 'TOUR',
                'cabin_type': 'Royal Panoramic Balcony',
                'booking_date': today + timedelta(days=22),
                'start_time': time(12, 0),
                'end_time': time(18, 0),
                'duration_hours': Decimal('48.00'),
                'base_price': created_ships[1].price,
                'total_price': Decimal('1740.00'),
                'number_of_people': 2,
                'status': 'PENDING',
                'special_request': 'Santorini private catamaran excursion reservation.',
            }
        )

        # Private Event Booking 4 (Completed)
        b4, _ = Booking.objects.update_or_create(
            booking_id='CRS-2026-EVT004',
            defaults={
                'user': user_objs[3],
                'cross': created_ships[2],
                'booking_type': 'EVENT',
                'event_type': 'Corporate Leadership Summit',
                'event_package': 'Emerald Wave Executive',
                'cabin_type': 'Deluxe Oceanview Stateroom',
                'booking_date': today - timedelta(days=6),
                'start_time': time(9, 0),
                'end_time': time(17, 0),
                'duration_hours': Decimal('8.00'),
                'base_price': created_ships[2].price,
                'total_price': Decimal('3280.00'),
                'number_of_people': 40,
                'status': 'COMPLETED',
                'special_request': 'Dual laser presentation screens and high-bandwidth satellite uplink.',
            }
        )

        # Tour Booking 5 (Cancelled)
        b5, _ = Booking.objects.update_or_create(
            booking_id='CRS-2026-CRZ005',
            defaults={
                'user': user_objs[4],
                'cross': created_ships[4],
                'booking_type': 'TOUR',
                'cabin_type': 'Signature Interior Stateroom',
                'booking_date': today + timedelta(days=35),
                'start_time': time(10, 0),
                'end_time': time(14, 0),
                'duration_hours': Decimal('24.00'),
                'base_price': created_ships[4].price,
                'total_price': Decimal('1080.00'),
                'number_of_people': 1,
                'status': 'CANCELLED',
                'cancellation_reason': 'Business conference rescheduled.',
            }
        )

        self.stdout.write(self.style.SUCCESS("Cruise Tour and Private Event bookings populated."))

        # 6. Add Reviews for Completed Voyages
        if not hasattr(b1, 'review') and not CrossReview.objects.filter(booking=b1).exists():
            CrossReview.objects.create(
                cross=b1.cross,
                user=b1.user,
                booking=b1,
                rating=5,
                comment="The MS Horizon Empress was pure maritime perfection! The private veranda on the Grand Presidential Suite offered panoramic ocean views every morning, and Captain Marcus ensured our voyage was extraordinary."
            )

        if not hasattr(b4, 'review') and not CrossReview.objects.filter(booking=b4).exists():
            CrossReview.objects.create(
                cross=b4.cross,
                user=b4.user,
                booking=b4,
                rating=5,
                comment="Hosting our executive retreat aboard the Nordic Glacier Explorer was the best corporate decision we made this year. Flawless AV equipment, breathtaking fjord scenery, and stellar dining."
            )

        self.stdout.write(self.style.SUCCESS("Verified voyage reviews configured."))
        self.stdout.write(self.style.SUCCESS("Cruise Hunt database seeding completed successfully!"))
