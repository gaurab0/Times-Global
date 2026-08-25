from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from locations.models import Location
from .models import GatePass

User = get_user_model()

GATEPASS_URL = '/api/gate-passes/'
MANAGER_EMAIL = 'gatepass-manager@example.com'


def make_gatepass_payload(location_id):
    return {
        'location_id': location_id,
        'recipient_name': 'Ram Bahadur',
        'recipient_address': 'Kathmandu',
        'prepared_by': 'Gaurab Chaudhary',
        'received_by': 'Site Guard',
        'approved_by': 'Manager One',
        'pass_date': '2026-08-25',
        'items': [
            {
                'sno': '1',
                'itemName': 'Dell Laptop',
                'description': 'Latitude 5540',
                'quantity': '2',
                'remarks': 'Asset tags TG-001, TG-002',
            },
            {
                'sno': '2',
                'itemName': 'Network Switch',
                'description': '24-port gigabit',
                'quantity': '1',
                'remarks': '',
            },
        ],
    }


@override_settings(GATEPASS_MANAGER_EMAIL=MANAGER_EMAIL)
class GatePassEmailTests(TestCase):
    def setUp(self):
        self.location = Location.objects.create(name='Datacenter One')
        self.user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='test-pass-123',
            first_name='Staff',
            last_name='Member',
        )
        self.user.is_approved_by_admin = True
        self.user.save()
        self.user.authorized_locations.add(self.location)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_issue_gate_pass_sends_single_email_with_device_details(self):
        response = self.client.post(
            GATEPASS_URL, make_gatepass_payload(self.location.id), format='json'
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(mail.outbox), 1)

        message = mail.outbox[0]
        self.assertEqual(message.to, [MANAGER_EMAIL])
        self.assertIn('Gate Pass #', message.subject)
        body = message.body
        # Device details from the real GatePassItem rows must be present.
        self.assertIn('Dell Laptop', body)
        self.assertIn('Network Switch', body)
        self.assertIn('Qty: 2', body)
        # Recipient/management context present.
        self.assertIn('Ram Bahadur', body)
        self.assertIn(self.location.name, body)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_failed_email_send_does_not_block_gate_pass_creation(self):
        with patch(
            'django.core.mail.EmailMessage.send',
            side_effect=Exception('SMTP server unreachable'),
        ):
            response = self.client.post(
                GATEPASS_URL, make_gatepass_payload(self.location.id), format='json'
            )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(GatePass.objects.count(), 1)
        gate_pass = GatePass.objects.get()
        self.assertEqual(gate_pass.items.count(), 2)
        # Nothing was delivered since the send raised.
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_manager_email_skips_notification_but_creates_gate_pass(self):
        with override_settings(GATEPASS_MANAGER_EMAIL=''):
            response = self.client.post(
                GATEPASS_URL, make_gatepass_payload(self.location.id), format='json'
            )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(GatePass.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 0)
