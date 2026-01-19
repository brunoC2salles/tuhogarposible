import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LeadKanban } from './LeadKanban';
import { LeadDetailsModal } from './LeadDetailsModal';
import { CreateEditLeadModal } from './CreateEditLeadModal';
import { SimuladoresModal } from './SimuladoresModal';
import { RecomendacionesModal } from './RecomendacionesModal';
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage, LeadFormData } from '@/types/crm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, Users } from 'lucide-react';

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
        <DialogContent className="max-w-[95vw] w-full h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Leads de {agentName}</DialogTitle>
          </DialogHeader>
          
          {/* Search bar */}
          <div className="flex items-center gap-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{agentLeads.length} Leads</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {agentLeads.length > 0 ? (
              <LeadKanban
                leads={agentLeads}
                onStageChange={handleStageChange}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
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

      {/* Recomendaciones Modal */}
      {recomendacionesLead && (
        <RecomendacionesModal
          open={!!recomendacionesLead}
          onClose={() => setRecomendacionesLead(null)}
          lead={recomendacionesLead}
        />
      )}
    </>
  );
};
