// Encargo de Servicio de Tu Mejor Hipoteca 2023, S.L. (TMH) — PDF A4 con pdf-lib.
// Texto literal del modelo "LOPD TMH THP" aportado por THP (26/10/2026). Único cambio pedido por Bruno:
// "Dº NOMBRE" pasa a "D./Dª <nombre>". Lugar fijo Madrid, fecha = envío del formulario.
// Mantiene la identidad de TMH (logo y marca de agua) y la paginación "1 de 3 / 2 de 3 / 3 de 3" del original.
// La firma del cliente se marca con un text tag de Lumin Sign en blanco (invisible).
import { PDFDocument, PDFFont, PDFImage, PDFPage, PDFString, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

export interface DatosEncargo {
  nombre: string;
  dni: string;
  domicilio: string;
  fecha: Date;
}

type Seg = { t: string; b?: boolean; link?: string };
type Bloque =
  | { k: "pagina"; t: string }
  | { k: "linea"; s: Seg[]; gap?: number }
  | { k: "p"; s: Seg[]; gap?: number }
  | { k: "titulo"; num: string; t: string }
  | { k: "li"; marca: string; s: Seg[] }
  | { k: "espacio"; h: number };

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Mismo formato que el modelo: "28 de Abril de 2026"
export function fechaEncargo(d: Date): string {
  const f = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "numeric", year: "numeric" })
    .formatToParts(d);
  const g = (t: string) => Number(f.find((x) => x.type === t)!.value);
  return `${g("day")} de ${MESES[g("month") - 1]} de ${g("year")}`;
}

export const LUMIN_TAG_FIRMA_TMH = "[sig|req|signer1|Firma|firma_cliente_tmh]";

const BDE = "https://www.bde.es/wbe/es/para-ciudadano/";

