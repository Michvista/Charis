'use client';

import DragCarousel from '@/components/ui/DragCarousel';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export type OutfitSnapshot = {
  outfitId: string;
  score: number;
  verdict: string;
  visualNotes: string;
  items: Array<{ name: string; image_url?: string; category: string }>;
};

const PLACEHOLDER = 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80';

export function verdictBadgeClass(v: string) {
  if (v === 'works') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (v === 'partially_works') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-600 border-red-200';
}

export function verdictBadgeLabel(v: string) {
  if (v === 'works') return '✓ Works';
  if (v === 'partially_works') return '~ Partial';
  return '✗ Clashes';
}

/**
 * A stylish card that shows an outfit as a drag-scroll slideshow with the
 * AI verdict badge, harmony score and visual notes below.
 */
export default function OutfitSnapshotCard({ snapshot }: { snapshot: OutfitSnapshot }) {
  const items = snapshot.items || [];
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d9c1c0] bg-white shadow-sm">
      {/* Slideshow */}
      <div className="bg-[#f5ece7]">
        {items.length > 1 ? (
          <DragCarousel className="flex gap-3 px-4 py-4" snap>
            {items.map((item, idx) => (
              <figure key={idx} className="w-40 shrink-0 snap-start">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white border border-[#d9c1c0] shadow-sm">
                  <img
                    src={item.image_url || PLACEHOLDER}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                <figcaption className="mt-2 px-0.5">
                  <p className="serif text-[11px] font-bold text-[#1e1b18] truncate">{item.name}</p>
                  <p className="text-[10px] text-[#867272] capitalize">{item.category}</p>
                </figcaption>
              </figure>
            ))}
          </DragCarousel>
        ) : (
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={items[0].image_url || PLACEHOLDER}
              alt={items[0].name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* AI Verdict */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={SparklesIcon} size={14} className="text-[#380208]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#867272]">AI Verdict</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${verdictBadgeClass(snapshot.verdict)}`}>
              {verdictBadgeLabel(snapshot.verdict)}
            </span>
            <span className="flex items-baseline gap-0.5">
              <span className="serif text-xl font-bold text-[#380208]">{snapshot.score}</span>
              <span className="text-[10px] text-[#867272]">%</span>
            </span>
          </div>
        </div>
        {snapshot.visualNotes && (
          <p className="text-xs text-[#544342] leading-relaxed">{snapshot.visualNotes}</p>
        )}
      </div>
    </div>
  );
}