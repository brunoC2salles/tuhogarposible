import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TimelineData } from '@/hooks/useDashboardStats';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineChartProps {
  data: TimelineData[];
}

export const TimelineChart = ({ data }: TimelineChartProps) => {
  const chartData = data.map(item => ({
    date: format(new Date(item.date), 'dd/MM', { locale: es }),
    'Creados': item.created,
    'Convertidos': item.converted
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--foreground))"
        />
        <YAxis stroke="hsl(var(--foreground))" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="Creados" 
          stroke="hsl(var(--chart-1))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--chart-1))' }}
        />
        <Line 
          type="monotone" 
          dataKey="Convertidos" 
          stroke="hsl(var(--chart-2))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--chart-2))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
