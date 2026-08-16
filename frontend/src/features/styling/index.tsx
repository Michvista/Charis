import { motion } from 'framer-motion';
import { PlusCircle, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Occasion, StylingItem, VerdictResponse, WardrobeItem } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { buildStylingItems, summarizeVerdict } from './hooks';

type Props = {
  wardrobeItems: WardrobeItem[];
  occasions: Occasion[];
  verdict: VerdictResponse | null;
  loading: boolean;
  onCreateOccasion: (name: string, formalityLevel: number) => Promise<void>;
  onGenerateStyling: (items: StylingItem[], occasionId?: string, targetSeason?: string) => Promise<void>;
};

export function StylingPage({ wardrobeItems, occasions, verdict, loading, onCreateOccasion, onGenerateStyling }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(wardrobeItems.slice(0, 3).map((item) => item.id));
  const [occasionId, setOccasionId] = useState<string>(occasions[0]?.id ?? '');
  const [newOccasion, setNewOccasion] = useState({ name: '', formalityLevel: 4 });

  const selectedItems = useMemo(
    () => buildStylingItems(wardrobeItems.filter((item) => selectedIds.includes(item.id))),
    [selectedIds, wardrobeItems],
  );

  const summary = summarizeVerdict(verdict);

  return (
    <motion.section className="advisor-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="stack">
        <Card title="Occasion Context" subtitle="Choose the occasion and the wardrobe pieces to evaluate">
          <div className="editorial-form" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', display: 'grid' }}>
            <label>
              <span>Occasion</span>
              <select value={occasionId} onChange={(event) => setOccasionId(event.target.value)}>
                <option value="">Select an occasion</option>
                {occasions.map((occasion) => (
                  <option key={occasion.id} value={occasion.id}>
                    {occasion.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Formality</span>
              <input
                type="number"
                min={1}
                max={5}
                value={newOccasion.formalityLevel}
                onChange={(event) => setNewOccasion((current) => ({ ...current, formalityLevel: Number(event.target.value) }))}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Create a new occasion</span>
              <input
                value={newOccasion.name}
                onChange={(event) => setNewOccasion((current) => ({ ...current, name: event.target.value }))}
                placeholder="Gala Dinner"
              />
            </label>
          </div>
          <div className="hero-cta-row" style={{ marginTop: '1rem' }}>
            <Button
              variant="outline"
              onClick={() => onCreateOccasion(newOccasion.name, newOccasion.formalityLevel)}
              disabled={!newOccasion.name}
            >
              <PlusCircle size={16} />
              Save Occasion
            </Button>
            <Button
              variant="primary"
              onClick={() => onGenerateStyling(selectedItems, occasionId || undefined, 'summer')}
              disabled={loading || selectedItems.length === 0}
            >
              <Sparkles size={16} />
              {loading ? 'Scoring Look...' : 'Run Styling Algorithm'}
            </Button>
          </div>
        </Card>

        <Card title="Select Items">
          <div className="wardrobe-grid">
            {wardrobeItems.map((item) => {
              const active = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="card wardrobe-card"
                  onClick={() =>
                    setSelectedIds((current) =>
                      current.includes(item.id)
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id],
                    )
                  }
                  style={{ outline: active ? '2px solid var(--accent)' : 'none' }}
                >
                  <div className="item-image">
                    <img src={item.image_url} alt={item.name} />
                    <span className="item-chip">{active ? 'selected' : 'tap to add'}</span>
                  </div>
                  <div className="item-body">
                    <h4 className="serif">{item.name}</h4>
                    <div className="muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.category}</span>
                      <span>{item.formality_level}/5</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="stack">
        <div className="verdict-panel">
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.78)' }}>AI Advisor Verdict</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
            <div>
              <h2 className="verdict-score serif">{summary.scoreText}</h2>
              <h3 className="serif" style={{ marginTop: 0 }}>{summary.title}</h3>
            </div>
            <Badge tone="outline">{loading ? 'processing' : verdict?.status ?? 'ready'}</Badge>
          </div>
          <p className="muted" style={{ color: 'rgba(255,255,255,0.76)' }}>
            {summary.notes}
          </p>
          <div className="verdict-grid">
            <h4 className="card-title" style={{ color: 'rgba(255,255,255,0.86)' }}>Suggested additions</h4>
            {(verdict?.rankedCombos?.[0]?.items ?? []).slice(0, 3).map((item) => (
              <div key={item.id} className="suggestion-card">
                <span>+ {item.category}</span>
                <span className="muted" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  {item.colorHex}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card title="Current Verdict" subtitle="Live output from styling-service">
          {verdict ? (
            <div className="stack">
              <div className="metric-row">
                <h3 className="metric serif" style={{ fontSize: '2.7rem' }}>
                  {verdict.score ?? verdict.rankedCombos?.[0]?.finalScore ?? verdict.rankedCombos?.[0]?.score ?? 0}
                </h3>
                <span className="metric-meta">match score</span>
              </div>
              <p className="muted">{verdict.verdictText ?? summary.notes}</p>
              <div className="segmented">
                {selectedItems.map((item) => (
                  <Badge key={item.wardrobeItemId} tone="outline">
                    {item.itemRole}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-panel">Run the styling service to see the live verdict and ranked combos.</div>
          )}
        </Card>
      </div>
    </motion.section>
  );
}
