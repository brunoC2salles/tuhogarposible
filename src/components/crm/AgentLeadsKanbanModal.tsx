import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LeadKanban } from './LeadKanban';
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage } from '@/types/crm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface AgentLeadsKanbanModalProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

export const AgentLeadsKanbanModal = ({ open, onClose, agentId, agentName }: AgentLeadsKanbanModalProps) => {
  const { leads, updateLead, deleteLead } = useLeads();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Filter leads by agent
  const agentLeads = leads.filter(lead => lead.agente_asignado_id === agentId);

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      await updateLead(leadId, { stage: newStage });
    } catch (error) {
      toast.error('Error al cambiar etapa');
    }
  };

  const handleViewDetails = (lead: Lead) => {
    // Open in new tab or just show toast - simplified for modal context
    toast.info(`Ver detalles de ${lead.nombre_completo}`);
  };

  const handleEdit = (lead: Lead) => {
    toast.info(`Editar ${lead.nombre_completo}`);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-full h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Leads de {agentName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {agentLeads.length > 0 ? (
              <LeadKanban
                leads={agentLeads}
                onStageChange={handleStageChange}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
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
    </>
  );
};
