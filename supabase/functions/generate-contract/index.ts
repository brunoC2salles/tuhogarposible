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

    // 2. Gerar conteúdo do contrato com variáveis substituídas
    const lead = linkData.leads;
    const agent = linkData.profiles;
    const template = linkData.contract_templates;

    let contractContent = template.template_content;
    
    // Substituir todas as variáveis
    contractContent = contractContent.replace(/<<mes>>/g, formData.mes || '');
    contractContent = contractContent.replace(/<<ag-fiscal>>/g, formData.agente_dni || '');
    contractContent = contractContent.replace(/<<nombre>>/g, formData.nombre_completo || '');
    contractContent = contractContent.replace(/<<Nombre>>/g, formData.nombre_completo || '');
    contractContent = contractContent.replace(/<<dirección>>/g, formData.direccion_actual || '');
    contractContent = contractContent.replace(/<<dni\/nie>>/g, formData.dni_nie || '');
    contractContent = contractContent.replace(/<<Agente>>/g, formData.agente_nombre || '');

    // 3. Criar registro na tabela generated_contracts
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
    const pdfPath = `${lead.id}/contrato_${Date.now()}.txt`;
    const encoder = new TextEncoder();
    const contractFile = encoder.encode(contractContent);

    const { error: uploadError } = await supabaseClient.storage
      .from('lead-documents')
      .upload(pdfPath, contractFile, {
        contentType: 'text/plain',
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
