import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function cdata(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value).replace(/]]>/g, ']]]]><![CDATA[>')
  return `<![CDATA[${str}]]>`
}

function esc(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

interface InmuebleRow {
  id: string
  codigo_inventario: string | null
  titulo: string | null
  tipo: string
  precio: number | null
  disponible: boolean
  ciudad: string
  region: string
  direccion: string
  proveedor: string
  quartos: number | null
  banheiros: number | null
  area_m2: number | null
  url_externa: string | null
  image_url: string | null
  images: unknown
  created_at: string
  updated_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const filterDisponible = url.searchParams.get('disponible')
    const filterProveedor = url.searchParams.get('proveedor')
    const limitParam = url.searchParams.get('limit')
    const maxLimit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 0) : null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const PAGE = 1000
    let from = 0
    const all: InmuebleRow[] = []

    while (true) {
      let q = supabase
        .from('inmuebles')
        .select('id,codigo_inventario,titulo,tipo,precio,disponible,ciudad,region,direccion,proveedor,quartos,banheiros,area_m2,url_externa,image_url,images,created_at,updated_at')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1)

      if (filterDisponible === 'true') q = q.eq('disponible', true)
      if (filterDisponible === 'false') q = q.eq('disponible', false)
      if (filterProveedor) q = q.eq('proveedor', filterProveedor)

      const { data, error } = await q
      if (error) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<error>${esc(error.message)}</error>`,
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' } },
        )
      }
      if (!data || data.length === 0) break
      all.push(...(data as InmuebleRow[]))
      if (data.length < PAGE) break
      if (maxLimit && all.length >= maxLimit) break
      from += PAGE
    }

    const rows = maxLimit ? all.slice(0, maxLimit) : all

    const parts: string[] = []
    parts.push('<?xml version="1.0" encoding="UTF-8"?>')
    parts.push(`<inmuebles generated_at="${new Date().toISOString()}" total="${rows.length}">`)

    for (const r of rows) {
      let imgs: string[] = []
      if (Array.isArray(r.images)) {
        imgs = (r.images as unknown[]).filter((x) => typeof x === 'string') as string[]
      }

      parts.push('  <inmueble>')
      parts.push(`    <id>${esc(r.id)}</id>`)
      parts.push(`    <codigo_inventario>${cdata(r.codigo_inventario ?? '')}</codigo_inventario>`)
      parts.push(`    <titulo>${cdata(r.titulo ?? '')}</titulo>`)
      parts.push(`    <tipo>${esc(r.tipo)}</tipo>`)
      parts.push(`    <precio currency="EUR">${esc(r.precio ?? '')}</precio>`)
      parts.push(`    <disponible>${r.disponible ? 'true' : 'false'}</disponible>`)
      parts.push('    <ubicacion>')
      parts.push(`      <ciudad>${cdata(r.ciudad)}</ciudad>`)
      parts.push(`      <region>${cdata(r.region)}</region>`)
      parts.push(`      <direccion>${cdata(r.direccion)}</direccion>`)
      parts.push('    </ubicacion>')
      parts.push('    <caracteristicas>')
      parts.push(`      <quartos>${esc(r.quartos ?? '')}</quartos>`)
      parts.push(`      <banheiros>${esc(r.banheiros ?? '')}</banheiros>`)
      parts.push(`      <area_m2>${esc(r.area_m2 ?? '')}</area_m2>`)
      parts.push('    </caracteristicas>')
      parts.push(`    <proveedor>${cdata(r.proveedor)}</proveedor>`)
      parts.push(`    <url_externa>${cdata(r.url_externa ?? '')}</url_externa>`)
      parts.push(`    <imagen_principal>${cdata(r.image_url ?? '')}</imagen_principal>`)
      if (imgs.length > 0) {
        parts.push('    <imagenes>')
        for (const img of imgs) {
          parts.push(`      <imagen>${cdata(img)}</imagen>`)
        }
        parts.push('    </imagenes>')
      } else {
        parts.push('    <imagenes/>')
      }
      parts.push('    <fechas>')
      parts.push(`      <created_at>${esc(r.created_at)}</created_at>`)
      parts.push(`      <updated_at>${esc(r.updated_at)}</updated_at>`)
      parts.push('    </fechas>')
      parts.push('  </inmueble>')
    }

    parts.push('</inmuebles>')

    return new Response(parts.join('\n'), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (e) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>${esc((e as Error).message)}</error>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' } },
    )
  }
})
