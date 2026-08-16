from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TripEventViewSet, TripViewSet

router = DefaultRouter()
router.register(r"trips", TripViewSet, basename="trip")

trip_event_list = TripEventViewSet.as_view({
    "get": "list",
    "post": "create",
})

trip_event_detail = TripEventViewSet.as_view({
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
})

urlpatterns = [
    *router.urls,
    path("trips/<uuid:trip_id>/events/", trip_event_list, name="trip-event-list"),
    path("trips/<uuid:trip_id>/events/<uuid:pk>/", trip_event_detail, name="trip-event-detail"),
]
