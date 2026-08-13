import assert from "node:assert/strict";

import {
  ComboBacktrackingDomainService,
  CombinationResult,
  WardrobeItemInput,
} from "../src/domain/combos/domain-services/combo-backtracking.service";
import { StyleCompatibilityService } from "../src/domain/shared/services/style-compatibility.service";

type ComboKey = string;

const comboService = new ComboBacktrackingDomainService();
const compatibilityService = new StyleCompatibilityService();

function item(
  id: string,
  category: WardrobeItemInput["category"],
  colorHex: string,
  formalityLevel: number,
  seasonTags?: string[],
): WardrobeItemInput {
  return { id, category, colorHex, formalityLevel, seasonTags };
}

function keyOf(items: WardrobeItemInput[]): ComboKey {
  return items.map((value) => value.id).join(",");
}

function sortResults(results: CombinationResult[]): CombinationResult[] {
  return [...results].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return keyOf(left.items).localeCompare(keyOf(right.items));
  });
}

function groupCandidates(items: WardrobeItemInput[]): Map<string, WardrobeItemInput[]> {
  const groups = new Map<string, WardrobeItemInput[]>();

  for (const value of items) {
    const key = value.category.toUpperCase();
    const bucket = groups.get(key) || [];
    bucket.push(value);
    groups.set(key, bucket);
  }

  return groups;
}

