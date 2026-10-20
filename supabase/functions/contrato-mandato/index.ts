// contrato-mandato (20/10/2026)
// Página pública del mandato de compra (/contrato/:token) y webhook de Lumin Sign.
//  GET  ?token=...                  -> estado del contrato (y sincroniza con Lumin si está pendiente de firma)
//  POST {token,nombre,dni,domicilio,email} -> genera el PDF, lo envía a Lumin y devuelve el enlace de firma
//  POST con cabecera X-Signature -> webhook de Lumin: al firmarse, guarda el PDF firmado en el lead
import { generarContratoPdf } from "./contratoPdf.ts";
import { FIRMA_ALBERT_PNG, LOGO_PNG } from "./assets.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const LUMIN = "https://api.luminpdf.com/v1";
const BUCKET = "mandatos";
const DIAS_FIRMA = 7;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...H, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

let LUMIN_KEY = "";
async function luminKey() {
  if (!LUMIN_KEY) {
    const [row] = await rest("admin_settings?select=value&key=eq.lumin_api_key");
    LUMIN_KEY = (row?.value || "").trim();
  }
  if (!LUMIN_KEY) throw new Error("Lumin sin configurar");
  return LUMIN_KEY;
}

async function lumin(path: string, init: RequestInit = {}) {
  const r = await fetch(`${LUMIN}${path}`, {
    ...init,
    headers: { "X-API-KEY": await luminKey(), "Content-Type": "application/json", Accept: "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });
  const txt = await r.text();
  let body: any = null;
  try { body = txt ? JSON.parse(txt) : null; } catch { body = { raw: txt.slice(0, 300) }; }
  if (!r.ok) throw new Error(`Lumin ${r.status}: ${body?.error_message || body?.raw || txt.slice(0, 200)}`);
  return body;
}

// Storage
async function subir(path: string, bytes: Uint8Array) {
  const r = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: new Blob([bytes as BlobPart], { type: "application/pdf" }),
  });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function urlFirmada(path: string, segundos = 3600, descarga?: string) {
  const r = await fetch(`${SB_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: segundos }),
  });
  const d = await r.json();
  if (!r.ok || !d.signedURL) throw new Error(`Storage sign ${r.status}`);
  const u = `${SB_URL}/storage/v1${d.signedURL}`;
  return descarga ? `${u}&download=${encodeURIComponent(descarga)}` : u;
}

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");

// DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra) con letra de control
export function dniValido(v: string): boolean {
  const s = v.toUpperCase().replace(/[\s-]/g, "");
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(s);
  if (!m) return false;
  if (m[1] && m[2].length !== 7) return false;
  if (!m[1] && m[2].length !== 8) return false;
  const prefijo = m[1] ? String("XYZ".indexOf(m[1])) : "";
  const num = Number(prefijo + m[2]);
  return "TRWAGMYFPDXBNJZSQVHLCKE"[num % 23] === m[3];
}

async function notificar(contrato: any, tipo: string, titulo: string, mensaje: string) {
  try {
    const [lead] = await rest(`leads?select=nombre_completo,agente_asignado_id&id=eq.${contrato.lead_id}`);
    const meta = { lead_id: contrato.lead_id, lead_name: lead?.nombre_completo, contrato_id: contrato.id };
    if (lead?.agente_asignado_id) {
      await rest("notifications", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: lead.agente_asignado_id, type: tipo, title: titulo, message: mensaje, link: "/inventario/agente/crm", metadata: meta }),
      });
    }
    await rest("rpc/notify_admins", {
      method: "POST",
      body: JSON.stringify({ p_type: tipo, p_title: titulo, p_message: mensaje, p_link: "/inventario/admin/crm", p_metadata: meta }),
    }).catch(() => null);
  } catch (e) {
    console.error("[contrato-mandato] notificación:", e);
  }
}

// Si Lumin ya lo marcó como firmado, guarda el PDF firmado y cierra el contrato
async function sincronizar(c: any): Promise<any> {
  if (!c.lumin_request_id || c.estado === "firmado") return c;
  const d = await lumin(`/signature_request/${encodeURIComponent(c.lumin_request_id)}`);
  const status = d?.signature_request?.status as string | undefined;
  if (!status) return c;
  if (status !== "APPROVED") {
    if (status !== c.lumin_status) {
      await rest(`lead_contratos?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ lumin_status: status, updated_at: new Date().toISOString() }) });
    }
    return { ...c, lumin_status: status };
  }
  let f: any;
  try { f = await lumin(`/signature_request/${encodeURIComponent(c.lumin_request_id)}/file?type=merged`); }
  catch { f = await lumin(`/signature_request/${encodeURIComponent(c.lumin_request_id)}/file?type=agreement`); }
  if (!f?.signed_url) throw new Error("Lumin no devolvió el PDF firmado");
  const pdf = new Uint8Array(await (await fetch(f.signed_url, { signal: AbortSignal.timeout(30000) })).arrayBuffer());
  const path = `${c.lead_id}/${c.id}-firmado.pdf`;
  await subir(path, pdf);
  const firmado_at = new Date().toISOString();
  const [upd] = await rest(`lead_contratos?id=eq.${c.id}&estado=neq.firmado`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ estado: "firmado", lumin_status: status, firmado_path: path, firmado_at, updated_at: firmado_at }),
  });
  if (upd) {
    await notificar(c, "contract_signed", "Contrato Firmado", `El lead "${c.datos?.nombre || ""}" firmó el mandato de compra.`);
    return upd;
  }
  const [actual] = await rest(`lead_contratos?select=*&id=eq.${c.id}`);
  return actual;
}

