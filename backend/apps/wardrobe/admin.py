from django.contrib import admin
from .models import Season, WardrobeItem, WearLog

@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("name",)

@admin.register(WardrobeItem)
class WardrobeItemAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "category", "primary_color", "formality_level", "tagging_status", "times_worn")
    list_filter = ("category", "tagging_status", "seasons")
    search_fields = ("name", "brand", "user__email")

@admin.register(WearLog)
class WearLogAdmin(admin.ModelAdmin):
    list_display = ("wardrobe_item", "worn_date", "created_at")
    list_filter = ("worn_date",)