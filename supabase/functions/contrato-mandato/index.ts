// contrato-mandato (20/10/2026; encargo TMH añadido el 26/10/2026)
// Página pública de contratos (/contrato/:token) y webhook de Lumin Sign.
// Un mismo enlace y formulario generan dos contratos con firmas separadas en Lumin:
//  - Mandato de compra con exclusividad (Tu Hogar Posible)  -> columnas pdf_path, lumin_*, firmado_*
//  - Encargo de Servicio de Tu Mejor Hipoteca (TMH)          -> columnas tmh_pdf_path, tmh_lumin_*, tmh_firmado_*
//  GET  ?token=...                  -> estado (y sincroniza con Lumin si está pendiente de firma)
//  POST {token,nombre,dni,domicilio,email} -> genera los dos PDF, los envía a Lumin y devuelve los enlaces de firma
//  POST con cabecera X-Signature -> webhook de Lumin: al firmarse cada contrato, guarda el PDF firmado en el lead
// estado = "firmado" solo cuando los dos están firmados. La etapa del lead se mueve al firmar el mandato
// (decisión Bruno 26/10/2026: el encargo TMH no influye en la etapa).
import { generarContratoPdf } from "./contratoPdf.ts";
import { generarEncargoTmhPdf } from "./encargoTmhPdf.ts";
import { FIRMA_ALBERT_PNG, LOGO_PNG } from "./assets.ts";
import { TMH_LOGO_PNG, TMH_MARCA_AGUA_PNG } from "./assetsTmh.ts";

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

// Documentos del contrato: columnas de cada uno en lead_contratos
type Doc = "mandato" | "tmh";
const COL = {
  mandato: { pdf: "pdf_path", req: "lumin_request_id", status: "lumin_status", firmado: "firmado_path", firmadoAt: "firmado_at", sufijo: "" },
  tmh: { pdf: "tmh_pdf_path", req: "tmh_lumin_request_id", status: "tmh_lumin_status", firmado: "tmh_firmado_path", firmadoAt: "tmh_firmado_at", sufijo: "-tmh" },
} as const;

// Contratos generados antes del 26/10/2026 no tienen encargo TMH: solo cuenta el mandato
const tieneTmh = (c: any) => !!(c.tmh_pdf_path || c.tmh_lumin_request_id);
const todoFirmado = (c: any) => !!c.firmado_path && (!tieneTmh(c) || !!c.tmh_firmado_path);

async function leer(id: string) {
  const [c] = await rest(`lead_contratos?select=*&id=eq.${id}`);
  return c;
}

// Si Lumin ya marcó un documento como firmado, guarda su PDF firmado
async function sincronizarDoc(c: any, doc: Doc): Promise<any> {
  const k = COL[doc];
  if (!c[k.req] || c[k.firmado]) return c;
  const d = await lumin(`/signature_request/${encodeURIComponent(c[k.req])}`);
  const status = d?.signature_request?.status as string | undefined;
  if (!status) return c;
  if (status !== "APPROVED") {
    if (status !== c[k.status]) {
      await rest(`lead_contratos?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ [k.status]: status, updated_at: new Date().toISOString() }) });
    }
    return { ...c, [k.status]: status };
  }
  let f: any;
  try { f = await lumin(`/signature_request/${encodeURIComponent(c[k.req])}/file?type=merged`); }
  catch { f = await lumin(`/signature_request/${encodeURIComponent(c[k.req])}/file?type=agreement`); }
  if (!f?.signed_url) throw new Error("Lumin no devolvió el PDF firmado");
  const pdf = new Uint8Array(await (await fetch(f.signed_url, { signal: AbortSignal.timeout(30000) })).arrayBuffer());
  const path = `${c.lead_id}/${c.id}${k.sufijo}-firmado.pdf`;
  await subir(path, pdf);
  const ahora = new Date().toISOString();
  // Condición firmado=is.null: si llegan dos avisos a la vez, solo uno registra la firma
  const [upd] = await rest(`lead_contratos?id=eq.${c.id}&${k.firmado}=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ [k.status]: status, [k.firmado]: path, [k.firmadoAt]: ahora, updated_at: ahora }),
  });
  if (!upd) return await leer(c.id);
  if (doc === "mandato") {
    // Firmado el mandato: el lead pasa de "Firma del contrato" a "Documentación a Riesgos" (decisión Bruno 20/10/2026).
    // Solo desde firma_contrato: nunca se mueve un lead que esté en otra etapa.
    await rest(`leads?id=eq.${c.lead_id}&stage=eq.firma_contrato`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ stage: "informacion_riesgos" }),
    }).catch((e) => console.error("[contrato-mandato] mover etapa:", e));
    await notificar(c, "contract_signed", "Contrato Firmado", `El lead "${c.datos?.nombre || ""}" firmó el mandato de compra.`);
  } else {
    await notificar(c, "contract_signed", "Encargo TMH Firmado", `El lead "${c.datos?.nombre || ""}" firmó el encargo de servicio de Tu Mejor Hipoteca.`);
  }
  return upd;
}

