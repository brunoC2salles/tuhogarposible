// Endpoint público para o cliente fazer polling do status do análise após upload.
// Não requer JWT — só precisa do analysis_id retornado pelo bewor-public-upload.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const analysisId = url.searchParams.get("analysis_id");

    if (!analysisId) {
      return new Response(JSON.stringify({ error: "analysis_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await admin
      .from("lead_document_analysis")
      .select("id, status, error_message, finished_at, viabilidade_sugerida")
      .eq("id", analysisId)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Análisis no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const v = (data.viabilidade_sugerida as any) || {};
    const ingresos = Number(v.ingresos_detectados || 0);
    const inconclusive = data.status === "FINISHED" && ingresos === 0;

    return new Response(
      JSON.stringify({
        status: data.status,
        finished: !!data.finished_at,
        error: data.error_message,
        aprobable: v?.aprobable ?? null,
        hipoteca_maxima: Number(v?.hipoteca_maxima || 0),
        cuota_max: Number(v?.cuota_max || 0),
        inconclusive,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bewor-public-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
