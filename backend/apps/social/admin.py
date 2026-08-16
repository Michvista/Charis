from django.contrib import admin

from .models import Comment, Friendship, OutfitShare, Vote


admin.site.register(OutfitShare)
admin.site.register(Comment)
admin.site.register(Vote)
admin.site.register(Friendship)
