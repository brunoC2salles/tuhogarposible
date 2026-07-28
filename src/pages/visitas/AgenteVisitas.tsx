import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, CalendarDays } from 'lucide-react';
import { useLeadVisits } from '@/hooks/useLeadVisits';
import { VisitFormModal } from '@/components/visits/VisitFormModal';
import { VisitsList } from '@/components/visits/VisitsList';
import { VisitStats } from '@/components/visits/VisitStats';
import { LeadVisit } from '@/types/visits';

const AgenteVisitas = () => {
  const navigate = useNavigate();
  const { visits, loading, createVisit, updateVisit, deleteVisit } = useLeadVisits({ scope: 'mine' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadVisit | null>(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (v: LeadVisit) => { setEditing(v); setModalOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventario/agente/crm')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Visitas
              </h1>
              <p className="text-xs text-muted-foreground">Registro de visitas a productos</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Registrar Visita
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <VisitStats visits={visits} />
        <VisitsList
          visits={visits}
          loading={loading}
          onEdit={openEdit}
          onDelete={deleteVisit}
        />
      </main>

      <VisitFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={editing ? (d) => updateVisit(editing.id, d) : createVisit}
        visit={editing}
      />
    </div>
  );
};

export default AgenteVisitas;
