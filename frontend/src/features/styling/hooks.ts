import type { StylingItem, VerdictResponse, WardrobeItem } from '../../lib/types';

export function buildStylingItems(items: WardrobeItem[]): StylingItem[] {
  return items.map((item) => ({
    wardrobeItemId: item.id,
    itemRole: item.category,
    imageUrl: item.image_url,
    colorHex: item.primary_color,
    formalityLevel: item.formality_level,
    seasonTags: item.seasons.map((season) => season.name),
  }));
}

export function summarizeVerdict(verdict: VerdictResponse | null) {
  if (!verdict) {
    return {
      scoreText: '—',
      title: 'Awaiting analysis',
      notes: 'Use the editor to run the graph-based combo generator and AI reranking pipeline.',
    };
  }

  const score = verdict.score ?? verdict.rankedCombos?.[0]?.finalScore ?? verdict.rankedCombos?.[0]?.score ?? 0;
  return {
    scoreText: `${score.toFixed ? score.toFixed(0) : score}%`,
    title: verdict.verdictText?.split('.')[0] ?? 'Editorial result',
    notes: verdict.verdictText ?? 'The algorithm is evaluating your current styling selection.',
  };
}
