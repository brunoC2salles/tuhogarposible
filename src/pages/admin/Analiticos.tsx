import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { ArrowDown, ArrowUp, Loader2, RefreshCw } from "lucide-react";

// Inicio del análisis: leads creados desde el 1/11/2026 (hora de Madrid).
const DESDE = "2026-10-31T23:00:00Z";

type Vivienda = "Todos" | "Con vivienda" | "Sin vivienda" | "Sin clasificar";
const GRUPOS: Exclude<Vivienda, "Todos">[] = ["Con vivienda", "Sin vivienda", "Sin clasificar"];
const COLORES: Record<string, string> = {
  "Con vivienda": "hsl(var(--primary))",
  "Sin vivienda": "#888780",
  "Sin clasificar": "#B4B2A9",
};

interface FilaIndividual {
  id: string;
  mes: string;
  nombre: string | null;
  vivienda: Vivienda;
  etapa_actual: string;
  estado: string;
  dias_proceso: number | null;
  d_buscando: number | null;
  d_encontrada: number | null;
  d_doc_ok: number | null;
  d_tasacion: number | null;
  d_firma: number | null;
  d_riesgos: number | null;
  d_fein: number | null;
}

interface FilaEtapa {
  mes: string;
  etapa: string;
  orden: number;
  vivienda: Vivienda;
  leads: number;
  siguen: number;
  salieron: number;
  media_dias: number | null;
  mediana_dias: number | null;
  media_salieron: number | null;
  media_siguen: number | null;
  max_dias: number | null;
}

interface FilaProceso {
  mes: string;
  vivienda: Vivienda;
  leads: number;
  completados: number;
  en_curso: number;
  fuera: number;
  media_completados: number | null;
  mediana_completados: number | null;
  media_en_curso: number | null;
  media_fuera: number | null;
}

