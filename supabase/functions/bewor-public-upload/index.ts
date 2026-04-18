// Recebe PDF do cliente via token público, valida, faz upload para Storage e envia para Bewor.
// Suporta tokens standalone (sem lead_id) para testes ou novos clientes não cadastrados.
// FASE 1: instrumentação para descobrir o type correto da Bewor que dispara extração financeira.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const form = await req.formData();
    const token = form.get("token") as string | null;
    const file = form.get("file") as File | null;

    if (!token || !file) {
      return new Response(JSON.stringify({ error: "token y file requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({ error: "Solo se permiten archivos PDF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "Archivo supera 10 MB" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Validar token
    const { data: tokenRow } = await admin
      .from("lead_document_tokens")
      .select("id, lead_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expirado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadId = tokenRow.lead_id; // pode ser null (standalone)

    // 2. Criar registro de análise (status CREATED) — lead_id pode ser null
    const { data: analysis, error: insErr } = await admin
      .from("lead_document_analysis")
      .insert({
        lead_id: leadId,
        tipo: "movimientos_bancarios",
        status: "CREATED",
      })
      .select()
      .single();

    if (insErr || !analysis) {
      console.error("insert analysis error:", insErr);
      return new Response(JSON.stringify({ error: "No se pudo crear el registro" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Upload para Storage (bucket lead-documents)
    const folder = leadId || "standalone";
    const filePath = `bewor/${folder}/${analysis.id}.pdf`;
    const arrayBuf = await file.arrayBuffer();
    const { error: upErr } = await admin.storage
      .from("lead-documents")
      .upload(filePath, arrayBuf, { contentType: "application/pdf", upsert: true });

    if (upErr) {
      console.error("storage upload error:", upErr);
      await admin
        .from("lead_document_analysis")
        .update({ status: "ERROR", error_message: `Storage: ${upErr.message}` })
        .eq("id", analysis.id);
      return new Response(JSON.stringify({ error: "No se pudo guardar el archivo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("lead_document_analysis")
      .update({ file_path: filePath })
      .eq("id", analysis.id);

    // 4. Chamar Bewor /third-party/request
    const baseUrl = Deno.env.get("BEWOR_BASE_URL")!;
    const jwt = Deno.env.get("BEWOR_THIRD_PARTY_JWT");
    const webhookSecret = Deno.env.get("BEWOR_WEBHOOK_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/bewor-webhook?secret=${webhookSecret}&analysis_id=${analysis.id}`;

    // FASE 1 — type configurável via env var para testar variantes da Bewor
    const requestType = Deno.env.get("BEWOR_REQUEST_TYPE") || "movimientos_bancarios";

    if (!jwt) {
      await admin
        .from("lead_document_analysis")
        .update({
          status: "ERROR",
          error_message: "BEWOR_THIRD_PARTY_JWT no configurado",
        })
        .eq("id", analysis.id);
      return new Response(
        JSON.stringify({
          success: true,
          analysis_id: analysis.id,
          message: "Documento recibido. Te contactaremos en breve.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FASE 1 — instrumentação: tentar listar types disponíveis na conta Bewor
    console.log(`[bewor-instrumentation] Probing Bewor capabilities. Configured type: "${requestType}"`);
    try {
      const probePaths = [
        "/api/v1/third-party/types",
        "/api/v1/third-party/request-types",
        "/api/v1/third-party/capabilities",
        "/api/v1/third-party/account",
      ];
      for (const path of probePaths) {
        try {
          const probeRes = await fetch(`${baseUrl}${path}`, {
            method: "GET",
            headers: { Accept: "application/json", Authorization: `Bearer ${jwt}` },
          });
          const probeText = await probeRes.text();
          console.log(
            `[bewor-instrumentation] GET ${path} → ${probeRes.status}: ${probeText.slice(0, 1000)}`
          );
        } catch (probeErr) {
          console.log(`[bewor-instrumentation] GET ${path} failed:`, String(probeErr));
        }
      }
    } catch (e) {
      console.log("[bewor-instrumentation] probe loop error:", String(e));
    }

    const beworForm = new FormData();
    beworForm.append("file", file, file.name || "documento.pdf");
    beworForm.append("type", requestType);
    beworForm.append("callback_url", webhookUrl);

    console.log(`[bewor-instrumentation] Sending request with type="${requestType}"`);

    const beworRes = await fetch(`${baseUrl}/api/v1/third-party/request`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: beworForm,
    });

    const beworText = await beworRes.text();
    let beworJson: any = null;
    try {
      beworJson = JSON.parse(beworText);
    } catch {
      beworJson = { raw: beworText };
    }

    // FASE 1 — log completo da resposta da Bewor (estrutura inteira)
    console.log(
      `[bewor-instrumentation] Bewor response status=${beworRes.status} body=${beworText.slice(0, 4000)}`
    );
    console.log(
      `[bewor-instrumentation] Bewor response keys: ${
        beworJson && typeof beworJson === "object" ? Object.keys(beworJson).join(", ") : "N/A"
      }`
    );

    if (!beworRes.ok) {
      console.error("Bewor request failed:", beworRes.status, beworText);
      await admin
        .from("lead_document_analysis")
        .update({
          status: "ERROR",
          error_message: `Bewor ${beworRes.status}: ${beworText.slice(0, 500)}`,
        })
        .eq("id", analysis.id);
    } else {
      const requestId =
        beworJson?.request_id || beworJson?.id || beworJson?.requestId || null;
      await admin
        .from("lead_document_analysis")
        .update({
          status: "PROCESSING",
          request_id: requestId,
          result: beworJson,
        })
        .eq("id", analysis.id);

      await admin
        .from("lead_document_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenRow.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: analysis.id,
        message: "Documento recibido. Te contactaremos en breve.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bewor-public-upload error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
