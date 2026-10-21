// seguimiento-etapas (19/10/2026)
// Se ejecuta cada hora (pg_cron) y solo actua a las 13h de Madrid.
//  - Buscando Vivienda: follow-up por Spoki los dias 2, 4 y 6 en la etapa, con viviendas nuevas de VoxHouses
//    (sin repetir las ya enviadas; si no hay nuevas, se envia /viviendas). Dia 90 sin cambio de etapa -> archivo oculto
//    (10 dias hasta el 20/10/2026). Tasacion ya no se archiva automaticamente (decision Bruno 20/10/2026).
// Solo cuentan los leads que entraron en la etapa despues de la fecha de activacion (admin_settings):
//   seguimiento_desde (Buscando Vivienda). Vacio = desactivado.
// Cualquier cambio de etapa (manual o automatico) actualiza last_stage_change_at y reinicia la cuenta.
// Parametros: ?dry=1 (no envia ni archiva, solo informa) · ?forzar=1 (ignora la hora de Madrid).
//   Ambos solo con la service role key (la función es pública; sin ellos solo actúa a las 13h y es idempotente).

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VR_URL = `${SB_URL}/functions/v1/viviendas-recomendadas`;
const SITE = "https://www.tuhogarposible.com/viviendas";
const HORA_ENVIO = 13;
const RONDAS = [2, 4, 6]; // dias en la etapa para cada follow-up
const DIAS_ARCHIVO_BUSCANDO = 90;

const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false });
const diaMadrid = (d: Date) => fmtDia.format(d);
// Dias de calendario (Madrid) entre la entrada en la etapa y hoy
const diasEnEtapa = (desde: string, ahora: Date) =>
  Math.round((Date.parse(diaMadrid(ahora)) - Date.parse(diaMadrid(new Date(desde)))) / 864e5);

// Telefono en formato +34 (misma regla que Make, 16/10/2026)
function telefonoSpoki(x: string): string | null {
  let d = String(x || "").trim().replace(/[\s+\-.()]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!/^\d+$/.test(d) || d.length < 9) return null;
  if (d.length === 9) d = "34" + d;
  return "+" + d;
}

