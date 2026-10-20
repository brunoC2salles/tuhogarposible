// Mandato de compra con exclusividad (Tu Hogar Posible) — PDF A4 con pdf-lib.
// Texto del contrato aportado por THP (20/10/2026), con la cláusula QUINTA corregida a 3 meses (2 de búsqueda).
// La firma del cliente se marca con un text tag de Lumin Sign en blanco (invisible).
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

export interface DatosContrato {
  nombre: string;
  dni: string;
  domicilio: string;
  fecha: Date;
  honorarios: number;
}

type Seg = { t: string; b?: boolean };
type Bloque =
  | { k: "titulo"; t: string }
  | { k: "p"; s: Seg[]; indent?: number; gap?: number }
  | { k: "li"; s: Seg[]; marca: string; indent?: number }
  | { k: "clausula"; num: string; t: string }
  | { k: "espacio"; h: number };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Número a letras (es) para importes enteros
const U = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE",
  "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS",
  "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const D = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const C = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
function menorMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100), r = n % 100;
  let s = C[c];
  if (r) s += (s ? " " : "") + (r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " Y " + U[r % 10] : ""));
  return s;
}
export function numeroALetras(n: number): string {
  n = Math.floor(n);
  if (n === 0) return "CERO";
  const mill = Math.floor(n / 1_000_000), miles = Math.floor((n % 1_000_000) / 1000), resto = n % 1000;
  const p: string[] = [];
  if (mill) p.push(mill === 1 ? "UN MILLÓN" : `${menorMil(mill).replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN")} MILLONES`);
  if (miles) p.push(miles === 1 ? "MIL" : `${menorMil(miles).replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN")} MIL`);
  if (resto) p.push(menorMil(resto));
  return p.join(" ");
}
// de-DE agrupa también los miles de 4 cifras (6.000); es-ES escribiría 6000
const eur = (n: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(n);

export function fechaLarga(d: Date): string {
  const f = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "numeric", year: "numeric" })
    .formatToParts(d);
  const g = (t: string) => Number(f.find((x) => x.type === t)!.value);
  return `${g("day")} de ${MESES[g("month") - 1]} de ${g("year")}`;
}

export const LUMIN_TAG_FIRMA = "[sig|req|signer1|Firma|firma_comprador]";

