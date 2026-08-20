from django.contrib import admin

from .models import Outfit


@admin.register(Outfit)
class OutfitAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "outfit_id", "score", "verdict", "created_at"]
    search_fields = ["name", "user__email", "outfit_id"]
    list_filter = ["verdict", "created_at"]