import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { AnalyticsOverview } from '../../lib/types';

type Props = {
  data: AnalyticsOverview['color_distribution'];
};

const COLORS = ['#5b0b16', '#9f4d57', '#cda777', '#eaded7', '#34313a', '#7b584f'];

export function ColorChart({ data }: Props) {
  return (
    <div className="chart-panel">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="color" outerRadius={90} innerRadius={42} paddingAngle={4}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid #ead8d1', background: '#fff7f2' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
