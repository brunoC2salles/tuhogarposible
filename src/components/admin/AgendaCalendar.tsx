import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Mail, Phone } from 'lucide-react';

const MADRID_TZ = 'Europe/Madrid';

/** YYYY-MM-DD en hora de Madrid */
const ymdFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: MADRID_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
/** HH:mm en hora de Madrid */
const hmFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: MADRID_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const longFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: MADRID_TZ,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function madridOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(date.toLocaleString('en-US', { timeZone: MADRID_TZ }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

/** Instante UTC correspondiente a las 00:00 de Madrid del día YYYY-MM-DD */
function madridMidnightUTC(ymd: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  return new Date(guess.getTime() - madridOffsetMinutes(guess) * 60000);
}

function ymdToParts(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d };
}

/** Suma días a un YYYY-MM-DD sin problemas de DST (usa mediodía UTC) */
function addDays(ymd: string, days: number): string {
  const { y, m, d } = ymdToParts(ymd);
  const base = Date.UTC(y, m - 1, d, 12);
  const next = new Date(base + days * 86400000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate(),
  ).padStart(2, '0')}`;
}

/** 0 = lunes ... 6 = domingo */
function weekdayIndex(ymd: string): number {
  const { y, m, d } = ymdToParts(ymd);
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7;
}

function todayMadrid(): string {
  return ymdFmt.format(new Date());
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface AgendaLead {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  email: string | null;
  stage: string;
  reunion_datetime: string;
  hora_reunion_texto: string | null;
  agente_asignado_id: string | null;
  ciudad_interes: string | null;
  zona_interes: string | null;
  valor_inmueble_deseado: number | null;
}

interface AgentOption {
  id: string;
  nombre: string;
}

type ViewMode = 'semana' | 'mes';

export function AgendaCalendar() {
  const [view, setView] = useState<ViewMode>('semana');
  const [anchor, setAnchor] = useState<string>(() => todayMadrid());
  const [agentFilter, setAgentFilter] = useState<string>('todos');
  const [leads, setLeads] = useState<AgendaLead[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgendaLead | null>(null);

  // Rejilla de días visibles
  const { days, rangeLabel, monthOfGrid } = useMemo(() => {
    if (view === 'semana') {
      const start = addDays(anchor, -weekdayIndex(anchor));
      const list = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      const a = ymdToParts(list[0]);
      const b = ymdToParts(list[6]);
      const label =
        a.m === b.m
          ? `${a.d}–${b.d} de ${MONTHS[b.m - 1]} ${b.y}`
          : `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
      return { days: list, rangeLabel: label, monthOfGrid: null as number | null };
    }
    const { y, m } = ymdToParts(anchor);
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    const gridStart = addDays(first, -weekdayIndex(first));
    const list = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return { days: list, rangeLabel: `${MONTHS[m - 1]} ${y}`, monthOfGrid: m };
  }, [view, anchor]);

  const fromISO = useMemo(() => madridMidnightUTC(days[0]).toISOString(), [days]);
  const toISO = useMemo(
    () => madridMidnightUTC(addDays(days[days.length - 1], 1)).toISOString(),
    [days],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rows, agentRes] = await Promise.all([
          fetchAllPaginated<AgendaLead>((from, to) =>
            supabase
              .from('leads')
              .select(
                'id, nombre_completo, telefono, email, stage, reunion_datetime, hora_reunion_texto, agente_asignado_id, ciudad_interes, zona_interes, valor_inmueble_deseado',
              )
              .not('reunion_datetime', 'is', null)
              .gte('reunion_datetime', fromISO)
              .lt('reunion_datetime', toISO)
              .order('reunion_datetime', { ascending: true })
              .range(from, to),
          ),
          supabase.from('profiles').select('id, nombre').order('nombre'),
        ]);
        if (cancelled) return;
        if (agentRes.error) throw agentRes.error;
        setLeads(rows);
        setAgents((agentRes.data ?? []) as AgentOption[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error al cargar la agenda');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fromISO, toISO]);

  const agentName = useCallback(
    (id: string | null) => (id ? agents.find((a) => a.id === id)?.nombre ?? 'Agente desconocido' : 'Sin agente'),
    [agents],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaLead[]>();
    leads
      .filter((l) => agentFilter === 'todos' || l.agente_asignado_id === agentFilter)
      .forEach((l) => {
        const key = ymdFmt.format(new Date(l.reunion_datetime));
        const arr = map.get(key) ?? [];
        arr.push(l);
        map.set(key, arr);
      });
    map.forEach((arr) =>
      arr.sort(
        (a, b) => new Date(a.reunion_datetime).getTime() - new Date(b.reunion_datetime).getTime(),
      ),
    );
    return map;
  }, [leads, agentFilter]);

  const total = useMemo(
    () => Array.from(byDay.values()).reduce((s, a) => s + a.length, 0),
    [byDay],
  );

  const shift = (dir: number) => {
    if (view === 'semana') {
      setAnchor((a) => addDays(a, dir * 7));
    } else {
      const { y, m } = ymdToParts(anchor);
      const nm = m - 1 + dir;
      const ny = y + Math.floor(nm / 12);
      const mm = ((nm % 12) + 12) % 12;
      setAnchor(`${ny}-${String(mm + 1).padStart(2, '0')}-01`);
    }
  };

  const today = todayMadrid();

  const renderEvent = (l: AgendaLead) => (
    <button
      key={l.id}
      onClick={() => setSelected(l)}
      className="w-full text-left rounded-md border border-border bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1"
    >
      <span className="block text-[11px] font-semibold text-primary">
        {hmFmt.format(new Date(l.reunion_datetime))}
      </span>
      <span className="block text-xs font-medium truncate">{l.nombre_completo}</span>
      <span className="block text-[11px] text-muted-foreground truncate">
        {agentName(l.agente_asignado_id)}
      </span>
    </button>
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Agenda de reuniones
            </CardTitle>
            <CardDescription>
              Reuniones programadas en hora de Madrid. Haz clic en una cita para ver el lead y el
              agente asignado.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            {total} reunion{total === 1 ? '' : 'es'}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(todayMadrid())}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize ml-1">{rangeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos los agentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los agentes</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mes</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-semibold text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((ymd) => {
                  const events = byDay.get(ymd) ?? [];
                  const isToday = ymd === today;
                  const outside = monthOfGrid !== null && ymdToParts(ymd).m !== monthOfGrid;
                  return (
                    <div
                      key={ymd}
                      className={`rounded-lg border p-1.5 space-y-1 ${
                        view === 'semana' ? 'min-h-[220px]' : 'min-h-[120px]'
                      } ${isToday ? 'border-primary bg-primary/5' : 'border-border'} ${
                        outside ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            isToday ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {ymdToParts(ymd).d}
                        </span>
                        {events.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">{events.length}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {(view === 'semana' ? events : events.slice(0, 3)).map(renderEvent)}
                        {view === 'mes' && events.length > 3 && (
                          <button
                            onClick={() => {
                              setView('semana');
                              setAnchor(ymd);
                            }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            +{events.length - 3} más
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.nombre_completo}</DialogTitle>
                <DialogDescription className="capitalize">
                  {longFmt.format(new Date(selected.reunion_datetime))} (Madrid)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{agentName(selected.agente_asignado_id)}</span>
                </div>
                {selected.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selected.telefono}`} className="hover:underline">
                      {selected.telefono}
                    </a>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selected.email}`} className="hover:underline break-all">
                      {selected.email}
                    </a>
                  </div>
                )}
                {selected.hora_reunion_texto && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">
                      Preferencia original: {selected.hora_reunion_texto}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{selected.stage}</Badge>
                  {(selected.ciudad_interes || selected.zona_interes) && (
                    <Badge variant="secondary">
                      {selected.ciudad_interes ?? selected.zona_interes}
                    </Badge>
                  )}
                  {selected.valor_inmueble_deseado != null && (
                    <Badge variant="secondary">
                      {selected.valor_inmueble_deseado.toLocaleString('es-ES')} €
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
