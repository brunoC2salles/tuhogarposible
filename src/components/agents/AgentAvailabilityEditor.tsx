import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, Copy } from 'lucide-react';
import { toast } from 'sonner';

export interface AvailabilitySlot {
  id?: string;
  weekday: number; // 0=Mon .. 6=Sun
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
}

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function normalizeTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

interface Props {
  agentId: string;
  className?: string;
}

export function AgentAvailabilityEditor({ agentId, className }: Props) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_availability')
      .select('id, weekday, start_time, end_time')
      .eq('agent_id', agentId)
      .order('weekday')
      .order('start_time');
    if (error) {
      toast.error('Error al cargar disponibilidad');
    } else {
      setSlots(
        (data || []).map((s: any) => ({
          id: s.id,
          weekday: s.weekday,
          start_time: normalizeTime(s.start_time),
          end_time: normalizeTime(s.end_time),
        })),
      );
    }
    setLoading(false);
  };

  const addSlot = (weekday: number) => {
    setSlots((prev) => [...prev, { weekday, start_time: '09:00', end_time: '18:00' }]);
  };

  const updateSlot = (idx: number, patch: Partial<AvailabilitySlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const copyToAllWeekdays = (weekday: number) => {
    const source = slots.filter((s) => s.weekday === weekday);
    if (source.length === 0) {
      toast.error('No hay franjas para copiar');
      return;
    }
    setSlots((prev) => {
      const others = prev.filter((s) => s.weekday === weekday);
      const rest: AvailabilitySlot[] = [];
      for (let d = 0; d < 7; d++) {
        if (d === weekday) continue;
        source.forEach((s) => rest.push({ weekday: d, start_time: s.start_time, end_time: s.end_time }));
      }
      return [...others, ...rest];
    });
    toast.success('Franjas copiadas a todos los días');
  };

  const handleSave = async () => {
    // Validate
    for (const s of slots) {
      if (s.end_time <= s.start_time) {
        toast.error(`${WEEKDAY_LABELS[s.weekday]}: la hora de fin debe ser mayor que la de inicio`);
        return;
      }
    }

    setSaving(true);
    try {
      // Replace strategy: delete existing, insert new
      const { error: delErr } = await supabase.from('agent_availability').delete().eq('agent_id', agentId);
      if (delErr) throw delErr;

      if (slots.length > 0) {
        const { error: insErr } = await supabase.from('agent_availability').insert(
          slots.map((s) => ({
            agent_id: agentId,
            weekday: s.weekday,
            start_time: s.start_time + ':00',
            end_time: s.end_time + ':00',
          })),
        );
        if (insErr) throw insErr;
      }

      toast.success('Disponibilidad guardada');
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando disponibilidad...</p>;

  return (
    <div className={className}>
      <div className="space-y-3">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const daySlots = slots
            .map((s, idx) => ({ s, idx }))
            .filter(({ s }) => s.weekday === weekday);

          return (
            <Card key={weekday} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">{label}</Label>
                <div className="flex gap-2">
                  {daySlots.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => copyToAllWeekdays(weekday)}>
                      <Copy className="h-3 w-3 mr-1" /> Aplicar a todos
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={() => addSlot(weekday)}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir franja
                  </Button>
                </div>
              </div>

              {daySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin disponibilidad</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map(({ s, idx }) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={s.start_time}
                        onChange={(e) => updateSlot(idx, { start_time: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={s.end_time}
                        onChange={(e) => updateSlot(idx, { end_time: e.target.value })}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSlot(idx)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-4 w-full">
        {saving ? 'Guardando...' : 'Guardar Disponibilidad'}
      </Button>
    </div>
  );
}
