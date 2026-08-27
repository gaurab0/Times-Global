"""
Verification command for SMTP TLS transport encryption.

Run via:  python manage.py verify_email_tls

This command opens a real connection to EMAIL_HOST:EMAIL_PORT, performs
STARTTLS, and reports success/failure without sending a real email. It
distinguishes a connection failure from a TLS negotiation failure and
reports the negotiated TLS version if obtainable.
"""
import socket
import sys

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
import ssl as _ssl_module


class Command(BaseCommand):
    help = (
        "Verify SMTP TLS transport encryption by opening a connection to "
        "EMAIL_HOST:EMAIL_PORT and performing STARTTLS."
    )

    def handle(self, *args, **options):
        host = getattr(settings, "EMAIL_HOST", "") or "localhost"
        port = getattr(settings, "EMAIL_PORT", 587)
        timeout = 10

        self.stdout.write(f"Connecting to {host}:{port} ...")
        try:
            sock = socket.create_connection((host, port), timeout=timeout)        except Exception as exc:
            raise CommandError(f"Connection failed: {exc}")
        except ssl.SSLError as exc:
            raise CommandError(f"TLS handshake failed: {exc}")

        self.stdout.write("Connected. Performing STARTTLS ...")
        try:            # Wrap the socket with SSL, performing STARTTLS.            ssl_sock = _ssl_module.wrap_socket(                sock, server_hostname=host, do_handshake_on_connect=False            )            # Request STARTTLS.            ssl_sock.starttls()            self.stdout.write("STARTTLS completed successfully.")            # Report the negotiated TLS version.            tls_version_name = _ssl_module.SSL_VERSION_TO_NAME.get(                ssl_sock.version(), "unknown")            self.stdout.write(                f"TLS version negotiated: {tls_version_name}"            )            self.stdout.write(                "TLS encryption is active for the SMTP connection."            )            sock.close()        except ssl.SSLCertVerificationError as exc:            raise CommandError(                f"Certificate verification failed: {exc}. "            "See guidance before suppressing verification."            )        except ssl.SSLWantReadError:            raise CommandError(                "TLS negotiation pending (unexpected)."            )        except ssl.SSLWantWriteError:            raise CommandError(                "TLS negotiation pending (unexpected)."            )        except Exception as exc:            raise CommandError(f"TLS negotiation failed: {exc}")