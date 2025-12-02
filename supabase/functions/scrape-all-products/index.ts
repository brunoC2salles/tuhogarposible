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

    // Primeiro, resetar produtos "completed" que têm apenas 1 imagem
    const { data: lowImageProducts, error: lowImageError } = await supabase
      .from('scraping_progress')
      .select('id, inmueble_id, images_found')
      .eq('status', 'completed')
      .lte('images_found', 1);
    
    if (lowImageProducts && lowImageProducts.length > 0) {
      console.log(`🔄 Resetando ${lowImageProducts.length} produtos com ≤1 imagem para reprocessar`);
      
      await supabase
        .from('scraping_progress')
        .update({ 
          status: 'pending', 
          attempts: 0,
          error_message: null,
          images_found: null
        })
        .in('id', lowImageProducts.map(p => p.id));
    }

    // Resetar produtos "failed" com erro "Nenhuma imagem encontrada" para tentar novamente
    const { data: retryableProducts } = await supabase
      .from('scraping_progress')
      .select('id')
      .eq('status', 'failed')
      .ilike('error_message', '%Nenhuma imagem encontrada%')
      .lt('attempts', 5); // Permitir até 5 tentativas para este erro específico

    if (retryableProducts && retryableProducts.length > 0) {
      console.log(`🔄 Resetando ${retryableProducts.length} produtos "failed" com erro de imagem não encontrada`);
      
      await supabase
        .from('scraping_progress')
        .update({ 
          status: 'pending',
          error_message: null
        })
        .in('id', retryableProducts.map(p => p.id));
    }

    // Buscar produtos pendentes (aumentado para 100)
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
      .lt('attempts', 5) // Aumentar limite de tentativas
      .order('attempts', { ascending: true }) // Priorizar os com menos tentativas
      .order('created_at', { ascending: true })
      .limit(100);

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

    // Processar em paralelo (10 por vez para maior throughput)
    const batchSize = 10;
    for (let i = 0; i < pendingItems.length; i += batchSize) {
      const batch = pendingItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const inmueble = item.inmuebles as any;
        
        if (!inmueble?.url_externa) {
          // Marcar como failed se não tem URL
          await supabase
            .from('scraping_progress')
            .update({ 
              status: 'failed',
              error_message: 'URL externa não definida'
            })
            .eq('id', item.id);
          errors++;
          return;
        }

        try {
          // Marcar como processing
          await supabase
            .from('scraping_progress')
            .update({ 
              status: 'processing',
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', item.id);

          console.log(`[${processed + errors + 1}/${pendingItems.length}] Processando: ${inmueble.titulo || inmueble.id}`);
          
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
          
          if (result.success && result.totalImages > 0) {
            // Marcar como completed apenas se encontrou imagens
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
            console.log(`✅ ${inmueble.titulo || inmueble.id}: ${result.totalImages} imagens`);
          } else {
            throw new Error(result.error || 'Nenhuma imagem encontrada');
          }
          
        } catch (error) {
          errors++;
          
          // Incrementar attempts
          const newAttempts = (item.attempts || 0) + 1;
          const errorMsg = error.message || 'Erro desconhecido';
          
          // Só marca como "failed" definitivo após 5 tentativas
          const newStatus = newAttempts >= 5 ? 'failed' : 'pending';
          
          await supabase
            .from('scraping_progress')
            .update({ 
              status: newStatus,
              attempts: newAttempts,
              error_message: errorMsg,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', item.id);

          results.push({
            id: inmueble.id,
            titulo: inmueble.titulo,
            status: 'error',
            error: errorMsg,
            attempts: newAttempts
          });
          console.error(`❌ ${inmueble.titulo || inmueble.id}: ${errorMsg} (tentativa ${newAttempts})`);
        }
      });

      await Promise.all(batchPromises);
      
      // Pequeno delay entre sub-batches para não sobrecarregar
      if (i + batchSize < pendingItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