function bloques(d: DatosEncargo): Bloque[] {
  const N = (t: string): Seg => ({ t });
  const B = (t: string): Seg => ({ t, b: true });
  const L = (t: string, link: string): Seg => ({ t, link });
  return [
    // ---- Página 1 ----
    { k: "linea", s: [N(`En Madrid, a ${fechaEncargo(d.fecha)}`)], gap: 14 },
    { k: "pagina", t: "1 de 3" },
    { k: "linea", s: [N("ENCARGO DE SERVICIO")], gap: 14 },
    { k: "linea", s: [B("EL CLIENTE")], gap: 8 },
    { k: "p", s: [N(`D./Dª ${d.nombre}, con DNI ${d.dni} y domicilio en ${d.domicilio}, en adelante EL CLIENTE`)], gap: 0 },
    { k: "p", s: [N("Mediante la firma del presente documento, manifiestan recibir la información necesaria, suficiente y entregada a tiempo para la contratación de un préstamo o crédito con garantía hipotecaria por parte del intermediario de crédito TU MEJOR HIPOTECA, de acuerdo con lo previsto en la Ley 15/2019 de 15 de marzo, reguladora de los contratos de crédito inmobiliario (LCCI)")] },
    { k: "linea", s: [B("EL INTERMEDIARIO DE CRÉDITO")], gap: 8 },
    {
      k: "p",
      s: [
        N("TU MEJOR HIPOTECA 2023, S.L., con CIF B- 56368301 y e-mail de contacto "),
        L("tumejorhipoteca@tmhipoteca.com", "mailto:tumejorhipoteca@tmhipoteca.com"),
        N(" y página web "),
        L("www.tmhipoteca.com", "http://www.tmhipoteca.com"),
        N(" , con domicilio en Madrid, Calle Edgar Neville 6, 28020, Madrid, (en adelante y como nombre comercial TMH), INSCRITA EN EL REGISTRO MERCANTIL DE MADRID, Hoja M-802989 Tomo 45669 Folio 100, cuenta con un Seguro de responsabilidad civil de la aseguradora LLOYD'S INSURANCE COMPANY, S.A., con número de póliza BASWZ169926811505, y está inscrita en el Registro del Banco de España como Intermediario de Crédito Inmobiliario con el número E136."),
      ],
    },
    { k: "linea", s: [L("Enlace al Registro General del Banco de España", BDE)], gap: 8 },
    { k: "p", s: [N("TMH actúa únicamente como intermediario entre los CLIENTES y las ENTIDADES FINANCIERAS DE CRÉDITO con las que colabora, sin depender de ninguna de ellas y sin prestar asesoramiento al CLIENTE, y puede realizar gestiones previas a la contratación hipotecaria, por lo que el importe exacto de la financiación, las condiciones del préstamo y la decisión sobre la viabilidad de la operación serán responsabilidad exclusiva de la entidad financiera en el momento de la autorización o no del préstamo hipotecario.")], gap: 18 },
    { k: "titulo", num: "1.", t: "ENCARGO DE SERVICIOS" },
    { k: "p", s: [N("Mediante la firma del presente documento, LOS CLIENTES, encarga a TU MEJOR HIPOTECA 2023, S.L., la realización de las gestiones necesarias, por sí mismo o con la colaboración de terceros, para la obtención de un préstamo con garantía hipotecaria por importe de: 90% (Importe aproximado).")], gap: 14 },
    { k: "p", s: [N("TMH actúa como intermediario entre los CLIENTES y las ENTIDADES FINANCIERAS DE CRÉDITO con las que colabora. Por lo que el importe exacto de la financiación, las condiciones del préstamo y la decisión sobre la viabilidad de la operación serán responsabilidad exclusiva de la entidad financiera en el momento de la autorización o no del préstamo hipotecario. En tal sentido, los CLIENTES declaran lo siguiente:")] },

    // ---- Página 2 ----
    { k: "pagina", t: "2 de 3" },
    { k: "li", marca: "1.", s: [N("Que encarga a TMH la realización de las gestiones que sean necesarias para la consecución del presente Encargo de Servicio.")] },
    { k: "li", marca: "2.", s: [N("Que es consciente de que TMH precisa, para la correcta realización de dichas labores, la entrega por parte de LOS CLIENTES de la documentación y datos que le sean requeridos para ser transmitidos a las entidades financieras y por ello LOS CLIENTES se comprometen a facilitar a TMH aquella información y documentación que sea necesaria, respondiendo de su veracidad.")] },
    { k: "li", marca: "3.", s: [N("Que la suscripción del presente contrato no es garantía de la aprobación de la operación, al hallarse condicionado en todo momento a la autorización de la entidad bancaria, eximiendo totalmente a TMH de cualquier responsabilidad por la no concesión de la financiación solicitada.")] },
    { k: "li", marca: "4.", s: [N("Que ha sido informado que, los servicios prestados por TMH no tendrán coste alguno para LOS CLIENTES. La retribución de TMH, en su caso, será asumida por Tu Hogar Posible y por la entidad financiera con la que se formalice la operación.")] },
    { k: "li", marca: "5.", s: [N("Que han sido informados de que dicha cantidad es independiente de otros gastos, comisiones u honorarios derivados de la propia operación financiera, ajenos al servicio de intermediación y sean por cuenta de LOS CLIENTES, tales como tasación, impuestos, gastos notariales o registrales.")] },
    { k: "li", marca: "6.", s: [N("Las comisiones que TMH pueda cobrar de las entidades de crédito, podrán ser consultadas o solicitadas por los clientes a TMH tras la FEIN.")] },

    // ---- Página 3 ----
    { k: "pagina", t: "3 de 3" },
    { k: "titulo", num: "7.", t: "ENTIDADES BANCARIAS Y FINANCIERAS" },
    { k: "espacio", h: 6 },
    { k: "p", s: [N("De forma expresa, LOS CLIENTES solicitan que queden fuera de la gestión y tramitación de pre- autorizaciones de TMH las siguientes entidades con las que los CLIENTES tienen relación y/o prefieren gestionarla personalmente, sin TMH, que son las siguientes: NINGUNO")], gap: 14 },
    { k: "p", s: [N("Por tanto, TMH no realizará gestiones con dichas entidades excluidas por los clientes ni podrá cobrar honorarios de intermediación por ello. En contraprestación, LOS CLIENTES aceptan expresamente, desde hoy, la intermediación de TMH con el resto de las entidades, por lo que, en caso de firmar la hipoteca con cualquiera de las entidades autorizadas, y aunque LOS CLIENTES quieran posteriormente continuar por su cuenta las gestiones con dichas entidades, sin la intervención de TMH, y por el plazo de 6 meses desde la fecha de este documento, deberá abonar igualmente los honorarios de TMH a los que se refiere el punto 4. El plazo se verá prorrogado por otros seis meses, siempre y cuando los clientes no avisen con un mes de antelación a la fecha de vencimiento.")], gap: 14 },
    { k: "titulo", num: "8.", t: "CLÁUSULA DE AUTORIZACIÓN DE USO Y CESIÓN DE DATOS PERSONALES (RGPD)" },
    {
      k: "p",
      s: [
        N("LOS CLIENTES autorizan a TMH: el uso, incorporación a ficheros, tratamiento y cesión de sus datos personales a terceros colaboradores externos, para los siguientes fines: 1) En todos los casos: gestión y tramitación de una financiación hipotecaria (bancos, entidades financieras, de crédito, tasadoras, registros de información de riesgos e impagados). LOS CLIENTES podrán ejercer en todo momento sus derechos de modificación, rectificación o supresión de sus datos personales ante TMH ("),
        L("RGPD@TMHIPOTECA.COM", "mailto:RGPD@TMHIPOTECA.COM"),
        N(")."),
      ],
      gap: 14,
    },
    { k: "p", s: [N("Y, como consecuencia de todo ello, LOS CLIENTES realizan el presente Encargo en la fecha y lugar arriba indicados, y lo firman digitalmente a un solo efecto en prueba de su plena conformidad.")] },
  ];
}