function bloques(d: DatosContrato): Bloque[] {
  const B = (t: string): Seg => ({ t, b: true });
  const N = (t: string): Seg => ({ t });
  const imp = eur(d.honorarios);
  return [
    { k: "titulo", t: "CONTRATO DE MANDATO DE COMPRA CON EXCLUSIVIDAD" },
    { k: "p", s: [N(`En Barcelona, a ${fechaLarga(d.fecha)}.`)], gap: 14 },
    { k: "clausula", num: "", t: "REUNIDOS" },
    { k: "p", s: [N("De una parte, "), B("Apunto Growth Agency S.L"), N(", con nombre comercial Tu Hogar Posible, con domicilio en calle Muntaner 262, 5-4, 08021 Barcelona y CIF B67980078, representada por Albert Puig Santaularia, en calidad de Administrador.")] },
    { k: "p", s: [N("Y de otra parte, D./Dña. "), B(d.nombre), N(", mayor de edad, con domicilio en "), B(d.domicilio), N(" y con DNI/NIE "), B(d.dni), N(", en adelante, “LA PARTE COMPRADORA”.")] },
    { k: "p", s: [N("Ambas partes, reconociéndose mutuamente capacidad legal suficiente, acuerdan suscribir el presente contrato conforme a las siguientes:")] },
    { k: "clausula", num: "", t: "CLÁUSULAS" },

    { k: "clausula", num: "PRIMERA.", t: "OBJETO DEL CONTRATO" },
    { k: "p", s: [N("LA PARTE COMPRADORA encarga a LA AGENCIA, en exclusiva, la búsqueda, análisis y asesoramiento de la hipoteca para la compra de una vivienda que se ajuste a sus necesidades.")] },
    { k: "p", s: [N("El servicio incluye:")], gap: 4 },
    { k: "li", marca: "•", s: [N("Análisis del perfil del comprador.")] },
    { k: "li", marca: "•", s: [N("Facilitar la búsqueda de vivienda mediante portal inmobiliario propio")] },
    { k: "li", marca: "•", s: [N("Negociación con vendedores y terceros.")] },
    { k: "li", marca: "•", s: [N("Asesoramiento en la financiación hipotecaria.")] },
    { k: "espacio", h: 6 },
    { k: "p", s: [N("LA AGENCIA prestará estos servicios con la debida diligencia, "), B("pero no puede garantizar que se consiga una hipoteca ni que finalmente se complete la compraventa, ya que estas decisiones dependen también de terceros.")] },

    { k: "clausula", num: "SEGUNDA.", t: "EXCLUSIVIDAD" },
    { k: "p", s: [N("Durante la vigencia del contrato, LA PARTE COMPRADORA se compromete a no contratar servicios similares con otros profesionales ni realizar por su cuenta gestiones paralelas relacionadas con la búsqueda de vivienda o financiación.")] },
    { k: "p", s: [N("Si LA PARTE COMPRADORA compra una vivienda o consigue financiación como resultado de una gestión realizada por LA AGENCIA, incluyendo viviendas presentadas o contactos facilitados por esta, se aplicarán las condiciones económicas previstas en este contrato.")] },

    { k: "clausula", num: "TERCERA.", t: "HONORARIOS" },
    { k: "p", s: [N("LA AGENCIA cobrará honorarios a LA PARTE COMPRADORA por la intermediación en la consecución de la hipoteca, en los siguientes términos:")], gap: 4 },
    { k: "li", marca: "1.", s: [N("El pago de los honorarios se pagará a la emisión de la FEIN.")] },
    { k: "li", marca: "2.", s: [N("Los honorarios ascienden a: "), B(`${numeroALetras(d.honorarios)} (${imp} €) EUROS`), N(", importe exento de IVA.")] },
    { k: "espacio", h: 6 },
    { k: "p", s: [N("Consideraciones:")], gap: 4 },
    { k: "li", marca: "a)", s: [N("Si, una vez iniciadas las gestiones, LA PARTE COMPRADORA decide finalizar el encargo antes de que termine el contrato, sin que exista un incumplimiento por parte de LA AGENCIA, deberá pagar "), B("900 € + IVA"), N(" por el trabajo realizado hasta ese momento.")] },
    { k: "p", indent: 22, s: [N("Se considerará que LA PARTE COMPRADORA desiste del encargo cuando:")], gap: 4 },
    { k: "li", indent: 22, marca: "•", s: [N("Comunique que no quiere continuar con el servicio.")] },
    { k: "li", indent: 22, marca: "•", s: [N("Pida a LA AGENCIA que deje de buscar, analizar, negociar o gestionar la operación.")] },
    { k: "li", indent: 22, marca: "•", s: [N("Por sus actuaciones deje claro que no quiere continuar con el servicio, aunque LA AGENCIA siga disponible para prestarlo.")] },
    { k: "espacio", h: 6 },
    { k: "p", indent: 22, s: [N("No se aplicará la penalización si el contrato termina por un incumplimiento de LA AGENCIA o si LA PARTE COMPRADORA ejerce un derecho de desistimiento que le corresponda legalmente.")] },
    { k: "li", marca: "b)", s: [N("Aprovechamiento de gestiones:")] },
    { k: "p", indent: 22, s: [N("Si LA PARTE COMPRADORA realiza una operación con una vivienda, entidad o contacto que haya sido facilitado por LA AGENCIA, durante la vigencia del contrato o durante los "), B("6 meses posteriores a su finalización"), N(", LA AGENCIA tendrá derecho a cobrar los honorarios que correspondan por el servicio realizado.")] },
    { k: "espacio", h: 6 },
    { k: "p", s: [B("La AGENCIA no será responsable de gastos externos (tasación, notaría, registro, impuestos, etc.).")] },

    { k: "clausula", num: "CUARTA.", t: "FORMA DE PAGO" },
    { k: "p", s: [N("Los importes que correspondan deberán abonarse en un plazo máximo de "), B("5 días naturales"), N(" desde que LA AGENCIA comunique que se ha generado el derecho.")] },

    { k: "clausula", num: "QUINTA.", t: "DURACIÓN" },
    { k: "p", s: [N("El contrato tendrá una duración de tres (3) meses desde su firma.")], gap: 4 },
    { k: "li", marca: "•", s: [N("Los primeros dos (2) meses corresponderán a la fase de búsqueda activa, análisis del expediente, etc.")] },
    { k: "li", marca: "•", s: [N("El período restante se destinará a cierre y formalización")] },
    { k: "espacio", h: 6 },
    { k: "p", s: [N("LA PARTE COMPRADORA podrá resolver el contrato tras los dos primeros meses con un preaviso de 10 días laborables, siempre que no exista una operación en curso.")] },

    { k: "clausula", num: "SEXTA.", t: "OBLIGACIONES DE LA PARTE COMPRADORA" },
    { k: "p", s: [N("LA PARTE COMPRADORA se compromete a:")], gap: 4 },
    { k: "li", marca: "•", s: [N("Facilitar información verdadera y completa.")] },
    { k: "li", marca: "•", s: [N("Entregar la documentación necesaria dentro de los plazos indicados.")] },
    { k: "li", marca: "•", s: [N("Colaborar activamente durante todo el proceso.")] },
    { k: "espacio", h: 6 },
    { k: "p", s: [N("Si LA PARTE COMPRADORA incumple estas obligaciones, LA AGENCIA podrá finalizar el contrato.")] },

    { k: "clausula", num: "SÉPTIMA.", t: "PROTECCIÓN DE DATOS" },
    { k: "p", s: [N("LA PARTE COMPRADORA autoriza el tratamiento de sus datos personales para la gestión del servicio, incluyendo su comunicación a entidades financieras, colaboradores y terceros necesarios.")] },
    { k: "p", s: [N("Podrá ejercer sus derechos conforme al RGPD mediante comunicación a contacto@tuhogarposible.com")] },
    { k: "p", s: [N("Los datos serán tratados conforme a la normativa vigente y durante el tiempo necesario para la prestación del servicio, incluyendo cesión a entidades financieras y otros posibles tratadores de los mismos.")] },

    { k: "clausula", num: "OCTAVA.", t: "LIMITACIÓN DE RESPONSABILIDAD" },
    { k: "p", s: [N("LA AGENCIA no será responsable de:")], gap: 4 },
    { k: "li", marca: "•", s: [N("La denegación de financiación por parte de entidades")] },
    { k: "li", marca: "•", s: [N("Decisiones de terceros")] },
    { k: "li", marca: "•", s: [N("Cambios en condiciones de mercado")] },

    { k: "clausula", num: "NOVENA.", t: "LEGISLACIÓN Y JURISDICCIÓN" },
    { k: "p", s: [N("El contrato se regirá por la legislación española.")] },
    { k: "p", s: [N("Para la resolución de conflictos, las partes se someterán a los Juzgados y Tribunales del domicilio de LA AGENCIA.")] },
    { k: "espacio", h: 6 },
    { k: "p", s: [N("Y en prueba de conformidad, firman el presente contrato por duplicado.")] },
  ];
}