interface Datos {
  individuales: FilaIndividual[];
  etapas: FilaEtapa[];
  proceso: FilaProceso[];
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const mesLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MESES[Number(mm) - 1] ?? m} ${y}`;
};
const dias = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const entero = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("es-ES"));

const COLUMNAS_ETAPA: { key: keyof FilaIndividual; label: string }[] = [
  { key: "d_buscando", label: "Buscando vivienda" },
  { key: "d_encontrada", label: "Vivienda encontrada" },
  { key: "d_doc_ok", label: "Documentación OK" },
  { key: "d_tasacion", label: "Tasación" },
  { key: "d_firma", label: "Firma del contrato" },
  { key: "d_riesgos", label: "Doc. a riesgos" },
  { key: "d_fein", label: "FEIN" },
];

const Analiticos = () => {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState<string>("");
  const [vivienda, setVivienda] = useState<Vivienda>("Todos");
  const [orden, setOrden] = useState<{ key: keyof FilaIndividual; dir: 1 | -1 }>({ key: "dias_proceso", dir: -1 });

  const cargar = async () => {
    setCargando(true);
    setError(null);
    const { data, error } = await supabase.rpc("analiticos_tiempos" as never, { p_desde: DESDE } as never);
    if (error) {
      setError(error.message);
      setDatos(null);
    } else {
      const d = (data ?? {}) as Partial<Datos>;
      setDatos({
        individuales: d.individuales ?? [],
        etapas: d.etapas ?? [],
        proceso: d.proceso ?? [],
      });
    }
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const meses = useMemo(
    () => [...new Set((datos?.proceso ?? []).map((p) => p.mes))].sort().reverse(),
    [datos]
  );

  useEffect(() => {
    if (meses.length && !meses.includes(mes)) setMes(meses[0]);
  }, [meses, mes]);

  const proceso = useMemo(
    () => datos?.proceso.find((p) => p.mes === mes && p.vivienda === vivienda) ?? null,
    [datos, mes, vivienda]
  );

  const etapasSeleccion = useMemo(
    () =>
      (datos?.etapas ?? [])
        .filter((e) => e.mes === mes && e.vivienda === vivienda)
        .sort((a, b) => a.orden - b.orden),
    [datos, mes, vivienda]
  );

  const comparacion = useMemo(() => {
    const delMes = (datos?.etapas ?? []).filter((e) => e.mes === mes);
    const etapas = delMes
      .filter((e) => e.vivienda === "Todos")
      .sort((a, b) => a.orden - b.orden)
      .map((e) => e.etapa);
    return etapas.map((etapa) => {
      const fila: Record<string, string | number | null> = { etapa };
      GRUPOS.forEach((g) => {
        fila[g] = delMes.find((e) => e.etapa === etapa && e.vivienda === g)?.media_dias ?? null;
      });
      return fila;
    });
  }, [datos, mes]);

  const individuales = useMemo(() => {
    const filas = (datos?.individuales ?? []).filter(
      (r) => r.mes === mes && (vivienda === "Todos" || r.vivienda === vivienda)
    );
    const { key, dir } = orden;
    return [...filas].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "es") * dir;
    });
  }, [datos, mes, vivienda, orden]);

  const ordenarPor = (key: keyof FilaIndividual) => {
    setOrden((o) =>
      o.key === key
        ? { key, dir: o.dir === 1 ? -1 : 1 }
        : { key, dir: typeof individuales[0]?.[key] === "number" ? -1 : 1 }
    );
  };

  const Cabecera = ({ k, label, izquierda }: { k: keyof FilaIndividual; label: string; izquierda?: boolean }) => (
    <TableHead className={`whitespace-nowrap ${izquierda ? "" : "text-right"}`}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => ordenarPor(k)}>
        {label}
        {orden.key === k && (orden.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  const sinDatos = !cargando && !error && meses.length === 0;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Analíticos</h1>
            <p className="text-sm text-muted-foreground">
              Tiempo por etapa y proceso completo (del alta en el CRM a FEIN). Leads creados desde el 1 de noviembre de 2026.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
            {cargando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Select value={mes} onValueChange={setMes} disabled={meses.length === 0}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Mes de creación" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {mesLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={vivienda}
            onValueChange={(v) => v && setVivienda(v as Vivienda)}
            className="flex-wrap justify-start"
          >
            {(["Todos", ...GRUPOS] as Vivienda[]).map((v) => (
              <ToggleGroupItem key={v} value={v} size="sm" className="rounded-full px-4">
                {v}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">No se pudieron cargar los datos: {error}</CardContent>
          </Card>
        )}

        {cargando && !datos && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {sinDatos && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Todavía no hay leads creados desde el 1 de noviembre de 2026 que hayan entrado en el kanban. Los datos aparecerán aquí en cuanto lleguen.
            </CardContent>
          </Card>
        )}

        {datos && meses.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proceso completo</CardTitle>
                <CardDescription>Del alta en el CRM a la entrada en FEIN, para el mes y el grupo elegidos.</CardDescription>
              </CardHeader>
              <CardContent>
                {proceso ? (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { label: "Leads", valor: entero(proceso.leads), sub: "entraron en el kanban" },
                      {
                        label: "Llegaron a FEIN",
                        valor: entero(proceso.completados),
                        sub: proceso.leads
                          ? `${Math.round((proceso.completados / proceso.leads) * 100)}% del total`
                          : "—",
                      },
                      {
                        label: "Días hasta FEIN",
                        valor: dias(proceso.media_completados),
                        sub: `media · mediana ${dias(proceso.mediana_completados)}`,
                      },
                      { label: "En curso", valor: entero(proceso.en_curso), sub: `media ${dias(proceso.media_en_curso)} días hasta hoy` },
                      { label: "Fuera del proceso", valor: entero(proceso.fuera), sub: `media ${dias(proceso.media_fuera)} días hasta salir` },
                    ].map((t) => (
                      <div key={t.label} className="rounded-xl border p-4">
                        <p className="text-xs text-muted-foreground">{t.label}</p>
                        <p className="text-2xl font-semibold tabular-nums mt-1">{t.valor}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.sub}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin leads de este grupo en el mes elegido.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Días por etapa</CardTitle>
                  <CardDescription>Media y mediana de días por lead en cada etapa (suma de todas sus pasadas).</CardDescription>
                </CardHeader>
                <CardContent>
                  {etapasSeleccion.length ? (
                    <div style={{ height: Math.max(220, etapasSeleccion.length * 52) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={etapasSeleccion} layout="vertical" margin={{ left: 8, right: 24 }}>
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `${v} d`} fontSize={12} />
                          <YAxis type="category" dataKey="etapa" width={160} fontSize={12} />
                          <Tooltip
                            formatter={(v: number, n: string) => [`${dias(v)} días`, n]}
                            labelFormatter={(l) => String(l)}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="media_dias" name="Media" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
                          <Bar dataKey="mediana_dias" name="Mediana" fill="#B4B2A9" radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin datos para este grupo.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Con vivienda frente a sin vivienda</CardTitle>
                  <CardDescription>Media de días por etapa en cada grupo, para el mes elegido.</CardDescription>
                </CardHeader>
                <CardContent>
                  {comparacion.length ? (
                    <div style={{ height: Math.max(220, comparacion.length * 64) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparacion} layout="vertical" margin={{ left: 8, right: 24 }}>
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `${v} d`} fontSize={12} />
                          <YAxis type="category" dataKey="etapa" width={160} fontSize={12} />
                          <Tooltip formatter={(v: number, n: string) => [`${dias(v)} días`, n]} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {GRUPOS.map((g) => (
                            <Bar key={g} dataKey={g} name={g} fill={COLORES[g]} radius={[0, 4, 4, 0]} barSize={10} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin datos en el mes elegido.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Días por lead</CardTitle>
                <CardDescription>
                  Días del proceso: hasta FEIN si llegó; si no, hasta hoy (en curso) o hasta su salida. Pulsa una cabecera para ordenar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[36rem] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <Cabecera k="nombre" label="Nombre" izquierda />
                        <Cabecera k="vivienda" label="Vivienda" izquierda />
                        <Cabecera k="estado" label="Estado" izquierda />
                        <Cabecera k="etapa_actual" label="Etapa actual" izquierda />
                        <Cabecera k="dias_proceso" label="Días proceso" />
                        {COLUMNAS_ETAPA.map((c) => (
                          <Cabecera key={c.key} k={c.key} label={c.label} />
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {individuales.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap font-medium">{r.nombre || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{r.vivienda}</TableCell>
                          <TableCell className="whitespace-nowrap">{r.estado}</TableCell>
                          <TableCell className="whitespace-nowrap">{r.etapa_actual}</TableCell>
                          <TableCell className="text-right tabular-nums">{dias(r.dias_proceso)}</TableCell>
                          {COLUMNAS_ETAPA.map((c) => (
                            <TableCell key={c.key} className="text-right tabular-nums">
                              {dias(r[c.key] as number | null)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {individuales.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5 + COLUMNAS_ETAPA.length} className="text-center text-sm text-muted-foreground">
                            Sin leads para este filtro.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalle por etapa</CardTitle>
                <CardDescription>Siguen: leads que todavía están en la etapa; su tiempo cuenta hasta hoy.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Salieron</TableHead>
                      <TableHead className="text-right">Siguen</TableHead>
                      <TableHead className="text-right">Media (días)</TableHead>
                      <TableHead className="text-right">Mediana</TableHead>
                      <TableHead className="text-right">Media salieron</TableHead>
                      <TableHead className="text-right">Media siguen</TableHead>
                      <TableHead className="text-right">Máximo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etapasSeleccion.map((e) => (
                      <TableRow key={e.etapa}>
                        <TableCell className="whitespace-nowrap font-medium">{e.etapa}</TableCell>
                        <TableCell className="text-right tabular-nums">{entero(e.leads)}</TableCell>
                        <TableCell className="text-right tabular-nums">{entero(e.salieron)}</TableCell>
                        <TableCell className="text-right tabular-nums">{entero(e.siguen)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dias(e.media_dias)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dias(e.mediana_dias)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dias(e.media_salieron)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dias(e.media_siguen)}</TableCell>
                        <TableCell className="text-right tabular-nums">{dias(e.max_dias)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cómo se calcula</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Entran los leads creados desde el 1 de noviembre de 2026 (hora de Madrid), manuales incluidos, que hayan pasado por alguna etapa del kanban. Los descualificados desde el alta no entran.</li>
              <li>Etapas: Buscando vivienda, Vivienda encontrada, Documentación OK, Tasación, Firma del contrato, Documentación a riesgos y FEIN.</li>
              <li>Días por etapa: se suma todo el tiempo que el lead pasó en la etapa, aunque haya vuelto a ella. Si sigue en la etapa, cuenta hasta hoy.</li>
              <li>Proceso completo: desde la creación del lead hasta su primera entrada en FEIN (Completado). Si aún no llegó, cuenta hasta hoy (En curso) o hasta que pasó a Descualificados o fue archivado (Fuera del proceso).</li>
              <li>Vivienda: leads de Meta según su respuesta en el formulario; leads de Tally, siempre sin vivienda; leads manuales según la primera etapa (Buscando vivienda = sin vivienda, Vivienda encontrada = con vivienda). Un lead manual que entra directo en otra etapa queda como Sin clasificar.</li>
              <li>El mes es el de creación del lead: los leads de un mes se siguen acompañando hasta que lleguen a FEIN.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Analiticos;
