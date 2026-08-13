import assert from "node:assert/strict";
import { ComboBacktrackingDomainService } from "../src/domain/combos/domain-services/combo-backtracking.service";
import { CompatibilityGraphDomainService } from "../src/domain/verdict/domain-services/compatibility-graph.service";
import { StyleCompatibilityService } from "../src/domain/shared/services/style-compatibility.service";

const compatibility = new StyleCompatibilityService();
const graph = new CompatibilityGraphDomainService();
const combos = new ComboBacktrackingDomainService();

const formalOutfit = [
  { category: "TOP", colorHex: "#1f2937", formalityLevel: 4 },
  { category: "BOTTOM", colorHex: "#f5f5f5", formalityLevel: 4 },
  { category: "SHOES", colorHex: "#111827", formalityLevel: 4 },
];

const casualOutfit = [
  { category: "TOP", colorHex: "#ff0000", formalityLevel: 1 },
  { category: "BOTTOM", colorHex: "#00ff00", formalityLevel: 1 },
  { category: "SHOES", colorHex: "#0000ff", formalityLevel: 1 },
];

assert(compatibility.evaluateColorPair("#ffffff", "#000000") > 0, "neutral pairing should score positively");
assert(compatibility.evaluateColorPair("#ff0000", "#00ff00") > 0, "complementary colors should be rewarded");
assert(compatibility.evaluateColorPair("#ff0000", "#ffff00") < 0, "strongly clashing colors should be penalized");
assert(compatibility.scoreFormalityCompatibility(formalOutfit, { occasionFormality: 5 }) > compatibility.scoreFormalityCompatibility(casualOutfit, { occasionFormality: 5 }), "formal outfit should fit a formal occasion better");

const verdictFormal = graph.evaluateOutfit({
  items: formalOutfit,
  occasionFormality: 5,
});
const verdictCasual = graph.evaluateOutfit({
  items: casualOutfit,
  occasionFormality: 5,
});

assert(verdictFormal.score > verdictCasual.score, "formal outfit should outrank casual outfit for formal occasion");

const comboResults = combos.generateCombinations(
  [
    { id: "top-a", category: "TOP", colorHex: "#111827", formalityLevel: 4 },
    { id: "top-b", category: "TOP", colorHex: "#ff0000", formalityLevel: 1 },
    { id: "bottom-a", category: "BOTTOM", colorHex: "#f5f5f5", formalityLevel: 4 },
    { id: "shoes-a", category: "SHOES", colorHex: "#111111", formalityLevel: 4 },
    { id: "outerwear-a", category: "OUTERWEAR", colorHex: "#374151", formalityLevel: 4 },
  ],
  { occasionFormality: 4, maxResults: 20 },
);

assert(comboResults.length > 0, "combo generation should return at least one valid combination");
assert(comboResults.every((combo) => combo.items.some((item) => item.category === "TOP")), "generated combos should keep the required roles");
assert(new Set(comboResults.map((combo) => combo.items.map((item) => item.id).join(","))).size === comboResults.length, "combination results should not contain duplicates");

console.log("style-compatibility smoke tests passed");
