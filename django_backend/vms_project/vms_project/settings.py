import os
from pathlib import Path
from datetime import timedelta

from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load <project_root>/.env before any os.environ.get(...) below.
# Real environment variables still take precedence over .env values.
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name, default):
    value = os.environ.get(name)
    if not value:
        return default
    return [item.strip() for item in value.split(',') if item.strip()]


SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-your-default-secret-key-here-for-locations')
DEBUG = env_bool('DJANGO_DEBUG', True)
ALLOWED_HOSTS = env_list(
    'DJANGO_ALLOWED_HOSTS',
    ['localhost', '127.0.0.1', 'backend', '111.119.60.23', '192.168.55.193'],
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',

    'users.apps.UsersConfig',
    'visitors.apps.VisitorsConfig',
    'forms_module.apps.FormsModuleConfig',
    'images.apps.ImagesConfig',
    'task_management.apps.TaskManagementConfig',
    'locations.apps.LocationsConfig', 
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'vms_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vms_project.wsgi.application'

if env_bool('DJANGO_USE_SQLITE', False):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / os.environ.get('SQLITE_DB_NAME', 'db_locations.sqlite3'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB', os.environ.get('DB_NAME', 'vms_db')),
            'USER': os.environ.get('POSTGRES_USER', os.environ.get('DB_USER', 'vms_user')),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', os.environ.get('DB_PASSWORD', 'vms_password')),
            'HOST': os.environ.get('POSTGRES_HOST', os.environ.get('DB_HOST', 'db')),
            'PORT': os.environ.get('POSTGRES_PORT', os.environ.get('DB_PORT', '5432')),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC' # Or 'Asia/Kathmandu'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles_locations'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media_locations'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DATETIME_FORMAT': "%Y-%m-%dT%H:%M:%S.%fZ",
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1), # Increased for easier dev
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),

    # Custom: Link to our custom serializer for token claims
    'TOKEN_OBTAIN_SERIALIZER': 'users.serializers.CustomTokenObtainPairSerializer',
}

CORS_ALLOW_ALL_ORIGINS = env_bool('CORS_ALLOW_ALL_ORIGINS', DEBUG)
CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    ['http://localhost:5173', 'http://127.0.0.1:5173'],
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'location-id',
]

# --- Gate pass email notification (SMTP) ---
# All credentials come from environment variables; never hardcode them here.
# Tests override EMAIL_BACKEND to locmem via vms_project/test_settings.py.
EMAIL_BACKEND = os.environ.get(
    'DJANGO_EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('GATEPASS_EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('GATEPASS_EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('GATEPASS_EMAIL_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('GATEPASS_EMAIL_PASSWORD', '')
EMAIL_USE_TLS = env_bool('GATEPASS_EMAIL_USE_TLS', True)
EMAIL_USE_SSL = env_bool('GATEPASS_EMAIL_USE_SSL', False)
DEFAULT_FROM_EMAIL = os.environ.get('GATEPASS_EMAIL_USER', 'webmaster@localhost')

# --- SMTP transport encryption guard ---
# Fail loudly at startup if the SMTP backend is configured without TLS,
# so operators cannot accidentally deploy a config that would send email
# in plaintext. (Django itself says nothing; an attacker or misconfigured
# network could intercept the traffic.)
_EMAIL_SMTP_TLS_GUARD = (
    EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend'
    and not EMAIL_USE_TLS
    and not EMAIL_USE_SSL
)
if _EMAIL_SMTP_TLS_GUARD:
    raise ImproperlyConfigured(
        "EMAIL_BACKEND is set to the SMTP backend but neither "
        "EMAIL_USE_TLS nor EMAIL_USE_SSL is True. "
        "Email would be sent in plaintext; adjust your email settings "
        "before deploying."
    )

# Recipient of the gate pass copy (the manager's dedicated inbox).
GATEPASS_MANAGER_EMAIL = os.environ.get('GATEPASS_MANAGER_EMAIL', '')
