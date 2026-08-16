from django.contrib import admin

from .models import PackingList, PackingListItem, Trip, TripEvent


admin.site.register(Trip)
admin.site.register(TripEvent)
admin.site.register(PackingList)
admin.site.register(PackingListItem)
