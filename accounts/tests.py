from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


class AccountsTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='TestUser@123',
            role='USER'
        )
        self.owner = User.objects.create_user(
            username='testowner',
            email='testowner@example.com',
            password='TestOwner@123',
            role='CROSS_OWNER'
        )
        self.admin = User.objects.create_superuser(
            username='testadmin',
            email='testadmin@example.com',
            password='TestAdmin@123',
            role='ADMIN'
        )

    def test_1_user_registration(self):
        """Test regular user registration."""
        response = self.client.post(reverse('register'), {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'email': 'newuser@example.com',
            'phone': '1234567890',
            'role': 'USER',
            'password': 'Password@123',
            'confirm_password': 'Password@123',
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_2_user_login_redirects_to_user_dashboard(self):
        """Test USER login redirects to user dashboard."""
        response = self.client.post(reverse('login'), {
            'username': 'testuser',
            'password': 'TestUser@123',
        })
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('user_dashboard'))

    def test_3_owner_login_redirects_to_owner_dashboard(self):
        """Test CROSS_OWNER login redirects to owner dashboard."""
        response = self.client.post(reverse('login'), {
            'username': 'testowner',
            'password': 'TestOwner@123',
        })
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('owner_dashboard'))

    def test_4_admin_access_allowed_and_regular_user_denied(self):
        """Test ADMIN can access admin dashboard, while regular user is denied."""
        # Regular user attempt
        self.client.login(username='testuser', password='TestUser@123')
        response = self.client.get(reverse('admin_dashboard'))
        self.assertEqual(response.status_code, 302)  # redirected
        self.client.logout()

        # Admin user attempt
        self.client.login(username='testadmin', password='TestAdmin@123')
        response = self.client.get(reverse('admin_dashboard'))
        self.assertEqual(response.status_code, 200)

    def test_unauthorized_role_registration_prevention(self):
        """Ensure public cannot register directly as ADMIN role."""
        response = self.client.post(reverse('register'), {
            'username': 'fakeadmin',
            'first_name': 'Fake',
            'last_name': 'Admin',
            'email': 'fakeadmin@example.com',
            'role': 'ADMIN',
            'password': 'Password@123',
            'confirm_password': 'Password@123',
        })
        # Should fail form validation
        self.assertFalse(User.objects.filter(username='fakeadmin').exists())
