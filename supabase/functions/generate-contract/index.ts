import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    const { token, formData } = await req.json();
    
    console.log('[Generate Contract] Processing token:', token);

    // 1. Buscar link e validar
    const { data: linkData, error: linkError } = await supabaseClient
      .from('public_contract_links')
      .select(`
        *,
        leads:lead_id (
          id,
          nombre_completo,
          email,
          telefono,
          ciudad_interes,
          zona_interes
        ),
        contract_templates:template_id (
          id,
          nombre,
          template_content,
          campos_formulario
        ),
        profiles:agente_id (
          id,
          nombre,
          email,
          telefono
        )
      `)
      .eq('token', token)
      .single();

    if (linkError || !linkData) {
      console.error('[Generate Contract] Link not found:', linkError);
      return new Response(
        JSON.stringify({ error: 'Link inválido ou expirado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já foi completado
    if (linkData.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Este contrato já foi preenchido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração
    const now = new Date();
    const expiresAt = new Date(linkData.expires_at);
    if (now > expiresAt) {
      // Marcar como expirado
      await supabaseClient
        .from('public_contract_links')
        .update({ status: 'expired' })
        .eq('id', linkData.id);

      return new Response(
        JSON.stringify({ error: 'Link expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Processar dados do formulário e gerar PDF simples
    const lead = linkData.leads;
    const agent = linkData.profiles;
    const template = linkData.contract_templates;

    // Criar registro na tabela generated_contracts
    const { data: contractData, error: contractError } = await supabaseClient
      .from('generated_contracts')
      .insert({
        lead_id: lead.id,
        tipo_contrato: 'compra_venta',
        datos_contrato: {
          ...formData,
          cliente_nombre: lead.nombre_completo,
          cliente_email: lead.email,
          cliente_telefono: lead.telefono,
          agente_nombre: agent.nombre,
          agente_email: agent.email,
          agente_dni: formData.agente_dni || '',
          fecha_contrato: formData.fecha_firma,
          template_used: template.nombre
        },
        generated_by: linkData.agente_id,
        notas: `Contrato gerado via formulário público. Template: ${template.nombre}`
      })
      .select()
      .single();

    if (contractError) {
      console.error('[Generate Contract] Error creating contract:', contractError);
      throw contractError;
    }

    // 3. Atualizar link como completado
    await supabaseClient
      .from('public_contract_links')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        datos_completados: formData,
        contract_generated_id: contractData.id
      })
      .eq('id', linkData.id);

    console.log('[Generate Contract] Contract generated successfully:', contractData.id);

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contractData.id,
        message: 'Contrato gerado com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[Generate Contract] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
