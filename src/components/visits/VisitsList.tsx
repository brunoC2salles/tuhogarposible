import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, ExternalLink, CalendarDays, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LeadVisit } from '@/types/visits';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Props {
  visits: LeadVisit[];
  loading: boolean;
  onEdit: (v: LeadVisit) => void;
  onDelete: (id: string) => void;
  showAgent?: boolean;
  enableSearch?: boolean;
}

export const VisitsList = ({ visits, loading, onEdit, onDelete, showAgent = false, enableSearch = true }: Props) => {
  const [query, setQuery] = useState('');
  const [reservaFilter, setReservaFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return visits.filter(v => {
      if (reservaFilter === 'yes' && !v.tiene_reserva) return false;
      if (reservaFilter === 'no' && v.tiene_reserva) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (v.lead_nombre || '').toLowerCase().includes(q)
        || (v.agente_nombre || '').toLowerCase().includes(q)
        || v.product_urls.some(u => u.toLowerCase().includes(q));
    });
  }, [visits, query, reservaFilter]);

  return (
    <div className="space-y-4">
      {enableSearch && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead, agente o URL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'yes', 'no'] as const).map(f => (
              <Button key={f} variant={reservaFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setReservaFilter(f)}>
                {f === 'all' ? 'Todas' : f === 'yes' ? 'Con reserva' : 'Sin reserva'}
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando visitas...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
          <p className="text-muted-foreground">Sin visitas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <Card key={v.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{v.lead_nombre || 'Lead'}</span>
                      {showAgent && v.agente_nombre && (
                        <Badge variant="outline" className="text-xs">{v.agente_nombre}</Badge>
                      )}
                      {v.tiene_reserva ? (
                        <Badge className="bg-green-600">Reserva</Badge>
                      ) : (
                        <Badge variant="secondary">Sin reserva</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(v.fecha_visita), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
                    </p>
                    <div className="space-y-1">
                      {v.product_urls.map((u, i) => (
                        <a
                          key={i}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-xs hover:underline truncate ${v.reserva_url === u ? 'text-green-700 font-medium' : 'text-primary'}`}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{u}</span>
                          {v.reserva_url === u && <Badge variant="outline" className="text-[10px] h-4">reservado</Badge>}
                        </a>
                      ))}
                    </div>
                    {v.notas && <p className="text-sm text-muted-foreground italic">{v.notas}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar visita?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDelete) { onDelete(confirmDelete); setConfirmDelete(null); } }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
