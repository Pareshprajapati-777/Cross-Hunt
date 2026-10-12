from django.core.management.base import BaseCommand
from bookings.whatsapp_service import dispatch_tour_reminders_batch, get_configured_reminder_hours

class Command(BaseCommand):
    help = "Dispatches automated WhatsApp tour reminders to customers whose departures are within the configured hours (default 24h)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=None,
            help='Override reminder window hours before departure (default: admin-configured setting, normally 24)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate reminder dispatch without marking as sent'
        )

    def handle(self, *args, **options):
        hours = options.get('hours')
        dry_run = options.get('dry_run', False)

        configured = hours if hours is not None else get_configured_reminder_hours()
        self.stdout.write(f"Checking for upcoming tour bookings departing within {configured} hours...")

        result = dispatch_tour_reminders_batch(hours_before=configured, dry_run=dry_run)

        self.stdout.write(self.style.SUCCESS(
            f"Done! Evaluated: {result['total_evaluated']} | "
            f"Eligible in {configured}h window: {result['eligible_in_window']} | "
            f"Sent: {result['sent']} | Failed: {result['failed']}"
        ))

        for item in result['results']:
            self.stdout.write(f"  - Booking {item.get('booking_id')}: {item.get('status')} ({item.get('recipient', '')})")
