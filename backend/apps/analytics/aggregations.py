from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Count
from django.db.models.functions import ExtractIsoYear, ExtractWeek

from apps.wardrobe.models import WardrobeItem, WearLog


def wear_frequency_by_week(user, start_date: date, end_date: date):
    rows = (
        WearLog.objects.filter(
            wardrobe_item__user=user,
            worn_date__gte=start_date,
            worn_date__lte=end_date,
        )
        .annotate(iso_year=ExtractIsoYear("worn_date"), iso_week=ExtractWeek("worn_date"))
        .values("iso_year", "iso_week")
        .annotate(count=Count("id"))
        .order_by("iso_year", "iso_week")
    )

    return [
        {
            "week": f"{row['iso_year']}-W{int(row['iso_week']):02d}",
            "count": row["count"],
        }
        for row in rows
    ]


def category_breakdown(user, start_date: date, end_date: date):
    rows = (
        WearLog.objects.filter(
            wardrobe_item__user=user,
            worn_date__gte=start_date,
            worn_date__lte=end_date,
        )
        .values("wardrobe_item__category")
        .annotate(count=Count("id"))
        .order_by("-count", "wardrobe_item__category")
    )

    return [
        {
            "category": row["wardrobe_item__category"],
            "count": row["count"],
        }
        for row in rows
    ]


def color_distribution(user):
    rows = (
        WardrobeItem.objects.filter(user=user)
        .values("primary_color")
        .annotate(count=Count("id"))
        .order_by("-count", "primary_color")[:10]
    )

    return [
        {
            "color": row["primary_color"],
            "count": row["count"],
        }
        for row in rows
    ]


def cost_per_wear(user):
    items = (
        WardrobeItem.objects.filter(user=user, purchase_price__isnull=False)
        .exclude(times_worn__lte=0)
        .order_by("created_at")
    )

    results = []
    for item in items:
        if not item.times_worn:
            continue
        cpw = Decimal(item.purchase_price) / Decimal(item.times_worn)
        results.append(
            {
                "item_id": str(item.id),
                "name": item.name,
                "purchase_price": str(item.purchase_price),
                "times_worn": item.times_worn,
                "cost_per_wear": float(cpw),
            }
        )

    results.sort(key=lambda row: row["cost_per_wear"])
    return results[:20]
