import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { STAGE_LABELS } from '@/types/crm';
import { StageDistribution } from '@/hooks/useDashboardStats';

interface LeadsByStageChartProps {
  data: StageDistribution[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const LeadsByStageChart = ({ data }: LeadsByStageChartProps) => {
  const chartData = data.map((item, index) => ({
    name: STAGE_LABELS[item.stage as keyof typeof STAGE_LABELS] || item.stage,
    value: item.count,
    color: COLORS[index % COLORS.length]
  })).filter(item => item.value > 0); // Only show stages with leads

  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(0);
    return `${entry.name}: ${percent}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
