import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.2";

export type HolderScope = "titular_1" | "titular_2" | "ambos";

export interface UploadedStatementFile {
  name: string;
  path: string;
  holder_scope: HolderScope;
  size: number;
  pages?: number;
}

export interface StatementAiHolder {
  index: number;
  holder_name?: string | null;
  bank_name?: string | null;
  iban_masked?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  months_detected: number;
  months?: string[];
  monthly_recurring_income: number;
  average_monthly_income: number;
  monthly_debts: number;
  savings_balance: number;
  confidence: number;
  warnings: string[];
}

export interface StatementAiResult {
  titulares: StatementAiHolder[];
  months_detected: string[];
  missing_months: string[];
  confidence: number;
  warnings: string[];
}

const REQUIRED_MONTHS = 12;
const DTI = 0.35;
const ANNUAL_RATE = 0.025;
const TERM_MONTHS = 30 * 12;

export async function extractPdfText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: String(text || ""), totalPages, arrayBuffer };
}


function compactStatementText(text: string, maxChars = 65000): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;

  const headSize = Math.floor(maxChars * 0.25);
  const tailSize = Math.floor(maxChars * 0.25);
  const middleBudget = maxChars - headSize - tailSize - 500;

  const monthRegex = /(?:\b\d{2}[-\/]\d{2}[-\/]\d{4}\b|\b\d{4}[-\/]\d{2}[-\/]\d{2}\b)/g;
  const matches = Array.from(normalized.matchAll(monthRegex));
  const buckets: Record<string, number[]> = {};

  for (const match of matches) {
    const raw = match[0];
    let month = "";
    if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(raw)) {
      const [, mm, yyyy] = raw.split(/[-\/]/);
      month = `${yyyy}-${mm}`;
    } else {
      const [yyyy, mm] = raw.split(/[-\/]/);
      month = `${yyyy}-${mm}`;
    }
    if (!buckets[month]) buckets[month] = [];
    buckets[month].push(match.index || 0);
  }

  const months = Object.keys(buckets).sort();
  const snippets: string[] = [];
  const perMonth = Math.max(900, Math.floor(middleBudget / Math.max(months.length, 1)));

  for (const month of months) {
    const positions = buckets[month];
    const pos = positions[Math.floor(positions.length / 2)] || positions[0];
    const start = Math.max(0, pos - Math.floor(perMonth / 2));
    snippets.push(`[MUESTRA ${month}] ${normalized.slice(start, start + perMonth)}`);
  }

  return [
    normalized.slice(0, headSize),
    "[CONTENIDO INTERMEDIO RESUMIDO POR MESES]",
    snippets.join(" "),
    "[FINAL DEL DOCUMENTO]",
    normalized.slice(-tailSize),
  ].join(" ");
}

export function buildFallbackAiResult(): StatementAiResult {
  return {
    titulares: [],
    months_detected: [],
    missing_months: [],
    confidence: 0,
    warnings: ["No se pudo extraer información estructurada del PDF"],
  };
}

function emptyToNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAiResult(result: StatementAiResult): StatementAiResult {
  return {
    titulares: Array.isArray(result.titulares)
      ? result.titulares.map((holder) => ({
          ...holder,
          holder_name: emptyToNull(holder.holder_name),
          bank_name: emptyToNull(holder.bank_name),
          iban_masked: emptyToNull(holder.iban_masked),
          period_start: emptyToNull(holder.period_start),
          period_end: emptyToNull(holder.period_end),
          warnings: Array.isArray(holder.warnings) ? holder.warnings : [],
          months: Array.isArray(holder.months) ? holder.months : [],
        }))
      : [],
    months_detected: Array.isArray(result.months_detected) ? result.months_detected : [],
    missing_months: Array.isArray(result.missing_months) ? result.missing_months : [],
    confidence: Number(result.confidence || 0),
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
  };
}

