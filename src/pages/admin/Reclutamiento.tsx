import { useState } from 'react';
import { useAgentCandidates } from '@/hooks/useAgentCandidates';
import { AgentCandidateKanban } from '@/components/reclutamiento/AgentCandidateKanban';
import { CreateEditCandidateModal } from '@/components/reclutamiento/CreateEditCandidateModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AgentCandidate } from '@/types/reclutamiento';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Reclutamiento = () => {
  const { candidates, loading, updateCandidateStage, deleteCandidate } = useAgentCandidates();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AgentCandidate | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);

  const handleEdit = (candidate: AgentCandidate) => {
    setSelectedCandidate(candidate);
    setModalOpen(true);
  };

  const handleDelete = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (candidateToDelete) {
      await deleteCandidate(candidateToDelete);
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedCandidate(undefined);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Reclutamiento de Agentes</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de candidatos a agentes
          </p>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold">
              Total de Candidatos: {candidates.length}
            </h2>
            <p className="text-sm text-muted-foreground">
              Arrastra los candidatos entre las columnas para cambiar su etapa
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Candidato
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando candidatos...</p>
          </div>
        ) : (
          <AgentCandidateKanban
            candidates={candidates}
            onStageChange={updateCandidateStage}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <CreateEditCandidateModal
        open={modalOpen}
        onClose={handleModalClose}
        candidate={selectedCandidate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar candidato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el candidato
              y todos sus documentos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Reclutamiento;
