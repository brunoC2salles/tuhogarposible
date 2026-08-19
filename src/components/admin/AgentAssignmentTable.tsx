import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AgentStarRating } from '@/components/agents/AgentStarRating';
import { useAssignmentMetrics, MetricsWindow } from '@/hooks/useAssignmentMetrics';

const OPTIONS: { value: MetricsWindow; label: string }[] = [
  { value: '24h', label: 'Día' },
  { value: '7d', label: 'Semana' },
  { value: '30d', label: 'Mes' },
  { value: 'total', label: 'Total' },
];

/**
 * Tabla de asignaciones por agente con su propio selector de período
 * (día / semana / mes / total) y edición de estrellas in-situ (solo admin).
 */
export function AgentAssignmentTable() {
  const [period, setPeriod] = useState<MetricsWindow>('7d');
  const { loading, agentCounts, average, agentsWithoutLeads, rangeLabel } =
    useAssignmentMetrics(period);

  const [stars, setStars] = useState<Record<string, number>>({});
  useEffect(() => {
    setStars((prev) => {
      const next = { ...prev };
      agentCounts.forEach((a) => {
        if (next[a.agentId] === undefined) next[a.agentId] = a.estrellas;
      });
      return next;
    });
  }, [agentCounts]);

  const updateStars = async (agentId: string, agentName: string, value: number) => {
    const prev = stars[agentId];
    setStars((s) => ({ ...s, [agentId]: value }));
    const { error } = await supabase.from('profiles').update({ estrellas: value }).eq('id', agentId);
    if (error) {
      setStars((s) => ({ ...s, [agentId]: prev }));
      toast.error('No se pudo actualizar la clasificación');
      return;
    }
    toast.success(`${agentName}: ${value} ${value === 1 ? 'estrella' : 'estrellas'}`);
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Asignaciones por agente</CardTitle>
            <CardDescription>
              Leads cualificados repartidos · {rangeLabel} · media {average.toFixed(1)} por agente.
              Cambia las estrellas aquí mismo para ajustar la prioridad de reparto.
            </CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as MetricsWindow)}>
            <TabsList className="grid grid-cols-4">
              {OPTIONS.map((o) => (
                <TabsTrigger key={o.value} value={o.value}>
                  {o.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
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
                          <AgentStarRating
                            value={stars[a.agentId] ?? a.estrellas}
                            size={16}
                            onChange={(v) => updateStars(a.agentId, a.agentName, v)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">{a.count}</TableCell>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
