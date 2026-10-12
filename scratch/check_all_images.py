import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cross_booking.settings')
import django
django.setup()

from crosses.models import Cross, PublicTour

print(f"Total Vessels: {Cross.objects.count()}")
print(f"Total Tours: {PublicTour.objects.count()}")

print("\n--- ALL VESSELS ---")
for s in Cross.objects.all().order_by('id'):
    print(f"Vessel {s.id}: {s.name} | category: {s.category} | img_url: {s.image_url}")

print("\n--- ALL PUBLIC TOURS ---")
for t in PublicTour.objects.all().order_by('id'):
    print(f"Tour {t.id}: {t.tour_title} | ship: {t.ship.name} | img_url: {t.image_url}")
