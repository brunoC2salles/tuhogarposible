import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  analyzeStatementsWithAi,
  buildWeakExtractionManualReviewResult,
  buildFallbackAiResult,
  calculateStatementViability,
  enrichStatementResultWithDeterministicCoverage,
  extractPdfText,
  type HolderScope,
  type UploadedStatementFile,
} from "../_shared/internalStatementAnalysis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const form = await req.formData();
    const token = form.get("token") as string | null;
    const files = form.getAll("files").filter((v): v is File => v instanceof File);
    const legacyFile = form.get("file") as File | null;
    if (legacyFile && files.length === 0) files.push(legacyFile);
    const numTitulares = Math.min(2, Math.max(1, Number(form.get("num_titulares") || 1)));

    if (!token || files.length === 0) {
      return new Response(JSON.stringify({ error: "token y archivos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (files.length > MAX_FILES) {
      return new Response(JSON.stringify({ error: "Máximo 3 documentos PDF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const file of files) {
      if (file.type !== "application/pdf") {
        return new Response(JSON.stringify({ error: "Solo se permiten archivos PDF" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (file.size > MAX_SIZE) {
        return new Response(JSON.stringify({ error: "Cada archivo debe tener como máximo 10 MB" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
    const holderScopes = files.map((_, index) => {
      const raw = String(form.get(`holder_scope_${index}`) || form.get("holder_scope") || "titular_1");
      return (["titular_1", "titular_2", "ambos"].includes(raw) ? raw : "titular_1") as HolderScope;
    });

    const { data: analysis, error: insErr } = await admin
      .from("lead_document_analysis")
      .insert({
        lead_id: leadId,
        tipo: "movimientos_bancarios",
        status: "CREATED",
        analysis_provider: "internal",
        num_titulares: numTitulares,
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

    // 3. Upload para Storage (bucket lead-documents) + extração local de texto
    const folder = leadId || "standalone";
    const uploadedFiles: UploadedStatementFile[] = [];
    const aiFiles: Array<{ name: string; holder_scope: HolderScope; text: string; pages: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const holderScope = holderScopes[i];
      const extracted = await extractPdfText(file);
      const filePath = `bank-statements/${folder}/${analysis.id}/${i + 1}.pdf`;
      const { error: upErr } = await admin.storage
        .from("lead-documents")
        .upload(filePath, extracted.arrayBuffer, { contentType: "application/pdf", upsert: true });

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

      uploadedFiles.push({ name: file.name || `extracto-${i + 1}.pdf`, path: filePath, holder_scope: holderScope, size: file.size, pages: extracted.totalPages });
      aiFiles.push({ name: file.name || `extracto-${i + 1}.pdf`, holder_scope: holderScope, text: extracted.text, pages: extracted.totalPages });
    }

    await admin
      .from("lead_document_analysis")
      .update({
        file_path: uploadedFiles[0]?.path || null,
        analysis_input: { files: uploadedFiles, num_titulares: numTitulares },
        status: "PROCESSING",
      })
      .eq("id", analysis.id);

    let aiResult;
    try {
      const weakFile = aiFiles.find((file, index) => uploadedFiles[index]?.pages && uploadedFiles[index].pages! >= 12 && (file.text || "").replace(/\s+/g, " ").trim().length < 800);
      if (weakFile) {
        console.warn("statement weak text extraction; forcing manual-review coverage fallback", {
          analysis_id: analysis.id,
          file: weakFile.name,
          pages: weakFile.pages,
          text_length: (weakFile.text || "").length,
        });
        aiResult = buildWeakExtractionManualReviewResult({
          fileName: weakFile.name,
          totalPages: weakFile.pages,
        });
      } else {
        aiResult = await analyzeStatementsWithAi({ files: aiFiles, numTitulares });
      }
    } catch (aiErr) {
      const message = aiErr instanceof Error ? aiErr.message : String(aiErr);
      if (message === "AI_RATE_LIMIT" || message === "AI_PAYMENT_REQUIRED") {
        await admin
          .from("lead_document_analysis")
          .update({ status: "ERROR", error_message: message })
          .eq("id", analysis.id);
        throw aiErr;
      }
      console.error("statement analysis fallback", { analysis_id: analysis.id, message });
      aiResult = buildFallbackAiResult();
    }
    aiResult = enrichStatementResultWithDeterministicCoverage(aiResult, aiFiles);
    const viabilidade = calculateStatementViability(aiResult, numTitulares);
    const firstHolder = aiResult.titulares?.[0];

    await admin
      .from("lead_document_analysis")
      .update({
        status: "FINISHED",
        result: { provider: "internal", ai_result: aiResult },
        viabilidade_sugerida: viabilidade,
        extracted_financials: aiResult,
        confidence_score: aiResult.confidence ?? null,
        manual_review_required: !!viabilidade.manual_review_required,
        months_detected: viabilidade.months_detected,
        missing_months: viabilidade.missing_months,
        finished_at: new Date().toISOString(),
        holder_name: firstHolder?.holder_name || null,
        iban: firstHolder?.iban_masked || null,
        bank_name: firstHolder?.bank_name || null,
        period_start: firstHolder?.period_start || null,
        monthly_income: viabilidade.ingresos_detectados > 0 ? viabilidade.ingresos_detectados : null,
      })
      .eq("id", analysis.id);

    await admin
      .from("lead_document_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

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
    const message = err instanceof Error ? err.message : String(err);
    if (message === "AI_RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "El servicio de análisis está temporalmente limitado. Inténtalo de nuevo en unos minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message === "AI_PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "Es necesario añadir créditos al workspace de Lovable AI para continuar con el análisis." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message === "AI_BAD_REQUEST" || message.startsWith("AI_GATEWAY_")) {
      return new Response(JSON.stringify({ error: "No se pudo analizar automáticamente el extracto. Nuestro equipo revisará el documento manualmente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
