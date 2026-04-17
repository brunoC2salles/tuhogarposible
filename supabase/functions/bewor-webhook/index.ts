// Recebe callback da Bewor (FINISHED). Valida secret. Busca resultado completo, salva,
// calcula viabilidade hipotecária, notifica agente e admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Replica simplificada da lógica de viabilidade hipotecária (caps 180k/210k, DTI 35%)
function calcularViabilidad(ingresos_mensuales: number, deudas_mensuales: number, exclusivo = false) {
  if (!ingresos_mensuales || ingresos_mensuales <= 0) {
    return {
      aprobable: false,
      ingresos_detectados: ingresos_mensuales,
      deudas_detectadas: deudas_mensuales,
      hipoteca_maxima: 0,
      cuota_max: 0,
      razon: "No se detectaron ingresos en los movimientos bancarios",
    };
  }

  const dti = 0.35;
  const cuotaMaxBruta = ingresos_mensuales * dti;
  const cuota_max = Math.max(0, cuotaMaxBruta - (deudas_mensuales || 0));

  // Estimar hipoteca máxima usando taxa ~3.5% a 30 anos
  const taxa_mensal = 0.035 / 12;
  const n = 30 * 12;
  const factor = (taxa_mensal * Math.pow(1 + taxa_mensal, n)) / (Math.pow(1 + taxa_mensal, n) - 1);
  let hipoteca = cuota_max > 0 ? cuota_max / factor : 0;

  const cap = exclusivo ? 210000 : 180000;
  const cap_aplicado = hipoteca > cap;
  hipoteca = Math.min(hipoteca, cap);

  const aprobable = cuota_max > 100 && hipoteca > 30000;

  return {
    aprobable,
    ingresos_detectados: Math.round(ingresos_mensuales),
    deudas_detectadas: Math.round(deudas_mensuales || 0),
    hipoteca_maxima: Math.round(hipoteca),
    cuota_max: Math.round(cuota_max),
    cap_aplicado,
    razon: aprobable
      ? `Capacidad estimada: cuota máx ${Math.round(cuota_max)} €/mes, hipoteca hasta ${Math.round(hipoteca)} €`
      : "Capacidad insuficiente según el análisis automático",
  };
}

function extractIncomeAndDebts(result: any): { income: number; debts: number } {
  // Tenta vários caminhos comuns no resultado da Bewor
  const r = result || {};
  const income =
    Number(
      r.average_monthly_income ??
        r.ingresos_mensuales_promedio ??
        r.monthly_income ??
        r.income?.monthly_average ??
        r.summary?.average_monthly_income ??
        r.data?.average_monthly_income ??
        0
    ) || 0;
  const debts =
    Number(
      r.average_monthly_debts ??
        r.deudas_mensuales ??
        r.monthly_debts ??
        r.debts?.monthly_average ??
        r.summary?.average_monthly_debts ??
        r.data?.average_monthly_debts ??
        0
    ) || 0;
  return { income, debts };
}

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

    // Localizar análise
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
      // Apenas atualizar status
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

    const { income, debts } = extractIncomeAndDebts(fullResult);
    const viabilidade = calcularViabilidad(income, debts);

    await admin
      .from("lead_document_analysis")
      .update({
        status: "FINISHED",
        result: fullResult,
        viabilidade_sugerida: viabilidade,
        finished_at: new Date().toISOString(),
      })
      .eq("id", analysis.id);

    // Notificar agente e admins
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
