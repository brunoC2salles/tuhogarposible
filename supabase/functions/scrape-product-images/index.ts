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

    // ✅ NOVO: Verificar se é Hipoges - não tentar scraping (site Angular SPA)
    const isHipoges = urlExterna.includes('hipoges.com') || urlExterna.includes('realestate.hipoges');
    if (isHipoges) {
      console.log('⚠️ Hipoges detectado - scraping não suportado (Angular SPA)');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Hipoges usa Angular SPA - imagens devem vir do JSON de importação',
          inmuebleId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer fetch da página do produto com headers mais completos
    const response = await fetch(urlExterna, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar página: ${response.status}`);
    }

    const html = await response.text();
    console.log(`📄 HTML recebido: ${html.length} caracteres`);

    // Detectar fornecedor pela URL
    const isSolvia = urlExterna.includes('solvia.es');

    let cleanImages: string[] = [];

    if (isSolvia) {
      console.log('🏢 Detectado: Solvia');
      
      // ESTRATÉGIA 1: Buscar no JSON-LD (mais confiável)
      const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      let jsonLdMatch;
      
      while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          
          // Verificar se é Product ou RealEstateListing
          if (jsonData['@type'] === 'Product' || jsonData['@type'] === 'RealEstateListing' || jsonData['@type'] === 'Residence') {
            if (jsonData.image) {
              const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
              cleanImages.push(...images.filter((img: string) => typeof img === 'string'));
              console.log(`✅ JSON-LD: Encontradas ${images.length} imagens`);
            }
          }
          
          // Verificar ImageGallery
          if (jsonData['@type'] === 'ImageGallery' && jsonData.image) {
            const images = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
            cleanImages.push(...images.filter((img: string) => typeof img === 'string'));
          }
        } catch (e) {
          // JSON inválido, continuar
        }
      }
      
      // ESTRATÉGIA 2: Buscar ORIGINAL (melhor qualidade)
      if (cleanImages.length === 0) {
        const originalPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.ORIGINAL\.(jpg|jpeg|png|webp)/gi;
        let matches = html.match(originalPattern);

        if (matches && matches.length > 0) {
          console.log(`✅ Encontradas ${matches.length} imagens ORIGINAL`);
          cleanImages = matches.map(url => 
            url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
          );
        }
      }
      
      // ESTRATÉGIA 3: Buscar 722x503 (médio)
      if (cleanImages.length === 0) {
        const mediumPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]+img_[A-F0-9-]+\.722x503\.(jpg|jpeg|png|webp)/gi;
        const matches = html.match(mediumPattern);
        
        if (matches && matches.length > 0) {
          console.log(`✅ Encontradas ${matches.length} imagens 722x503`);
          cleanImages = matches.map(url => 
            url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
          );
        }
      }
      
      // ESTRATÉGIA 4: Qualquer imagem do CDN Solvia
      if (cleanImages.length === 0) {
        const genericPattern = /https:\/\/cdnsolvproep\.solvia\.es\/uploaded[\/\\]*[^"'\s<>]+\.(jpg|jpeg|png|webp)/gi;
        const matches = html.match(genericPattern);
        
        if (matches && matches.length > 0) {
          console.log(`✅ Pattern genérico: ${matches.length} imagens`);
          cleanImages = matches.map(url => 
            url.replace(/\\/g, '/').replace(/\/+/g, '/').replace(':/', '://')
          );
        }
      }
      
      // ESTRATÉGIA 5: Buscar em data attributes e srcset
      if (cleanImages.length === 0) {
        const dataImgPattern = /data-(?:src|original|lazy|image)=["']([^"']+solvia[^"']+\.(jpg|jpeg|png|webp))/gi;
        let match;
        while ((match = dataImgPattern.exec(html)) !== null) {
          cleanImages.push(match[1]);
        }
        
        if (cleanImages.length > 0) {
          console.log(`✅ Data attributes: ${cleanImages.length} imagens`);
        }
      }
      
    } else {
      console.log('⚠️ Fornecedor desconhecido, usando extração genérica');
      
      // Fallback: qualquer imagem grande
      const genericPattern = /https?:\/\/[^"'\s<>]+\/(original|large|xlarge|high|big|full)[^"'\s<>]*\.(jpg|jpeg|png|webp)/gi;
      const genericMatches = html.match(genericPattern);
      
      if (genericMatches && genericMatches.length > 0) {
        cleanImages = genericMatches.map(url => url.trim());
      }
    }

    // Remover duplicados e limitar a 20 imagens
    cleanImages = [...new Set(cleanImages)].slice(0, 20);
    
    // Filtrar thumbnails e miniaturas
    cleanImages = cleanImages.filter(url => 
      !url.includes('thumb') && 
      !url.includes('mini') && 
      !url.includes('small') &&
      !url.includes('50x') &&
      !url.includes('100x') &&
      !url.includes('150x')
    );

    console.log(`📸 Total final: ${cleanImages.length} imagens únicas`);

    if (cleanImages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma imagem encontrada',
          inmuebleId,
          htmlLength: html.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('inmuebles')
      .update({ 
        images: cleanImages,
        image_url: cleanImages[0] // Também atualizar image_url com a primeira imagem
      })
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
