from decimal import Decimal
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from crosses.models import Cross

User = get_user_model()


class CrossesTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username='crossowner',
            email='crossowner@example.com',
            password='OwnerPassword@123',
            role='CROSS_OWNER'
        )
        self.other_owner = User.objects.create_user(
            username='otherowner',
            email='otherowner@example.com',
            password='OwnerPassword@123',
            role='CROSS_OWNER'
        )
        self.regular_user = User.objects.create_user(
            username='regularuser',
            email='regular@example.com',
            password='UserPassword@123',
            role='USER'
        )
        self.cross = Cross.objects.create(
            owner=self.owner,
            name='Test Cross Arena',
            category='Luxury Ocean Cruise',
            location='Metro Central',
            address='100 Metro Way',
            price=Decimal('50.00'),
            capacity=100,
            facilities='Wi-Fi, Parking',
            rules='No smoking',
            is_active=True
        )

    def test_5_cross_creation_by_owner(self):
        """Test owner can successfully create a new Cross listing."""
        self.client.login(username='crossowner', password='OwnerPassword@123')
        response = self.client.post(reverse('cross_create'), {
            'name': 'New Sunset Hall',
            'category': 'Scenic Coastal Cruise',
            'location': 'Westside',
            'address': '450 Sunset Blvd',
            'price': '65.00',
            'capacity': '80',
            'facilities': 'Sound System, Restrooms',
            'rules': 'Keep clean',
            'cancellation_policy': 'Standard policy',
            'is_active': True,
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Cross.objects.filter(name='New Sunset Hall').exists())

    def test_6_cross_editing_by_owner(self):
        """Test owner can update their own Cross listing."""
        self.client.login(username='crossowner', password='OwnerPassword@123')
        response = self.client.post(reverse('cross_update', kwargs={'pk': self.cross.pk}), {
            'name': 'Updated Cross Arena Name',
            'category': 'Luxury Ocean Cruise',
            'location': 'Metro Central',
            'address': '100 Metro Way',
            'price': '80.00',
            'capacity': '120',
            'facilities': 'Wi-Fi, Parking, Locker Room',
            'rules': 'No smoking',
            'cancellation_policy': 'Updated cancellation policy',
            'is_active': True,
        })
        self.assertEqual(response.status_code, 302)
        self.cross.refresh_from_db()
        self.assertEqual(self.cross.name, 'Updated Cross Arena Name')
        self.assertEqual(self.cross.price, Decimal('80.00'))

    def test_cross_editing_unauthorized_owner_denied(self):
        """Test owner cannot edit another owner's Cross."""
        self.client.login(username='otherowner', password='OwnerPassword@123')
        response = self.client.post(reverse('cross_update', kwargs={'pk': self.cross.pk}), {
            'name': 'Hacked Cross Name',
            'category': 'Luxury Ocean Cruise',
            'location': 'Metro Central',
            'address': '100 Metro Way',
            'price': '1.00',
            'capacity': '100',
            'is_active': True,
        })
        self.cross.refresh_from_db()
        self.assertNotEqual(self.cross.name, 'Hacked Cross Name')

    def test_regular_user_cannot_access_cross_create(self):
        """Regular user without owner role must be redirected away from cross creation."""
        self.client.login(username='regularuser', password='UserPassword@123')
        response = self.client.get(reverse('cross_create'))
        self.assertEqual(response.status_code, 302)
