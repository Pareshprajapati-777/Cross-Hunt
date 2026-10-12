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

    def test_15_whatsapp_phone_normalization_and_validation(self):
        """Test normalization and validation of WhatsApp mobile numbers."""
        from bookings.whatsapp_service import normalize_whatsapp_number, is_valid_whatsapp_mobile, mask_whatsapp_number

        # 10-digit Indian numbers
        self.assertEqual(normalize_whatsapp_number('9876543210'), '+919876543210')
        self.assertTrue(is_valid_whatsapp_mobile('9876543210'))

        # 11-digit number with leading 0
        self.assertEqual(normalize_whatsapp_number('09876543210'), '+919876543210')

        # Existing international country code
        self.assertEqual(normalize_whatsapp_number('+91 98765 43210'), '+919876543210')
        self.assertEqual(normalize_whatsapp_number('+971501234567'), '+971501234567')

        # Invalid formats
        self.assertIsNone(normalize_whatsapp_number('12345'))
        self.assertFalse(is_valid_whatsapp_mobile('abc'))

        # Masking for privacy
        masked = mask_whatsapp_number('+919876543210')
        self.assertIn('••••••', masked)
        self.assertTrue(masked.endswith('3210'))

    def test_16_whatsapp_message_template_rich_content(self):
        """Test that the reminder message contains all required fields: customer name, ship/tour, date/time, route, ticket code, boarding info."""
        from bookings.whatsapp_service import build_tour_reminder_text
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=date.today() + timedelta(days=1),
            start_time=time(15, 30),
            end_time=time(19, 30),
            total_price=Decimal('240.00'),
            base_price=Decimal('60.00'),
            number_of_people=4,
            ticket_code='TK-DEMO99',
            customer_whatsapp='+919876543210',
            status='CONFIRMED'
        )

        msg = build_tour_reminder_text(booking)
        # Verify customer name
        self.assertIn(self.customer1.username, msg)
        # Verify vessel / tour name
        self.assertIn(self.cross.name, msg)
        # Verify date & time
        self.assertIn('03:30 PM', msg)
        # Verify ticket / booking code
        self.assertIn('TK-DEMO99', msg)
        # Verify boarding instructions
        self.assertIn('Boarding Instructions', msg)
        self.assertIn('30 minutes prior', msg)

    def test_17_booking_creation_with_whatsapp_number_and_consent(self):
        """Test saving verified WhatsApp number and opt-in consent during booking creation."""
        import json
        self.client.login(username='customer1', password='CustomerPassword@123')
        target_date = date.today() + timedelta(days=3)
        res = self.client.post('/api/bookings/create/', json.dumps({
            'cruise_id': self.cross.id,
            'booking_type': 'EVENT',
            'booking_date': target_date.strftime('%Y-%m-%d'),
            'start_time': '11:00',
            'end_time': '14:00',
            'adults_count': 2,
            'customer_whatsapp': '9820012345',
            'whatsapp_reminder_opt_in': True
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['booking']['customer_whatsapp'], '+919820012345')
        self.assertTrue(data['booking']['whatsapp_reminder_opt_in'])
        self.assertEqual(data['booking']['whatsapp_reminder_status'], 'SCHEDULED')

    def test_18_customer_whatsapp_opt_in_out_toggle(self):
        """Test user can opt-in / opt-out anytime from their booking."""
        import json
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=date.today() + timedelta(days=5),
            start_time=time(10, 0),
            end_time=time(12, 0),
            base_price=Decimal('60.00'),
            total_price=Decimal('120.00'),
            number_of_people=2,
            customer_whatsapp='+919876543210',
            whatsapp_reminder_opt_in=True,
            status='CONFIRMED'
        )

        self.client.login(username='customer1', password='CustomerPassword@123')
        # Opt-out
        res = self.client.post(f'/api/bookings/{booking.booking_id}/whatsapp-opt/', json.dumps({
            'opt_in': False
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        booking.refresh_from_db()
        self.assertFalse(booking.whatsapp_reminder_opt_in)
        self.assertEqual(booking.whatsapp_reminder_status, 'OPTED_OUT')

        # Opt back in
        res = self.client.post(f'/api/bookings/{booking.booking_id}/whatsapp-opt/', json.dumps({
            'opt_in': True
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        booking.refresh_from_db()
        self.assertTrue(booking.whatsapp_reminder_opt_in)
        self.assertEqual(booking.whatsapp_reminder_status, 'SCHEDULED')

    def test_19_admin_configurable_reminder_hours(self):
        """Test admin can configure reminder hours (default 24h)."""
        import json
        from bookings.whatsapp_service import get_configured_reminder_hours
        admin = User.objects.create_user(
            username='admin_test_wa',
            email='admin_wa@cross-hunt.in',
            password='AdminPassword@123',
            role='ADMIN'
        )
        self.client.login(username='admin_test_wa', password='AdminPassword@123')

        # Check default
        res = self.client.get('/api/admin/whatsapp/config/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['config']['configured_hours'], 24)

        # Update to 48 hours
        res = self.client.post('/api/admin/whatsapp/config/', json.dumps({
            'hours': 48
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(get_configured_reminder_hours(), 48)

    def test_20_public_page_privacy_protection(self):
        """Test that public ticket verification endpoint never leaks customer's raw WhatsApp number or unmasked phone."""
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=date.today() + timedelta(days=2),
            start_time=time(16, 0),
            end_time=time(18, 0),
            base_price=Decimal('60.00'),
            total_price=Decimal('120.00'),
            number_of_people=2,
            ticket_code='TK-SECRET99',
            customer_whatsapp='+919876543210',
            status='CONFIRMED'
        )

        # Unauthenticated / public gate scanner check
        self.client.logout()
        res = self.client.get('/api/tickets/verify/TK-SECRET99/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Customer WhatsApp must not be returned
        self.assertNotIn('customer_whatsapp', data)
        # Passenger raw phone must be empty or masked
        self.assertNotEqual(data.get('passenger_phone'), '+919876543210')

    def test_21_automated_batch_reminder_dispatch(self):
        """Test the batch reminder dispatch engine and management command."""
        from django.core.management import call_command
        from bookings.whatsapp_service import dispatch_tour_reminders_batch
        booking = Booking.objects.create(
            user=self.customer1,
            cross=self.cross,
            booking_date=date.today() + timedelta(hours=12),
            start_time=time(12, 0),
            end_time=time(14, 0),
            base_price=Decimal('60.00'),
            total_price=Decimal('120.00'),
            number_of_people=2,
            customer_whatsapp='+919876543210',
            whatsapp_reminder_opt_in=True,
            status='CONFIRMED'
        )

        result = dispatch_tour_reminders_batch(hours_before=24, dry_run=False)
        self.assertIn('sent', result)
        self.assertIn('failed', result)

        # Call management command
        call_command('send_whatsapp_reminders', '--hours', '24', '--dry-run')

