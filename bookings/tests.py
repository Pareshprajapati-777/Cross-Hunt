from decimal import Decimal
from datetime import date, time, timedelta
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from crosses.models import Cross, CrossReview
from bookings.models import Booking

User = get_user_model()


class BookingsTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username='owner_booking_test',
            email='owner_booking@example.com',
            password='OwnerPassword@123',
            role='CROSS_OWNER'
        )
        self.customer1 = User.objects.create_user(
            username='customer1',
            email='customer1@example.com',
            password='CustomerPassword@123',
            role='USER'
        )
        self.customer2 = User.objects.create_user(
            username='customer2',
            email='customer2@example.com',
            password='CustomerPassword@123',
            role='USER'
        )
        self.cross = Cross.objects.create(
            owner=self.owner,
            name='Alpha Cross Center',
            category='Luxury Ocean Cruise',
            location='Civic Square',
            address='12 Civic Avenue',
            price=Decimal('60.00'),
            capacity=50,
            is_active=True
        )

    def test_7_user_booking_success(self):
        """Test regular user can book a Cross."""
        self.client.login(username='customer1', password='CustomerPassword@123')
        target_date = date.today() + timedelta(days=5)
        response = self.client.post(reverse('booking_create', kwargs={'slug': self.cross.slug}), {
            'booking_date': target_date.strftime('%Y-%m-%d'),
            'start_time': '10:00',
            'end_time': '12:00',
            'number_of_people': 25,
            'special_request': 'Table setup near windows',
        })
        self.assertEqual(response.status_code, 302)
        booking = Booking.objects.filter(user=self.customer1, cross=self.cross).first()
        self.assertIsNotNone(booking)
        self.assertEqual(booking.status, 'PENDING')
        self.assertEqual(booking.duration_hours, Decimal('2.00'))
        self.assertEqual(booking.total_price, Decimal('120.00'))

    def test_8_invalid_booking_past_date_or_inverted_time(self):
        """Test booking fails when selecting past date or end time before start time."""
        self.client.login(username='customer1', password='CustomerPassword@123')
        past_date = date.today() - timedelta(days=1)
        response = self.client.post(reverse('booking_create', kwargs={'slug': self.cross.slug}), {
            'booking_date': past_date.strftime('%Y-%m-%d'),
            'start_time': '10:00',
            'end_time': '12:00',
            'number_of_people': 10,
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Booking.objects.filter(user=self.customer1, booking_date=past_date).exists())

        # Inverted time
        future_date = date.today() + timedelta(days=2)
        response = self.client.post(reverse('booking_create', kwargs={'slug': self.cross.slug}), {
            'booking_date': future_date.strftime('%Y-%m-%d'),
            'start_time': '14:00',
            'end_time': '11:00',  # End before start
            'number_of_people': 10,
        })
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Booking.objects.filter(user=self.customer1, booking_date=future_date).exists())

    def test_9_double_booking_prevention(self):
        """Test that overlapping slots for the same Cross and date are strictly rejected."""
        target_date = date.today() + timedelta(days=7)
        # Existing confirmed booking from 14:00 to 17:00
        Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=target_date,
            start_time=time(14, 0),
            end_time=time(17, 0),
            duration_hours=Decimal('3.00'),
            base_price=Decimal('60.00'),
            total_price=Decimal('180.00'),
            number_of_people=20,
            status='CONFIRMED'
        )

        # Customer 2 attempts to book 15:00 to 18:00 (overlapping)
        self.client.login(username='customer2', password='CustomerPassword@123')
        response = self.client.post(reverse('booking_create', kwargs={'slug': self.cross.slug}), {
            'booking_date': target_date.strftime('%Y-%m-%d'),
            'start_time': '15:00',
            'end_time': '18:00',
            'number_of_people': 15,
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "already booked for the selected time")
        self.assertFalse(Booking.objects.filter(user=self.customer2, booking_date=target_date).exists())

    def test_10_capacity_validation(self):
        """Test booking fails when number of people exceeds Cross capacity."""
        self.client.login(username='customer1', password='CustomerPassword@123')
        target_date = date.today() + timedelta(days=4)
        response = self.client.post(reverse('booking_create', kwargs={'slug': self.cross.slug}), {
            'booking_date': target_date.strftime('%Y-%m-%d'),
            'start_time': '09:00',
            'end_time': '11:00',
            'number_of_people': 100,  # Capacity is 50
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "exceeds maximum capacity")
        self.assertFalse(Booking.objects.filter(user=self.customer1, booking_date=target_date).exists())

    def test_11_booking_cancellation(self):
        """Test customer can cancel their upcoming booking."""
        target_date = date.today() + timedelta(days=10)
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=target_date,
            start_time=time(10, 0),
            end_time=time(12, 0),
            duration_hours=Decimal('2.00'),
            base_price=Decimal('60.00'),
            total_price=Decimal('120.00'),
            number_of_people=10,
            status='CONFIRMED'
        )

        self.client.login(username='customer1', password='CustomerPassword@123')
        response = self.client.post(reverse('booking_cancel', kwargs={'booking_id': booking.booking_id}), {
            'reason': 'Change of plans'
        })
        self.assertEqual(response.status_code, 302)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'CANCELLED')
        self.assertEqual(booking.cancellation_reason, 'Change of plans')

    def test_12_unauthorized_cancellation_denied(self):
        """Test customer 2 cannot cancel customer 1's booking."""
        target_date = date.today() + timedelta(days=10)
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=target_date,
            start_time=time(10, 0),
            end_time=time(12, 0),
            duration_hours=Decimal('2.00'),
            base_price=Decimal('60.00'),
            total_price=Decimal('120.00'),
            number_of_people=10,
            status='CONFIRMED'
        )

        self.client.login(username='customer2', password='CustomerPassword@123')
        response = self.client.post(reverse('booking_cancel', kwargs={'booking_id': booking.booking_id}), {
            'reason': 'Malicious attempt'
        })
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'CONFIRMED')

    def test_13_review_permission_only_for_completed(self):
        """Test reviews are permitted only for completed bookings."""
        # Booking that is only confirmed (not completed)
        target_date = date.today() + timedelta(days=1)
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=target_date,
            start_time=time(10, 0),
            end_time=time(12, 0),
            duration_hours=Decimal('2.00'),
            base_price=Decimal('60.00'),
            total_price=Decimal('120.00'),
            number_of_people=10,
            status='CONFIRMED'
        )

        self.client.login(username='customer1', password='CustomerPassword@123')
        response = self.client.post(reverse('add_review', kwargs={'booking_id': booking.booking_id}), {
            'rating': 5,
            'comment': 'Premature review attempt'
        })
        self.assertEqual(response.status_code, 302)
        self.assertFalse(CrossReview.objects.filter(booking=booking).exists())

        # Now mark booking COMPLETED
        booking.status = 'COMPLETED'
        booking.save()

        response = self.client.post(reverse('add_review', kwargs={'booking_id': booking.booking_id}), {
            'rating': 5,
            'comment': 'Legitimate completed review!'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(CrossReview.objects.filter(booking=booking).exists())

    def test_14_server_side_price_calculation(self):
        """Test total price is strictly calculated server side regardless of any input."""
        self.client.login(username='customer1', password='CustomerPassword@123')
        target_date = date.today() + timedelta(days=12)
        # Rate is 60.00/hr, slot is 3 hours: 10:00 to 13:00 -> expected total = 180.00
        self.client.post(reverse('booking_create', kwargs={'slug': self.cross.slug}), {
            'booking_date': target_date.strftime('%Y-%m-%d'),
            'start_time': '10:00',
            'end_time': '13:00',
            'number_of_people': 15,
            'total_price': '1.00',  # Tampered frontend price
        })
        booking = Booking.objects.filter(user=self.customer1, booking_date=target_date).first()
        self.assertIsNotNone(booking)
        self.assertEqual(booking.total_price, Decimal('180.00'))
