import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('🚀 Iniciando processamento em lote de produtos pendentes');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar 50 produtos pendentes (batch size otimizado)
    const { data: pendingItems, error: fetchError } = await supabase
      .from('scraping_progress')
      .select(`
        id,
        inmueble_id,
        attempts,
        inmuebles!inner (
          id,
          titulo,
          url_externa
        )
      `)
      .eq('status', 'pending')
      .lt('attempts', 3) // Máximo 3 tentativas
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingItems || pendingItems.length === 0) {
      // Buscar estatísticas finais
      const { data: stats } = await supabase
        .from('scraping_progress')
        .select('status');
      
      const summary = stats?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum produto pendente para processar',
          stats: summary,
          allCompleted: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Processando lote de ${pendingItems.length} produtos`);

    let processed = 0;
    let errors = 0;
    const results = [];

    // Processar em paralelo (5 por vez)
    const batchSize = 5;
    for (let i = 0; i < pendingItems.length; i += batchSize) {
      const batch = pendingItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const inmueble = item.inmuebles as any;
        
        try {
          // Marcar como processing
          await supabase
            .from('scraping_progress')
            .update({ 
              status: 'processing',
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', item.id);

          console.log(`[${i + 1}/${pendingItems.length}] Processando: ${inmueble.titulo}`);
          
          // Chamar função de scraping
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-product-images`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                inmuebleId: inmueble.id,
                urlExterna: inmueble.url_externa
              })
            }
          );

          const result = await response.json();
          
          if (result.success) {
            // Marcar como completed
            await supabase
              .from('scraping_progress')
              .update({ 
                status: 'completed',
                images_found: result.totalImages,
                error_message: null
              })
              .eq('id', item.id);

            processed++;
            results.push({
              id: inmueble.id,
              titulo: inmueble.titulo,
              imagesFound: result.totalImages,
              status: 'success'
            });
            console.log(`✅ ${inmueble.titulo}: ${result.totalImages} imagens`);
          } else {
            throw new Error(result.error || 'Scraping falhou');
          }
          
        } catch (error) {
          errors++;
          
          // Incrementar attempts e marcar como failed se atingiu limite
          const newAttempts = (item.attempts || 0) + 1;
          const newStatus = newAttempts >= 3 ? 'failed' : 'pending';
          
          await supabase
            .from('scraping_progress')
            .update({ 
              status: newStatus,
              attempts: newAttempts,
              error_message: error.message,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', item.id);

          results.push({
            id: inmueble.id,
            titulo: inmueble.titulo,
            status: 'error',
            error: error.message,
            attempts: newAttempts
          });
          console.error(`❌ Erro ao processar ${inmueble.titulo}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Pequeno delay entre sub-batches
      if (i + batchSize < pendingItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Buscar estatísticas atualizadas
    const { data: stats } = await supabase
      .from('scraping_progress')
      .select('status');
    
    const summary = stats?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      success: true,
      batchSize: pendingItems.length,
      processed,
      errors,
      results,
      stats: summary,
      message: `Lote concluído: ${processed} sucessos, ${errors} erros`
    };

    console.log('🎉 Lote finalizado:', response.message);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro crítico no processamento em lote:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
