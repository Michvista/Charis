from django.contrib import admin

from .models import ShoppingSuggestion, StyleKnowledgeChunk, WishlistItem


@admin.register(StyleKnowledgeChunk)
class StyleKnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ["title", "source_file", "tags", "content_hash", "created_at"]
    search_fields = ["title", "content", "source_file", "tags"]
    readonly_fields = ["content_hash"]


@admin.register(ShoppingSuggestion)
class ShoppingSuggestionAdmin(admin.ModelAdmin):
    list_display = ["item_description", "priority", "user", "created_at"]
    search_fields = ["item_description", "occasion_description"]


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ["item_description", "priority", "user", "created_at"]
    search_fields = ["item_description", "occasion_description"]
