"""
Settings overrides for the automated test suite.

Run with:  python manage.py test --settings=vms_project.test_settings

- locmem email backend so assertions run against django.core.mail.outbox
  and no real SMTP is ever contacted.
- in-memory SQLite so tests never touch the configured Postgres database.
"""
from .settings import *  # noqa: F401,F403

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
