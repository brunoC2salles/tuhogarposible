// Endpoint público para o cliente fazer polling do status da análise após upload.
// Não requer JWT — só precisa do analysis_id retornado pelo upload público.
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

    let { data, error } = await admin
      .from("lead_document_analysis")
      .select("id, status, error_message, finished_at, viabilidade_sugerida, request_id, created_at, holder_name, bank_name, analysis_provider, months_detected, missing_months")
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
    const legacyStatus = (v.bewor_status || "").toString().toUpperCase();
    const warnings: string[] = Array.isArray(v.bewor_warnings) ? v.bewor_warnings : [];
    const kos: string[] = Array.isArray(v.bewor_kos) ? v.bewor_kos : [];
    const pages = Number(v.pages || 0);
    const needsManualReview = !!v.needs_manual_review;
    const holderName = (data as any).holder_name || null;
    const bankName = (data as any).bank_name || null;

    // Se não há ingresos calculados nem cálculo de crédito, o resultado é inconclusivo.
    const hasCalculation =
      data.status === "FINISHED" &&
      ingresos > 0 &&
      (Number(v.hipoteca_maxima || 0) > 0 || v.aprobable !== undefined);

    const inconclusive =
      data.status === "FINISHED" &&
      !hasCalculation;

    let inconclusive_reason: string | null = null;
    if (inconclusive) {
      if (v.incomplete_months) {
        inconclusive_reason =
          "El extracto enviado no contiene los últimos 12 meses completos. Por favor, sube un documento que cubra los últimos 12 meses para poder calcular tu hipoteca máxima.";
      } else if (v.period_validated || v.needs_manual_review) {
        inconclusive_reason =
          v.razon || "Documento válido recibido. Nuestro equipo revisará manualmente los movimientos para calcular tu hipoteca máxima.";
      } else if (legacyStatus === "KO" || kos.length > 0) {
        inconclusive_reason =
          "Hubo un problema procesando tu extracto. Por favor, contacta con tu agente para que te ayude a subir el documento correcto.";
      } else if (pages > 0 && pages < 2) {
        inconclusive_reason =
          "Hubo un problema procesando tu extracto (documento incompleto). Por favor, contacta con tu agente para que te ayude a subir el documento correcto.";
      } else {
        inconclusive_reason =
          "Hubo un problema procesando tu extracto. Por favor, contacta con tu agente para que te ayude a subir el documento correcto.";
      }
    }

    // Documento "validado sem cálculo" deixa de ser apresentado como sucesso ao cliente.
    const documentValidated = false;
    const validated_message: string | null = null;

    return new Response(
      JSON.stringify({
        status: data.status,
        finished: !!data.finished_at,
        error: data.error_message,
        aprobable: v?.aprobable ?? null,
        hipoteca_maxima: Number(v?.hipoteca_maxima || 0),
        cuota_max: Number(v?.cuota_max || 0),
        inconclusive,
        inconclusive_reason,
        document_validated: documentValidated,
        validated_message,
        holder_name: holderName,
        bank_name: bankName,
        analysis_status: legacyStatus || null,
        analysis_warnings: warnings,
        pages,
        months_detected: data.months_detected ?? v.months_detected ?? null,
        missing_months: data.missing_months ?? v.missing_months ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("public-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
