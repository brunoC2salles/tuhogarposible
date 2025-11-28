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

    // Detectar fornecedor pela URL
    const isSolvia = urlExterna.includes('solvia.es');
    const isClickalia = urlExterna.includes('clikalia.es');

    let cleanImages: string[] = [];

    if (isSolvia) {
      console.log('🏢 Detectado: Solvia');
      
      // Estratégia 1: Tentar ORIGINAL (melhor qualidade)
      const originalPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.ORIGINAL\.jpg/gi;
      let matches = html.match(originalPattern);

      if (matches && matches.length > 0) {
        console.log(`✅ Encontradas ${matches.length} imagens ORIGINAL`);
        cleanImages = Array.from(new Set(
          matches.map(url => 
            url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
          )
        ));
      } else {
        console.log('⚠️ Nenhuma imagem ORIGINAL encontrada, tentando 722x503');
        
        // Estratégia 2: Fallback para 722x503
        const mediumPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.722x503\.jpg/gi;
        matches = html.match(mediumPattern);
        
        if (matches && matches.length > 0) {
          console.log(`✅ Encontradas ${matches.length} imagens 722x503`);
          cleanImages = Array.from(new Set(
            matches.map(url => 
              url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
            )
          ));
        } else {
          console.log('⚠️ Tentando pattern genérico .jpg');
          
          // Estratégia 3: Fallback genérico - qualquer imagem do CDN
          const genericPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.[a-zA-Z0-9]+\.jpg/gi;
          matches = html.match(genericPattern);
          
          if (matches && matches.length > 0) {
            console.log(`✅ Encontradas ${matches.length} imagens com pattern genérico`);
            cleanImages = Array.from(new Set(
              matches.map(url => 
                url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
              )
            ));
          }
        }
      }
      
    } else if (isClickalia) {
      console.log('🏢 Detectado: Clickalia');
      console.log(`📄 Tamanho do HTML: ${html.length} caracteres`);
      
      // NOVO PATTERN: Buscar imagens do Google Cloud Storage
      const clikaliaPattern = /https:\/\/storage\.googleapis\.com\/es-api-clikoffice-infra-esp-pro\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi;
      const clikaliaMatches = html.match(clikaliaPattern);
      
      console.log(`📸 Encontradas ${clikaliaMatches?.length || 0} imagens no Google Storage`);
      
      if (clikaliaMatches && clikaliaMatches.length > 0) {
        cleanImages = Array.from(new Set(
          clikaliaMatches.map(url => url.trim())
        ));
        
        console.log(`✅ ${cleanImages.length} imagens únicas extraídas da Clickalia`);
      } else {
        console.log('❌ Nenhuma imagem encontrada no Clickalia');
      }
      
    } else {
      console.log('⚠️ Fornecedor desconhecido, usando extração genérica');
      
      // Fallback genérico: buscar qualquer .jpg de alta resolução
      const genericPattern = /https:\/\/[^"'\s]+\/(original|large|xlarge|high)\/[^"'\s]+\.jpg/gi;
      const genericMatches = html.match(genericPattern);
      
      if (genericMatches && genericMatches.length > 0) {
        cleanImages = Array.from(new Set(
          genericMatches.map(url => url.trim())
        ));
      }
    }

    // Limitar a 15 imagens
    cleanImages = cleanImages.slice(0, 15);

    if (cleanImages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma imagem encontrada',
          inmuebleId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