// Envía a Lumin un PDF ya generado y guarda el id de la solicitud
async function enviarALumin(c: any, doc: Doc, titulo: string): Promise<any> {
  const k = COL[doc];
  const fileUrl = await urlFirmada(c[k.pdf], 6 * 3600);
  const envio = await lumin("/signature_request/send", {
    method: "POST",
    body: JSON.stringify({
      title: titulo,
      file_url: fileUrl,
      use_text_tags: true,
      signing_type: "SAME_TIME",
      expires_at: Date.now() + DIAS_FIRMA * 864e5,
      signers: [{ name: c.datos.nombre, email_address: c.datos.email }],
    }),
  });
  const reqId = envio?.signature_request?.signature_request_id;
  if (!reqId) throw new Error("Lumin no devolvió el id de la solicitud");
  const [upd] = await rest(`lead_contratos?id=eq.${c.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ [k.req]: reqId, [k.status]: envio.signature_request.status, updated_at: new Date().toISOString() }),
  });
  return upd;
}

// Si el envío del encargo TMH falló después de enviar el mandato, se reintenta al abrir el enlace
async function reintentarTmh(c: any): Promise<any> {
  if (c.estado !== "firmando" || !c.tmh_pdf_path || c.tmh_lumin_request_id) return c;
  try {
    const upd = await enviarALumin(c, "tmh", `Encargo de Servicio TMH - ${c.datos?.nombre || ""}`);
    await rest(`lead_contratos?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ error: null }) });
    return { ...upd, error: null };
  } catch (e) {
    console.error("[contrato-mandato] reintento TMH:", e);
    return c;
  }
}

async function sincronizar(c: any): Promise<any> {
  if (c.estado === "firmado") return c;
  c = await reintentarTmh(c);
  c = await sincronizarDoc(c, "mandato");
  c = await sincronizarDoc(c, "tmh");
  if (c.estado !== "firmado" && todoFirmado(c)) {
    const [upd] = await rest(`lead_contratos?id=eq.${c.id}&estado=neq.firmado`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ estado: "firmado", updated_at: new Date().toISOString() }),
    });
    return upd || await leer(c.id);
  }
  return c;
}