async function enlaceFirma(c: any): Promise<string | null> {
  const email = c.datos?.email;
  if (!c.lumin_request_id || !email) return null;
  for (let i = 0; i < 6; i++) {
    try {
      const d = await lumin(`/signature_request/${encodeURIComponent(c.lumin_request_id)}/signing-link`, {
        method: "POST",
        body: JSON.stringify({ signer_email: email }),
      });
      if (d?.view_url) return d.view_url;
    } catch (e) {
      if (i === 5) console.error("[contrato-mandato] signing-link:", e);
    }
    await new Promise((r) => setTimeout(r, 2000)); // Lumin procesa el documento antes de dar el enlace
  }
  return null;
}

async function respuestaPublica(c: any, conEnlace = true) {
  const [lead] = await rest(`leads?select=nombre_completo,email&id=eq.${c.lead_id}`);
  const expirado = c.estado === "pendiente" && new Date(c.expires_at).getTime() < Date.now();
  const nombreArchivo = `Mandato_de_compra_${slug(c.datos?.nombre || "THP")}.pdf`;
  return {
    estado: expirado ? "expirado" : c.estado,
    honorarios: Number(c.honorarios),
    expires_at: c.expires_at,
    prefill: { nombre: lead?.nombre_completo || "", email: lead?.email || "" },
    datos: c.datos ? { nombre: c.datos.nombre, dni: c.datos.dni, domicilio: c.datos.domicilio, email: c.datos.email } : null,
    pdf_url: c.pdf_path ? await urlFirmada(c.pdf_path, 3600, nombreArchivo) : null,
    firmar_url: c.estado === "firmando" && conEnlace ? await enlaceFirma(c) : null,
    firmado_url: c.firmado_path ? await urlFirmada(c.firmado_path, 3600, nombreArchivo.replace(".pdf", "_firmado.pdf")) : null,
    firmado_at: c.firmado_at,
  };
}

async function porToken(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const [c] = await rest(`lead_contratos?select=*&token=eq.${token}`);
  return c || null;
}

