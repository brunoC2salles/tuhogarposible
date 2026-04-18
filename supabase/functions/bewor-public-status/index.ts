// Endpoint público para o cliente fazer polling do status do análise após upload.
// Não requer JWT — só precisa do analysis_id retornado pelo bewor-public-upload.
// Inclui FALLBACK ATIVO: se PROCESSING > 30s e há request_id, busca direto na Bewor via GET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  calcularViabilidad,
  extractIncomeAndDebts,
  extractStructuredData,
  buildViabilidadeWithMetadata,
  fetchBeworResult,
} from "../_shared/beworExtraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_AFTER_MS = 30 * 1000;

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
      .select("id, status, error_message, finished_at, viabilidade_sugerida, request_id, created_at, holder_name, bank_name")
      .eq("id", analysisId)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Análisis no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FALLBACK ATIVO: se PROCESSING há mais de 30s e tem request_id, buscar na Bewor
    const isProcessing = data.status === "PROCESSING" || data.status === "PENDING" || data.status === "RECEIVED";
    const ageMs = Date.now() - new Date(data.created_at).getTime();
    if (isProcessing && data.request_id && ageMs > FALLBACK_AFTER_MS) {
      console.log(`[fallback] analysis=${analysisId} age=${Math.round(ageMs / 1000)}s — fetching Bewor GET`);
      const fullResult = await fetchBeworResult(data.request_id);
      const beworStatus = (fullResult?.status || fullResult?.result?.status || "").toString().toUpperCase();
      const isFinished = beworStatus === "FINISHED" || beworStatus === "COMPLETED" || !!fullResult?.result;

      if (fullResult && isFinished) {
        const { income, debts, source } = extractIncomeAndDebts(fullResult);
        let viabilidade: any = calcularViabilidad(income, debts);
        viabilidade = buildViabilidadeWithMetadata(fullResult, viabilidade);
        const structured = extractStructuredData(fullResult);
        console.log(`[fallback] extracted income=${income} debts=${debts} source=${source}`);
        console.log(`[fallback] structured:`, JSON.stringify(structured));

        await admin
          .from("lead_document_analysis")
          .update({
            status: "FINISHED",
            result: fullResult,
            viabilidade_sugerida: viabilidade,
            finished_at: new Date().toISOString(),
            holder_name: structured.holder_name,
            holder_dni: structured.holder_dni,
            iban: structured.iban,
            bank_name: structured.bank_name,
            period_start: structured.period_start,
            monthly_income: income > 0 ? Math.round(income) : null,
          })
          .eq("id", analysisId);

        // Re-ler para refletir o estado atualizado
        const { data: refreshed } = await admin
          .from("lead_document_analysis")
          .select("id, status, error_message, finished_at, viabilidade_sugerida, request_id, created_at, holder_name, bank_name")
          .eq("id", analysisId)
          .maybeSingle();
        if (refreshed) data = refreshed;
      }
    }

    const v = (data.viabilidade_sugerida as any) || {};
    const ingresos = Number(v.ingresos_detectados || 0);
    const beworStatus = (v.bewor_status || "").toString().toUpperCase();
    const warnings: string[] = Array.isArray(v.bewor_warnings) ? v.bewor_warnings : [];
    const kos: string[] = Array.isArray(v.bewor_kos) ? v.bewor_kos : [];
    const pages = Number(v.pages || 0);
    const needsManualReview = !!v.needs_manual_review;
    const holderName = (data as any).holder_name || null;
    const bankName = (data as any).bank_name || null;

    // Per user request: se não há ingressos calculados nem cálculo de crédito, é um problema do documento
    // (mesmo que a Bewor diga "OK" só de validação). Cliente deve contactar o agente.
    const hasCalculation =
      data.status === "FINISHED" &&
      ingresos > 0 &&
      (Number(v.hipoteca_maxima || 0) > 0 || v.aprobable !== undefined);

    const inconclusive =
      data.status === "FINISHED" &&
      !hasCalculation;

    let inconclusive_reason: string | null = null;
    if (inconclusive) {
      if (beworStatus === "KO" || kos.length > 0) {
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
        bewor_status: beworStatus || null,
        bewor_warnings: warnings,
        pages,
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
