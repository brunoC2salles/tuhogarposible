import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeads } from '@/hooks/useLeads';
import { useAgentes } from '@/hooks/useAgentes';
import { Users, TrendingUp, CheckCircle, Download, Search, Kanban } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AgentLeadsKanbanModal } from '@/components/crm/AgentLeadsKanbanModal';
import { AgentStatsModal } from '@/components/crm/AgentStatsModal';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';
import { CreateEditLeadModal } from '@/components/crm/CreateEditLeadModal';
import { SimuladoresModal } from '@/components/crm/SimuladoresModal';

import { downloadCSV } from '@/lib/csvExporter';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Lead, LeadStage } from '@/types/crm';

type PeriodOption = '30' | '90' | 'all';

const STORAGE_KEY = 'admincrm.filters.v1';

const loadStoredFilters = (): { period: PeriodOption; includeDisqualified: boolean } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        period: (['30', '90', 'all'].includes(parsed.period) ? parsed.period : '30') as PeriodOption,
        includeDisqualified: !!parsed.includeDisqualified,
      };
    }
  } catch {}
  return { period: '30', includeDisqualified: false };
};

const AdminCRM = () => {
  // Filtros de carga (lidos do localStorage para persistir entre sessões)
  const initial = useMemo(() => loadStoredFilters(), []);
  const [period, setPeriod] = useState<PeriodOption>(initial.period);
  const [includeDisqualified, setIncludeDisqualified] = useState<boolean>(initial.includeDisqualified);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ period, includeDisqualified }));
    } catch {}
  }, [period, includeDisqualified]);

  const periodDays = period === 'all' ? null : Number(period);

  const { leads, updateLeadStage, updateLead, createLead, deleteLead } = useLeads({
    periodDays,
    includeDisqualified,
  });
  const { agentes } = useAgentes();

  const [selectedAgent, setSelectedAgent] = useState<{ id: string; nombre: string } | null>(null);
  const [agentStatsOpen, setAgentStatsOpen] = useState(false);

  // Kanban global state
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [simuladoresLead, setSimuladoresLead] = useState<Lead | null>(null);
  

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

  // Stats baseados nos leads carregados (respeitando os filtros atuais)
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

  // Pre-index leads by agent with period stats (usado no pop-up)
  const agentesWithStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
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
          : 0,
      };
    });
  }, [agentes, leads]);

  // Export agent statistics to CSV
  const handleExportStats = () => {
    if (agentesWithStats.length === 0) {
      toast.info('No hay agentes para exportar');
      return;
    }

    const headers = ['Agente', 'Email', 'Hoy', 'Semana', 'Mes', 'Total', 'Activos', 'Convertidos', 'Tasa Conversión (%)'];
    const rows = agentesWithStats.map(a => [
      a.nombre, a.email, a.today, a.thisWeek, a.thisMonth, a.total, a.active, a.converted, a.conversionRate.toFixed(1),
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
              <CardTitle className="text-sm font-medium">Leads cargados</CardTitle>
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
              <p className="text-xs text-muted-foreground">De los leads cargados</p>
            </CardContent>
          </Card>
        </div>

        {/* Global Kanban View — agora protagonista da página */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Kanban className="h-5 w-5" />
                  Vista Kanban — Leads
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setAgentStatsOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Ver leads por agente
                  </Button>
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
              </div>

              {/* Linha de filtros de carga */}
              <div className="flex items-center gap-4 flex-wrap pt-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Período:</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="90">Últimos 90 días</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="include-disq"
                    checked={includeDisqualified}
                    onCheckedChange={setIncludeDisqualified}
                  />
                  <Label htmlFor="include-disq" className="text-sm cursor-pointer">
                    Incluir descualificados
                  </Label>
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  Mostrando {leads.length} leads
                </span>
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

      {/* Pop-up: Leads por Agente */}
      <AgentStatsModal
        open={agentStatsOpen}
        onClose={() => setAgentStatsOpen(false)}
        agentes={agentesWithStats}
        onSelectAgent={(a) => setSelectedAgent(a)}
      />

      {/* Agent Leads Kanban Modal (drilldown) */}
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
    </AdminLayout>
  );
};

export default AdminCRM;