// Webhook de Lumin: X-Signature = HMAC-SHA256 hex del cuerpo con la clave API primaria
async function hmacOk(body: string, firma: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(await luminKey()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const a = hex, b = firma.trim().toLowerCase();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  const u = new URL(req.url);

  try {
    // ---- Webhook Lumin ----
    // Lumin no acepta URLs con query string: el webhook se reconoce por la cabecera X-Signature
    if (req.method === "POST" && (u.searchParams.get("evento") === "lumin" || req.headers.has("x-signature"))) {
      const raw = await req.text();
      if (!(await hmacOk(raw, req.headers.get("x-signature") || ""))) return json({ error: "Firma no válida" }, 401);
      let ev: any = {};
      try { ev = JSON.parse(raw); } catch { return json({ ok: true }); }
      const id = ev?.signature_request?.signature_request_id;
      if (id) {
        const [c] = await rest(`lead_contratos?select=*&lumin_request_id=eq.${encodeURIComponent(id)}`);
        if (c) await sincronizar(c); // el estado real se consulta a la API de Lumin
      }
      return json({ ok: true });
    }

    // ---- Página pública ----
    if (req.method === "GET") {
      let c = await porToken(u.searchParams.get("token") || "");
      if (!c) return json({ error: "Enlace no válido" }, 404);
      if (c.estado === "firmando") c = await sincronizar(c).catch(() => c);
      return json(await respuestaPublica(c));
    }

    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const c = await porToken(clean(b.token));
      if (!c) return json({ error: "Enlace no válido" }, 404);
      if (c.estado !== "pendiente") return json(await respuestaPublica(c));
      if (new Date(c.expires_at).getTime() < Date.now()) return json({ error: "Este enlace ha caducado. Pide uno nuevo a tu asesor." }, 410);

      const nombre = clean(b.nombre), domicilio = clean(b.domicilio), email = clean(b.email).toLowerCase();
      const dni = clean(b.dni).toUpperCase().replace(/[\s-]/g, "");
      const errores: Record<string, string> = {};
      if (nombre.length < 5 || !/\s/.test(nombre)) errores.nombre = "Escribe tu nombre y apellidos completos.";
      if (!dniValido(dni)) errores.dni = "Revisa el DNI/NIE: el formato o la letra no son correctos.";
      if (domicilio.length < 8) errores.domicilio = "Escribe tu domicilio completo (calle, número, código postal y ciudad).";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.email = "Escribe un email válido.";
      if (Object.keys(errores).length) return json({ error: "Revisa los datos", errores }, 422);

      // Bloquea el contrato para evitar envíos dobles
      const ahora = new Date();
      const [lock] = await rest(`lead_contratos?id=eq.${c.id}&estado=eq.pendiente`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ estado: "generando", datos: { nombre, dni, domicilio, email }, enviado_at: ahora.toISOString(), updated_at: ahora.toISOString() }),
      });
      if (!lock) {
        const [actual] = await rest(`lead_contratos?select=*&id=eq.${c.id}`);
        return json(await respuestaPublica(actual));
      }

      try {
        const pdf = await generarContratoPdf({ nombre, dni, domicilio, fecha: ahora, honorarios: Number(c.honorarios) }, LOGO_PNG, FIRMA_ALBERT_PNG);
        const pdfPath = `${c.lead_id}/${c.id}.pdf`;
        await subir(pdfPath, pdf);
        const fileUrl = await urlFirmada(pdfPath, 6 * 3600);
        const envio = await lumin("/signature_request/send", {
          method: "POST",
          body: JSON.stringify({
            title: `Mandato de compra - ${nombre}`,
            file_url: fileUrl,
            use_text_tags: true,
            signing_type: "SAME_TIME",
            expires_at: ahora.getTime() + DIAS_FIRMA * 864e5,
            signers: [{ name: nombre, email_address: email }],
          }),
        });
        const reqId = envio?.signature_request?.signature_request_id;
        if (!reqId) throw new Error("Lumin no devolvió el id de la solicitud");
        const [upd] = await rest(`lead_contratos?id=eq.${c.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ estado: "firmando", pdf_path: pdfPath, lumin_request_id: reqId, lumin_status: envio.signature_request.status, error: null, updated_at: new Date().toISOString() }),
        });
        await notificar(upd, "contract_generated", "Contrato Generado", `El lead "${nombre}" completó sus datos del mandato de compra.`);
        return json(await respuestaPublica(upd));
      } catch (e) {
        const msg = String((e as Error).message || e);
        console.error("[contrato-mandato] envío:", msg);
        await rest(`lead_contratos?id=eq.${c.id}`, {
          method: "PATCH",
          body: JSON.stringify({ estado: "pendiente", error: msg.slice(0, 500), updated_at: new Date().toISOString() }),
        });
        return json({ error: "No hemos podido preparar tu contrato. Inténtalo de nuevo en unos minutos." }, 502);
      }
    }

    return json({ error: "Método no permitido" }, 405);
  } catch (e) {
    console.error("[contrato-mandato]", e);
    return json({ error: "Error inesperado" }, 500);
  }
});
