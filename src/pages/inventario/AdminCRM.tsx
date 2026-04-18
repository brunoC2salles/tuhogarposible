import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLeads } from '@/hooks/useLeads';
import { useAgentes } from '@/hooks/useAgentes';
import { Users, TrendingUp, CheckCircle, Download, CalendarDays, CalendarRange, Calendar, Search, Kanban } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AgentLeadsKanbanModal } from '@/components/crm/AgentLeadsKanbanModal';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';
import { CreateEditLeadModal } from '@/components/crm/CreateEditLeadModal';
import { SimuladoresModal } from '@/components/crm/SimuladoresModal';
import { RecomendacionesModal } from '@/components/crm/RecomendacionesModal';
import { downloadCSV } from '@/lib/csvExporter';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Lead, LeadStage } from '@/types/crm';

const AdminCRM = () => {
  const { leads, updateLeadStage, updateLead, createLead, deleteLead } = useLeads();
  const { agentes } = useAgentes();

  const [selectedAgent, setSelectedAgent] = useState<{ id: string; nombre: string } | null>(null);

  // Kanban global state
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [simuladoresLead, setSimuladoresLead] = useState<Lead | null>(null);
  const [recomendacionesLead, setRecomendacionesLead] = useState<Lead | null>(null);

  // Filtered leads for Kanban
  const filteredLeadsKanban = useMemo(() => {
    if (!kanbanSearch.trim()) return leads;
    return leads.filter(lead =>
      lead.nombre_completo.toLowerCase().includes(kanbanSearch.toLowerCase())
    );
  }, [leads, kanbanSearch]);

  // Kanban handlers
  const handleKanbanStageChange = (leadId: string, newStage: LeadStage) => {
    updateLeadStage(leadId, newStage);
  };

  const handleKanbanDelete = async (leadId: string) => {
    await deleteLead(leadId);
  };

  const handleKanbanDisqualify = (leadId: string) => {
    updateLeadStage(leadId, 'descualificados');
  };

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

  // OPTIMIZED: Pre-index leads by agent with period stats
  const agentesWithStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const monthStart = startOfMonth(now);

    return agentes.map(agente => {
      const agentLeads = leads.filter(l => l.agente_asignado_id === agente.id);
      const activeLeads = agentLeads.filter(l => 
        l.stage !== 'subida_expediente_bancos' && l.stage !== 'descualificados'
      );
      const convertedLeads = agentLeads.filter(l => l.stage === 'subida_expediente_bancos');

      return {
        ...agente,
        today: agentLeads.filter(l => new Date(l.created_at) >= todayStart).length,
        thisWeek: agentLeads.filter(l => new Date(l.created_at) >= weekStart).length,
        thisMonth: agentLeads.filter(l => new Date(l.created_at) >= monthStart).length,
        total: agentLeads.length,
        active: activeLeads.length,
        converted: convertedLeads.length,
        conversionRate: agentLeads.length > 0 
          ? (convertedLeads.length / agentLeads.length) * 100 
          : 0
      };
    });
  }, [agentes, leads]);

  // Export agent statistics to CSV
  const handleExportStats = () => {
    if (agentesWithStats.length === 0) {
      toast.info('No hay agentes para exportar');
      return;
    }

    const headers = [
      'Agente',
      'Email',
      'Hoy',
      'Semana',
      'Mes',
      'Total',
      'Activos',
      'Convertidos',
      'Tasa Conversión (%)'
    ];

    const rows = agentesWithStats.map(a => [
      a.nombre,
      a.email,
      a.today,
      a.thisWeek,
      a.thisMonth,
      a.total,
      a.active,
      a.converted,
      a.conversionRate.toFixed(1)
    ]);

    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    downloadCSV(csv, `estadisticas-agentes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success(`Estadísticas de ${agentesWithStats.length} agentes exportadas`);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard CRM</h1>
            <p className="text-muted-foreground mt-1">Métricas y estadísticas de leads</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportStats}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Estadísticas
            </Button>
          </div>
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
              <p className="text-xs text-muted-foreground">En "Subida a Bancos"</p>
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

        {/* Agent Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leads por Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agente</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        Hoy
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CalendarRange className="h-4 w-4" />
                        Semana
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Mes
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Activos</TableHead>
                    <TableHead className="text-center">Conversión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentesWithStats.map(agente => (
                    <TableRow 
                      key={agente.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAgent({ id: agente.id, nombre: agente.nombre })}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{agente.nombre}</p>
                          <p className="text-sm text-muted-foreground">{agente.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-primary">{agente.today}</span>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className="font-medium text-foreground">{agente.thisWeek}</span>
                       </TableCell>
                       <TableCell className="text-center">
                         <span className="font-medium text-foreground">{agente.thisMonth}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">{agente.total}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{agente.active}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={agente.conversionRate > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {agente.conversionRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {agentesWithStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No hay agentes registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Global Kanban View */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Kanban className="h-5 w-5" />
                Vista Kanban — Todos los Leads
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lead..."
                  value={kanbanSearch}
                  onChange={e => setKanbanSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <LeadKanban
              leads={filteredLeadsKanban}
              onStageChange={handleKanbanStageChange}
              onViewDetails={lead => setDetailsLead(lead)}
              onEdit={lead => setEditingLead(lead)}
              onDelete={handleKanbanDelete}
              onDisqualify={handleKanbanDisqualify}
            />
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

      {/* Lead management modals */}
      {detailsLead && (
        <LeadDetailsModal
          lead={detailsLead}
          open={!!detailsLead}
          onClose={() => setDetailsLead(null)}
          onOpenSimulators={lead => { setDetailsLead(null); setSimuladoresLead(lead); }}
          onOpenRecomendaciones={lead => { setDetailsLead(null); setRecomendacionesLead(lead); }}
        />
      )}

      <CreateEditLeadModal
        open={editingLead !== null}
        onClose={() => setEditingLead(null)}
        lead={editingLead}
        onSave={async (data) => {
          if (editingLead) {
            await updateLead(editingLead.id, data);
          } else {
            await createLead(data);
          }
          setEditingLead(null);
        }}
      />

      {simuladoresLead && (
        <SimuladoresModal
          lead={simuladoresLead}
          open={!!simuladoresLead}
          onClose={() => setSimuladoresLead(null)}
          onSave={async (leadId, updates) => { await updateLead(leadId, updates); }}
        />
      )}

      {recomendacionesLead && (
        <RecomendacionesModal
          lead={recomendacionesLead}
          open={!!recomendacionesLead}
          onClose={() => setRecomendacionesLead(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCRM;
