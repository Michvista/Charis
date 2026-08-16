import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { CategoryChart } from '../../components/charts/CategoryChart';
import { ColorChart } from '../../components/charts/ColorChart';
import { CostPerWearChart } from '../../components/charts/CostPerWearChart';
import { WearFrequencyChart } from '../../components/charts/WearFrequencyChart';
import type { AnalyticsOverview } from '../../lib/types';

type Props = {
  analytics: AnalyticsOverview;
};

export function AnalyticsPage({ analytics }: Props) {
  return (
    <motion.section className="analytics-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="eyebrow">Total Wear Sessions</div>
          <p className="stat-value">{analytics.wear_frequency.reduce((sum, item) => sum + item.count, 0)}</p>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Categories Tracked</div>
          <p className="stat-value">{analytics.category_breakdown.length}</p>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Colors in Rotation</div>
          <p className="stat-value">{analytics.color_distribution.length}</p>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Cost per Wear</div>
          <p className="stat-value">{analytics.cost_per_wear.length}</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <Card title="Wear Frequency">
          <WearFrequencyChart data={analytics.wear_frequency} />
        </Card>
        <Card title="Category Distribution">
          <CategoryChart data={analytics.category_breakdown} />
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card title="Color Mix">
          <ColorChart data={analytics.color_distribution} />
        </Card>
        <Card title="Cost per Wear">
          <CostPerWearChart data={analytics.cost_per_wear} />
        </Card>
      </div>
    </motion.section>
  );
}
