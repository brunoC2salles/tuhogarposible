import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STAGE_LABELS, LeadStage } from '@/types/crm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CalendarCheck, CalendarX, History } from 'lucide-react';

// Historial del lead (21/10/2026): cambios de etapa y marcas de visita agendada (tabla lead_historico).
interface HistorialItem {
  id: string;
  stage_anterior: LeadStage | null;
  stage_nuevo: LeadStage;
  changed_by: string;
  notas: string | null;
  created_at: string;
}

interface Props {
  leadId: string;
  /** Cambia cuando el lead se actualiza, para recargar el historial */
  refreshKey?: string;
}

const etapa = (s: LeadStage | null) => (s ? STAGE_LABELS[s] || s : '-');

export const LeadHistorial = ({ leadId, refreshKey }: Props) => {
  const [items, setItems] = useState<HistorialItem[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_historico')
        .select('id, stage_anterior, stage_nuevo, changed_by, notas, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (!activo) return;
      if (error) {
        console.error('[LeadHistorial] error:', error);
        setItems([]);
        setLoading(false);
        return;
      }
      const rows = (data || []) as HistorialItem[];
      setItems(rows);
      const ids = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean)));
      if (ids.length) {
        const { data: perfiles } = await supabase.from('profiles').select('id, nombre').in('id', ids);
        if (activo) {
          setNombres(Object.fromEntries((perfiles || []).map((p: any) => [p.id, p.nombre || ''])));
        }
      }
      if (activo) setLoading(false);
    })();
    return () => { activo = false; };
  }, [leadId, refreshKey]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-6">Cargando historial...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Sin movimientos registrados</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const esVisita = !!it.notas && it.notas.startsWith('Visita agendada');
        const marcada = it.notas === 'Visita agendada marcada';
        const Icono = esVisita ? (marcada ? CalendarCheck : CalendarX) : ArrowRight;
        return (
          <li key={it.id} className="flex items-start gap-3 rounded-lg border p-3">
            <span
              className={
                'mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ' +
                (esVisita && marcada ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')
              }
            >
              <Icono className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {esVisita
                  ? it.notas
                  : it.stage_anterior === it.stage_nuevo
                    ? etapa(it.stage_nuevo)
                    : `${etapa(it.stage_anterior)} → ${etapa(it.stage_nuevo)}`}
              </p>
              {!esVisita && it.notas && <p className="text-xs text-muted-foreground">{it.notas}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(it.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                {nombres[it.changed_by] ? ` · ${nombres[it.changed_by]}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
