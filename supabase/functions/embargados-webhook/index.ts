// embargados-webhook (20/10/2026)
// Recibe de Make los leads del formulario Meta "producto 2" (Embargados), los cualifica,
// los guarda en el CRM Embargados y envia los aptos a la automatizacion Spoki "producto 2".
// Regla: apto si caja neta (valor de mercado - deuda pendiente) > valor de mercado x 35 %.
//   Apto -> etapa "contactado" + Spoki. No apto -> etapa "descualificados" (solo CRM).
// Importes de texto libre que no se pueden leer -> "descualificados" con motivo para revisar (sin Spoki).
// Excepcion (20/10/2026): situacion "estoy en proceso de ejecucion hipotecaria" -> siempre apto y a Spoki.
// Body (form-urlencoded o JSON): secret, meta_lead_id, nombre, email, telefono, importe_inicial, pagado, pendiente,
//   meses_retraso, valor_mercado, y opcionales puede_pagar, situacion, campaign_name, form_id, created_time.
// ?dry=1: calcula y devuelve el resultado sin guardar ni enviar.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

const clean = (v: unknown) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim();

// Importe en texto libre (ES): "150.000 €", "150000", "150k", "150 mil", "1,2 millones", "95.000,50"
export function parseImporte(raw: unknown): number | null {
  let s = clean(raw).toLowerCase();
  if (!s) return null;
  s = s.replace(/euros?|eur|€/g, " ").replace(/aprox(\.|imadamente)?|unos|unas|sobre|alrededor de|cerca de|mas o menos|más o menos/g, " ");
  let mult = 1;
  if (/mill(o|ó)n(es)?|\d\s*m\b/.test(s)) { mult = 1_000_000; s = s.replace(/mill(o|ó)n(es)?|m\b/g, " "); }
  else if (/\bmil\b|\d\s*k\b/.test(s)) { mult = 1_000; s = s.replace(/\bmil\b|k\b/g, " "); }
  const nums = s.match(/\d[\d.,\s]*\d|\d/g);
  if (!nums || nums.length !== 1) return null; // vacio o varios numeros (rango): no se adivina
  let n = nums[0].replace(/\s+/g, "");
  const hasDot = n.includes("."), hasComma = n.includes(",");
  if (hasDot && hasComma) {
    const dec = n.lastIndexOf(".") > n.lastIndexOf(",") ? "." : ",";
    const thou = dec === "." ? "," : ".";
    n = n.split(thou).join("").replace(dec, ".");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const parts = n.split(sep);
    const miles = parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    n = miles ? parts.join("") : parts.length === 2 ? `${parts[0]}.${parts[1]}` : "";
  }
  const v = Number(n) * mult;
  return Number.isFinite(v) && n !== "" ? Math.round(v * 100) / 100 : null;
}

// Telefono en formato +34 (misma regla que Make, 16/10/2026)
function telefonoSpoki(x: string): string | null {
  let d = clean(x).replace(/[\s+\-.()]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!/^\d+$/.test(d) || d.length < 9) return null;
  if (d.length === 9) d = "34" + d;
  return "+" + d;
}

