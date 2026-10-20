// embargados-spoki (20/10/2026)
// Boton "Enviar a Spoki" del CRM Embargados: envia un lead a la automatizacion Spoki "producto 2".
// Solo admin o usuarios con acceso al CRM Embargados (puede_ver_embargados). Body JSON: { lead_id }

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

const clean = (v: unknown) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim();

// Telefono en formato +34 (misma regla que Make, 16/10/2026)
function telefonoSpoki(x: string): string | null {
  let d = clean(x).replace(/[\s+\-.()]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!/^\d+$/.test(d) || d.length < 9) return null;
  if (d.length === 9) d = "34" + d;
  return "+" + d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    // Usuario que llama (JWT de la sesion del CRM)
    const auth = req.headers.get("authorization") || "";
    const ur = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: auth } });
    if (!ur.ok) return json({ error: "No autorizado" }, 401);
    const user = await ur.json();
    const permitido = await rest("rpc/puede_ver_embargados", { method: "POST", body: JSON.stringify({ _uid: user.id }) });
    if (permitido !== true) return json({ error: "Sin acceso al CRM Embargados" }, 403);

    const { lead_id } = await req.json().catch(() => ({}));
    if (!lead_id) return json({ error: "Falta lead_id" }, 400);
    const [lead] = await rest(`embargados_leads?select=id,nombre_completo,telefono,email&id=eq.${encodeURIComponent(lead_id)}`);
    if (!lead) return json({ error: "Lead no encontrado" }, 404);

    const phone = telefonoSpoki(lead.telefono);
    if (!phone) return json({ error: "Teléfono no válido" }, 400);

    const rows: { key: string; value: string }[] = await rest(
      "admin_settings?select=key,value&key=in.(embargados_spoki_url,embargados_spoki_secret)",
    );
    const cfg = Object.fromEntries(rows.map((r) => [r.key, (r.value || "").trim()]));
    if (!cfg.embargados_spoki_url || !cfg.embargados_spoki_secret) return json({ error: "Spoki sin configurar" }, 500);

    const nombre = clean(lead.nombre_completo);
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
        email: clean(lead.email),
        custom_fields: { CONTACT_NAME: nombre },
      }),
    });
    const txt = (await sp.text()).slice(0, 300);
    if (!sp.ok) return json({ error: `Spoki respondió ${sp.status}`, respuesta: txt }, 502);

    const enviado = new Date().toISOString();
    await rest(`embargados_leads?id=eq.${lead.id}`, { method: "PATCH", body: JSON.stringify({ spoki_enviado_at: enviado }) });
    return json({ ok: true, spoki_enviado_at: enviado });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
