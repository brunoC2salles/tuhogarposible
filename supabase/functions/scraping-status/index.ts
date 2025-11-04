import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar estatísticas detalhadas
    const { data: stats, error } = await supabase
      .from('scraping_progress')
      .select('status, attempts, images_found');

    if (error) throw error;

    const summary = stats?.reduce((acc, item) => {
      acc.total++;
      acc[item.status] = (acc[item.status] || 0) + 1;
      
      if (item.status === 'completed' && item.images_found) {
        acc.totalImages = (acc.totalImages || 0) + item.images_found;
      }
      
      return acc;
    }, { 
      total: 0, 
      pending: 0, 
      processing: 0, 
      completed: 0, 
      failed: 0,
      totalImages: 0 
    } as any);

    const progressPercentage = summary.total > 0 
      ? ((summary.completed / summary.total) * 100).toFixed(2)
      : 0;

    const response = {
      success: true,
      stats: summary,
      progress_percentage: progressPercentage,
      estimated_time_remaining: summary.pending > 0 
        ? `${Math.ceil((summary.pending * 2) / 60)} minutos`
        : 'Concluído'
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar status:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
