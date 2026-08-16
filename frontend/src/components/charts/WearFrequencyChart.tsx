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
  data: AnalyticsOverview['wear_frequency'];
};

export function WearFrequencyChart({ data }: Props) {
  return (
    <div className="chart-panel">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecdcd7" vertical={false} />
          <XAxis dataKey="week" stroke="#9a8687" />
          <YAxis allowDecimals={false} stroke="#9a8687" />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid #ead8d1', background: '#fff7f2' }}
          />
          <Bar dataKey="count" fill="#9f4d57" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