const A4: [number, number] = [595.28, 841.89];
const M = { x: 71, top: 40, bottom: 56 };
const SIZE = 10.5;
const LH = 14.6;
const TEXTO = rgb(0.1, 0.1, 0.1);
const LINK = rgb(0.067, 0.333, 0.8);

export async function generarEncargoTmhPdf(d: DatosEncargo, logoPng: Uint8Array, marcaAguaPng: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Encargo de Servicio - Tu Mejor Hipoteca");
  pdf.setAuthor("Tu Mejor Hipoteca 2023, S.L.");
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo: PDFImage = await pdf.embedPng(logoPng);
  const marca: PDFImage = await pdf.embedPng(marcaAguaPng);
  const ancho = A4[0] - M.x * 2;

  let page!: PDFPage;
  let y = 0;
  const nuevaPagina = () => {
    page = pdf.addPage(A4);
    // Marca de agua centrada (como en el modelo)
    const mw = 300, mh = (marca.height / marca.width) * mw;
    page.drawImage(marca, { x: (A4[0] - mw) / 2, y: A4[1] * 0.5 - mh / 2 + 20, width: mw, height: mh });
    // Logo arriba a la izquierda
    const lw = 150, lh = (logo.height / logo.width) * lw;
    y = A4[1] - M.top;
    page.drawImage(logo, { x: M.x - 6, y: y - lh, width: lw, height: lh });
    y -= lh + 16;
  };
  const asegurar = (h: number) => { if (y - h < M.bottom) nuevaPagina(); };

  const enlace = (x1: number, y1: number, x2: number, y2: number, url: string) => {
    const a = pdf.context.register(pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x1, y1, x2, y2],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    }));
    page.node.addAnnot(a);
  };

  type W = { t: string; f: PDFFont; link?: string };
  const lineas = (segs: Seg[], w: number) => {
    const words: W[] = [];
    for (const s of segs) for (const p of s.t.split(/(\s+)/)) if (p) words.push({ t: p, f: s.b ? bold : reg, link: s.link });
    const out: W[][] = [];
    let cur: W[] = [], cw = 0;
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
  const pintar = (ls: W[][], x: number, w: number, justificar: boolean) => {
    ls.forEach((l, i) => {
      asegurar(LH);
      const ultima = i === ls.length - 1;
      const espacios = l.filter((p) => /^\s+$/.test(p.t)).length;
      const usado = l.reduce((a, p) => a + p.f.widthOfTextAtSize(p.t, SIZE), 0);
      let extra = justificar && !ultima && espacios ? (w - usado) / espacios : 0;
      if (extra > 8) extra = 0;
      let cx = x;
      for (const p of l) {
        if (/^\s+$/.test(p.t)) { cx += p.f.widthOfTextAtSize(" ", SIZE) + extra; continue; }
        const pw = p.f.widthOfTextAtSize(p.t, SIZE);
        page.drawText(p.t, { x: cx, y: y - SIZE, size: SIZE, font: p.f, color: p.link ? LINK : TEXTO });
        if (p.link) {
          page.drawLine({ start: { x: cx, y: y - SIZE - 1.5 }, end: { x: cx + pw, y: y - SIZE - 1.5 }, thickness: 0.6, color: LINK });
          enlace(cx, y - SIZE - 3, cx + pw, y, p.link);
        }
        cx += pw;
      }
      y -= LH;
    });
  };

  // Cada "x de 3" abre página nueva, salvo el primero (ya va en la primera página)
  nuevaPagina();
  let primera = true;
  for (const b of bloques(d)) {
    if (b.k === "pagina") {
      if (!primera) nuevaPagina();
      primera = false;
      pintar(lineas([{ t: b.t }], ancho), M.x, ancho, false);
      y -= 12;
      continue;
    }
    if (b.k === "espacio") { y -= b.h; continue; }
    if (b.k === "linea") { pintar(lineas(b.s, ancho), M.x, ancho, false); y -= b.gap ?? 8; continue; }
    if (b.k === "p") { pintar(lineas(b.s, ancho), M.x, ancho, true); y -= b.gap ?? 10; continue; }
    if (b.k === "titulo") {
      asegurar(LH * 3);
      page.drawText(b.num, { x: M.x, y: y - SIZE, size: SIZE, font: reg, color: TEXTO });
      pintar(lineas([{ t: b.t }], ancho - 36), M.x + 36, ancho - 36, false);
      y -= 2;
      continue;
    }
    if (b.k === "li") {
      const tab = 36;
      const ls = lineas(b.s, ancho - tab);
      asegurar(LH);
      page.drawText(b.marca, { x: M.x + 18, y: y - SIZE, size: SIZE, font: reg, color: TEXTO });
      pintar(ls, M.x + tab, ancho - tab, true);
      y -= 14;
    }
  }

  // Firma del cliente
  asegurar(110);
  y -= 70;
  const etiqueta = "Firma cliente conforme:";
  page.drawText(etiqueta, { x: M.x, y, size: SIZE, font: reg, color: TEXTO });
  const x0 = M.x + reg.widthOfTextAtSize(etiqueta, SIZE) + 6;
  const x1 = x0 + 290;
  page.drawLine({ start: { x: x0, y: y - 2 }, end: { x: x1, y: y - 2 }, thickness: 0.8, color: TEXTO });
  // Text tag de Lumin (texto real del PDF, en blanco) donde firmará el cliente
  page.drawText(LUMIN_TAG_FIRMA_TMH + "____", { x: x0 + 4, y: y + 4, size: 12, font: reg, color: rgb(1, 1, 1) });

  return await pdf.save();
}

