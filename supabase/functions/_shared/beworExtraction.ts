// Lógica compartilhada de extração e cálculo de viabilidade Bewor.
// Usada tanto pelo webhook (callback rápido) quanto pelo status (fallback ativo via GET).

export function calcularViabilidad(
  ingresos_mensuales: number,
  deudas_mensuales: number,
  exclusivo = false
) {
  if (!ingresos_mensuales || ingresos_mensuales <= 0) {
    return {
      aprobable: false,
      ingresos_detectados: ingresos_mensuales,
      deudas_detectadas: deudas_mensuales,
      hipoteca_maxima: 0,
      cuota_max: 0,
      razon: "No se detectaron ingresos en los movimientos bancarios",
    } as any;
  }

  const dti = 0.35;
  const cuotaMaxBruta = ingresos_mensuales * dti;
  const cuota_max = Math.max(0, cuotaMaxBruta - (deudas_mensuales || 0));

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
  } as any;
}

export function extractIncomeAndDebts(
  result: any
): { income: number; debts: number; source: string } {
  const r = result || {};
  const directIncome = Number(
    r.average_monthly_income ??
      r.ingresos_mensuales_promedio ??
      r.monthly_income ??
      r.income?.monthly_average ??
      r.summary?.average_monthly_income ??
      r.data?.average_monthly_income ??
      r.result?.average_monthly_income ??
      r.result?.summary?.average_monthly_income ??
      0
  ) || 0;
  const directDebts = Number(
    r.average_monthly_debts ??
      r.deudas_mensuales ??
      r.monthly_debts ??
      r.debts?.monthly_average ??
      r.summary?.average_monthly_debts ??
      r.data?.average_monthly_debts ??
      r.result?.average_monthly_debts ??
      r.result?.summary?.average_monthly_debts ??
      0
  ) || 0;

  if (directIncome > 0 || directDebts > 0) {
    return { income: directIncome, debts: directDebts, source: "aggregated_fields" };
  }

  const records: any[] =
    r.result?.document_fields?.records ||
    r.document_fields?.records ||
    r.records ||
    [];

  if (Array.isArray(records) && records.length > 0) {
    let totalIncome = 0;
    let totalDebts = 0;
    const startStr =
      r.result?.document_fields?.period_start_date ||
      r.document_fields?.period_start_date;
    let months = 6;
    if (startStr) {
      const parts = String(startStr).split("/");
      if (parts.length === 3) {
        const start = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const diffMs = Date.now() - start.getTime();
        const m = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30)));
        months = m;
      }
    }
    for (const rec of records) {
      const amount = Number(rec.amount ?? rec.value ?? rec.importe ?? 0);
      if (amount > 0) totalIncome += amount;
      else if (amount < 0) totalDebts += Math.abs(amount);
    }
    return {
      income: totalIncome / months,
      debts: totalDebts / months,
      source: `records_sum_${records.length}_over_${months}m`,
    };
  }

  return { income: 0, debts: 0, source: "no_data" };
}

/**
 * Extrai dados estruturados do resultado Bewor (titular, IBAN, banco, período, DNI).
 * Usado para popular as colunas estruturadas em lead_document_analysis.
 */
export function extractStructuredData(fullResult: any): {
  holder_name: string | null;
  holder_dni: string | null;
  iban: string | null;
  bank_name: string | null;
  period_start: string | null;
} {
  const r: any = fullResult || {};
  const innerResult: any = r.result || r;
  const docFields: any =
    innerResult?.document_fields || r?.document_fields || {};

  // Holders pode vir como array de objetos {name, idNumber} OU array de strings.
  const holdersRaw = docFields.holders ?? docFields.holder;
  let holder_name: string | null = null;
  let holder_dni: string | null = null;

  if (Array.isArray(holdersRaw)) {
    const names = holdersRaw
      .map((h: any) => {
        if (typeof h === "string") return h.trim();
        if (h && typeof h === "object") return String(h.name ?? "").trim();
        return "";
      })
      .filter((n: string) => n.length > 0);
    if (names.length > 0) holder_name = names.join(", ");

    // Primeiro idNumber não vazio
    for (const h of holdersRaw) {
      if (h && typeof h === "object") {
        const id = String(h.idNumber ?? h.dni ?? h.nif ?? "").trim();
        if (id.length > 0) {
          holder_dni = id;
          break;
        }
      }
    }
  } else if (typeof holdersRaw === "string" && holdersRaw.trim().length > 0) {
    holder_name = holdersRaw.trim();
  }

  // Fallback DNI nos campos top-level do documento
  if (!holder_dni) {
    const dniRaw = docFields.idNumber ?? docFields.dni ?? docFields.nif;
    if (typeof dniRaw === "string" && dniRaw.trim().length > 0) {
      holder_dni = dniRaw.trim();
    }
  }

  const ibanRaw = docFields.iban ?? docFields.IBAN;
  const iban =
    typeof ibanRaw === "string" && ibanRaw.trim().length > 0 ? ibanRaw.trim() : null;

  // Bewor devolve o nome do banco em financial_entity_text / financial_entity_normalized
  const bankCandidates = [
    docFields.financial_entity_text,
    docFields.financial_entity_normalized,
    docFields.bank,
    docFields.bank_name,
  ];
  let bank_name: string | null = null;
  for (const b of bankCandidates) {
    if (typeof b === "string" && b.trim().length > 0) {
      bank_name = b.trim();
      break;
    }
  }

  // period_start em formato dd/mm/yyyy → ISO yyyy-mm-dd
  let period_start: string | null = null;
  const psRaw = docFields.period_start_date;
  if (typeof psRaw === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(psRaw)) {
    const [d, m, y] = psRaw.split("/");
    period_start = `${y}-${m}-${d}`;
  }

  return { holder_name, holder_dni, iban, bank_name, period_start };
}

