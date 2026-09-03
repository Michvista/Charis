from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Iterable, Optional

from apps.wardrobe.models import WardrobeItem

from .models import TripEvent


SEASON_BY_MONTH = {
    12: "winter",
    1: "winter",
    2: "winter",
    3: "spring",
    4: "spring",
    5: "spring",
    6: "summer",
    7: "summer",
    8: "summer",
    9: "fall",
    10: "fall",
    11: "fall",
}

# Which item categories a capsule should try to fill per formality band.
# Formal events get a fuller look (dress + layering + bag + accessories);
# casual events still get a complete top/bottom/shoes base.
CATEGORY_PRIORITY_BY_FORMALITY = {
    5: ["dress", "top", "bottom", "shoes", "bag", "outerwear", "accessory"],
    4: ["dress", "top", "bottom", "shoes", "bag", "outerwear", "accessory"],
    3: ["top", "bottom", "shoes", "outerwear", "accessory"],
    2: ["top", "bottom", "shoes", "outerwear", "accessory"],
    1: ["top", "bottom", "shoes", "accessory"],
}

TRAVEL_CATEGORIES = ["top", "bottom", "shoes"]


@dataclass(frozen=True)
class PackedItem:
    wardrobe_item: WardrobeItem
    covers_event_ids: list[str]


def _season_for_date(value: date) -> str:
    return SEASON_BY_MONTH[value.month]


def _item_seasons(item: WardrobeItem) -> set[str]:
    return {season.name.lower() for season in item.seasons.all()}


def _item_fit(item: WardrobeItem, target_formality: int, event: Optional[TripEvent] = None) -> int:
    """Lower is a better match. Formality distance dominates, season mismatch adds a penalty."""
    formality_dist = abs((item.formality_level or 0) - target_formality) # 1
    penalty = 0
    if event is not None:
        seasons = _item_seasons(item)
        if seasons and _season_for_date(event.date) not in seasons:
            penalty = 5
    return formality_dist + penalty


def _pick_for_event(
    wardrobe_items: list[WardrobeItem],
    used_ids: set,
    event: TripEvent,
    category: str,
) -> Optional[WardrobeItem]:
    candidates = [
        item
        for item in wardrobe_items
        if item.id not in used_ids and (item.category or "").lower() == category
    ]
    if not candidates:
        return None
    best = min(  
        candidates,
        key=lambda it: _item_fit(it, event.formality_required or 3, event),
    )
    # Allow a small formality drift, but never bridge e.g. a 1 with a 5.
    if _item_fit(best, event.formality_required or 3, event) <= 6:
        return best
    return None


def _pick_travel_item(
    wardrobe_items: list[WardrobeItem],
    used_ids: set,
    category: str,
) -> Optional[WardrobeItem]:
    candidates = [
        item
        for item in wardrobe_items
        if item.id not in used_ids and (item.category or "").lower() == category
    ]
    if not candidates:
        return None
    # Prefer casual, low-formality pieces for travel days.
    return min(candidates, key=lambda it: (it.formality_level or 3))


def greedy_packing_list(
    wardrobe_items: list[WardrobeItem],
    trip_events: list[TripEvent],
    trip=None,
) -> list[dict[str, object]]:
    selected: list[dict[str, object]] = []
    used_ids: set = set()

    # 1. Fill every scheduled event with a full capsule across complementary categories.
    for event in sorted(
        trip_events,
        key=lambda e: e.formality_required or 0,
        reverse=True,
    ):
        categories = CATEGORY_PRIORITY_BY_FORMALITY.get(
            event.formality_required,
            ["top", "bottom", "shoes", "outerwear", "accessory"],
        )
        for category in categories:
            item = _pick_for_event(wardrobe_items, used_ids, event, category)
            if item is None:
                continue
            selected.append(
                {
                    "wardrobe_item": item,
                    "covers_event_ids": [str(event.id)],
                }
            )
            used_ids.add(item.id)

    # 2. Add daywear/travel pieces to cover the days the trip spans beyond the events. 
    if trip is not None and trip.start_date and trip.end_date: 
        day_count = (trip.end_date - trip.start_date).days + 1 
    elif trip_events:
        dates = sorted(e.date for e in trip_events)
        day_count = (dates[-1] - dates[0]).days + 1
    else:
        day_count = 0

    travel_needed = max(0, day_count - len(selected))
    category_idx = 0
    for _ in range(travel_needed):
        category = TRAVEL_CATEGORIES[category_idx % len(TRAVEL_CATEGORIES)] 
        category_idx += 1
        item = _pick_travel_item(wardrobe_items, used_ids, category)
        if item is None:
            continue
        selected.append(
            {
                "wardrobe_item": item,
                "covers_event_ids": [],
            }
        )
        used_ids.add(item.id)

    return selected