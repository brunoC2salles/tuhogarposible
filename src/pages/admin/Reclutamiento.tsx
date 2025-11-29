import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentCandidates } from '@/hooks/useAgentCandidates';
import { AgentCandidateKanban } from '@/components/reclutamiento/AgentCandidateKanban';
import { CreateEditCandidateModal } from '@/components/reclutamiento/CreateEditCandidateModal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Plus, Users, Bell, Settings, LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AgentCandidate } from '@/types/reclutamiento';
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
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { candidates, loading, updateCandidateStage, deleteCandidate } = useAgentCandidates();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AgentCandidate | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold">Reclutamiento de Agentes</h1>
                <p className="text-sm text-muted-foreground">
                  Gestión de candidatos a agentes
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/crm')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al CRM
              </Button>

              <NotificationBell />

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Configuración</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/agentes')}
              >
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Agentes</span>
              </Button>

              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {profile?.nombre?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{profile?.nombre}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
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
      </main>

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
  );
};

export default Reclutamiento;
