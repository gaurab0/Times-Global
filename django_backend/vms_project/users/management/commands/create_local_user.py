from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from locations.models import Location


class Command(BaseCommand):
    help = "Create or update a login-ready local development user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default="local.admin@example.com",
            help="Email address. The login flow also uses this as the username.",
        )
        parser.add_argument(
            "--password",
            default="LocalAdmin123!",
            help="Password for the local user.",
        )
        parser.add_argument("--first-name", default="Local")
        parser.add_argument("--last-name", default="Admin")
        parser.add_argument(
            "--location",
            default="Local Data Center",
            help="Location to create if needed and assign to the user.",
        )
        parser.add_argument(
            "--staff",
            action="store_true",
            help="Also allow this user to access the Django admin.",
        )
        parser.add_argument(
            "--superuser",
            action="store_true",
            help="Make this user a Django superuser. Implies --staff.",
        )

    def handle(self, *args, **options):
        User = get_user_model()

        email = options["email"].strip().lower()
        password = options["password"]
        location_name = options["location"].strip()
        is_superuser = options["superuser"]
        is_staff = options["staff"] or is_superuser

        location, location_created = Location.objects.get_or_create(
            name=location_name,
            defaults={"description": "Created for local development login."},
        )

        user, user_created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": options["first_name"],
                "last_name": options["last_name"],
            },
        )

        user.email = email
        user.first_name = options["first_name"]
        user.last_name = options["last_name"]
        user.is_active = True
        user.is_approved_by_admin = True
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.set_password(password)
        user.save()
        user.authorized_locations.add(location)

        action = "Created" if user_created else "Updated"
        location_action = "created" if location_created else "reused"

        self.stdout.write(self.style.SUCCESS(f"{action} local user: {email}"))
        self.stdout.write(f"Password: {password}")
        self.stdout.write(f"Location {location_action}: {location.name}")
        self.stdout.write(
            "Frontend login fields: "
            f"Email Address (used as Username) = {email}, Password = {password}"
        )
