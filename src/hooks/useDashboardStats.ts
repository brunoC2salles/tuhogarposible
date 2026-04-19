import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadStage, STAGE_ORDER } from '@/types/crm';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';

export interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface AgentPerformance {
  agentName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface StageDistribution {
  stage: string;
  count: number;
}

export interface TimelineData {
  date: string;
  created: number;
  converted: number;
}

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisPeriod: number;
  convertedLeads: number;
  conversionRate: number;
  activeAgents: number;
  avgLeadsPerAgent: number;
  funnelData: FunnelData[];
  agentPerformance: AgentPerformance[];
  stageDistribution: StageDistribution[];
  timelineData: TimelineData[];
}

export const useDashboardStats = (period: '7d' | '30d' | '90d' | 'all' = '30d') => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate period start date
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = null;
          break;
      }

      // OPTIMIZED: Fetch ALL leads via pagination (overcomes 1000-row PostgREST cap)
      const [leadsData, agentsResult] = await Promise.all([
        fetchAllPaginated<any>((from, to) =>
          supabase
            .from('leads')
            .select('*, profiles!agente_asignado_id(nombre)')
            .order('created_at', { ascending: false })
            .range(from, to)
        ),
        supabase
          .from('profiles')
          .select('id, nombre')
          .eq('activo', true)
      ]);

      if (agentsResult.error) throw agentsResult.error;

      const allLeads = leadsData || [];
      const agents = agentsResult.data || [];

      // Filter leads by period client-side (eliminates duplicate query)
      const periodLeads = startDate 
        ? allLeads.filter(l => new Date(l.created_at) >= startDate)
        : allLeads;

      // Calculate statistics
      const totalLeads = allLeads.length;
      const newLeadsThisPeriod = periodLeads.length;
      const convertedLeads = allLeads.filter(l => l.stage === 'finalizada').length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      const activeAgents = agents.length;
      const avgLeadsPerAgent = activeAgents > 0 ? totalLeads / activeAgents : 0;

      // Funnel data (based on all leads)
      const stageCounts = STAGE_ORDER.map(stage => ({
        stage,
        count: allLeads.filter(l => l.stage === stage).length
      }));

      const funnelData: FunnelData[] = stageCounts.map((s, index) => ({
        stage: s.stage,
        count: s.count,
        percentage: index === 0 ? 100 : totalLeads > 0 ? (s.count / totalLeads) * 100 : 0
      }));

      // Agent performance (based on all leads)
      const agentMap = new Map<string, { total: number; converted: number }>();
      
      allLeads.forEach(lead => {
        const agentName = (lead as any).profiles?.nombre || 'Sin asignar';
        const current = agentMap.get(agentName) || { total: 0, converted: 0 };
        current.total += 1;
        if (lead.stage === 'finalizada') {
          current.converted += 1;
        }
        agentMap.set(agentName, current);
      });

      const agentPerformance: AgentPerformance[] = Array.from(agentMap.entries())
        .map(([agentName, data]) => ({
          agentName,
          totalLeads: data.total,
          convertedLeads: data.converted,
          conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0
        }))
        .sort((a, b) => b.totalLeads - a.totalLeads)
        .slice(0, 10);

      // Stage distribution
      const stageDistribution: StageDistribution[] = STAGE_ORDER.map(stage => ({
        stage,
        count: allLeads.filter(l => l.stage === stage).length
      }));

      // Timeline (based on period leads)
      const timelineMap = new Map<string, { created: number; converted: number }>();
      
      periodLeads.forEach(lead => {
        const date = new Date(lead.created_at).toISOString().split('T')[0];
        const current = timelineMap.get(date) || { created: 0, converted: 0 };
        current.created += 1;
        if (lead.stage === 'finalizada') {
          current.converted += 1;
        }
        timelineMap.set(date, current);
      });

      const timelineData: TimelineData[] = Array.from(timelineMap.entries())
        .map(([date, data]) => ({
          date,
          created: data.created,
          converted: data.converted
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setStats({
        totalLeads,
        newLeadsThisPeriod,
        convertedLeads,
        conversionRate,
        activeAgents,
        avgLeadsPerAgent,
        funnelData,
        agentPerformance,
        stageDistribution,
        timelineData
      });

    } catch (err: any) {
      console.error('[Dashboard] Error fetching stats:', err);
      setError(err.message);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};
