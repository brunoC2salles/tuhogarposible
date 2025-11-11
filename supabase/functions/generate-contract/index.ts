import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getMonthFromDate(dateString: string): string {
  const date = new Date(dateString);
  return MESES_ES[date.getMonth()];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // 2. Buscar dados do agente que criou o link
    const { data: agentData, error: agentError } = await supabaseClient
      .from('profiles')
      .select('id, nombre, email, telefono, dni_nie')
      .eq('id', linkData.agente_id)
      .single();

    if (agentError || !agentData) {
      console.error('[Generate Contract] Agent not found:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Gerar conteúdo do contrato com variáveis substituídas
    const lead = linkData.leads;
    const agent = agentData;
    const template = linkData.contract_templates;

    // Buscar dados do agente selecionado pelo lead
    const selectedAgentId = formData.agente_id;
    const { data: selectedAgent } = await supabaseClient
      .from('profiles')
      .select('nombre, dni_nie')
      .eq('id', selectedAgentId)
      .single();

    if (!selectedAgent) {
      throw new Error('Agente selecionado não encontrado');
    }

    // Calcular mês a partir da data de firma
    const mes = getMonthFromDate(formData.fecha_firma);

    let contractContent = template.template_content;
    
    // Substituir todas as variáveis
    contractContent = contractContent.replace(/<<mes>>/g, mes);
    contractContent = contractContent.replace(/<<ag-fiscal>>/g, selectedAgent.dni_nie || '');
    contractContent = contractContent.replace(/<<nombre>>/g, formData.nombre_completo || '');
    contractContent = contractContent.replace(/<<Nombre>>/g, formData.nombre_completo || '');
    contractContent = contractContent.replace(/<<dirección>>/g, formData.direccion_actual || '');
    contractContent = contractContent.replace(/<<dni\/nie>>/g, formData.dni_nie || '');
    contractContent = contractContent.replace(/<<Agente>>/g, selectedAgent.nombre || '');
    contractContent = contractContent.replace(/<<email>>/g, formData.email || '');
    contractContent = contractContent.replace(/<<teléfono>>/g, lead.telefono || '');
    contractContent = contractContent.replace(/<<fecha>>/g, formData.fecha_firma || '');

    // 3. Criar registro na tabela generated_contracts
    const { data: contractData, error: contractError } = await supabaseClient
      .from('generated_contracts')
      .insert({
        lead_id: lead.id,
        tipo_contrato: 'compra_venta',
        datos_contrato: {
          ...formData,
          mes_calculado: mes,
          cliente_nombre: lead.nombre_completo,
          cliente_email: lead.email,
          cliente_telefono: lead.telefono,
          agente_id: selectedAgentId,
          agente_nombre: selectedAgent.nombre,
          agente_dni: selectedAgent.dni_nie,
          agente_email: agent.email,
          agente_telefono: agent.telefono,
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

    console.log('[Generate Contract] Contract record created:', contractData.id);

    // 4. Gerar PDF simples (texto formatado)
    const pdfPath = `${lead.id}/contrato_${Date.now()}.pdf`;
    const encoder = new TextEncoder();
    const contractFile = encoder.encode(contractContent);

    const { error: uploadError } = await supabaseClient.storage
      .from('lead-documents')
      .upload(pdfPath, contractFile, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('[Generate Contract] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[Generate Contract] File uploaded:', pdfPath);

    // 5. Atualizar contract com file_path
    await supabaseClient
      .from('generated_contracts')
      .update({ file_path: pdfPath })
      .eq('id', contractData.id);

    // 6. Atualizar link como completado
    await supabaseClient
      .from('public_contract_links')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        datos_completados: formData,
        contract_generated_id: contractData.id
      })
      .eq('id', linkData.id);

    // 7. Criar notificação para o agente
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: linkData.agente_id,
        type: 'contract_signed',
        title: 'Contrato Assinado',
        message: `O lead "${lead.nombre_completo}" assinou o contrato.`,
        link: '/crm',
        metadata: { lead_id: lead.id, contract_id: contractData.id }
      });

    console.log('[Generate Contract] Agent notification created');

    // 8. Notificar admins usando função SQL
    await supabaseClient.rpc('notify_admins', {
      p_type: 'contract_signed',
      p_title: 'Contrato Assinado',
      p_message: `O lead "${lead.nombre_completo}" assinou um contrato.`,
      p_link: '/admin/crm',
      p_metadata: { lead_id: lead.id, contract_id: contractData.id }
    });

    console.log('[Generate Contract] Admin notifications created');
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
