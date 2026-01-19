import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de rangos de ingresos para valor numérico
const RANGO_INGRESOS_MAP: Record<string, number> = {
  'menos de 1000€': 900,
  'menos de 1000': 900,
  '1000-1500€': 1250,
  '1000-1500': 1250,
  '1500-2000€': 1750,
  '1500-2000': 1750,
  '2000-2500€': 2250,
  '2000-2500': 2250,
  '2500-3000€': 2750,
  '2500-3000': 2750,
  'más de 3000€': 3500,
  'más de 3000': 3500,
  'mas de 3000€': 3500,
  'mas de 3000': 3500,
};

// Regiões da Catalunha
const CATALUNA_ZONAS = ['barcelona', 'tarragona', 'girona', 'lleida', 'catalunya', 'cataluña'];

interface MetaLeadData {
  nombre: string;
  telefono: string;
  email: string;
  antiguedad_trabajo?: string;
  tiene_nie_dni?: string;
  en_fichero_morosidad?: string;
  preferencia_llamada?: string;
  edad?: number;
  habitaciones?: number;
  zona_interes?: string;
  rango_ingresos?: string;
  deudas_mensuales?: number;
}

interface QualificationResult {
  cualificado: boolean;
  razon_no_cualificado?: string;
}

function parseIngresos(rangoIngresos?: string): number {
  if (!rangoIngresos) return 0;
  
  const normalizado = rangoIngresos.toLowerCase().trim();
  
  // Tentar match exato
  if (RANGO_INGRESOS_MAP[normalizado]) {
    return RANGO_INGRESOS_MAP[normalizado];
  }
  
  // Tentar match parcial
  for (const [key, value] of Object.entries(RANGO_INGRESOS_MAP)) {
    if (normalizado.includes(key.replace('€', '').trim())) {
      return value;
    }
  }
  
  // Tentar extrair número diretamente
  const numMatch = rangoIngresos.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  
  return 1500; // Valor padrão
}

function determinarRegion(zonaInteres?: string): string {
  if (!zonaInteres) return 'General';
  
  const zonaNormalizada = zonaInteres.toLowerCase().trim();
  
  for (const catalunaZona of CATALUNA_ZONAS) {
    if (zonaNormalizada.includes(catalunaZona)) {
      return 'Cataluña';
    }
  }
  
  return 'General';
}

function normalizarPreferenciaLlamada(preferencia?: string): string {
  if (!preferencia) return 'mañana';
  
  const pref = preferencia.toLowerCase().trim();
  
  if (pref.includes('mañana') || pref.includes('manana') || pref.includes('morning')) {
    return 'mañana';
  }
  if (pref.includes('tarde') || pref.includes('afternoon')) {
    return 'tarde';
  }
  if (pref.includes('noche') || pref.includes('evening') || pref.includes('night')) {
    return 'noche';
  }
  
  return 'mañana';
}

function qualificarLead(data: MetaLeadData, ingresos: number): QualificationResult {
  // Critério 1: Antigüedad en trabajo >= 1 año
  if (data.antiguedad_trabajo) {
    const antiguedad = data.antiguedad_trabajo.toLowerCase();
    if (antiguedad.includes('menos') || antiguedad.includes('0') || antiguedad === 'no') {
      return { cualificado: false, razon_no_cualificado: 'Antigüedad laboral insuficiente (menos de 1 año)' };
    }
  }
  
  // Critério 2: Tiene NIE/DNI
  if (data.tiene_nie_dni) {
    const tiene = data.tiene_nie_dni.toLowerCase();
    if (tiene === 'no' || tiene.includes('no tengo')) {
      return { cualificado: false, razon_no_cualificado: 'No tiene NIE/DNI' };
    }
  }
  
  // Critério 3: NO está en fichero de morosidad
  if (data.en_fichero_morosidad) {
    const morosidad = data.en_fichero_morosidad.toLowerCase();
    if (morosidad === 'si' || morosidad === 'sí' || morosidad.includes('si')) {
      return { cualificado: false, razon_no_cualificado: 'Está en fichero de morosidad' };
    }
  }
  
  // Critério 4: Edad < 66
  if (data.edad && data.edad >= 66) {
    return { cualificado: false, razon_no_cualificado: 'Edad superior a 65 años' };
  }
  
  // Critério 5: Ingresos >= 1050€
  if (ingresos < 1050) {
    return { cualificado: false, razon_no_cualificado: 'Ingresos insuficientes (menos de 1050€)' };
  }
  
  // Critério 6: Deudas < 30% de ingresos
  const deudas = data.deudas_mensuales || 0;
  const porcentajeDeuda = (deudas / ingresos) * 100;
  if (porcentajeDeuda >= 30) {
    return { cualificado: false, razon_no_cualificado: 'Porcentaje de deuda muy alto (≥30% de ingresos)' };
  }
  
  return { cualificado: true };
}

