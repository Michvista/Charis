import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsOverview } from '../../lib/types';

type Props = {
  data: AnalyticsOverview['cost_per_wear'];
};

export function CostPerWearChart({ data }: Props) {
  return (
    <div className="chart-panel">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecdcd7" vertical={false} />
          <XAxis dataKey="name" stroke="#9a8687" hide />
          <YAxis stroke="#9a8687" />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid #ead8d1', background: '#fff7f2' }}
          />
          <Area type="monotone" dataKey="cost_per_wear" stroke="#5b0b16" fill="#cda777" fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