export async function analyzeStatementsWithAi(input: {
  files: Array<{ name: string; holder_scope: HolderScope; text: string; pages: number }>;
  numTitulares: number;
}): Promise<StatementAiResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY no configurado");

  const compactText = input.files
    .map((file, index) => {
      const safeText = compactStatementText(file.text);
      return `PDF ${index + 1}: ${file.name}\nTitular: ${file.holder_scope}\nPáginas: ${file.pages}\nTexto:\n${safeText}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = [
    "Eres un analista financiero que extrae datos de extractos bancarios españoles.",
    "Devuelve SIEMPRE los datos usando la función estructurada.",
    "Identifica meses cubiertos en formato YYYY-MM. Deben ser meses con movimientos o saldo real, no meses inventados.",
    "Si un documento indica Periodo/Fecha inicio/Fecha fin, úsalo como señal principal para months_detected, verificándolo con movimientos.",
    "Ingresos recurrentes: nómina, pensión, prestación o transferencias salariales recurrentes. Ignora Bizum, devoluciones y transferencias familiares puntuales.",
    "Deudas: cuotas recurrentes de préstamo, crédito, financiación o hipoteca existente.",
    "Ahorros: usa el saldo final más reciente detectado o Saldo disponible si existe. Si no hay saldo, usa 0 y añade warning.",
    "Para dos titulares, mantén titulares separados; el backend sumará los importes.",
    "Para campos de texto desconocidos, devuelve una cadena vacía, nunca null.",
  ].join(" ");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Número de titulares declarado: ${input.numTitulares}. Analiza estos PDFs y extrae el JSON financiero.\n\n${compactText}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_bank_statement_financials",
            description: "Extrae datos financieros estructurados de extractos bancarios.",
            parameters: {
              type: "object",
              properties: {
                titulares: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer", enum: [1, 2] },
                      holder_name: { type: "string", description: "Nombre del titular o cadena vacía si no aparece" },
                      bank_name: { type: "string", description: "Nombre del banco o cadena vacía si no aparece" },
                      iban_masked: { type: "string", description: "IBAN completo o enmascarado, o cadena vacía si no aparece" },
                      period_start: { type: "string", description: "YYYY-MM-DD o cadena vacía si no aparece" },
                      period_end: { type: "string", description: "YYYY-MM-DD o cadena vacía si no aparece" },
                      months_detected: { type: "integer" },
                      months: { type: "array", items: { type: "string" } },
                      monthly_recurring_income: { type: "number" },
                      average_monthly_income: { type: "number" },
                      monthly_debts: { type: "number" },
                      savings_balance: { type: "number" },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                      warnings: { type: "array", items: { type: "string" } },
                    },
                    required: ["index", "months_detected", "monthly_recurring_income", "average_monthly_income", "monthly_debts", "savings_balance", "confidence", "warnings"],
                    additionalProperties: false,
                  },
                },
                months_detected: { type: "array", items: { type: "string" } },
                missing_months: { type: "array", items: { type: "string" } },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                warnings: { type: "array", items: { type: "string" } },
              },
              required: ["titulares", "months_detected", "missing_months", "confidence", "warnings"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_bank_statement_financials" } },
    }),
  });

  if (!response.ok) {
    const gatewayBody = await response.text().catch(() => "");
    console.error("AI gateway statement analysis error", {
      status: response.status,
      body: gatewayBody.slice(0, 500),
    });
    if (response.status === 429) throw new Error("AI_RATE_LIMIT");
    if (response.status === 402) throw new Error("AI_PAYMENT_REQUIRED");
    if (response.status === 400) throw new Error("AI_BAD_REQUEST");
    throw new Error(`AI_GATEWAY_${response.status}`);
  }

  const data = await response.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return buildFallbackAiResult();
  try {
    return normalizeAiResult(JSON.parse(args) as StatementAiResult);
  } catch {
    return buildFallbackAiResult();
  }
}

export function calculateStatementViability(ai: StatementAiResult, numTitulares: number) {
  const titulares = Array.isArray(ai.titulares) ? ai.titulares : [];
  const ingresos = titulares.reduce((sum, h) => sum + Number(h.monthly_recurring_income || h.average_monthly_income || 0), 0);
  const deudas = titulares.reduce((sum, h) => sum + Number(h.monthly_debts || 0), 0);
  const ahorros = titulares.reduce((sum, h) => sum + Number(h.savings_balance || 0), 0);
  const detectedMonths = Array.from(new Set(ai.months_detected || [])).sort();
  const missingMonths = Array.isArray(ai.missing_months) ? ai.missing_months : [];
  const hasTwelveMonths = detectedMonths.length >= REQUIRED_MONTHS && missingMonths.length === 0;

  if (!hasTwelveMonths) {
    return {
      aprobable: false,
      hipoteca_maxima: 0,
      cuota_max: 0,
      ingresos_detectados: Math.round(ingresos),
      deudas_detectadas: Math.round(deudas),
      ahorros_detectados: Math.round(ahorros),
      razon: "El extracto enviado no contiene los últimos 12 meses completos.",
      months_detected: detectedMonths.length,
      missing_months: missingMonths,
      manual_review_required: true,
      incomplete_months: true,
    };
  }

  const monthlyRate = ANNUAL_RATE / 12;
  const cuotaMax = Math.max(0, ingresos * DTI - deudas);
  const factor = (monthlyRate * Math.pow(1 + monthlyRate, TERM_MONTHS)) / (Math.pow(1 + monthlyRate, TERM_MONTHS) - 1);
  const rawMortgage = cuotaMax > 0 ? cuotaMax / factor : 0;
  const cap = numTitulares >= 2 ? 210000 : 180000;
  const hipoteca = Math.min(rawMortgage, cap);
  const aprobable = cuotaMax > 100 && hipoteca > 30000;

  return {
    aprobable,
    hipoteca_maxima: Math.round(hipoteca),
    cuota_max: Math.round(cuotaMax),
    ingresos_detectados: Math.round(ingresos),
    deudas_detectadas: Math.round(deudas),
    ahorros_detectados: Math.round(ahorros),
    razon: aprobable
      ? `Capacidad estimada: cuota máx ${Math.round(cuotaMax)} €/mes, hipoteca hasta ${Math.round(hipoteca)} €`
      : "Capacidad insuficiente según el análisis automático",
    months_detected: detectedMonths.length,
    missing_months: missingMonths,
    manual_review_required: Number(ai.confidence || 0) < 0.65,
    incomplete_months: false,
    cap_aplicado: rawMortgage > cap,
  };
}