// "estoy_en_proceso_de_ejecución_hipotecaria_" (opcion del formulario Meta), sin depender de acentos ni separadores
const norm = (v: unknown) =>
  clean(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export const enEjecucionHipotecaria = (situacion: unknown) =>
  norm(situacion).includes("en proceso de ejecucion hipotecaria");

const eur = (n: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n) + " €";

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const dry = new URL(req.url).searchParams.get("dry") === "1";
    // Make envia application/x-www-form-urlencoded (sin escapar JSON a mano); tambien se acepta JSON
    let b: Record<string, unknown>;
    try {
      const ct = req.headers.get("content-type") || "";
      b = ct.includes("application/json")
        ? await req.json()
        : Object.fromEntries(new URLSearchParams(await req.text()));
    } catch { return json({ error: "Body inválido" }, 400); }

    const rows: { key: string; value: string }[] = await rest(
      "admin_settings?select=key,value&key=in.(embargados_webhook_secret,embargados_spoki_url,embargados_spoki_secret,embargados_umbral_caja)",
    );
    const cfg = Object.fromEntries(rows.map((r) => [r.key, (r.value || "").trim()]));
    if (!cfg.embargados_webhook_secret || clean(b.secret) !== cfg.embargados_webhook_secret) {
      return json({ error: "No autorizado" }, 401);
    }
    const umbral = Number(cfg.embargados_umbral_caja) || 0.35;

    const nombre = clean(b.nombre) || "Sin nombre";
    const metaId = clean(b.meta_lead_id) || null;

    // Duplicado del mismo lead de Meta: no se vuelve a crear ni a enviar
    if (metaId && !dry) {
      const ex = await rest(`embargados_leads?select=id,stage&meta_lead_id=eq.${encodeURIComponent(metaId)}`);
      if (ex.length) return json({ ok: true, duplicado: true, id: ex[0].id, stage: ex[0].stage });
    }

    const valores = {
      importe_inicial: parseImporte(b.importe_inicial),
      pagado: parseImporte(b.pagado),
      pendiente: parseImporte(b.pendiente),
      valor_mercado: parseImporte(b.valor_mercado),
    };

    let cualificado = false;
    let motivo: string | null = null;
    let caja: number | null = null;
    let minimo: number | null = null;
    const vm = valores.valor_mercado, dp = valores.pendiente;
    if (vm === null || dp === null || vm <= 0) {
      const malos = [vm === null || vm <= 0 ? "valor de mercado" : null, dp === null ? "capital pendiente" : null].filter(Boolean);
      motivo = `Revisar: no se pudo leer el importe (${malos.join(" y ")})`;
    } else {
      caja = Math.round((vm - dp) * 100) / 100;
      minimo = Math.round(vm * umbral * 100) / 100;
      cualificado = caja > minimo;
      if (!cualificado) {
        motivo = `Caja neta ${eur(caja)} no supera el ${Math.round(umbral * 100)} % del valor de mercado (${eur(minimo)})`;
      }
    }
    const porEjecucion = enEjecucionHipotecaria(b.situacion);
    if (porEjecucion) { cualificado = true; motivo = null; }

    const respuestas: Record<string, unknown> = {
      "Importe inicial de la hipoteca": clean(b.importe_inicial),
      "Pagado hasta ahora": clean(b.pagado),
      "Capital pendiente": clean(b.pendiente),
      "Meses de retraso": clean(b.meses_retraso),
      "Valor de mercado actual": clean(b.valor_mercado),
    };
    if (clean(b.puede_pagar)) respuestas["¿Puede pagar la hipoteca?"] = clean(b.puede_pagar);
    if (clean(b.situacion)) respuestas["Situación"] = clean(b.situacion);
    if (caja !== null && minimo !== null) {
      respuestas["Caja neta estimada"] = eur(caja);
      respuestas[`Umbral ${Math.round(umbral * 100)} %`] = eur(minimo);
    }
    if (porEjecucion) respuestas["Cualificado por"] = "Situación: en proceso de ejecución hipotecaria";
    if (clean(b.campaign_name)) respuestas["Campaña"] = clean(b.campaign_name);

    const resultado = { cualificado, por_ejecucion: porEjecucion, motivo, caja_neta: caja, umbral: minimo, valores };
    if (dry) return json({ ok: true, dry: true, ...resultado });

    const [lead] = await rest("embargados_leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        nombre_completo: nombre,
        telefono: clean(b.telefono) || null,
        email: clean(b.email) || null,
        stage: cualificado ? "contactado" : "descualificados",
        cualificado,
        motivo_descualificacion: motivo,
        respuestas: { ...respuestas, _valores: valores, _meta: { form_id: clean(b.form_id), created_time: clean(b.created_time) } },
        source: "meta_ads",
        meta_lead_id: metaId,
      }),
    });

    let spoki: unknown = null;
    if (cualificado) {
      const phone = telefonoSpoki(clean(b.telefono));
      if (!phone || !cfg.embargados_spoki_url || !cfg.embargados_spoki_secret) {
        spoki = { error: !phone ? "teléfono no válido" : "Spoki sin configurar" };
        await rest(`embargados_leads?id=eq.${lead.id}`, {
          method: "PATCH",
          body: JSON.stringify({ notas: `Spoki no enviado: ${(spoki as any).error}` }),
        });
      } else {
        const first = nombre.split(/\s+/)[0] || "";
        const sp = await fetch(cfg.embargados_spoki_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            secret: cfg.embargados_spoki_secret,
            phone,
            first_name: first,
            last_name: nombre.slice(first.length).trim(),
            email: clean(b.email),
            custom_fields: { CONTACT_NAME: nombre },
          }),
        });
        const txt = (await sp.text()).slice(0, 300);
        spoki = { status: sp.status, respuesta: txt };
        await rest(`embargados_leads?id=eq.${lead.id}`, {
          method: "PATCH",
          body: JSON.stringify(sp.ok
            ? { spoki_enviado_at: new Date().toISOString() }
            : { notas: `Spoki error ${sp.status}: ${txt}` }),
        });
      }
    }

    return json({ ok: true, id: lead.id, stage: lead.stage, ...resultado, spoki });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
