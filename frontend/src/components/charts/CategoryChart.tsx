import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsOverview } from '../../lib/types';

type Props = {
  data: AnalyticsOverview['category_breakdown'];
};

export function CategoryChart({ data }: Props) {
  return (
    <div className="chart-panel">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecdcd7" vertical={false} />
          <XAxis dataKey="category" stroke="#9a8687" />
          <YAxis allowDecimals={false} stroke="#9a8687" />
          <Tooltip
            cursor={{ fill: 'rgba(133, 39, 46, 0.08)' }}
            contentStyle={{ borderRadius: 16, border: '1px solid #ead8d1', background: '#fff7f2' }}
          />
          <Bar dataKey="count" fill="#5b0b16" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