function bruteForceCombinations(
  items: WardrobeItemInput[],
  maxResults: number,
  occasionFormality?: number,
  targetSeason?: string,
): CombinationResult[] {
  const groups = groupCandidates(items);
  const roles = ["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];
  const current: WardrobeItemInput[] = [];
  const results: CombinationResult[] = [];

  function recurse(index: number): void {
    if (index >= roles.length) {
      const hasCoreRoles = ["TOP", "BOTTOM", "SHOES"].every((role) =>
        current.some((itemValue) => itemValue.category.toUpperCase() === role),
      );

      if (hasCoreRoles) {
        const breakdown = compatibilityService.scoreOutfit(current as never[], {
          occasionFormality,
          targetSeason,
        });
        results.push({
          comboId: `brute-${results.length + 1}`,
          items: [...current],
          score: breakdown.score,
        });
      }

      return;
    }

    const role = roles[index];
    const roleItems = groups.get(role) || [];

    if (role === "OUTERWEAR" || role === "ACCESSORY") {
      recurse(index + 1);
    }

    for (const candidate of roleItems) {
      current.push(candidate);
      recurse(index + 1);
      current.pop();
    }
  }

  recurse(0);

  return sortResults(results).slice(0, maxResults);
}

function bestCompletionScore(
  wardrobe: WardrobeItemInput[],
  branch: WardrobeItemInput[],
  occasionFormality?: number,
  targetSeason?: string,
): number {
  const branchIds = new Set(branch.map((item) => item.id));
  const groups = groupCandidates(wardrobe.filter((item) => !branchIds.has(item.id)));
  const roles = ["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];
  const fixedByRole = new Map<string, WardrobeItemInput>();

  for (const item of branch) {
    fixedByRole.set(item.category.toUpperCase(), item);
  }

  const current = [...branch];
  let best = Number.NEGATIVE_INFINITY;

  function recurse(index: number): void {
    if (index >= roles.length) {
      const hasCoreRoles = ["TOP", "BOTTOM", "SHOES"].every((role) =>
        current.some((itemValue) => itemValue.category.toUpperCase() === role),
      );

      if (hasCoreRoles) {
        const breakdown = compatibilityService.scoreOutfit(current as never[], {
          occasionFormality,
          targetSeason,
        });
        best = Math.max(best, breakdown.score);
      }

      return;
    }

    const role = roles[index];
    const fixed = fixedByRole.get(role);

    if (fixed) {
      recurse(index + 1);
      return;
    }

    if (role === "OUTERWEAR" || role === "ACCESSORY") {
      recurse(index + 1);
    }

    for (const candidate of groups.get(role) || []) {
      current.push(candidate);
      recurse(index + 1);
      current.pop();
    }
  }

  recurse(0);
  return best;
}

function assertSameTopN(actual: CombinationResult[], expected: CombinationResult[]): void {
  assert.equal(actual.length, expected.length, "top-N result length mismatch");

  for (let index = 0; index < expected.length; index += 1) {
    assert.equal(actual[index].score, expected[index].score, `score mismatch at index ${index}`);
    assert.equal(
      keyOf(actual[index].items),
      keyOf(expected[index].items),
      `combo mismatch at index ${index}`,
    );
  }
}

function assertUpperBoundIsSafe(
  wardrobe: WardrobeItemInput[],
  branch: WardrobeItemInput[],
  occasionFormality?: number,
  targetSeason?: string,
): void {
  const remaining = ["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"]
    .filter((role) => !branch.some((item) => item.category.toUpperCase() === role))
    .map((role) => ({
      role,
      items: wardrobe.filter((item) => item.category.toUpperCase() === role),
    }));

  const optimistic = compatibilityService.estimateUpperBound(branch, remaining, {
    occasionFormality,
    targetSeason,
  });

  const bestActual = bestCompletionScore(wardrobe, branch, occasionFormality, targetSeason);

  if (bestActual !== Number.NEGATIVE_INFINITY) {
    assert.ok(
      optimistic >= bestActual,
      `upper bound ${optimistic} underestimates achievable score ${bestActual}`,
    );
  }
}

function testTopNAndPruning(): void {
  const wardrobe: WardrobeItemInput[] = [
    item("top-a", "TOP", "#f4d7c5", 3, ["SUMMER"]),
    item("top-b", "TOP", "#243447", 4, ["FALL", "WINTER"]),
    item("top-c", "TOP", "#e4572e", 2, ["SPRING", "SUMMER"]),
    item("bottom-a", "BOTTOM", "#1f2a44", 3, ["SUMMER"]),
    item("bottom-b", "BOTTOM", "#f2efe9", 4, ["SPRING", "SUMMER"]),
    item("bottom-c", "BOTTOM", "#2a9d8f", 2, ["FALL"]),
    item("shoes-a", "SHOES", "#000000", 3, ["ALL"]),
    item("shoes-b", "SHOES", "#ffffff", 2, ["SPRING", "SUMMER"]),
    item("outerwear-a", "OUTERWEAR", "#445566", 4, ["WINTER"]),
    item("accessory-a", "ACCESSORY", "#d4af37", 3, ["SUMMER"]),
  ];

  const options = { occasionFormality: 3, targetSeason: "SUMMER" };
  const bruteForce = bruteForceCombinations(wardrobe, 3, options.occasionFormality, options.targetSeason);
  const optimized = comboService.generateCombinations(wardrobe, { ...options, maxResults: 3 });

  assertSameTopN(optimized, bruteForce);

  const maxOne = comboService.generateCombinations(wardrobe, { ...options, maxResults: 1 });
  assertSameTopN(maxOne, bruteForce.slice(0, 1));

  const full = comboService.generateCombinations(wardrobe, { ...options, maxResults: 999 });
  assert.equal(
    full.length,
    bruteForceCombinations(wardrobe, 999, options.occasionFormality, options.targetSeason).length,
  );
  assert.ok(
    full.length >= bruteForce.length,
    "maxResults larger than valid combos should return all valid combos",
  );

  const reversed = comboService.generateCombinations([...wardrobe].reverse(), { ...options, maxResults: 3 });
  assertSameTopN(reversed, bruteForce);
}

function testSeasonCompatibility(): void {
  const summerTop = item("summer-top", "TOP", "#f4d7c5", 3, ["SUMMER"]);
  const summerBottom = item("summer-bottom", "BOTTOM", "#1f2a44", 3, ["SUMMER"]);
  const summerShoes = item("summer-shoes", "SHOES", "#ffffff", 3, ["SUMMER"]);
  const springTop = item("spring-top", "TOP", "#f1c27d", 3, ["SPRING"]);
  const winterTop = item("winter-top", "TOP", "#243447", 3, ["WINTER"]);
  const winterOuterwear = item("winter-coat", "OUTERWEAR", "#112233", 4, ["WINTER"]);
  const noSeasonTop = item("no-season-top", "TOP", "#d4af37", 3);

  assert.ok(
    compatibilityService.scoreSeasonCompatibility([summerTop, summerBottom, summerShoes]) > 0,
    "summer + summer should be positive",
  );
  assert.ok(
    compatibilityService.scoreSeasonCompatibility([springTop, summerBottom, summerShoes]) >= 0,
    "spring + summer should be mild or neutral, not strongly negative",
  );
  assert.ok(
    compatibilityService.scoreSeasonCompatibility([summerTop, winterTop, summerShoes]) <= 1,
    "summer + winter should be reduced to a low or neutral compatibility signal",
  );
  assert.ok(
    compatibilityService.scoreSeasonCompatibility(
      [summerTop, summerBottom, summerShoes, winterOuterwear],
    ) >= compatibilityService.scoreSeasonCompatibility([summerTop, summerBottom, summerShoes]),
    "winter outerwear should not automatically invalidate a valid summer base outfit",
  );
  assert.doesNotThrow(() =>
    compatibilityService.scoreSeasonCompatibility([noSeasonTop, summerBottom, summerShoes]),
  );
  assert.equal(
    compatibilityService.scoreSeasonCompatibility([noSeasonTop, summerBottom, summerShoes]),
    compatibilityService.scoreSeasonCompatibility([summerBottom, summerShoes]),
    "missing season metadata should be neutral",
  );
}

function testOptionalRolesAndDeterminism(): void {
  const wardrobe: WardrobeItemInput[] = [
    item("top-a", "TOP", "#f4d7c5", 3, ["SUMMER"]),
    item("bottom-a", "BOTTOM", "#1f2a44", 3, ["SUMMER"]),
    item("shoes-a", "SHOES", "#000000", 3, ["SUMMER"]),
    item("outerwear-a", "OUTERWEAR", "#445566", 4, ["SUMMER"]),
    item("accessory-a", "ACCESSORY", "#d4af37", 3, ["SUMMER"]),
  ];

  const coreOnly = comboService.generateCombinations(wardrobe.slice(0, 3), {
    occasionFormality: 3,
    targetSeason: "SUMMER",
    maxResults: 5,
  });
  assert.equal(coreOnly.length, 1, "core roles should remain valid without optional roles");

  const withOptional = comboService.generateCombinations(wardrobe, {
    occasionFormality: 3,
    targetSeason: "SUMMER",
    maxResults: 10,
  });
  assert.ok(withOptional.some((combo) => combo.items.some((itemValue) => itemValue.category === "OUTERWEAR")));
  assert.ok(withOptional.some((combo) => combo.items.some((itemValue) => itemValue.category === "ACCESSORY")));

  const first = comboService.generateCombinations(wardrobe, {
    occasionFormality: 3,
    targetSeason: "SUMMER",
    maxResults: 3,
  });
  const second = comboService.generateCombinations([...wardrobe].reverse(), {
    occasionFormality: 3,
    targetSeason: "SUMMER",
    maxResults: 3,
  });

  assertSameTopN(first, second);
}

function testUpperBoundSafety(): void {
  const wardrobe: WardrobeItemInput[] = [
    item("top-a", "TOP", "#f4d7c5", 3, ["SUMMER"]),
    item("top-b", "TOP", "#243447", 4, ["WINTER"]),
    item("bottom-a", "BOTTOM", "#1f2a44", 3, ["SUMMER"]),
    item("bottom-b", "BOTTOM", "#f2efe9", 4, ["SPRING"]),
    item("shoes-a", "SHOES", "#000000", 3, ["SUMMER"]),
    item("outerwear-a", "OUTERWEAR", "#445566", 4, ["WINTER"]),
  ];

  const branches = [
    [wardrobe[0]],
    [wardrobe[0], wardrobe[2]],
    [wardrobe[0], wardrobe[2], wardrobe[4]],
    [wardrobe[0], wardrobe[2], wardrobe[4], wardrobe[5]],
  ];

  for (const branch of branches) {
    assertUpperBoundIsSafe(wardrobe, branch, 3, "SUMMER");
  }
}

function main(): void {
  testTopNAndPruning();
  testSeasonCompatibility();
  testOptionalRolesAndDeterminism();
  testUpperBoundSafety();
  console.log("algorithm regression checks passed");
}

main();
