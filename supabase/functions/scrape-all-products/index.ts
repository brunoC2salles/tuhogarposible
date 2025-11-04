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
    console.log('🚀 Iniciando scraping automático de todos os produtos Solvia');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar todos os produtos Solvia com URL externa
    const { data: produtos, error: fetchError } = await supabase
      .from('inmuebles')
      .select('id, url_externa, titulo, proveedor')
      .eq('proveedor', 'Solvia')
      .not('url_externa', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!produtos || produtos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum produto Solvia encontrado para processar',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 ${produtos.length} produtos encontrados para processar`);

    let processed = 0;
    let errors = 0;
    const results = [];

    // Processar produtos em lotes de 5 para não sobrecarregar
    const batchSize = 5;
    for (let i = 0; i < produtos.length; i += batchSize) {
      const batch = produtos.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (produto) => {
        try {
          console.log(`[${i + 1}/${produtos.length}] Processando: ${produto.titulo}`);
          
          // Chamar função de scraping para cada produto
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-product-images`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                inmuebleId: produto.id,
                urlExterna: produto.url_externa
              })
            }
          );

          const result = await response.json();
          
          if (result.success) {
            processed++;
            results.push({
              id: produto.id,
              titulo: produto.titulo,
              imagesFound: result.totalImages,
              status: 'success'
            });
            console.log(`✅ ${produto.titulo}: ${result.totalImages} imagens`);
          } else {
            errors++;
            results.push({
              id: produto.id,
              titulo: produto.titulo,
              status: 'error',
              error: result.error
            });
            console.log(`❌ ${produto.titulo}: Erro - ${result.error}`);
          }
          
          // Pequeno delay para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          errors++;
          results.push({
            id: produto.id,
            titulo: produto.titulo,
            status: 'error',
            error: error.message
          });
          console.error(`❌ Erro ao processar ${produto.titulo}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Delay entre lotes
      if (i + batchSize < produtos.length) {
        console.log(`⏸️ Aguardando antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const summary = {
      success: true,
      total: produtos.length,
      processed,
      errors,
      results,
      message: `Processamento concluído: ${processed} sucessos, ${errors} erros`
    };

    console.log('🎉 Scraping automático finalizado:', summary.message);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro crítico no scraping automático:', error);
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
