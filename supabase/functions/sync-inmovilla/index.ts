import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

const INMOVILLA_XML_URL = 'http://procesos.apinmo.com/xml/v2/2IcpvbLH/13611-web.xml';

interface InmovillaProduct {
  referencia: string;
  tipo_inmueble: string;
  precio_venta: number;
  poblacion: string;
  provincia: string;
  dormitorios?: number;
  banos?: number;
  metros?: number;
  direccion: string;
  titulo?: string;
  fotos?: string[];
  url_ficha?: string;
}

interface CreateInmuebleData {
  titulo?: string;
  ciudad: string;
  region: string;
  tipo: 'apartamento' | 'casa' | 'local_comercial' | 'terreno' | 'oficina';
  precio: number;
  direccion: string;
  proveedor: string;
  quartos?: number;
  banheiros?: number;
  area_m2?: number;
  url_externa?: string;
  image_url?: string;
  images?: string[];
  codigo_inventario?: string;
}

// Map Inmovilla property types to DB types
const mapPropertyType = (tipoInmovilla: string): CreateInmuebleData['tipo'] => {
  const tipo = tipoInmovilla.toLowerCase();
  
  if (tipo.includes('piso') || tipo.includes('apartamento') || tipo.includes('ático') || tipo.includes('dúplex')) {
    return 'apartamento';
  }
  if (tipo.includes('casa') || tipo.includes('chalet') || tipo.includes('unifamiliar') || tipo.includes('adosado')) {
    return 'casa';
  }
  if (tipo.includes('local') || tipo.includes('garaje') || tipo.includes('comercial')) {
    return 'local_comercial';
  }
  if (tipo.includes('terreno') || tipo.includes('parcela') || tipo.includes('solar')) {
    return 'terreno';
  }
  if (tipo.includes('oficina') || tipo.includes('despacho')) {
    return 'oficina';
  }
  
  return 'apartamento'; // default
};

// Parse XML to extract properties
const parseInmovillaXML = (xmlText: string): InmovillaProduct[] => {
  console.log('[XML Parser] Iniciando parse do XML');
  
  const products: InmovillaProduct[] = [];
  
  // Simple regex-based XML parsing (lightweight, no external deps)
  const propertyRegex = /<inmueble>([\s\S]*?)<\/inmueble>/g;
  const matches = xmlText.matchAll(propertyRegex);
  
  for (const match of matches) {
    const propertyXML = match[1];
    
    try {
      const getTag = (tag: string): string | null => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
        const tagMatch = propertyXML.match(regex);
        return tagMatch ? tagMatch[1].trim() : null;
      };
      
      const getNumber = (tag: string): number | undefined => {
        const value = getTag(tag);
        if (!value) return undefined;
        const num = parseFloat(value.replace(',', '.'));
        return isNaN(num) ? undefined : num;
      };
      
      const getPhotos = (): string[] => {
        const photos: string[] = [];
        const fotosRegex = /<foto[^>]*>([^<]+)<\/foto>/gi;
        const photoMatches = propertyXML.matchAll(fotosRegex);
        
        for (const photoMatch of photoMatches) {
          const url = photoMatch[1].trim();
          if (url) photos.push(url);
        }
        
        return photos;
      };
      
      const referencia = getTag('referencia');
      const precio = getNumber('precio_venta');
      
      // Skip if missing critical fields
      if (!referencia || !precio) {
        console.log('[XML Parser] Produto sem referência ou preço, pulando');
        continue;
      }
      
      const product: InmovillaProduct = {
        referencia,
        tipo_inmueble: getTag('tipo_inmueble') || 'Piso',
        precio_venta: precio,
        poblacion: getTag('poblacion') || '',
        provincia: getTag('provincia') || '',
        dormitorios: getNumber('dormitorios'),
        banos: getNumber('banos'),
        metros: getNumber('metros'),
        direccion: getTag('direccion') || '',
        titulo: getTag('titulo'),
        fotos: getPhotos(),
        url_ficha: getTag('url_ficha'),
      };
      
      products.push(product);
      
    } catch (error) {
      console.error('[XML Parser] Erro ao parsear produto:', error);
    }
  }
  
  console.log(`[XML Parser] Total de produtos parseados: ${products.length}`);
  return products;
};

