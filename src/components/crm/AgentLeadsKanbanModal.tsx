import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LeadKanban } from './LeadKanban';
import { LeadDetailsModal } from './LeadDetailsModal';
import { CreateEditLeadModal } from './CreateEditLeadModal';
import { SimuladoresModal } from './SimuladoresModal';

import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage, LeadFormData } from '@/types/crm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, Users, Download, Ban, CalendarDays, CalendarRange, Calendar } from 'lucide-react';
import { exportLeadsToCSV, downloadCSV } from '@/lib/csvExporter';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';

interface AgentLeadsKanbanModalProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

export const AgentLeadsKanbanModal = ({ open, onClose, agentId, agentName }: AgentLeadsKanbanModalProps) => {
  const { leads, updateLead, deleteLead, fetchLeads } = useLeads();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [simuladoresLead, setSimuladoresLead] = useState<Lead | null>(null);
  const [recomendacionesLead, setRecomendacionesLead] = useState<Lead | null>(null);

  // Filter leads by agent and search query
  const agentLeads = useMemo(() => {
    const byAgent = leads.filter(lead => lead.agente_asignado_id === agentId);
    if (!searchQuery.trim()) return byAgent;
    return byAgent.filter(lead => 
      lead.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, agentId, searchQuery]);

  // Period statistics
  const periodStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const monthStart = startOfMonth(now);

    const byAgent = leads.filter(lead => lead.agente_asignado_id === agentId);

    return {
      today: byAgent.filter(l => new Date(l.created_at) >= todayStart).length,
      thisWeek: byAgent.filter(l => new Date(l.created_at) >= weekStart).length,
      thisMonth: byAgent.filter(l => new Date(l.created_at) >= monthStart).length,
      total: byAgent.length
    };
  }, [leads, agentId]);

  // Contadores
  const descualificadosCount = useMemo(() => 
    agentLeads.filter(lead => lead.stage === 'descualificados').length, 
    [agentLeads]
  );

  const cualificadosCount = useMemo(() => 
    agentLeads.filter(lead => lead.stage !== 'descualificados').length, 
    [agentLeads]
  );

  // Exportar leads descualificados
  const handleExportDescualificados = () => {
    const descualificados = agentLeads.filter(lead => lead.stage === 'descualificados');
    if (descualificados.length === 0) {
      toast.info('No hay leads descualificados para exportar');
      return;
    }
    const csv = exportLeadsToCSV(descualificados, {});
    downloadCSV(csv, `leads-descualificados-${agentName}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${descualificados.length} leads exportados`);
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      await updateLead(leadId, { stage: newStage });
    } catch (error) {
      toast.error('Error al cambiar etapa');
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setDetailsLead(lead);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
  };

  const handleDeleteClick = (leadId: string) => {
    setLeadToDelete(leadId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (leadToDelete) {
      try {
        await deleteLead(leadToDelete);
        toast.success('Lead eliminado');
      } catch (error) {
        toast.error('Error al eliminar lead');
      }
    }
    setDeleteDialogOpen(false);
    setLeadToDelete(null);
  };

  const handleSaveEdit = async (data: LeadFormData) => {
    if (!editingLead) return;
    try {
      await updateLead(editingLead.id, data);
      toast.success('Lead actualizado');
      fetchLeads();
    } catch (error) {
      toast.error('Error al actualizar lead');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Leads de {agentName}</DialogTitle>
          </DialogHeader>
          
          {/* Period Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Hoy</p>
                  <p className="text-xl font-bold">{periodStats.today}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-3 flex items-center gap-3">
                <CalendarRange className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Semana</p>
                  <p className="text-xl font-bold">{periodStats.thisWeek}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-3 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Mes</p>
                  <p className="text-xl font-bold">{periodStats.thisMonth}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3 flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{periodStats.total}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search bar and counters */}
          <div className="flex items-center justify-between gap-4 py-2 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">{cualificadosCount} Leads Activos</span>
                </div>
                {descualificadosCount > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    {descualificadosCount} Descualificados
                  </Badge>
                )}
              </div>
            </div>
            
            {descualificadosCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportDescualificados}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Descualificados
              </Button>
            )}
          </div>
          
          {/* FIXED: overflow-auto instead of overflow-hidden */}
          <div className="flex-1 overflow-auto">
            {agentLeads.length > 0 ? (
              <LeadKanban
                leads={agentLeads}
                onStageChange={handleStageChange}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onDisqualify={(leadId) => handleStageChange(leadId, 'descualificados')}
              />
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p>No se encontraron leads para "{searchQuery}"</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Este agente no tiene leads asignados
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El lead será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lead Details Modal */}
      <LeadDetailsModal
        open={!!detailsLead}
        onClose={() => setDetailsLead(null)}
        lead={detailsLead}
        onOpenSimulators={(lead) => {
          setDetailsLead(null);
          setSimuladoresLead(lead);
        }}
        onOpenRecomendaciones={(lead) => {
          setDetailsLead(null);
          setRecomendacionesLead(lead);
        }}
      />

      {/* Edit Lead Modal */}
      <CreateEditLeadModal
        open={!!editingLead}
        onClose={() => {
          setEditingLead(null);
          fetchLeads();
        }}
        onSave={handleSaveEdit}
        lead={editingLead}
      />

      {/* Simuladores Modal */}
      {simuladoresLead && (
        <SimuladoresModal
          open={!!simuladoresLead}
          onClose={() => setSimuladoresLead(null)}
          lead={simuladoresLead}
          onSave={() => {}}
        />
      )}

    </>
  );
};
