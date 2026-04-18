// Recebe callback da Bewor (FINISHED). Valida secret. Busca resultado completo, salva,
// calcula viabilidade hipotecária, notifica agente e admins.
// Suporta análises standalone (sem lead_id) — apenas atualiza o registro, não notifica.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  calcularViabilidad,
  extractIncomeAndDebts,
  extractStructuredData,
  buildViabilidadeWithMetadata,
} from "../_shared/beworExtraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const analysisIdParam = url.searchParams.get("analysis_id");
    const expected = Deno.env.get("BEWOR_WEBHOOK_SECRET")!;

    if (!secret || secret !== expected) {
      return new Response(JSON.stringify({ error: "Invalid secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    console.log("bewor-webhook payload:", JSON.stringify(payload));

    const requestId =
      payload?.request_id || payload?.id || payload?.requestId || null;
    const status = (payload?.status || "").toString().toUpperCase();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let analysis: any = null;
    if (analysisIdParam) {
      const { data } = await admin
        .from("lead_document_analysis")
        .select("*")
        .eq("id", analysisIdParam)
        .maybeSingle();
      analysis = data;
    }
    if (!analysis && requestId) {
      const { data } = await admin
        .from("lead_document_analysis")
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle();
      analysis = data;
    }
    if (!analysis) {
      console.warn("Análise não encontrada para webhook", { analysisIdParam, requestId });
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status !== "FINISHED" && status !== "COMPLETED") {
      await admin
        .from("lead_document_analysis")
        .update({ status: status || "PROCESSING" })
        .eq("id", analysis.id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar resultado completo
    const baseUrl = Deno.env.get("BEWOR_BASE_URL")!;
    const jwt = Deno.env.get("BEWOR_THIRD_PARTY_JWT")!;
    let fullResult: any = payload;
    if (requestId && jwt) {
      try {
        const r = await fetch(`${baseUrl}/api/v1/third-party/request/${requestId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${jwt}`,
          },
        });
        if (r.ok) fullResult = await r.json();
      } catch (e) {
        console.error("Failed to GET full result:", e);
      }
    }

    const { income, debts, source } = extractIncomeAndDebts(fullResult);
    console.log(`bewor-webhook extraction: income=${income} debts=${debts} source=${source} analysis=${analysis.id}`);
    let viabilidade: any = calcularViabilidad(income, debts);
    viabilidade = buildViabilidadeWithMetadata(fullResult, viabilidade);

    const structured = extractStructuredData(fullResult);
    console.log(`bewor-webhook structured:`, JSON.stringify(structured));

    await admin
      .from("lead_document_analysis")
      .update({
        status: "FINISHED",
        result: fullResult,
        viabilidade_sugerida: viabilidade,
        finished_at: new Date().toISOString(),
        holder_name: structured.holder_name,
        holder_dni: structured.holder_dni ?? analysis.holder_dni ?? null,
        iban: structured.iban,
        bank_name: structured.bank_name,
        period_start: structured.period_start,
        monthly_income: income > 0 ? Math.round(income) : analysis.monthly_income ?? null,
      })
      .eq("id", analysis.id);

    // Notificar agente e admins (apenas se houver lead vinculado)
    if (analysis.lead_id) {
      const { data: lead } = await admin
        .from("leads")
        .select("id, nombre_completo, agente_asignado_id")
        .eq("id", analysis.lead_id)
        .maybeSingle();

      if (lead) {
        const title = "Análisis de documentos completado";
        const message = `El análisis de movimientos bancarios de "${lead.nombre_completo}" está listo. ${viabilidade.aprobable ? "Hipoteca viable según cálculo automático." : "Capacidad insuficiente según cálculo automático."}`;
        const link = "/inventario/admin/crm";

        if (lead.agente_asignado_id) {
          await admin.from("notifications").insert({
            user_id: lead.agente_asignado_id,
            type: "document_analysis_completed",
            title,
            message,
            link,
            metadata: { lead_id: lead.id, analysis_id: analysis.id },
          });
        }
        await admin.rpc("notify_admins", {
          p_type: "document_analysis_completed",
          p_title: title,
          p_message: message,
          p_link: link,
          p_metadata: { lead_id: lead.id, analysis_id: analysis.id },
        });
      }
    } else {
      // Análise standalone — notificar apenas admins
      await admin.rpc("notify_admins", {
        p_type: "document_analysis_completed",
        p_title: "Análisis standalone completado",
        p_message: "Un análisis de documentos sin lead asociado fue completado. Revisa la sección 'Análisis sin asignar'.",
        p_link: "/inventario/admin/crm",
        p_metadata: { analysis_id: analysis.id, standalone: true },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bewor-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
