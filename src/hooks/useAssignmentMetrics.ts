import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';

export type MetricsWindow = '24h' | '7d' | '30d' | 'custom';

export interface MetricLead {
  id: string;
  nombre_completo: string;
  agente_asignado_id: string | null;
  created_at: string;
  reunion_datetime: string | null;
  hora_reunion_texto: string | null;
  stage: string;
}

export interface AgentRow {
  id: string;
  nombre: string;
  email: string;
}

export interface AgentCount {
  agentId: string;
  agentName: string;
  count: number;
  deviationPct: number;
}

export interface Collision {
  agentId: string;
  agentName: string;
  leadA: MetricLead;
  leadB: MetricLead;
  diffMinutes: number;
}

export type DateIssueType =
  | 'pasado'
  | 'anio_invalido'
  | 'fuera_horario'
  | 'fin_de_semana'
  | 'sin_fecha';

export interface DateIssue {
  lead: MetricLead;
  agentName: string;
  type: DateIssueType;
  detail: string;
}

export const MADRID_TZ = 'Europe/Madrid';

const dtf = new Intl.DateTimeFormat('es-ES', {
  timeZone: MADRID_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hour12: false,
});

export function formatMadrid(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'fecha inválida';
  return dtf.format(d);
}

/** Devuelve partes de la fecha en hora de Madrid. */
export function madridParts(iso: string) {
  const d = new Date(iso);
  const parts = dtf.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    weekday: get('weekday').toLowerCase(),
    valid: !isNaN(d.getTime()),
  };
}

/** Inicio del día de calendario en Madrid, N días atrás, como ISO UTC. */
function madridDayStartISO(daysAgo: number): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const base = new Date(now.getTime() - daysAgo * 86400000);
  const ymd = fmt.format(base); // YYYY-MM-DD
  // Madrid es UTC+1/+2; construimos medianoche local vía offset calculado
  const guess = new Date(`${ymd}T00:00:00Z`);
  const offsetMin = madridOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMin * 60000).toISOString();
}

function madridOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(date.toLocaleString('en-US', { timeZone: MADRID_TZ }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

export interface UseAssignmentMetricsResult {
  loading: boolean;
  error: string | null;
  leads: MetricLead[];
  agents: AgentRow[];
  agentCounts: AgentCount[];
  average: number;
  agentsWithoutLeads: AgentRow[];
  collisions: Collision[];
  dateIssues: DateIssue[];
  rangeLabel: string;
  refetch: () => void;
}

export function useAssignmentMetrics(
  window: MetricsWindow,
  customFrom?: string,
  customTo?: string,
): UseAssignmentMetricsResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<MetricLead[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [nonce, setNonce] = useState(0);

  const { fromISO, toISO, rangeLabel } = useMemo(() => {
    if (window === 'custom' && customFrom && customTo) {
      const from = new Date(`${customFrom}T00:00:00Z`);
      const to = new Date(`${customTo}T00:00:00Z`);
      const f = new Date(from.getTime() - madridOffsetMinutes(from) * 60000);
      const t = new Date(to.getTime() - madridOffsetMinutes(to) * 60000 + 86400000);
      return {
        fromISO: f.toISOString(),
        toISO: t.toISOString(),
        rangeLabel: `${customFrom} → ${customTo} (Madrid)`,
      };
    }
    const days = window === '24h' ? 0 : window === '7d' ? 6 : 29;
    return {
      fromISO: madridDayStartISO(days),
      toISO: new Date(Date.now() + 60000).toISOString(),
      rangeLabel:
        window === '24h' ? 'Hoy (Madrid)' : window === '7d' ? 'Últimos 7 días' : 'Últimos 30 días',
    };
  }, [window, customFrom, customTo]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [leadRows, agentRes] = await Promise.all([
          fetchAllPaginated<MetricLead>((from, to) =>
            supabase
              .from('leads')
              .select(
                'id, nombre_completo, agente_asignado_id, created_at, reunion_datetime, hora_reunion_texto, stage',
              )
              .gte('created_at', fromISO)
              .lt('created_at', toISO)
              .order('created_at', { ascending: false })
              .range(from, to),
          ),
          supabase
            .from('profiles')
            .select('id, nombre, email')
            .eq('activo', true)
            .eq('role', 'agente')
            .order('nombre'),
        ]);
        if (agentRes.error) throw agentRes.error;
        if (cancelled) return;
        setLeads(leadRows);
        setAgents((agentRes.data ?? []) as AgentRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error al cargar métricas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fromISO, toISO, nonce]);

  const derived = useMemo(() => {
    const nameById = new Map<string, string>();
    agents.forEach((a) => nameById.set(a.id, a.nombre));
    leads.forEach((l) => {
      if (l.agente_asignado_id && !nameById.has(l.agente_asignado_id)) {
        nameById.set(l.agente_asignado_id, 'Agente inactivo');
      }
    });

    // 1) Conteo por agente
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      if (!l.agente_asignado_id) return;
      counts.set(l.agente_asignado_id, (counts.get(l.agente_asignado_id) ?? 0) + 1);
    });
    const assignedTotal = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    const denom = Math.max(agents.length, counts.size, 1);
    const average = assignedTotal / denom;
    const agentCounts: AgentCount[] = Array.from(
      new Set([...agents.map((a) => a.id), ...counts.keys()]),
    )
      .map((id) => {
        const count = counts.get(id) ?? 0;
        return {
          agentId: id,
          agentName: nameById.get(id) ?? 'Desconocido',
          count,
          deviationPct: average > 0 ? ((count - average) / average) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    const agentsWithoutLeads = agents.filter((a) => (counts.get(a.id) ?? 0) === 0);

    // 2) Colisiones (< 30 min entre reuniones del mismo agente)
    const byAgent = new Map<string, MetricLead[]>();
    leads.forEach((l) => {
      if (!l.agente_asignado_id || !l.reunion_datetime) return;
      const t = new Date(l.reunion_datetime).getTime();
      if (isNaN(t)) return;
      const arr = byAgent.get(l.agente_asignado_id) ?? [];
      arr.push(l);
      byAgent.set(l.agente_asignado_id, arr);
    });
    const collisions: Collision[] = [];
    byAgent.forEach((arr, agentId) => {
      const sorted = [...arr].sort(
        (a, b) => new Date(a.reunion_datetime!).getTime() - new Date(b.reunion_datetime!).getTime(),
      );
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        const diff =
          (new Date(cur.reunion_datetime!).getTime() - new Date(prev.reunion_datetime!).getTime()) /
          60000;
        if (diff < 30) {
          collisions.push({
            agentId,
            agentName: nameById.get(agentId) ?? 'Desconocido',
            leadA: prev,
            leadB: cur,
            diffMinutes: Math.round(diff),
          });
        }
      }
    });
    collisions.sort((a, b) => a.diffMinutes - b.diffMinutes);

    // 3) Fechas problemáticas
    const nowYear = new Date().getFullYear();
    const todayStart = new Date(madridDayStartISO(0)).getTime();
    const dateIssues: DateIssue[] = [];
    leads.forEach((l) => {
      const agentName = l.agente_asignado_id
        ? nameById.get(l.agente_asignado_id) ?? 'Desconocido'
        : 'Sin agente';
      if (!l.reunion_datetime) {
        if (l.hora_reunion_texto && l.hora_reunion_texto.trim()) {
          dateIssues.push({
            lead: l,
            agentName,
            type: 'sin_fecha',
            detail: 'Hay preferencia horaria pero no se guardó fecha de reunión',
          });
        }
        return;
      }
      const d = new Date(l.reunion_datetime);
      if (isNaN(d.getTime())) {
        dateIssues.push({ lead: l, agentName, type: 'anio_invalido', detail: 'Fecha inválida' });
        return;
      }
      const p = madridParts(l.reunion_datetime);
      if (p.year < nowYear || p.year > nowYear + 1) {
        dateIssues.push({
          lead: l,
          agentName,
          type: 'anio_invalido',
          detail: `Año fuera de rango: ${p.year}`,
        });
        return;
      }
      if (d.getTime() < new Date(l.created_at).getTime() || d.getTime() < todayStart) {
        dateIssues.push({
          lead: l,
          agentName,
          type: 'pasado',
          detail: 'La reunión está en el pasado',
        });
        return;
      }
      if (p.weekday.startsWith('sáb') || p.weekday.startsWith('sab') || p.weekday.startsWith('dom')) {
        dateIssues.push({
          lead: l,
          agentName,
          type: 'fin_de_semana',
          detail: 'Reunión en fin de semana',
        });
        return;
      }
      if (p.hour < 9 || p.hour >= 20) {
        dateIssues.push({
          lead: l,
          agentName,
          type: 'fuera_horario',
          detail: `Fuera del horario laboral (${String(p.hour).padStart(2, '0')}:${String(
            p.minute,
          ).padStart(2, '0')} Madrid)`,
        });
      }
    });

    return { agentCounts, average, agentsWithoutLeads, collisions, dateIssues };
  }, [leads, agents]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return {
    loading,
    error,
    leads,
    agents,
    rangeLabel,
    refetch,
    ...derived,
  };
}
