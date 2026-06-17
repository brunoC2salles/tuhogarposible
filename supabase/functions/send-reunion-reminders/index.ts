// ============================================================================
// send-reunion-reminders
// Roda a cada 5 minutos via pg_cron. Lê fila `lead_reuniones_recordatorios`
// pendente e vencida, e (por enquanto) só loga + marca como sent. Quando o
// canal de WhatsApp for definido, substituir o bloco SEND pelo envio real.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const now = new Date().toISOString();
    const { data: pendientes, error } = await supabase
      .from('lead_reuniones_recordatorios')
      .select(`
        id, lead_id, tipo, reunion_datetime, scheduled_for,
        leads:lead_id ( nombre_completo, telefono, email, agente_asignado_id )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(50);

    if (error) {
      console.error('[send-reunion-reminders] Erro consultando fila:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendientes || pendientes.length === 0) {
      console.log('[send-reunion-reminders] Nada na fila.');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-reunion-reminders] ${pendientes.length} recordatorio(s) para processar.`);

    let processed = 0;
    for (const r of pendientes) {
      const lead = (r as any).leads;
      // ===== BLOCO SEND (placeholder) =====
      // Quando definirmos canal (Twilio/Make/etc), substituir este log pelo envio real.
      console.log(
        `[send-reunion-reminders] [${r.tipo}] lead=${r.lead_id} telefono=${lead?.telefono || 'N/A'} reunion=${r.reunion_datetime}`
      );
      // ====================================

      const { error: updErr } = await supabase
        .from('lead_reuniones_recordatorios')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          canal: 'pending_channel',
        })
        .eq('id', r.id);

      if (updErr) {
        console.error('[send-reunion-reminders] Erro marcando sent:', updErr);
      } else {
        processed++;
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-reunion-reminders] Exceção:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
