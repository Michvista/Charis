from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Iterable

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


@dataclass(frozen=True)
class PackedItem:
    wardrobe_item: WardrobeItem
    covers_event_ids: list[str]


def _season_for_date(value: date) -> str:
    return SEASON_BY_MONTH[value.month]


def _item_seasons(item: WardrobeItem) -> set[str]:
    return {
        season.name.lower()
        for season in item.seasons.all()
    }


def _item_covers_event(item: WardrobeItem, event: TripEvent) -> bool:
    item_seasons = _item_seasons(item)
    event_season = _season_for_date(event.date)
    formality_match = abs((item.formality_level or 0) - (event.formality_required or 0)) <= 1
    season_match = (not item_seasons) or (event_season in item_seasons)
    return formality_match and season_match


def greedy_packing_list(
    wardrobe_items: list[WardrobeItem],
    trip_events: list[TripEvent],
) -> list[dict[str, object]]:
    uncovered_event_ids = {str(event.id) for event in trip_events}
    selected: list[dict[str, object]] = []
    remaining_items = list(wardrobe_items)

    while uncovered_event_ids and remaining_items:
        best_item = None
        best_covered: list[str] = []

        for item in remaining_items:
            covered = [
                str(event.id)
                for event in trip_events
                if str(event.id) in uncovered_event_ids and _item_covers_event(item, event)
            ]

            if len(covered) > len(best_covered):
                best_item = item
                best_covered = covered
            elif len(covered) == len(best_covered) and covered and best_item is not None:
                current_key = (item.name.lower(), str(item.id))
                best_key = (best_item.name.lower(), str(best_item.id))
                if current_key < best_key:
                    best_item = item
                    best_covered = covered

        if not best_item or not best_covered:
            break

        selected.append(
            {
                "wardrobe_item": best_item,
                "covers_event_ids": best_covered,
            }
        )
        uncovered_event_ids -= set(best_covered)
        remaining_items = [item for item in remaining_items if item.id != best_item.id]

    return selected