function calcularSimulacionPersonal(ingresos: number, deudas: number) {
  const capacidadPago = ingresos * 0.35;
  const capacidadDisponible = Math.max(capacidadPago - deudas, 0);
  
  // Crédito personal: hasta 7 años (84 meses), TAE ~8%
  const tasaMensual = 0.08 / 12;
  const plazoMeses = 84;
  
  // Monto máximo = cuota * ((1 - (1+r)^-n) / r)
  const factorAnualidad = (1 - Math.pow(1 + tasaMensual, -plazoMeses)) / tasaMensual;
  const montoMaximo = Math.round(capacidadDisponible * factorAnualidad);
  
  return {
    monto_maximo: Math.min(montoMaximo, 50000), // Límite de crédito personal
    cuota_mensual: Math.round(capacidadDisponible),
    plazo_meses: plazoMeses,
    tae_estimada: 8,
    aprobado: capacidadDisponible >= 100
  };
}

function calcularSimulacionHipotecaria(ingresos: number, deudas: number, edad?: number) {
  const capacidadPago = ingresos * 0.35;
  const capacidadDisponible = Math.max(capacidadPago - deudas, 0);
  
  // Plazo máximo según edad (máx 75 años al finalizar)
  const edadActual = edad || 35;
  const plazoMaximoAnos = Math.min(30, 75 - edadActual);
  const plazoMeses = plazoMaximoAnos * 12;
  
  // Hipoteca: TAE ~3.5%
  const tasaMensual = 0.035 / 12;
  
  // Monto máximo financiable
  const factorAnualidad = (1 - Math.pow(1 + tasaMensual, -plazoMeses)) / tasaMensual;
  const montoMaximoFinanciable = Math.round(capacidadDisponible * factorAnualidad);
  
  // Valor máximo inmueble (asumiendo 80% financiación)
  const valorMaximoInmueble = Math.round(montoMaximoFinanciable / 0.8);
  
  // Capital necesario (20% entrada + ~10% gastos)
  const capitalNecesario = Math.round(valorMaximoInmueble * 0.30);
  
  return {
    monto_maximo_financiable: montoMaximoFinanciable,
    valor_maximo_inmueble: valorMaximoInmueble,
    cuota_maxima_mensual: Math.round(capacidadDisponible),
    capital_necesario: capitalNecesario,
    plazo_anos: plazoMaximoAnos,
    tae_estimada: 3.5,
    aprobado: capacidadDisponible >= 200 && montoMaximoFinanciable >= 50000
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const data: MetaLeadData = await req.json();
    
    console.log('[meta-lead-webhook] Dados recebidos:', JSON.stringify(data));

    // Validar campos obrigatórios
    if (!data.nombre || !data.telefono || !data.email) {
      console.error('[meta-lead-webhook] Campos obrigatórios faltando');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios faltando: nombre, telefono, email' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Parsear ingresos
    const ingresos = parseIngresos(data.rango_ingresos);
    const deudas = data.deudas_mensuales || 0;
    
    console.log('[meta-lead-webhook] Ingresos parseados:', ingresos, 'Deudas:', deudas);

    // 2. Qualificar lead
    const qualificacao = qualificarLead(data, ingresos);
    console.log('[meta-lead-webhook] Qualificação:', qualificacao);

    // 3. Determinar região e turno
    const region = determinarRegion(data.zona_interes);
    const turnoPreferido = normalizarPreferenciaLlamada(data.preferencia_llamada);
    
    console.log('[meta-lead-webhook] Região:', region, 'Turno:', turnoPreferido);

    // 4. Atribuir agente via round-robin
    let agenteAsignado = null;
    
    if (qualificacao.cualificado) {
      try {
        const { data: agenteData, error: agenteError } = await supabase.functions.invoke('get-next-agent', {
          body: { 
            region: region,
            considerarTurno: true,
            turnoOverride: turnoPreferido
          }
        });
        
        if (agenteError) {
          console.error('[meta-lead-webhook] Erro ao buscar agente:', agenteError);
        } else if (agenteData?.agente) {
          agenteAsignado = agenteData.agente;
          console.log('[meta-lead-webhook] Agente asignado:', agenteAsignado.nombre);
        }
      } catch (err) {
        console.error('[meta-lead-webhook] Exceção ao buscar agente:', err);
      }
    }

    // 5. Calcular simulações
    const simulacionPersonal = calcularSimulacionPersonal(ingresos, deudas);
    const simulacionHipotecaria = calcularSimulacionHipotecaria(ingresos, deudas, data.edad);
    
    console.log('[meta-lead-webhook] Simulación personal:', simulacionPersonal);
    console.log('[meta-lead-webhook] Simulación hipotecaria:', simulacionHipotecaria);

    // 6. Buscar recomendações de imóveis
    let recomendaciones: any[] = [];
    
    if (qualificacao.cualificado && data.zona_interes) {
      try {
        const precioMinimo = Math.round(simulacionHipotecaria.valor_maximo_inmueble * 0.80);
        const precioMaximo = simulacionHipotecaria.valor_maximo_inmueble;
        
        let query = supabase
          .from('inmuebles')
          .select('id, titulo, precio, quartos, ciudad, region, direccion, image_url, url_externa')
          .eq('disponible', true)
          .gte('precio', precioMinimo)
          .lte('precio', precioMaximo);
        
        // Filtrar por zona
        query = query.or(
          `ciudad.ilike.%${data.zona_interes}%,` +
          `region.ilike.%${data.zona_interes}%,` +
          `direccion.ilike.%${data.zona_interes}%`
        );
        
        // Filtrar por habitaciones se especificado
        if (data.habitaciones) {
          query = query.gte('quartos', data.habitaciones);
        }
        
        const { data: inmuebles, error: inmError } = await query
          .order('precio', { ascending: true })
          .limit(5);
        
        if (inmError) {
          console.error('[meta-lead-webhook] Erro ao buscar imóveis:', inmError);
        } else {
          recomendaciones = inmuebles || [];
          console.log('[meta-lead-webhook] Recomendaciones encontradas:', recomendaciones.length);
        }
      } catch (err) {
        console.error('[meta-lead-webhook] Exceção ao buscar imóveis:', err);
      }
    }

    // 7. Salvar lead no banco
    let leadId = null;
    
    try {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert({
          nombre_completo: data.nombre,
          telefono: data.telefono,
          email: data.email,
          ciudad_interes: data.zona_interes || null,
          zona_interes: data.zona_interes || null,
          valor_inmueble_deseado: simulacionHipotecaria.valor_maximo_inmueble,
          agente_asignado_id: agenteAsignado?.id || null,
          stage: qualificacao.cualificado ? 'recopilacion_expediente' : 'no_cualificado',
          source: 'formulario_web', // Usaremos formulario_web pois não existe meta_ads no enum
          notas: `Lead do Meta Ads.\nPreferência de chamada: ${data.preferencia_llamada || 'não especificada'}\nHabitaciones: ${data.habitaciones || 'não especificada'}\nAntigüedad: ${data.antiguedad_trabajo || 'não especificada'}`,
          simulador_personal_data: simulacionPersonal,
          simulador_hipotecario_data: simulacionHipotecaria
        })
        .select('id')
        .single();
      
      if (leadError) {
        console.error('[meta-lead-webhook] Erro ao criar lead:', leadError);
      } else {
        leadId = leadData.id;
        console.log('[meta-lead-webhook] Lead criado:', leadId);
      }
    } catch (err) {
      console.error('[meta-lead-webhook] Exceção ao criar lead:', err);
    }

    // 8. Montar resposta completa para o Make.com
    const response = {
      success: true,
      lead_id: leadId,
      cualificado: qualificacao.cualificado,
      razon_no_cualificado: qualificacao.razon_no_cualificado || null,
      
      lead: {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        edad: data.edad || null,
        zona_interes: data.zona_interes || null,
        habitaciones: data.habitaciones || null,
        ingresos_estimados: ingresos,
        deudas_mensuales: deudas,
        preferencia_llamada: data.preferencia_llamada || null
      },
      
      agente: agenteAsignado ? {
        id: agenteAsignado.id,
        nombre: agenteAsignado.nombre,
        email: agenteAsignado.email,
        telefono: agenteAsignado.telefono || null,
        tidycal_url: agenteAsignado.tidycal_url || null
      } : null,
      
      simulacion_personal: simulacionPersonal,
      simulacion_hipotecaria: simulacionHipotecaria,
      
      recomendaciones: recomendaciones.map(inm => ({
        id: inm.id,
        titulo: inm.titulo || `${inm.quartos || '?'} hab en ${inm.ciudad}`,
        precio: inm.precio,
        habitaciones: inm.quartos,
        ciudad: inm.ciudad,
        url_externa: inm.url_externa,
        image_url: inm.image_url
      })),
      
      recomendaciones_url: leadId 
        ? `https://tu-hogar-vista.lovable.app/agente/crm?lead=${leadId}`
        : null,
      
      metadata: {
        region_detectada: region,
        turno_preferido: turnoPreferido,
        processed_at: new Date().toISOString()
      }
    };

    // 9. Disparar webhook para Bitrix24 via Make.com (se lead qualificado)
    if (qualificacao.cualificado && leadId) {
      try {
        // Buscar URL do webhook Meta Bitrix
        const { data: webhookSetting } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'webhook_meta_bitrix_url')
          .single();

        const webhookUrl = webhookSetting?.value;

        if (webhookUrl && webhookUrl.trim() !== '') {
          console.log('[meta-lead-webhook] Disparando webhook para Bitrix24:', webhookUrl);

          // Payload ACHATADO para Make.com reconhecer todos os campos individualmente
          const recom = recomendaciones.slice(0, 3);
          
          const bitrixPayload = {
            // Identificação
            source: 'meta_ads',
            timestamp: new Date().toISOString(),
            lead_id: leadId,
            cualificado: true,
            
            // Dados do lead (achatados)
            lead_nombre: data.nombre,
            lead_telefono: data.telefono,
            lead_email: data.email,
            lead_edad: data.edad || null,
            lead_zona_interes: data.zona_interes || null,
            lead_habitaciones: data.habitaciones || null,
            lead_ingresos_estimados: ingresos,
            lead_deudas_mensuales: deudas,
            lead_preferencia_llamada: data.preferencia_llamada || null,
            
            // Dados do agente (achatados)
            agente_id: agenteAsignado?.id || null,
            agente_nombre: agenteAsignado?.nombre || null,
            agente_email: agenteAsignado?.email || null,
            agente_telefono: agenteAsignado?.telefono || null,
            
            // Simulação pessoal (achatados)
            sim_personal_monto_maximo: simulacionPersonal.monto_maximo,
            sim_personal_cuota_mensual: simulacionPersonal.cuota_mensual,
            sim_personal_plazo_meses: simulacionPersonal.plazo_meses,
            sim_personal_tae: simulacionPersonal.tae_estimada,
            
            // Simulação hipotecária (achatados)
            sim_hipoteca_monto_maximo: simulacionHipotecaria.monto_maximo_financiable,
            sim_hipoteca_valor_inmueble: simulacionHipotecaria.valor_maximo_inmueble,
            sim_hipoteca_cuota_mensual: simulacionHipotecaria.cuota_maxima_mensual,
            sim_hipoteca_capital_necesario: simulacionHipotecaria.capital_necesario,
            sim_hipoteca_plazo_anos: simulacionHipotecaria.plazo_anos,
            sim_hipoteca_tae: simulacionHipotecaria.tae_estimada,
            
            // Recomendações (achatadas - até 3)
            recom_1_titulo: recom[0]?.titulo || recom[0] ? `${recom[0]?.quartos || '?'} hab en ${recom[0]?.ciudad}` : null,
            recom_1_precio: recom[0]?.precio || null,
            recom_1_url: recom[0]?.url_externa || null,
            recom_2_titulo: recom[1]?.titulo || recom[1] ? `${recom[1]?.quartos || '?'} hab en ${recom[1]?.ciudad}` : null,
            recom_2_precio: recom[1]?.precio || null,
            recom_2_url: recom[1]?.url_externa || null,
            recom_3_titulo: recom[2]?.titulo || recom[2] ? `${recom[2]?.quartos || '?'} hab en ${recom[2]?.ciudad}` : null,
            recom_3_precio: recom[2]?.precio || null,
            recom_3_url: recom[2]?.url_externa || null,
            
            // URL do CRM
            crm_url: `https://tu-hogar-vista.lovable.app/agente/crm?lead=${leadId}`
          };

          // Disparar webhook
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bitrixPayload)
          });

          // Registrar log
          const logStatus = webhookResponse.ok ? 'success' : 'error';
          const errorMessage = !webhookResponse.ok 
            ? `HTTP ${webhookResponse.status}: ${webhookResponse.statusText}` 
            : null;

          await supabase.from('webhook_logs').insert({
            webhook_url: webhookUrl + ' (meta_bitrix)',
            status: logStatus,
            error_message: errorMessage,
            payload: bitrixPayload
          });

          console.log('[meta-lead-webhook] Webhook Bitrix24 disparado:', logStatus);
        } else {
          console.log('[meta-lead-webhook] URL do webhook Bitrix24 não configurada');
        }
      } catch (webhookErr) {
        console.error('[meta-lead-webhook] Erro ao disparar webhook Bitrix24:', webhookErr);
        
        // Registrar erro no log
        await supabase.from('webhook_logs').insert({
          webhook_url: 'webhook_meta_bitrix_url (error)',
          status: 'error',
          error_message: webhookErr.message || 'Erro desconhecido'
        });
      }
    }

    console.log('[meta-lead-webhook] Resposta final:', JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[meta-lead-webhook] Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
