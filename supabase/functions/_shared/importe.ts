// Importes escritos a mano en formularios (ES). Usado por embargados-webhook y meta-lead-webhook.
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