const A4: [number, number] = [595.28, 841.89];
const M = { x: 64, top: 64, bottom: 64 };
const SIZE = 11;
const LH = 15.4;
const AZUL = rgb(0x3d / 255, 0x8b / 255, 0xf7 / 255);
const TEXTO = rgb(0.1, 0.1, 0.1);
const GRIS = rgb(0.45, 0.45, 0.45);
const ALTO_FIRMAS = 145; // titulo + firma + linea + nombre (2 lineas) + DNI

export async function generarContratoPdf(d: DatosContrato, logoPng: Uint8Array, firmaAlbertPng: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Contrato de mandato de compra con exclusividad");
  pdf.setAuthor("Tu Hogar Posible");
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(logoPng);
  const firma = await pdf.embedPng(firmaAlbertPng);
  const ancho = A4[0] - M.x * 2;

  let page!: PDFPage;
  let y = 0;
  let nPag = 0;
  const nuevaPagina = () => {
    page = pdf.addPage(A4);
    nPag++;
    y = A4[1] - M.top;
    if (nPag === 1) {
      const w = 118, h = (logo.height / logo.width) * w;
      page.drawImage(logo, { x: (A4[0] - w) / 2, y: y - h, width: w, height: h });
      y -= h + 22;
    }
  };
  const asegurar = (h: number) => { if (y - h < M.bottom + 18) nuevaPagina(); };

  // Palabras con estilo -> líneas
  const lineas = (segs: Seg[], w: number) => {
    const words: { t: string; f: PDFFont }[] = [];
    for (const s of segs) for (const p of s.t.split(/(\s+)/)) if (p) words.push({ t: p, f: s.b ? bold : reg });
    const out: { t: string; f: PDFFont }[][] = [];
    let cur: { t: string; f: PDFFont }[] = [], cw = 0;
    for (const wd of words) {
      const ww = wd.f.widthOfTextAtSize(wd.t, SIZE);
      if (/^\s+$/.test(wd.t)) { if (cur.length) { cur.push(wd); cw += ww; } continue; }
      if (cw + ww > w && cur.length) {
        while (cur.length && /^\s+$/.test(cur[cur.length - 1].t)) cur.pop();
        out.push(cur); cur = []; cw = 0;
      }
      cur.push(wd); cw += ww;
    }
    if (cur.length) out.push(cur);
    return out;
  };
  const pintar = (ls: { t: string; f: PDFFont }[][], x: number, w: number, justificar: boolean) => {
    ls.forEach((l, i) => {
      asegurar(LH);
      const ultima = i === ls.length - 1;
      const espacios = l.filter((p) => /^\s+$/.test(p.t)).length;
      const usado = l.reduce((a, p) => a + p.f.widthOfTextAtSize(p.t, SIZE), 0);
      let extra = justificar && !ultima && espacios ? (w - usado) / espacios : 0;
      if (extra > 6) extra = 0; // linea con palabra larga: mejor alineada a la izquierda que con huecos
      let cx = x;
      for (const p of l) {
        if (/^\s+$/.test(p.t)) { cx += p.f.widthOfTextAtSize(" ", SIZE) + extra; continue; }
        page.drawText(p.t, { x: cx, y: y - SIZE, size: SIZE, font: p.f, color: TEXTO });
        cx += p.f.widthOfTextAtSize(p.t, SIZE);
      }
      y -= LH;
    });
  };

  nuevaPagina();
  const lista = bloques(d);
  lista.forEach((b, idx) => {
    // El párrafo final ("Y en prueba de conformidad...") va siempre en la misma página que las firmas
    if (idx === lista.length - 1) asegurar(LH + 7 + 14 + ALTO_FIRMAS);
    pintarBloque(b);
  });
  function pintarBloque(b: Bloque) {
    if (b.k === "espacio") { y -= b.h; return; }
    if (b.k === "titulo") {
      const sz = 13.5, w = bold.widthOfTextAtSize(b.t, sz);
      page.drawText(b.t, { x: (A4[0] - w) / 2, y: y - sz, size: sz, font: bold, color: TEXTO });
      y -= sz + 18;
      return;
    }
    if (b.k === "clausula") {
      asegurar(LH * 3 + 10);
      y -= 8;
      let x = M.x;
      if (b.num) {
        page.drawText(b.num, { x, y: y - SIZE, size: SIZE, font: bold, color: AZUL });
        x += bold.widthOfTextAtSize(b.num, SIZE) + 5;
      }
      page.drawText(b.t, { x, y: y - SIZE, size: SIZE, font: bold, color: b.num ? TEXTO : AZUL });
      y -= LH + 3;
      return;
    }
    const ind = b.indent || 0;
    if (b.k === "p") {
      pintar(lineas(b.s, ancho - ind), M.x + ind, ancho - ind, true);
      y -= b.gap ?? 7;
      return;
    }
    if (b.k === "li") {
      const tab = 18;
      const ls = lineas(b.s, ancho - ind - tab);
      asegurar(LH);
      page.drawText(b.marca, { x: M.x + ind + 4, y: y - SIZE, size: SIZE, font: reg, color: TEXTO });
      pintar(ls, M.x + ind + tab, ancho - ind - tab, true);
      y -= 3;
    }
  }

  // Firmas: dos columnas, siempre juntas en la misma página
  asegurar(ALTO_FIRMAS);
  y -= 14;
  const colW = (ancho - 30) / 2;
  const cols = [M.x, M.x + colW + 30];
  const top = y;
  page.drawText("POR LA AGENCIA:", { x: cols[0], y: top - SIZE, size: SIZE, font: bold, color: TEXTO });
  page.drawText("POR LA PARTE COMPRADORA:", { x: cols[1], y: top - SIZE, size: SIZE, font: bold, color: TEXTO });
  const lineaY = top - 92;
  const fw = 120, fh = (firma.height / firma.width) * fw;
  const fh2 = Math.min(fh, 64), fw2 = (firma.width / firma.height) * fh2;
  page.drawImage(firma, { x: cols[0], y: lineaY + 4, width: Math.min(fw, fw2), height: fh2 });
  // Text tag de Lumin (texto real del PDF, en blanco) donde firmará el cliente
  page.drawText(LUMIN_TAG_FIRMA + "____", { x: cols[1], y: lineaY + 30, size: 12, font: reg, color: rgb(1, 1, 1) });
  for (const x of cols) page.drawLine({ start: { x, y: lineaY }, end: { x: x + colW, y: lineaY }, thickness: 0.8, color: TEXTO });
  const pie = (x: number, l1: string, l2: string) => {
    const wrap = lineas([{ t: l1, b: true }], colW);
    let yy = lineaY - 16;
    for (const l of wrap) { page.drawText(l.map((p) => p.t).join(""), { x, y: yy, size: 10, font: bold, color: TEXTO }); yy -= 13; }
    page.drawText(l2, { x, y: yy, size: 10, font: reg, color: GRIS });
  };
  pie(cols[0], "Albert Puig Santaularia", "Administrador · Apunto Growth Agency S.L.");
  pie(cols[1], d.nombre, `DNI/NIE ${d.dni}`);

  // Pie de página
  const pags = pdf.getPages();
  pags.forEach((p, i) => {
    const t = `Tu Hogar Posible · Apunto Growth Agency S.L. · CIF B67980078            ${i + 1} / ${pags.length}`;
    const w = reg.widthOfTextAtSize(t, 8);
    p.drawText(t, { x: (A4[0] - w) / 2, y: 30, size: 8, font: reg, color: GRIS });
  });

  return await pdf.save();
}