async function recomendar(idealista: string, excluir: string[], count = 3) {
  const qs = new URLSearchParams({ i: idealista, count: String(count) });
  if (excluir.length) qs.set("excluir", excluir.join(","));
  const r = await fetch(`${VR_URL}?${qs}`, { signal: AbortSignal.timeout(120000) });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(`viviendas-recomendadas: ${d.error || r.status}`);
  return d;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const admin = (req.headers.get("authorization") || "") === `Bearer ${SB_KEY}`;
  const dry = admin && u.searchParams.get("dry") === "1";
  const forzar = admin && u.searchParams.get("forzar") === "1";
  const ahora = new Date();
  const hora = Number(fmtHora.format(ahora));
  const out: Record<string, unknown> = { dry, hora_madrid: hora };
  const res = (status = 200) => new Response(JSON.stringify(out), { status, headers: { "Content-Type": "application/json" } });

  if (!forzar && hora !== HORA_ENVIO) { out.omitido = "fuera de la hora de envio"; return res(); }

  try {
    const rows: { key: string; value: string }[] = await rest(
      "admin_settings?select=key,value&key=in.(seguimiento_desde,seguimiento_spoki_url,seguimiento_spoki_secret,seguimiento_spoki_campo_link)",
    );
    const cfg = Object.fromEntries(rows.map((r) => [r.key, (r.value || "").trim()]));
    const archivados: unknown[] = [];
    const enviados: unknown[] = [];
    const errores: unknown[] = [];
    const sinConfig: unknown[] = [];

    const archivar = async (id: string, motivo: string) => {
      if (dry) return;
      await rest(`leads?id=eq.${id}&archivado_at=is.null`, {
        method: "PATCH", body: JSON.stringify({ archivado_at: ahora.toISOString(), archivado_motivo: motivo }),
      });
    };

    // ---- Buscando Vivienda: follow-ups 2/4/6 y archivo dia 90 ----
    if (cfg.seguimiento_desde) {
      const spokiOk = !!(cfg.seguimiento_spoki_url && cfg.seguimiento_spoki_secret && cfg.seguimiento_spoki_campo_link);
      const leads = await rest(
        `leads?select=id,nombre_completo,telefono,email,simulador_hipotecario_data,last_stage_change_at,vivienda_revisar` +
          `&stage=eq.buscando_vivienda&archivado_at=is.null` +
          `&last_stage_change_at=gte.${encodeURIComponent(cfg.seguimiento_desde)}`,
      );
      for (const l of leads) {
        const dias = diasEnEtapa(l.last_stage_change_at, ahora);
        if (dias >= DIAS_ARCHIVO_BUSCANDO) {
          await archivar(l.id, `buscando_vivienda_${DIAS_ARCHIVO_BUSCANDO}_dias`);
          archivados.push({ id: l.id, nombre: l.nombre_completo, etapa: "buscando_vivienda", dias });
          continue;
        }
        // Leads "vivienda a revisar": sin follow-ups automáticos (decisión Bruno 21/10/2026);
        // el agente envía el enlace de viviendas desde el card. El archivo a 90 días sí se aplica.
        if (l.vivienda_revisar) continue;
        const entrada = l.last_stage_change_at;
        const previas: any[] = await rest(
          `lead_recomendaciones?select=id,ronda,slugs,estado&lead_id=eq.${l.id}` +
            `&stage_entrada_at=eq.${encodeURIComponent(entrada)}`,
        );
        const hechas = previas.filter((p) => p.ronda >= 1 && p.estado === "enviado").map((p) => p.ronda);
        const ronda = (hechas.length ? Math.max(...hechas) : 0) + 1;
        if (ronda > RONDAS.length || dias < RONDAS[ronda - 1]) continue;

        const item = { id: l.id, nombre: l.nombre_completo, dias, ronda };
        if (!spokiOk) { sinConfig.push(item); continue; }
        const phone = telefonoSpoki(l.telefono);
        if (!phone) { errores.push({ ...item, error: "telefono no valido" }); continue; }
        if (dry) { enviados.push({ ...item, simulado: true }); continue; }

        try {
          const idealista = String(l.simulador_hipotecario_data?.idealista_url || "");
          let link = SITE;
          let recId: string | null = null;
          if (idealista) {
            // Referencia de lo enviado el dia 0 (mensaje inicial): las 3 primeras recomendaciones
            if (!previas.some((p) => p.ronda === 0)) {
              const r0 = await recomendar(idealista, []);
              const s0 = (r0.viviendas || []).map((v: any) => v.slug);
              await rest("lead_recomendaciones", {
                method: "POST", headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
                body: JSON.stringify({ lead_id: l.id, stage_entrada_at: entrada, ronda: 0, slugs: s0, estado: "referencia" }),
              });
              previas.push({ ronda: 0, slugs: s0 });
            }
            const excluir = Array.from(new Set(previas.flatMap((p) => p.slugs || [])));
            const r = await recomendar(idealista, excluir);
            const viviendas = r.viviendas || [];
            if (viviendas.length) {
              const base = { techo: r.techo, minimo: r.minimo, tope: r.tope, libre: r.libre, ciudad: r.ciudad, max: r.max };
              const [row] = await rest("lead_recomendaciones?on_conflict=lead_id,stage_entrada_at,ronda", {
                method: "POST", headers: { Prefer: "return=representation,resolution=merge-duplicates" },
                body: JSON.stringify({
                  lead_id: l.id, stage_entrada_at: entrada, ronda, slugs: viviendas.map((v: any) => v.slug),
                  viviendas, base, estado: "pendiente",
                }),
              });
              recId = row.id;
              link = `${SITE}?i=${encodeURIComponent(idealista)}&rec=${recId}`;
            }
          }
          if (!recId) {
            const [row] = await rest("lead_recomendaciones?on_conflict=lead_id,stage_entrada_at,ronda", {
              method: "POST", headers: { Prefer: "return=representation,resolution=merge-duplicates" },
              body: JSON.stringify({ lead_id: l.id, stage_entrada_at: entrada, ronda, slugs: [], viviendas: [], estado: "pendiente" }),
            });
            recId = row.id;
          }

          const nombre = String(l.nombre_completo || "").trim();
          const first = nombre.split(/\s+/)[0] || "";
          const sp = await fetch(cfg.seguimiento_spoki_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
              secret: cfg.seguimiento_spoki_secret,
              phone,
              first_name: first,
              last_name: nombre.slice(first.length).trim(),
              email: l.email || "",
              custom_fields: { CONTACT_NAME: nombre, [cfg.seguimiento_spoki_campo_link]: link },
            }),
          });
          const spTxt = (await sp.text()).slice(0, 500);
          await rest(`lead_recomendaciones?id=eq.${recId}`, {
            method: "PATCH",
            body: JSON.stringify({
              link, respuesta: `${sp.status} ${spTxt}`, estado: sp.ok ? "enviado" : "error",
              enviado_at: sp.ok ? new Date().toISOString() : null,
            }),
          });
          (sp.ok ? enviados : errores).push({ ...item, link, spoki: sp.status });
        } catch (e) {
          errores.push({ ...item, error: String((e as Error).message || e) });
        }
      }
    }

    Object.assign(out, { archivados, enviados, errores, sin_config_spoki: sinConfig, config: {
      seguimiento_desde: cfg.seguimiento_desde || null,
      spoki_configurado: !!(cfg.seguimiento_spoki_url && cfg.seguimiento_spoki_secret && cfg.seguimiento_spoki_campo_link),
    } });
    return res();
  } catch (e) {
    out.error = String((e as Error).message || e);
    return res(500);
  }
});
