export interface AgentStatistics {
  total_leads: number;
  converted_leads: number;
  conversion_rate: number;
  stage_counts: Record<string, number>;
}
