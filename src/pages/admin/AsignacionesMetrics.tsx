import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CalendarClock, CheckCircle2, Download, RefreshCw, Users } from 'lucide-react';
import {
  useAssignmentMetrics,
  formatMadrid,
  MetricsWindow,
  DateIssueType,
} from '@/hooks/useAssignmentMetrics';
import { AgentStarRating } from '@/components/agents/AgentStarRating';

const ISSUE_LABEL: Record<DateIssueType, string> = {
  pasado: 'En el pasado',
  anio_invalido: 'Año inválido',
  fuera_horario: 'Fuera de horario',
  fin_de_semana: 'Fin de semana',
  sin_fecha: 'Sin fecha',
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(';'),
    )
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AsignacionesMetrics() {
  const [window, setWindow] = useState<MetricsWindow>('7d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const {
    loading,
    error,
    leads,
    agentCounts,
    average,
    agentsWithoutLeads,
    collisions,
    dateIssues,
    sharedSlots,
    rangeLabel,
    refetch,
  } = useAssignmentMetrics(window, from, to);

  const assignedLeads = useMemo(
    () => leads.filter((l) => l.agente_asignado_id).length,
    [leads],
  );
  const withMeeting = useMemo(
    () => leads.filter((l) => l.reunion_datetime).length,
    [leads],
  );
  const validPct = withMeeting > 0
    ? Math.round(((withMeeting - dateIssues.filter((i) => i.type !== 'sin_fecha').length) / withMeeting) * 100)
    : 100;

  const chartData = agentCounts.map((a) => ({ name: a.agentName, Leads: a.count }));

  return (
    <AdminLayout>
      <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reparto de Leads</h1>
            <p className="text-sm text-muted-foreground">
              Auditoría del round-robin y de las fechas de llamada · solo leads cualificados · {rangeLabel}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={window} onValueChange={(v) => setWindow(v as MetricsWindow)}>
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="24h">Hoy</TabsTrigger>
              <TabsTrigger value="7d">7 días</TabsTrigger>
              <TabsTrigger value="30d">30 días</TabsTrigger>
              <TabsTrigger value="custom">Rango</TabsTrigger>
            </TabsList>
          </Tabs>
          {window === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
          )}
        </div>

        {error && (
          <Card>
            <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-80" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads asignados</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignedLeads}</div>
                  <p className="text-xs text-muted-foreground">{leads.length} recibidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Agentes con leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {agentCounts.filter((a) => a.count > 0).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Media {average.toFixed(1)} por agente
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Colisiones</CardTitle>
                  {collisions.length === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      collisions.length === 0 ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {collisions.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Mismo agente a &lt; 30 min</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fechas con incidencia</CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      dateIssues.length === 0 ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {dateIssues.length}
                  </div>
                  <p className="text-xs text-muted-foreground">de {leads.length} leads</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Fechas válidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{validPct}%</div>
                  <p className="text-xs text-muted-foreground">{withMeeting} con reunión</p>
                </CardContent>
              </Card>
            </div>

            {/* Reparto por agente */}
            <Card>
              <CardHeader>
                <CardTitle>Asignaciones por agente</CardTitle>
                <CardDescription>
                  Reparto de leads cualificados en la ventana seleccionada. La línea marca la media (
                  {average.toFixed(1)}). El "esperado" tiene en cuenta la clasificación por estrellas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">


                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agente</TableHead>
                        <TableHead>Estrellas</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Esperado</TableHead>
                        <TableHead className="text-right">Desviación</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentCounts.map((a) => {
                        const off = Math.abs(a.deviationPct) > 30;
                        return (
                          <TableRow key={a.agentId}>
                            <TableCell className="font-medium">{a.agentName}</TableCell>
                            <TableCell>
                              <AgentStarRating value={a.estrellas} readOnly size={14} />
                            </TableCell>
                            <TableCell className="text-right">{a.count}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {a.expected.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right">
                              {a.deviationPct > 0 ? '+' : ''}
                              {a.deviationPct.toFixed(0)}%
                            </TableCell>
                            <TableCell>
                              {a.count === 0 ? (
                                <Badge variant="destructive">Sin leads</Badge>
                              ) : off ? (
                                <Badge variant="secondary">Desbalanceado</Badge>
                              ) : (
                                <Badge variant="outline">Equilibrado</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {agentCounts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Sin datos en el período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {agentsWithoutLeads.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Agentes activos sin ningún lead: {agentsWithoutLeads.map((a) => a.nombre).join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Colisiones */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Colisiones de agenda (mismo agente)</CardTitle>
                  <CardDescription>
                    Solo se marca conflicto cuando un mismo agente tiene dos reuniones a menos de 30
                    minutos. Que varios leads coincidan en el mismo día y hora con agentes distintos
                    es correcto y no cuenta como colisión.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={collisions.length === 0}
                  onClick={() =>
                    downloadCsv('colisiones.csv', [
                      ['Agente', 'Lead A', 'Hora A (Madrid)', 'Lead B', 'Hora B (Madrid)', 'Diferencia (min)'],
                      ...collisions.map((c) => [
                        c.agentName,
                        c.leadA.nombre_completo,
                        formatMadrid(c.leadA.reunion_datetime),
                        c.leadB.nombre_completo,
                        formatMadrid(c.leadB.reunion_datetime),
                        c.diffMinutes,
                      ]),
                    ])
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Franjas horarias atendidas simultáneamente por agentes distintos:{' '}
                  <span className="font-medium text-foreground">{sharedSlots}</span> (situación
                  normal, no es un error).
                </p>
                {collisions.length === 0 ? (
                  <p className="text-sm text-primary font-medium">
                    0 colisiones: ningún agente tiene dos leads solapados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agente</TableHead>
                          <TableHead>Lead A</TableHead>
                          <TableHead>Lead B</TableHead>
                          <TableHead>Hora (Madrid)</TableHead>
                          <TableHead className="text-right">Δ min</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collisions.map((c, i) => (
                          <TableRow key={`${c.leadA.id}-${c.leadB.id}-${i}`}>
                            <TableCell className="font-medium">{c.agentName}</TableCell>
                            <TableCell>{c.leadA.nombre_completo}</TableCell>
                            <TableCell>{c.leadB.nombre_completo}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatMadrid(c.leadA.reunion_datetime)}
                            </TableCell>
                            <TableCell className="text-right text-destructive font-semibold">
                              {c.diffMinutes}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fechas */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Certificación de fechas de llamada</CardTitle>
                  <CardDescription>
                    Reuniones en el pasado, año inválido, fin de semana, fuera de 09:00–20:00 o sin fecha.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={dateIssues.length === 0}
                  onClick={() =>
                    downloadCsv('fechas_incidencias.csv', [
                      ['Lead', 'Agente', 'Incidencia', 'Detalle', 'Reunión (Madrid)', 'Texto original', 'Creado'],
                      ...dateIssues.map((i) => [
                        i.lead.nombre_completo,
                        i.agentName,
                        ISSUE_LABEL[i.type],
                        i.detail,
                        formatMadrid(i.lead.reunion_datetime),
                        i.lead.hora_reunion_texto ?? '',
                        formatMadrid(i.lead.created_at),
                      ]),
                    ])
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ISSUE_LABEL) as DateIssueType[]).map((t) => {
                    const n = dateIssues.filter((i) => i.type === t).length;
                    return (
                      <Badge key={t} variant={n > 0 ? 'destructive' : 'outline'}>
                        {ISSUE_LABEL[t]}: {n}
                      </Badge>
                    );
                  })}
                </div>
                {dateIssues.length === 0 ? (
                  <p className="text-sm text-primary font-medium">
                    Todas las fechas de llamada son coherentes y están en el futuro.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead</TableHead>
                          <TableHead>Agente</TableHead>
                          <TableHead>Incidencia</TableHead>
                          <TableHead>Reunión (Madrid)</TableHead>
                          <TableHead>Texto original</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateIssues.slice(0, 200).map((i) => (
                          <TableRow key={`${i.lead.id}-${i.type}`}>
                            <TableCell className="font-medium">{i.lead.nombre_completo}</TableCell>
                            <TableCell>{i.agentName}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{ISSUE_LABEL[i.type]}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatMadrid(i.lead.reunion_datetime)}
                            </TableCell>
                            <TableCell className="max-w-[240px] truncate text-muted-foreground">
                              {i.lead.hora_reunion_texto ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {dateIssues.length > 200 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Mostrando 200 de {dateIssues.length}. Descarga el CSV para el detalle completo.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
