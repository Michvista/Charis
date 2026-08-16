import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, DollarSign, Shirt } from 'lucide-react';
import type { AnalyticsOverview, WardrobeItem, WearLog } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CategoryChart } from '../../components/charts/CategoryChart';
import { ColorChart } from '../../components/charts/ColorChart';
import { CostPerWearChart } from '../../components/charts/CostPerWearChart';
import { WearFrequencyChart } from '../../components/charts/WearFrequencyChart';
import { formatCount, getWardrobeHighlights } from './hooks';

type Props = {
  items: WardrobeItem[];
  wearLogs: WearLog[];
  analytics: AnalyticsOverview;
  selectedItem: WardrobeItem | null;
  onSelectItem: (id: string) => void;
};

export function WardrobePage({ items, wearLogs, analytics, selectedItem, onSelectItem }: Props) {
  const highlights = getWardrobeHighlights(items);

  return (
    <motion.section className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="dashboard-grid">
        <Card title="Total Value" subtitle="Estimated value across your collection">
          <div className="metric-row">
            <h2 className="metric serif">$14,250</h2>
            <span className="metric-meta">+2.4% this month</span>
          </div>
          <Badge tone="outline">{items.length} items tracked</Badge>
        </Card>
        <Card title="Most Worn Piece" subtitle={selectedItem?.name ?? highlights.topItem.name}>
          <div className="metric-row" style={{ alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h2 className="metric serif" style={{ fontSize: '1.9rem' }}>
                {selectedItem?.name ?? highlights.topItem.name}
              </h2>
              <p className="muted">
                Worn {selectedItem?.times_worn ?? highlights.topItem.times_worn} times · Cost per wear{' '}
                ${((Number(selectedItem?.purchase_price ?? highlights.topItem.purchase_price ?? '0')) / Math.max(selectedItem?.times_worn ?? highlights.topItem.times_worn, 1)).toFixed(2)}
              </p>
            </div>
            <div className="image-frame" style={{ width: 260, height: 180, borderRadius: 22, overflow: 'hidden' }}>
              <img src={selectedItem?.image_url ?? highlights.topItem.image_url} alt={selectedItem?.name ?? highlights.topItem.name} />
            </div>
          </div>
        </Card>
      </div>

      <div className="two-column">
        <div className="stack">
          <Card title="Collection" subtitle="Select an item for more context">
            <div className="wardrobe-grid">
              {items.map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className="card wardrobe-card"
                  whileHover={{ y: -4 }}
                  onClick={() => onSelectItem(item.id)}
                >
                  <div className="item-image">
                    <img src={item.image_url} alt={item.name} />
                    <span className="item-chip">{item.tagging_status}</span>
                  </div>
                  <div className="item-body">
                    <h4 className="serif">{item.name}</h4>
                    <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <span>{item.category}</span>
                      <span>{item.times_worn} wears</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span className="swatch" style={{ background: item.primary_color }} />
                      <span className="muted">{item.primary_color}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </Card>

          <div className="dashboard-grid">
            <Card title="Category Distribution">
              <CategoryChart data={analytics.category_breakdown} />
            </Card>
            <Card title="Wear Frequency">
              <WearFrequencyChart data={analytics.wear_frequency} />
            </Card>
          </div>

          <div className="dashboard-grid">
            <Card title="Color Distribution">
              <ColorChart data={analytics.color_distribution} />
            </Card>
            <Card title="Cost per Wear">
              <CostPerWearChart data={analytics.cost_per_wear} />
            </Card>
          </div>
        </div>

        <aside className="detail-drawer">
          {selectedItem ? (
            <>
              <div className="detail-image">
                <img src={selectedItem.image_url} alt={selectedItem.name} />
              </div>
              <p className="eyebrow">{selectedItem.category}</p>
              <h3 className="serif section-title">{selectedItem.name}</h3>
              <p className="muted">{selectedItem.fabric ?? 'Fabric not specified'} · Formality {selectedItem.formality_level}/5</p>
              <div className="detail-grid">
                <div className="detail-field">
                  <small>Color</small>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="swatch" style={{ background: selectedItem.primary_color }} />
                    {selectedItem.primary_color}
                  </span>
                </div>
                <div className="detail-field">
                  <small>Brand</small>
                  <span>{selectedItem.brand ?? '—'}</span>
                </div>
                <div className="detail-field">
                  <small>Times Worn</small>
                  <span>{selectedItem.times_worn}</span>
                </div>
                <div className="detail-field">
                  <small>Purchase Price</small>
                  <span>{selectedItem.purchase_price ? `$${selectedItem.purchase_price}` : '—'}</span>
                </div>
              </div>
              <div className="stack" style={{ marginTop: '1rem' }}>
                {wearLogs.slice(0, 3).map((wear) => (
                  <div key={wear.id} className="empty-state" style={{ background: 'rgba(90,7,19,0.04)' }}>
                    <CalendarDays size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Worn on {wear.worn_date}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-panel">Select an item to inspect the wardrobe detail drawer.</div>
          )}
        </aside>
      </div>
    </motion.section>
  );
}
