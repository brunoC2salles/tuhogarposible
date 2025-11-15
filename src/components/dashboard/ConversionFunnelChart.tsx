import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { STAGE_LABELS } from '@/types/crm';
import { FunnelData } from '@/hooks/useDashboardStats';

interface ConversionFunnelChartProps {
  data: FunnelData[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const ConversionFunnelChart = ({ data }: ConversionFunnelChartProps) => {
  const chartData = data.map((item, index) => ({
    name: STAGE_LABELS[item.stage as keyof typeof STAGE_LABELS] || item.stage,
    leads: item.count,
    porcentaje: item.percentage.toFixed(1),
    color: COLORS[index % COLORS.length]
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--foreground))"
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
        />
        <YAxis stroke="hsl(var(--foreground))" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: any, name: string) => {
            if (name === 'leads') return [value, 'Leads'];
            return [value + '%', 'Porcentaje'];
          }}
        />
        <Legend />
        <Bar dataKey="leads" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