// Intelligent sync logic
const syncInventory = async (supabase: any, newProducts: CreateInmuebleData[], proveedor: string) => {
  console.log(`[Sync] Iniciando sincronização para: ${proveedor}`);
  console.log(`[Sync] Novos produtos: ${newProducts.length}`);
  
  const stats = {
    added: 0,
    updated: 0,
    disabled: 0,
    protected: 0,
    errors: 0,
  };
  
  try {
    // 1️⃣ Fetch existing products
    const { data: existingProducts, error: fetchError } = await supabase
      .from('inmuebles')
      .select('id, codigo_inventario, proveedor, precio, disponible')
      .eq('proveedor', proveedor);
    
    if (fetchError) throw fetchError;
    
    console.log(`[Sync] Produtos existentes: ${existingProducts?.length || 0}`);
    
    // 2️⃣ Fetch protected products (with reservations or leads)
    const { data: protectedIds, error: protectedError } = await supabase
      .rpc('get_protected_inmuebles', { provider: proveedor });
    
    if (protectedError) throw protectedError;
    
    const protectedSet = new Set(protectedIds?.map((p: any) => p.inmueble_id) || []);
    console.log(`[Sync] Produtos protegidos: ${protectedSet.size}`);
    
    // 3️⃣ Build maps
    const existingMap = new Map();
    existingProducts?.forEach((product: any) => {
      const key = `${product.proveedor}:${product.codigo_inventario}`;
      existingMap.set(key, product);
    });
    
    const newProductsMap = new Map();
    newProducts.forEach(product => {
      const key = `${product.proveedor}:${product.codigo_inventario}`;
      newProductsMap.set(key, product);
    });
    
    // 4️⃣ Process in batches
    const BATCH_SIZE = 100;
    
    // Add/Update products
    for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
      const batch = newProducts.slice(i, i + BATCH_SIZE);
      
      for (const product of batch) {
        const key = `${product.proveedor}:${product.codigo_inventario}`;
        const existing = existingMap.get(key);
        
        try {
          if (!existing) {
            // New product - INSERT
            const { error } = await supabase
              .from('inmuebles')
              .insert(product);
            
            if (error) {
              console.error(`[Sync] Erro ao inserir ${product.codigo_inventario}:`, error);
              stats.errors++;
            } else {
              stats.added++;
            }
          } else {
            // Existing product - UPDATE if changed
            const priceChanged = existing.precio !== product.precio;
            
            if (priceChanged) {
              const { error } = await supabase
                .from('inmuebles')
                .update({
                  precio: product.precio,
                  disponible: true, // Re-enable if was disabled
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
              
              if (error) {
                console.error(`[Sync] Erro ao atualizar ${product.codigo_inventario}:`, error);
                stats.errors++;
              } else {
                stats.updated++;
              }
            }
          }
        } catch (error) {
          console.error(`[Sync] Erro ao processar ${product.codigo_inventario}:`, error);
          stats.errors++;
        }
      }
      
      console.log(`[Sync] Processados ${Math.min(i + BATCH_SIZE, newProducts.length)}/${newProducts.length}`);
    }
    
    // 5️⃣ Disable removed products (except protected)
    for (const [key, existingProduct] of existingMap) {
      if (!newProductsMap.has(key)) {
        const isProtected = protectedSet.has(existingProduct.id);
        
        if (isProtected) {
          stats.protected++;
          console.log(`[Sync] Produto protegido mantido: ${existingProduct.codigo_inventario}`);
        } else if (existingProduct.disponible) {
          // Disable only if currently available
          const { error } = await supabase
            .from('inmuebles')
            .update({ disponible: false })
            .eq('id', existingProduct.id);
          
          if (error) {
            console.error(`[Sync] Erro ao desabilitar ${existingProduct.codigo_inventario}:`, error);
            stats.errors++;
          } else {
            stats.disabled++;
          }
        }
      }
    }
    
    console.log('[Sync] Sincronização concluída:', stats);
    return stats;
    
  } catch (error) {
    console.error('[Sync] Erro geral na sincronização:', error);
    throw error;
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('[Inmovilla Sync] Iniciando sincronização');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1️⃣ Fetch XML from Inmovilla
    console.log('[Inmovilla Sync] Buscando XML de:', INMOVILLA_XML_URL);
    const xmlResponse = await fetch(INMOVILLA_XML_URL);
    
    if (!xmlResponse.ok) {
      throw new Error(`Falha ao buscar XML: ${xmlResponse.status}`);
    }
    
    const xmlText = await xmlResponse.text();
    console.log(`[Inmovilla Sync] XML recebido: ${xmlText.length} caracteres`);
    
    // 2️⃣ Parse XML
    const inmovillaProducts = parseInmovillaXML(xmlText);
    console.log(`[Inmovilla Sync] Produtos parseados: ${inmovillaProducts.length}`);
    
    if (inmovillaProducts.length === 0) {
      throw new Error('Nenhum produto válido encontrado no XML');
    }
    
    // 3️⃣ Map to DB format
    const mappedProducts: CreateInmuebleData[] = inmovillaProducts.map(product => ({
      codigo_inventario: product.referencia,
      titulo: product.titulo || `${product.tipo_inmueble} en ${product.poblacion}`,
      ciudad: product.poblacion || 'N/D',
      region: product.provincia || 'N/D',
      tipo: mapPropertyType(product.tipo_inmueble),
      precio: product.precio_venta,
      direccion: product.direccion || product.poblacion,
      proveedor: 'Inmovilla',
      quartos: product.dormitorios,
      banheiros: product.banos,
      area_m2: product.metros,
      url_externa: product.url_ficha,
      image_url: product.fotos?.[0],
      images: product.fotos && product.fotos.length > 0 ? product.fotos : undefined,
    }));
    
    console.log(`[Inmovilla Sync] Produtos mapeados: ${mappedProducts.length}`);
    
    // 4️⃣ Sync with database
    const syncStats = await syncInventory(supabase, mappedProducts, 'Inmovilla');
    
    // 5️⃣ Return results
    return new Response(
      JSON.stringify({
        success: true,
        total: inmovillaProducts.length,
        stats: syncStats,
        message: 'Sincronização Inmovilla concluída com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error: any) {
    console.error('[Inmovilla Sync] Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
