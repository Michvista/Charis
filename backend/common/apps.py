from django.apps import AppConfig
from django.conf import settings
from django.db.backends.signals import connection_created


def _apply_django_schema(sender, connection, **kwargs) -> None:
    if connection.vendor != "postgresql":
        return

    schema_name = getattr(settings, "DJANGO_DB_SCHEMA", "django").strip()
    if not schema_name:
        return

    # Keep Django isolated in its own schema while sharing the same Postgres instance.
    safe_schema_name = schema_name.replace('"', '""')

    with connection.cursor() as cursor:
        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{safe_schema_name}"')
        cursor.execute(f'SET search_path TO "{safe_schema_name}", public')


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "common"

    def ready(self) -> None:
        connection_created.connect(
            _apply_django_schema,
            dispatch_uid="common.apply_django_schema",
        )
