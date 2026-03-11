

# Analysis: JSON de Preços de Mercado por Município

## What is this data?

The file contains **official Spanish real estate market price data** per municipality, with ~162k entries covering:

| Field | Description |
|---|---|
| `name_muni` | Municipality name (e.g., "Alhama de Almería") |
| `name_prov` | Province (e.g., "Almería") |
| `name_ccaa` | Autonomous community (e.g., "Andalucía") |
| `precio_m2` | **Average price per m²** (e.g., 535€/m²) |
| `precio_medio` | **Average property price** (e.g., 66,428€) |
| `superficie_media` | Average surface area (e.g., 124m²) |
| `tipo_construccion_id` | 7=new build, 9=second-hand, 99=all |
| `clase_finca_urbana_id` | 14=apartment, 15=house, 99=all |
| `total_informados` | Number of properties in sample |

Each municipality has multiple rows (combinations of construction type × property class). Per your choice, we use **tipo=99 + clase=99** (aggregated averages), giving us ~7,000-8,000 unique municipality records.

## How it can be used

### 1. Qualification in Simulator
When a lead enters a property value and city in the mortgage simulator, we can:
- Look up the municipality's `precio_m2` and `precio_medio`
- Show: "El precio medio en [municipio] es X€. Tu inmueble está **+15% por encima** de la media"
- Flag unrealistic values (e.g., requesting 300k in a municipality where the average is 50k)

### 2. Enriched Recommendations
When showing property recommendations to agents:
- Add a badge on each property card: "12% bajo la media" or "20% sobre la media"
- Compare `inmueble.precio / inmueble.area_m2` vs the municipality's `precio_m2`

### 3. Webhook Qualification (Meta Ads)
When a lead arrives from Meta Ads with `ciudad_interes` and `valor_inmueble_deseado`:
- Cross-reference with market data to validate if the budget is realistic
- Add context to the qualification notes: "Presupuesto realista para [ciudad]" or "⚠️ Presupuesto bajo para la zona"

---

## Implementation Plan

### Step 1: Pre-process JSON into compact static file

Create a script/utility that filters the 162k-line JSON to only `tipo_construccion_id=99 AND clase_finca_urbana_id=99`, then generates a compact TypeScript lookup:

**File:** `src/data/marketPrices.ts`
```typescript
// Auto-generated from datos.json (tipo=99, clase=99)
export interface MarketPrice {
  municipio: string;
  provincia: string;
  ccaa: string;
  precioM2: number;
  precioMedio: number;
  superficieMedia: number;
  totalInformados: number;
}

export const MARKET_PRICES: Record<string, MarketPrice> = {
  "villares del saz": { municipio: "Villares del Saz", provincia: "Cuenca", ccaa: "Castilla-La Mancha", precioM2: 231, precioMedio: 30000, superficieMedia: 130, totalInformados: 5 },
  // ... ~7k entries
};
```

Key is normalized municipality name (lowercase, no accents). Estimated size: ~500-700KB (acceptable for a business app with lazy import).

### Step 2: Create lookup utility

**File:** `src/lib/marketPriceUtils.ts`

- `getMarketPrice(municipio: string): MarketPrice | null` — normalized lookup
- `comparePriceToMarket(precio: number, areaM2: number, municipio: string)` — returns `{ diferenciaPorcentaje, precioM2Mercado, estaEnRango }` 
- `formatMarketComparison(...)` — returns human-readable text like "+15% sobre la media"

### Step 3: Integrate into Simulator (`ResultadosSimulacionHipotecaria.tsx`)

After showing results, add a market context section:
- "El precio medio en [municipio] es X€/m². Tu vivienda está Y% [por encima/por debajo] de la media."
- Visual indicator (green/yellow/red) based on deviation

### Step 4: Enrich Recommendations (`useRecomendaciones.ts` + `InmuebleCard.tsx`)

When displaying recommended properties:
- Look up the municipality from `inmueble.ciudad`
- Calculate `inmueble.precio / inmueble.area_m2` vs `marketPrice.precioM2`
- Show a small badge: "8% bajo media" (green) or "25% sobre media" (orange)

### Step 5: Webhook enrichment (`meta-lead-webhook/index.ts`)

Since edge functions can't import from `src/`, we have two options:
- **Option A**: Store the processed JSON in Supabase storage and fetch at runtime (adds ~1s latency)
- **Option B**: Deploy a second, compact version as a Deno-compatible file in `supabase/functions/_shared/marketPrices.ts`

I recommend **Option B** — embed the compact lookup in the edge function shared folder.

Add to the qualification logic:
- After determining `ciudad_interes`, look up market price
- If lead's `valor_inmueble_deseado` is >200% of `precioMedio`, add warning to notes
- If <30% of `precioMedio`, flag as potentially unrealistic

---

## Files to create/modify

| File | Action |
|---|---|
| `src/data/marketPrices.ts` | **Create** — Static lookup (~7k municipalities) |
| `src/lib/marketPriceUtils.ts` | **Create** — Lookup & comparison functions |
| `src/components/simuladores/ResultadosSimulacionHipotecaria.tsx` | **Modify** — Add market context section |
| `src/hooks/useRecomendaciones.ts` | **Modify** — Enrich with market comparison |
| `src/components/crm/LeadCard.tsx` or `InmuebleCard.tsx` | **Modify** — Show market badge |
| `supabase/functions/_shared/marketPrices.ts` | **Create** — Compact lookup for edge functions |
| `supabase/functions/meta-lead-webhook/index.ts` | **Modify** — Add market validation |

## What does NOT change
- Simulator calculation logic (simuladorUtils.ts)
- Database schema
- Personal credit rules
- Existing recommendation filtering logic (city, zone, price range)

## Risk / Considerations
- The static file will be ~500-700KB. This is loaded lazily only when needed (dynamic import), so it won't affect initial page load.
- Municipality name matching requires normalization (accents, case). The `matchesSearch` utility from `textUtils.ts` already handles this.
- Some municipalities may not be in the dataset. The UI should gracefully handle "no market data available."

