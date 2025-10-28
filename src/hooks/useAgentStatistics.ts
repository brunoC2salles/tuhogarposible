import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentStatistics } from '@/types/agent';

export const useAgentStatistics = (agentId?: string) => {
  const [statistics, setStatistics] = useState<AgentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: rpcError } = await supabase.rpc('get_agent_statistics', {
          agent_id: agentId
        });

        if (rpcError) throw rpcError;
        
        if (data && typeof data === 'object') {
          const jsonData = data as any;
          setStatistics({
            total_leads: Number(jsonData.total_leads) || 0,
            converted_leads: Number(jsonData.converted_leads) || 0,
            conversion_rate: Number(jsonData.conversion_rate) || 0,
            stage_counts: (jsonData.stage_counts || {}) as Record<string, number>,
          });
        }
      } catch (err: any) {
        console.error('[useAgentStatistics] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [agentId]);

  return { statistics, loading, error };
};
