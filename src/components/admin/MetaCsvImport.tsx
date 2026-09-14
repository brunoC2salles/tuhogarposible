import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Row = Record<string, string>;

interface ResultSummary {
  total: number;
  existentes: number;
  creados: number;
  cualificados: number;
  errores: number;
  motivos: Record<string, number>;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Palabras clave → campo del webhook de cualificación
const FIELD_MATCHERS: Array<[string, (h: string) => boolean]> = [
  ['meta_lead_id', (h) => h === 'id'],
  ['nombre', (h) => h.includes('full name') || h === 'nombre'],
  ['telefono', (h) => h.includes('phone') || h.includes('telefono')],
  ['email', (h) => h.includes('email')],
  ['tiene_nie_dni', (h) => h.includes('dni') && h.includes('nie')],
  ['tiene_vivienda_seleccionada', (h) => h.includes('vivienda de tu interes')],
  ['habitaciones', (h) => h.includes('habitaciones')],
  ['antiguedad_trabajo', (h) => h.includes('antiguedad')],
  ['en_fichero_morosidad', (h) => h.includes('morosidad')],
  ['edad', (h) => h.includes('edad')],
  ['zona_interes', (h) => h.includes('zona quieres vivir') || h.includes('zona')],
  ['rango_ingresos', (h) => h.includes('ingresos')],
  ['deudas_mensuales', (h) => h.includes('credito') || h.includes('deuda')],
  ['monto_ahorros', (h) => h.includes('ahorros')],
  ['tiene_ahorros_impuestos', (h) => h.includes('ahorros')],
  ['preferencia_llamada', (h) => h.includes('hora') && h.includes('llamemos')],
];

function decode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // BOM UTF-16 LE (exportación estándar de Meta)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  return new TextDecoder('utf-8').decode(buffer);
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === sep && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const sep = lines[0].includes('\t') ? '\t' : (lines[0].split(';').length > lines[0].split(',').length ? ';' : ',');
  const headers = splitLine(lines[0], sep);
  return lines.slice(1).map((line) => {
    const cells = splitLine(line, sep);
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

function toPayload(row: Row): Record<string, string> | null {
  const entries = Object.entries(row);
  const payload: Record<string, string> = {};
  for (const [field, match] of FIELD_MATCHERS) {
    if (payload[field]) continue;
    const hit = entries.find(([h]) => match(norm(h)));
    if (hit && hit[1]) payload[field] = hit[1];
  }
  if (payload.meta_lead_id) payload.meta_lead_id = payload.meta_lead_id.replace(/^l:/, '');
  if (payload.telefono) payload.telefono = payload.telefono.replace(/^p:/, '').trim();
  if (payload.email) payload.email = payload.email.toLowerCase().trim();
  if (!payload.telefono && !payload.email) return null;
  return payload;
}

export const MetaCsvImport = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [summary, setSummary] = useState<ResultSummary | null>(null);

  const handleFile = async (file: File) => {
    const text = decode(await file.arrayBuffer());
    const parsed = parseCsv(text);
    setRows(parsed);
    setFileName(file.name);
    setSummary(null);
    setDone(0);
    if (parsed.length === 0) toast.error('No se han encontrado filas en el archivo');
    else toast.success(`${parsed.length} filas leídas`);
  };

  const run = async () => {
    setRunning(true);
    setDone(0);
    const res: ResultSummary = { total: 0, existentes: 0, creados: 0, cualificados: 0, errores: 0, motivos: {} };
    for (const row of rows) {
      const payload = toPayload(row);
      if (!payload) { setDone((d) => d + 1); continue; }
      res.total++;
      try {
        const { data, error } = await supabase.functions.invoke('meta-lead-webhook', { body: payload });
        if (error) throw error;
        if ((data as any)?.duplicated) res.existentes++;
        else {
          res.creados++;
          if ((data as any)?.cualificado) res.cualificados++;
          else {
            const motivo = (data as any)?.razon_no_cualificado || 'Sin motivo';
            res.motivos[motivo] = (res.motivos[motivo] || 0) + 1;
          }
        }
      } catch {
        res.errores++;
      }
      setDone((d) => d + 1);
      setSummary({ ...res });
    }
    setSummary({ ...res });
    setRunning(false);
    toast.success(`Importación terminada: ${res.creados} nuevos, ${res.existentes} ya existían`);
  };

  const progress = rows.length ? Math.round((done / rows.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar leads desde CSV de Meta Ads
        </CardTitle>
        <CardDescription>
          Sube la exportación de leads de Meta. Cada fila pasa por el mismo proceso de cualificación.
          Los leads que ya existen (mismo teléfono o email en los últimos 90 días) se detectan y se ignoran,
          sin duplicar ni reasignar agentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".csv,.tsv,text/csv,text/plain"
          disabled={running}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {rows.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {fileName}: <strong>{rows.length}</strong> filas listas para procesar
          </p>
        )}

        <Button onClick={run} disabled={running || rows.length === 0}>
          <Upload className="h-4 w-4 mr-2" />
          {running ? `Procesando ${done}/${rows.length}...` : 'Procesar archivo'}
        </Button>

        {(running || done > 0) && <Progress value={progress} />}

        {summary && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Procesados: {summary.total}</Badge>
              <Badge variant="secondary">Ya existían: {summary.existentes}</Badge>
              <Badge>Nuevos: {summary.creados}</Badge>
              <Badge>Cualificados: {summary.cualificados}</Badge>
              {summary.errores > 0 && <Badge variant="destructive">Errores: {summary.errores}</Badge>}
            </div>
            {Object.keys(summary.motivos).length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Motivos de descualificación:</p>
                {Object.entries(summary.motivos)
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, c]) => <p key={m}>• {c} — {m}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
