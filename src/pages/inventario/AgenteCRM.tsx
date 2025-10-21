import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { CreateEditLeadModal } from '@/components/crm/CreateEditLeadModal';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';
import { RecomendacionesModal } from '@/components/crm/RecomendacionesModal';
import { SimuladoresModal } from '@/components/crm/SimuladoresModal';
import { Lead } from '@/types/crm';
import { Plus, ArrowLeft, Users, Building, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const AgenteCRM = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { leads, loading, updateLeadStage, updateLead, createLead, deleteLead } = useLeads();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [recomendacionesLead, setRecomendacionesLead] = useState<Lead | null>(null);
  const [simuladoresLead, setSimuladoresLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  const handleCreateLead = async (data: any) => {
    await createLead(data);
    setCreateModalOpen(false);
  };

  const handleUpdateLead = async (data: any) => {
    if (!editingLead) return;
    await updateLead(editingLead.id, data);
    setEditingLead(null);
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    const success = await deleteLead(deleteLeadId);
    if (success) {
      setDeleteLeadId(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/inventario/agente')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">CRM - Gestión de Leads</h1>
                <p className="text-sm text-muted-foreground">Agente: {profile?.nombre}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/inventario/agente')}>
                <Building className="h-4 w-4 mr-2" />
                Inventario
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="text-lg font-semibold">{leads.length} Leads</span>
            </div>
          </div>

          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo Lead
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Cargando leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No tienes leads aún</h3>
            <p className="text-muted-foreground mb-4">Crea tu primer lead para comenzar</p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Lead
            </Button>
          </div>
        ) : (
          <LeadKanban
            leads={leads}
            onStageChange={updateLeadStage}
            onViewDetails={setDetailsLead}
            onEdit={setEditingLead}
            onDelete={setDeleteLeadId}
          />
        )}
      </main>

      <CreateEditLeadModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateLead}
      />

      <CreateEditLeadModal
        open={!!editingLead}
        onClose={() => setEditingLead(null)}
        onSave={handleUpdateLead}
        lead={editingLead}
      />

      <LeadDetailsModal
        open={!!detailsLead}
        onClose={() => setDetailsLead(null)}
        lead={detailsLead}
        onOpenSimulators={setSimuladoresLead}
        onOpenRecomendaciones={setRecomendacionesLead}
      />

      <RecomendacionesModal
        open={!!recomendacionesLead}
        onClose={() => setRecomendacionesLead(null)}
        lead={recomendacionesLead}
      />

      <SimuladoresModal
        open={!!simuladoresLead}
        onClose={() => setSimuladoresLead(null)}
        lead={simuladoresLead}
        onSave={updateLead}
      />

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El lead y todo su historial serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgenteCRM;
