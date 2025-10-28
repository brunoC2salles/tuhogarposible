import { Badge } from '@/components/ui/badge';
import { useAgentStatistics } from '@/hooks/useAgentStatistics';

interface AgentStatisticsBadgeProps {
  agentId: string;
}

export const AgentStatisticsBadge = ({ agentId }: AgentStatisticsBadgeProps) => {
  const { statistics, loading } = useAgentStatistics(agentId);

  if (loading) {
    return <span className="text-muted-foreground text-sm">Cargando...</span>;
  }

  if (!statistics) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="text-xs justify-center">
        {statistics.total_leads} leads
      </Badge>
      <Badge 
        variant={statistics.converted_leads > 0 ? "default" : "secondary"} 
        className="text-xs justify-center"
      >
        {statistics.converted_leads} conv. ({statistics.conversion_rate.toFixed(1)}%)
      </Badge>
    </div>
  );
};
