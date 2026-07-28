import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, TrendingUp } from 'lucide-react';
import { LeadVisit } from '@/types/visits';
import { startOfWeek, startOfMonth, isAfter } from 'date-fns';

interface Props {
  visits: LeadVisit[];
}

export const VisitStats = ({ visits }: Props) => {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const week = visits.filter(v => isAfter(new Date(v.fecha_visita), weekStart)).length;
    const month = visits.filter(v => isAfter(new Date(v.fecha_visita), monthStart)).length;
    const reservas = visits.filter(v => v.tiene_reserva).length;
    const conversion = visits.length > 0 ? Math.round((reservas / visits.length) * 100) : 0;
    return { week, month, reservas, conversion, total: visits.length };
  }, [visits]);

  const cards = [
    { label: 'Esta semana', value: stats.week, icon: CalendarDays },
    { label: 'Este mes', value: stats.month, icon: CalendarDays },
    { label: 'Total visitas', value: stats.total, icon: TrendingUp },
    { label: `Reservas (${stats.conversion}%)`, value: stats.reservas, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <c.icon className="h-4 w-4" />
              {c.label}
            </div>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
