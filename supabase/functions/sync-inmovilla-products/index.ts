import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INMOVILLA_API_URL = 'http://ycasas.es/apiemail/servidor/adjuntos/api_cliente.php'

// Map Inmovilla property types to our enum
const mapTipoInmueble = (nbtipo: string): string => {
  const tipoLower = (nbtipo || '').toLowerCase()
  
  if (tipoLower.includes('apartamento') || tipoLower.includes('piso') || tipoLower.includes('ático') || tipoLower.includes('estudio')) {
    return 'apartamento'
  }
  if (tipoLower.includes('casa') || tipoLower.includes('chalet') || tipoLower.includes('villa') || tipoLower.includes('adosado') || tipoLower.includes('pareado')) {
    return 'casa'
  }
  if (tipoLower.includes('local') || tipoLower.includes('comercial') || tipoLower.includes('nave') || tipoLower.includes('tienda')) {
    return 'local_comercial'
  }
  if (tipoLower.includes('terreno') || tipoLower.includes('solar') || tipoLower.includes('parcela') || tipoLower.includes('finca')) {
    return 'terreno'
  }
  if (tipoLower.includes('oficina') || tipoLower.includes('despacho')) {
    return 'oficina'
  }
  
  // Default to apartamento if unknown
  return 'apartamento'
}

// Parse numeric value safely
const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''))
  return isNaN(parsed) ? null : parsed
}

interface InmovillaProduct {
  ref: string
  ciudad: string
  zona: string
  nbtipo: string
  precioinmo: number
  habdobles?: number
  habitaciones?: number
  banyos?: number
  aseos?: number
  m_cons?: number
  foto?: string
  direccion?: string
  titulo?: string
  codpostal?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const NUMAGENCIA = Deno.env.get('INMOVILLA_NUMAGENCIA')
    const ADDNUMAGENCIA = Deno.env.get('INMOVILLA_ADDNUMAGENCIA')
    const PASSWORD = Deno.env.get('INMOVILLA_PASSWORD')

    if (!NUMAGENCIA || !ADDNUMAGENCIA || !PASSWORD) {
      console.error('Missing Inmovilla credentials')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Inmovilla credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting Inmovilla sync...')
    
    let allProducts: InmovillaProduct[] = []
    let posInicial = 1
    const numElementos = 50
    let hasMore = true
    let pageCount = 0
    const maxPages = 20 // Safety limit: max 1000 products

    // Paginate through all results
    while (hasMore && pageCount < maxPages) {
      console.log(`Fetching page ${pageCount + 1}, position ${posInicial}...`)
      
      const formData = new URLSearchParams({
        numagencia: NUMAGENCIA,
        addnumagencia: ADDNUMAGENCIA,
        password: PASSWORD,
        idioma: '1',
        tipo: 'paginacion',
        posinicial: String(posInicial),
        numelementos: String(numElementos),
        where: '',
        orden: 'fechaact desc'
      })

      const response = await fetch(INMOVILLA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (!response.ok) {
        console.error(`API request failed: ${response.status}`)
        break
      }

      const data = await response.json()
      
      // Check if we got results
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('No more results from API')
        hasMore = false
        break
      }

      // Check for error response
      if (data.error) {
        console.error('API returned error:', data.error)
        break
      }

      allProducts = [...allProducts, ...data]
      console.log(`Received ${data.length} products, total: ${allProducts.length}`)
      
      // Check if we got less than requested (end of results)
      if (data.length < numElementos) {
        hasMore = false
      } else {
        posInicial += numElementos
        pageCount++
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`Total products fetched: ${allProducts.length}`)

    if (allProducts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No products found in Inmovilla API',
          synced: 0,
          errors: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get protected inmuebles (with reservations or linked to leads)
    const { data: protectedIds } = await supabase
      .rpc('get_protected_inmuebles', { provider: 'Inmovilla' })

    const protectedSet = new Set((protectedIds || []).map((p: { inmueble_id: string }) => p.inmueble_id))
    console.log(`Protected inmuebles (won't be deleted): ${protectedSet.size}`)

    // Transform and prepare products for upsert
    let syncedCount = 0
    let errorCount = 0
    const productsToUpsert: any[] = []

    for (const product of allProducts) {
      try {
        const quartos = (parseNumber(product.habdobles) || 0) + (parseNumber(product.habitaciones) || 0)
        const banheiros = (parseNumber(product.banyos) || 0) + (parseNumber(product.aseos) || 0)
        
        productsToUpsert.push({
          codigo_inventario: String(product.ref),
          ciudad: product.ciudad || 'Sin especificar',
          region: product.zona || product.codpostal || 'Sin especificar',
          tipo: mapTipoInmueble(product.nbtipo),
          precio: parseNumber(product.precioinmo) || 0,
          direccion: product.direccion || `${product.ciudad || ''}, ${product.zona || ''}`.trim() || 'Sin dirección',
          proveedor: 'Inmovilla',
          disponible: true,
          quartos: quartos > 0 ? quartos : null,
          banheiros: banheiros > 0 ? banheiros : null,
          area_m2: parseNumber(product.m_cons),
          image_url: product.foto || null,
          titulo: product.titulo || null,
        })
      } catch (err) {
        console.error(`Error transforming product ${product.ref}:`, err)
        errorCount++
      }
    }

    // Batch upsert in chunks of 100
    const chunkSize = 100
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize)
      
      const { error: upsertError } = await supabase
        .from('inmuebles')
        .upsert(chunk, {
          onConflict: 'codigo_inventario,proveedor',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error(`Upsert error for chunk ${i / chunkSize}:`, upsertError)
        errorCount += chunk.length
      } else {
        syncedCount += chunk.length
      }
    }

    // Mark products not in API response as unavailable (soft delete)
    // Only for Inmovilla products that are not protected
    const syncedRefs = new Set(allProducts.map(p => String(p.ref)))
    
    const { data: existingProducts } = await supabase
      .from('inmuebles')
      .select('id, codigo_inventario')
      .eq('proveedor', 'Inmovilla')
      .eq('disponible', true)

    const toMarkUnavailable: string[] = []
    for (const existing of existingProducts || []) {
      if (!syncedRefs.has(existing.codigo_inventario) && !protectedSet.has(existing.id)) {
        toMarkUnavailable.push(existing.id)
      }
    }

    if (toMarkUnavailable.length > 0) {
      console.log(`Marking ${toMarkUnavailable.length} products as unavailable`)
      await supabase
        .from('inmuebles')
        .update({ disponible: false })
        .in('id', toMarkUnavailable)
    }

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors, ${toMarkUnavailable.length} marked unavailable`)

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors: errorCount,
        markedUnavailable: toMarkUnavailable.length,
        total: allProducts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
