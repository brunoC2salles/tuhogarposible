import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLeads } from '@/hooks/useLeads';
import { useAgentes } from '@/hooks/useAgentes';
import { Users, TrendingUp, CheckCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AgentLeadsKanbanModal } from '@/components/crm/AgentLeadsKanbanModal';

const AdminCRM = () => {
  const { leads } = useLeads();
  const { agentes } = useAgentes();

  const [selectedAgent, setSelectedAgent] = useState<{ id: string; nombre: string } | null>(null);

  // OPTIMIZED: Memoize all metric calculations
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const totalLeads = leads.length;
    const leadsThisMonth = leads.filter(l => {
      const created = new Date(l.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    }).length;
    const leadsConvertidos = leads.filter(l => l.stage === 'subida_expediente_bancos').length;
    const tasaConversion = totalLeads > 0 ? ((leadsConvertidos / totalLeads) * 100).toFixed(1) : '0';
    
    return { totalLeads, leadsThisMonth, leadsConvertidos, tasaConversion };
  }, [leads]);

  // OPTIMIZED: Pre-index leads by agent for O(1) lookup
  const leadsByAgentId = useMemo(() => {
    const index = new Map<string, { total: number; active: number }>();
    leads.forEach(lead => {
      const agentId = lead.agente_asignado_id;
      if (agentId) {
        const current = index.get(agentId) || { total: 0, active: 0 };
        current.total += 1;
        if (lead.stage !== 'finalizada') {
          current.active += 1;
        }
        index.set(agentId, current);
      }
    });
    return index;
  }, [leads]);

  const leadsPorAgente = useMemo(() => 
    agentes.map(agente => ({
      ...agente,
      totalLeads: leadsByAgentId.get(agente.id)?.total || 0,
      leadsActivos: leadsByAgentId.get(agente.id)?.active || 0,
    })),
    [agentes, leadsByAgentId]
  );

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Dashboard CRM</h1>
          <p className="text-muted-foreground mt-1">Métricas y estadísticas de leads</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">{stats.leadsThisMonth} este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.leadsConvertidos}</div>
              <p className="text-xs text-muted-foreground">Llegaron a "Listo!"</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasaConversion}%</div>
              <p className="text-xs text-muted-foreground">De todos los leads</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leads por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadsPorAgente.map(agente => (
                <div 
                  key={agente.id} 
                  className="flex items-center justify-between border-b pb-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                  onClick={() => setSelectedAgent({ id: agente.id, nombre: agente.nombre })}
                >
                  <div>
                    <p className="font-medium">{agente.nombre}</p>
                    <p className="text-sm text-muted-foreground">{agente.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary hover:underline">
                      {agente.totalLeads} leads
                    </p>
                    <p className="text-sm text-muted-foreground">{agente.leadsActivos} activos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Leads Kanban Modal */}
      {selectedAgent && (
        <AgentLeadsKanbanModal
          open={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          agentId={selectedAgent.id}
          agentName={selectedAgent.nombre}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCRM;
