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

    // ✅ REMOVIDO: Reset de produtos "completed" com poucas imagens
    // ✅ REMOVIDO: Reset de produtos "failed" que causava loop infinito

    // Buscar produtos pendentes (apenas os que realmente precisam scraping)
    const { data: pendingItems, error: fetchError } = await supabase
      .from('scraping_progress')
      .select(`
        id,
        inmueble_id,
        attempts,
        inmuebles!inner (
          id,
          titulo,
          url_externa,
          proveedor,
          images
        )
      `)
      .eq('status', 'pending')
      .lt('attempts', 3) // Máximo 3 tentativas
      .order('attempts', { ascending: true })
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
    let skipped = 0;
    const results = [];

    // Processar em paralelo (5 por vez para evitar sobrecarga)
    const batchSize = 5;
    for (let i = 0; i < pendingItems.length; i += batchSize) {
      const batch = pendingItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const inmueble = item.inmuebles as any;
        
        // ✅ NOVO: Verificar se é Hipoges - não fazer scraping
        if (inmueble?.proveedor === 'Hipoges') {
          // Hipoges já tem imagens do JSON, marcar como completed
          const existingImages = inmueble.images as any[];
          const imageCount = Array.isArray(existingImages) ? existingImages.length : 0;
          
          await supabase
            .from('scraping_progress')
            .update({ 
              status: 'completed',
              images_found: imageCount,
              error_message: imageCount > 0 ? null : 'Hipoges - imagens do JSON'
            })
            .eq('id', item.id);
          
          skipped++;
          results.push({
            id: inmueble.id,
            titulo: inmueble.titulo,
            status: 'skipped',
            reason: 'Hipoges - usa imagens do JSON'
          });
          console.log(`⏭️ ${inmueble.titulo || inmueble.id}: Hipoges (${imageCount} imagens do JSON)`);
          return;
        }
        
        // ✅ NOVO: Se já tem imagens no banco, marcar como completed
        const existingImages = inmueble?.images as any[];
        if (Array.isArray(existingImages) && existingImages.length > 0) {
          await supabase
            .from('scraping_progress')
            .update({ 
              status: 'completed',
              images_found: existingImages.length,
              error_message: null
            })
            .eq('id', item.id);
          
          skipped++;
          results.push({
            id: inmueble.id,
            titulo: inmueble.titulo,
            status: 'skipped',
            reason: `Já tem ${existingImages.length} imagens`
          });
          console.log(`⏭️ ${inmueble.titulo || inmueble.id}: Já tem ${existingImages.length} imagens`);
          return;
        }
        
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

          console.log(`[${processed + errors + skipped + 1}/${pendingItems.length}] Processando: ${inmueble.titulo || inmueble.id}`);
          
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
          
          // ✅ CORRIGIDO: Marcar como failed definitivo após 3 tentativas (não resetar)
          const newStatus = newAttempts >= 3 ? 'failed' : 'pending';
          
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
          console.error(`❌ ${inmueble.titulo || inmueble.id}: ${errorMsg} (tentativa ${newAttempts}/3)`);
        }
      });

      await Promise.all(batchPromises);
      
      // Pequeno delay entre sub-batches para não sobrecarregar
      if (i + batchSize < pendingItems.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
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
      skipped,
      errors,
      results,
      stats: summary,
      message: `Lote concluído: ${processed} sucessos, ${skipped} pulados, ${errors} erros`
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
