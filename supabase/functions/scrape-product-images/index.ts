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
    const { inmuebleId, urlExterna } = await req.json();
    
    if (!inmuebleId || !urlExterna) {
      throw new Error('inmuebleId e urlExterna são obrigatórios');
    }

    console.log('🔍 Iniciando scraping para:', urlExterna, 'ID:', inmuebleId);

    // Fazer fetch da página do produto
    const response = await fetch(urlExterna, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar página: ${response.status}`);
    }

    const html = await response.text();

    // Extrair apenas imagens do produto (cdnsolvproep.solvia.es)
    // Filtrar para pegar apenas as versões .ORIGINAL.jpg (melhor qualidade)
    const imagePattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.ORIGINAL\.jpg/gi;
    const matches = html.match(imagePattern);

    if (!matches || matches.length === 0) {
      console.log('⚠️ Nenhuma imagem ORIGINAL encontrada, tentando outras resoluções');
      
      // Fallback: pegar 722x503 se não houver ORIGINAL
      const fallbackPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.722x503\.jpg/gi;
      const fallbackMatches = html.match(fallbackPattern);
      
      if (fallbackMatches && fallbackMatches.length > 0) {
        const cleanImages = Array.from(new Set(
          fallbackMatches.map(url => 
            url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
          )
        ));
        
        console.log(`📸 ${cleanImages.length} imagens 722x503 encontradas`);
        
        // Atualizar banco de dados
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { error: updateError } = await supabase
          .from('inmuebles')
          .update({ images: cleanImages })
          .eq('id', inmuebleId);

        if (updateError) {
          console.error('❌ Erro ao atualizar banco:', updateError);
          throw updateError;
        }

        console.log('✅ Banco atualizado com sucesso');
        
        return new Response(
          JSON.stringify({
            success: true,
            inmuebleId,
            totalImages: cleanImages.length,
            images: cleanImages,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma imagem encontrada',
          inmuebleId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar URLs e remover duplicatas
    const cleanImages = Array.from(new Set(
      matches.map(url => 
        url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
      )
    ));

    console.log(`📸 ${cleanImages.length} imagens ORIGINAL encontradas`);

    // Atualizar banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('inmuebles')
      .update({ images: cleanImages })
      .eq('id', inmuebleId);

    if (updateError) {
      console.error('❌ Erro ao atualizar banco:', updateError);
      throw updateError;
    }

    console.log('✅ Banco atualizado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        inmuebleId,
        totalImages: cleanImages.length,
        images: cleanImages,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro no scraping:', error);
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
