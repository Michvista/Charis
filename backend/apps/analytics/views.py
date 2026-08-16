from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .aggregations import (
    category_breakdown,
    color_distribution,
    cost_per_wear,
    wear_frequency_by_week,
)


class AnalyticsOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            end_raw = request.query_params.get("end")
            start_raw = request.query_params.get("start")
            end_date = (
                timezone.datetime.fromisoformat(end_raw).date()
                if end_raw
                else timezone.now().date()
            )
            start_date = (
                timezone.datetime.fromisoformat(start_raw).date()
                if start_raw
                else end_date - timedelta(days=30)
            )
        except ValueError:
            return Response(
                {"detail": "Invalid start or end date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "wear_frequency": wear_frequency_by_week(request.user, start_date, end_date),
                "category_breakdown": category_breakdown(request.user, start_date, end_date),
                "color_distribution": color_distribution(request.user),
                "cost_per_wear": cost_per_wear(request.user),
            }
        )
