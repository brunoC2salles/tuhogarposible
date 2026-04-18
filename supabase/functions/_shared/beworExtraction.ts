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
  const pages =
    Number(
      innerResult?.pages_processed ??
        innerResult?.num_pages ??
        r?.pages_processed ??
        r?.num_pages ??
        docFields?.pages ??
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
  if (beworStatus === "KO" || koDescriptions.length > 0) {
    viabilidade.razon = `El documento no es un extracto bancario válido (${koDescriptions.length || warningDescriptions.length} errores)`;
    viabilidade.aprobable = false;
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
