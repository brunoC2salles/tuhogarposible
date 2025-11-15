import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AgentPerformance } from '@/hooks/useDashboardStats';

interface AgentPerformanceChartProps {
  data: AgentPerformance[];
}

export const AgentPerformanceChart = ({ data }: AgentPerformanceChartProps) => {
  const chartData = data.map(agent => ({
    name: agent.agentName,
    'Total Leads': agent.totalLeads,
    'Convertidos': agent.convertedLeads,
    'Tasa (%)': agent.conversionRate.toFixed(1)
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
        />
        <Legend />
        <Bar dataKey="Total Leads" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
        <Bar dataKey="Convertidos" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
