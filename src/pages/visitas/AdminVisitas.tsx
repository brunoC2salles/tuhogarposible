import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Download } from 'lucide-react';
import { useLeadVisits } from '@/hooks/useLeadVisits';
import { VisitFormModal } from '@/components/visits/VisitFormModal';
import { VisitsList } from '@/components/visits/VisitsList';
import { VisitStats } from '@/components/visits/VisitStats';
import { LeadVisit } from '@/types/visits';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentes } from '@/hooks/useAgentes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminVisitas = () => {
  const { isAdmin } = useAuth();
  const { visits, loading, createVisit, updateVisit, deleteVisit } = useLeadVisits({ scope: 'all' });
  const { agentes, loading: loadingAgentes } = useAgentes();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadVisit | null>(null);
  const [agenteId, setAgenteId] = useState<string>('all');

  const filteredVisits = useMemo(() => {
    if (agenteId === 'all') return visits;
    return visits.filter(v => v.agente_id === agenteId);
  }, [visits, agenteId]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (v: LeadVisit) => { setEditing(v); setModalOpen(true); };

  const weeklyChart = useMemo(() => {
    const map = new Map<string, { week: string; total: number; reservas: number }>();
    filteredVisits.forEach(v => {
      const w = startOfWeek(new Date(v.fecha_visita), { weekStartsOn: 1 });
      const key = format(w, 'yyyy-MM-dd');
      const label = format(w, "d MMM", { locale: es });
      const entry = map.get(key) || { week: label, total: 0, reservas: 0 };
      entry.total += 1;
      if (v.tiene_reserva) entry.reservas += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v);
  }, [filteredVisits]);

  const topAgents = useMemo(() => {
    const map = new Map<string, number>();
    filteredVisits.forEach(v => {
      if (v.agente_nombre) map.set(v.agente_nombre, (map.get(v.agente_nombre) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [filteredVisits]);

  const exportCSV = () => {
    const headers = ['Fecha', 'Lead', 'Agente', 'URLs', 'Reserva', 'URL reservada', 'Notas'];
    const rows = filteredVisits.map(v => [
      format(new Date(v.fecha_visita), 'yyyy-MM-dd HH:mm'),
      v.lead_nombre || '',
      v.agente_nombre || '',
      v.product_urls.join(' | '),
      v.tiene_reserva ? 'Sí' : 'No',
      v.reserva_url || '',
      (v.notas || '').replace(/\n/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Visitas de Leads</h1>
          <p className="text-sm text-muted-foreground">Tracking global de visitas y reservas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Registrar Visita
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar por agente:</span>
        <Select value={agenteId} onValueChange={setAgenteId} disabled={loadingAgentes}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Todos los agentes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los agentes</SelectItem>
            {agentes.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <VisitStats visits={filteredVisits} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Visitas por semana</CardTitle></CardHeader>
          <CardContent>
            {weeklyChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Visitas" />
                  <Bar dataKey="reservas" fill="hsl(142 76% 36%)" name="Reservas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top agentes</CardTitle></CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {topAgents.map((a, i) => (
                  <div key={a.name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{i + 1}. {a.name}</span>
                    <span className="font-semibold">{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Todas las visitas</CardTitle></CardHeader>
        <CardContent>
          <VisitsList
            visits={filteredVisits}
            loading={loading || loadingAgentes}
            onEdit={openEdit}
            onDelete={deleteVisit}
            showAgent
          />
        </CardContent>
      </Card>

      <VisitFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={editing ? (d) => updateVisit(editing.id, d) : createVisit}
        visit={editing}
      />
    </div>
  );
};

export default AdminVisitas;