async function enlaceFirma(c: any, doc: Doc): Promise<string | null> {
  const email = c.datos?.email;
  const reqId = c[COL[doc].req];
  if (!reqId || !email || c[COL[doc].firmado]) return null;
  for (let i = 0; i < 6; i++) {
    try {
      const d = await lumin(`/signature_request/${encodeURIComponent(reqId)}/signing-link`, {
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
  const archivoTmh = `Encargo_de_Servicio_TMH_${slug(c.datos?.nombre || "THP")}.pdf`;
  const firmando = c.estado === "firmando" && conEnlace;
  const [firmarMandato, firmarTmh] = await Promise.all([
    firmando ? enlaceFirma(c, "mandato") : null,
    firmando ? enlaceFirma(c, "tmh") : null,
  ]);
  const documentos = [
    {
      id: "mandato",
      titulo: "Contrato de mandato de compra con exclusividad",
      empresa: "Tu Hogar Posible",
      pdf_url: c.pdf_path ? await urlFirmada(c.pdf_path, 3600, nombreArchivo) : null,
      firmar_url: firmarMandato,
      firmado_url: c.firmado_path ? await urlFirmada(c.firmado_path, 3600, nombreArchivo.replace(".pdf", "_firmado.pdf")) : null,
      firmado_at: c.firmado_at,
    },
  ];
  if (tieneTmh(c)) {
    documentos.push({
      id: "tmh",
      titulo: "Encargo de Servicio",
      empresa: "Tu Mejor Hipoteca",
      pdf_url: c.tmh_pdf_path ? await urlFirmada(c.tmh_pdf_path, 3600, archivoTmh) : null,
      firmar_url: firmarTmh,
      firmado_url: c.tmh_firmado_path ? await urlFirmada(c.tmh_firmado_path, 3600, archivoTmh.replace(".pdf", "_firmado.pdf")) : null,
      firmado_at: c.tmh_firmado_at,
    });
  }
  return {
    estado: expirado ? "expirado" : c.estado,
    honorarios: Number(c.honorarios),
    expires_at: c.expires_at,
    prefill: { nombre: lead?.nombre_completo || "", email: lead?.email || "" },
    datos: c.datos ? { nombre: c.datos.nombre, dni: c.datos.dni, domicilio: c.datos.domicilio, email: c.datos.email } : null,
    // Campos del mandato (compatibilidad con la página anterior)
    pdf_url: documentos[0].pdf_url,
    firmar_url: documentos[0].firmar_url,
    firmado_url: documentos[0].firmado_url,
    firmado_at: c.firmado_at,
    documentos,
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
        const v = encodeURIComponent(id);
        const [c] = await rest(`lead_contratos?select=*&or=(lumin_request_id.eq.${v},tmh_lumin_request_id.eq.${v})`);
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

      let mandatoEnviado = false;
      try {
        // 1) Genera y guarda los dos PDF
        const [pdfMandato, pdfTmh] = await Promise.all([
          generarContratoPdf({ nombre, dni, domicilio, fecha: ahora, honorarios: Number(c.honorarios) }, LOGO_PNG, FIRMA_ALBERT_PNG),
          generarEncargoTmhPdf({ nombre, dni, domicilio, fecha: ahora }, TMH_LOGO_PNG, TMH_MARCA_AGUA_PNG),
        ]);
        const pdfPath = `${c.lead_id}/${c.id}.pdf`;
        const tmhPath = `${c.lead_id}/${c.id}-tmh.pdf`;
        await Promise.all([subir(pdfPath, pdfMandato), subir(tmhPath, pdfTmh)]);
        let cur = { ...lock, pdf_path: pdfPath, tmh_pdf_path: tmhPath };
        await rest(`lead_contratos?id=eq.${c.id}`, {
          method: "PATCH",
          body: JSON.stringify({ pdf_path: pdfPath, tmh_pdf_path: tmhPath, updated_at: new Date().toISOString() }),
        });

        // 2) Mandato a Lumin
        cur = await enviarALumin(cur, "mandato", `Mandato de compra - ${nombre}`);
        mandatoEnviado = true;
        await rest(`lead_contratos?id=eq.${c.id}`, {
          method: "PATCH",
          body: JSON.stringify({ estado: "firmando", error: null, updated_at: new Date().toISOString() }),
        });
        cur = { ...cur, estado: "firmando", error: null };

        // 3) Encargo TMH a Lumin (si falla, el mandato sigue y se reintenta al abrir el enlace)
        try {
          cur = await enviarALumin(cur, "tmh", `Encargo de Servicio TMH - ${nombre}`);
        } catch (e) {
          const msg = String((e as Error).message || e);
          console.error("[contrato-mandato] envío TMH:", msg);
          await rest(`lead_contratos?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ error: `TMH: ${msg}`.slice(0, 500) }) });
          cur = { ...cur, error: `TMH: ${msg}`.slice(0, 500) };
        }
        await notificar(cur, "contract_generated", "Contrato Generado", `El lead "${nombre}" completó sus datos del mandato de compra y del encargo TMH.`);
        return json(await respuestaPublica(cur));
      } catch (e) {
        const msg = String((e as Error).message || e);
        console.error("[contrato-mandato] envío:", msg);
        if (mandatoEnviado) {
          const actual = await leer(c.id);
          return json(await respuestaPublica(actual));
        }
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