export function buildViabilidadeWithMetadata(fullResult: any, viabilidade: any) {
  const r: any = fullResult || {};
  const innerResult: any = r.result || r;
  const beworStatus: string =
    (innerResult?.result || innerResult?.status || r?.result || "")
      .toString()
      .toUpperCase() || "UNKNOWN";

  const warnings: any[] =
    innerResult?.warning_reasons ||
    innerResult?.warnings ||
    r?.warning_reasons ||
    [];
  const kos: any[] =
    innerResult?.ko_reasons || innerResult?.kos || r?.ko_reasons || [];

  const docFields = innerResult?.document_fields || r?.document_fields || {};

  // FIX: ler `pages` do innerResult (correto), não de docFields.pages (sempre 0)
  const pages =
    Number(
      innerResult?.pages ??
        innerResult?.pages_processed ??
        innerResult?.num_pages ??
        r?.pages ??
        r?.pages_processed ??
        r?.num_pages ??
        0
    ) || 0;
  const confidence =
    innerResult?.confidence ?? r?.confidence ?? docFields?.confidence ?? null;

  const warningDescriptions = (warnings || [])
    .map((w: any) => w?.description || w?.code || String(w))
    .filter(Boolean);
  const koDescriptions = (kos || [])
    .map((k: any) => k?.description || k?.code || String(k))
    .filter(Boolean);

  viabilidade.bewor_status = beworStatus;
  viabilidade.bewor_warnings = warningDescriptions;
  viabilidade.bewor_kos = koDescriptions;
  viabilidade.pages = pages;
  viabilidade.confidence = confidence;

  const income = Number(viabilidade.ingresos_detectados || 0);
  const records: any[] =
    innerResult?.document_fields?.records ||
    r?.document_fields?.records ||
    [];
  const recordsCount = Array.isArray(records) ? records.length : 0;

  // Dados limpos do titular/banco para mensagem amigável (reusa extractStructuredData)
  const structured = extractStructuredData(fullResult);
  const holder = structured.holder_name || "";
  const bank = structured.bank_name || "";

  if (beworStatus === "KO" || koDescriptions.length > 0) {
    viabilidade.razon = `El documento no es un extracto bancario válido (${koDescriptions.length || warningDescriptions.length} errores)`;
    viabilidade.aprobable = false;
  } else if (income === 0 && recordsCount === 0 && (beworStatus === "OK" || beworStatus === "WARNING") && pages >= 1) {
    // Documento validado mas SEM registros — Bewor só fez validação documental.
    // Mensagem honesta: confirmar dados extraídos e pedir revisão manual.
    const partes: string[] = [];
    if (bank) partes.push(`Banco ${bank}`);
    if (holder) partes.push(`titular ${holder}`);
    partes.push(`${pages} página${pages === 1 ? "" : "s"}`);
    viabilidade.razon = `Documento validado correctamente (${partes.join(", ")}). El sistema no extrajo movimientos individuales — el agente revisará el PDF para calcular ingresos manualmente.`;
    viabilidade.needs_manual_review = true;
  } else if (income === 0 && (warningDescriptions.length > 0 || pages < 2)) {
    viabilidade.razon =
      pages < 2
        ? `El documento procesado tiene solo ${pages || 1} página. Se necesita el extracto completo (mínimo 4-5 páginas).`
        : `El análisis no pudo extraer movimientos: ${warningDescriptions.join("; ")}`;
  }

  return viabilidade;
}

export async function fetchBeworResult(requestId: string): Promise<any | null> {
  const baseUrl = Deno.env.get("BEWOR_BASE_URL");
  const jwt = Deno.env.get("BEWOR_THIRD_PARTY_JWT");
  if (!baseUrl || !jwt) return null;
  try {
    const r = await fetch(`${baseUrl}/api/v1/third-party/request/${requestId}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    });
    if (!r.ok) {
      console.warn(`Bewor GET ${requestId} returned ${r.status}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error("fetchBeworResult error:", e);
    return null;
  }
}
