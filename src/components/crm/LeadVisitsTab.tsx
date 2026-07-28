import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLeadVisits } from '@/hooks/useLeadVisits';
import { VisitFormModal } from '@/components/visits/VisitFormModal';
import { VisitsList } from '@/components/visits/VisitsList';
import { LeadVisit } from '@/types/visits';

interface Props {
  leadId: string;
  leadNombre: string;
}

export const LeadVisitsTab = ({ leadId, leadNombre }: Props) => {
  const { visits, loading, createVisit, updateVisit, deleteVisit } = useLeadVisits({ leadId });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadVisit | null>(null);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (v: LeadVisit) => { setEditing(v); setModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Registrar Visita
        </Button>
      </div>
      <VisitsList
        visits={visits}
        loading={loading}
        onEdit={openEdit}
        onDelete={deleteVisit}
        showAgent
        enableSearch={false}
      />
      <VisitFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={editing ? (d) => updateVisit(editing.id, d) : createVisit}
        visit={editing}
        presetLeadId={editing ? undefined : leadId}
        presetLeadName={editing ? undefined : leadNombre}
      />
    </div>
  );
};
