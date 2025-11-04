import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urlExterna } = await req.json();
    
    if (!urlExterna) {
      throw new Error('URL externa é obrigatória');
    }

    console.log('🔍 Iniciando scraping para:', urlExterna);

    // Fazer fetch da página do produto
    const response = await fetch(urlExterna, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar página: ${response.status}`);
    }

    const html = await response.text();
    console.log('✅ HTML recebido, tamanho:', html.length);

    // Extrair URLs de imagens
    // Solvia usa diferentes padrões de URL para imagens
    const imagePatterns = [
      /https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi,
      /cdnsolvproep\.solvia\.es[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi,
    ];

    const foundImages = new Set<string>();

    for (const pattern of imagePatterns) {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(url => {
          // Limpar e normalizar URL
          let cleanUrl = url.replace(/['">\s]/g, '');
          if (cleanUrl.startsWith('//')) {
            cleanUrl = 'https:' + cleanUrl;
          } else if (cleanUrl.startsWith('cdnsolvproep')) {
            cleanUrl = 'https://' + cleanUrl;
          }
          
          // Filtrar miniaturas muito pequenas e duplicadas
          if (!cleanUrl.includes('thumb') && 
              !cleanUrl.includes('50x50') &&
              !cleanUrl.includes('100x100')) {
            foundImages.add(cleanUrl);
          }
        });
      }
    }

    // Tentar extrair do JSON-LD se houver
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.image) {
          if (Array.isArray(jsonData.image)) {
            jsonData.image.forEach((img: string) => foundImages.add(img));
          } else if (typeof jsonData.image === 'string') {
            foundImages.add(jsonData.image);
          }
        }
      } catch (e) {
        console.log('Não foi possível extrair JSON-LD');
      }
    }

    const imageArray = Array.from(foundImages);
    
    console.log('📸 Imagens encontradas:', imageArray.length);
    console.log('URLs:', imageArray);

    return new Response(
      JSON.stringify({
        success: true,
        urlExterna,
        totalImages: imageArray.length,
        images: imageArray,
        message: `${imageArray.length} imagens encontradas`
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
