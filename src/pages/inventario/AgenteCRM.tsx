import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Download, Ban } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { CreateEditLeadModal } from '@/components/crm/CreateEditLeadModal';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';

import { SimuladoresModal } from '@/components/crm/SimuladoresModal';
import { Lead } from '@/types/crm';
import { Plus, ArrowLeft, Users } from 'lucide-react';
import Logo from '@/components/Logo';
import AuthButton from '@/components/AuthButton';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { exportLeadsToCSV, downloadCSV } from '@/lib/csvExporter';
import { Badge } from '@/components/ui/badge';
import StandaloneDocsButton from '@/components/crm/StandaloneDocsButton';
import { CallTimeFilter, matchesCallTime, tieneVivienda } from '@/lib/leadFilters';
import { esZonaCastellon } from '@/lib/castellon';

interface AgenteCRMProps {
  /** 'castellon' limita el kanban a leads de la provincia de Castellón */
  scope?: 'all' | 'castellon';
  title?: string;
}

const AgenteCRM = ({ scope = 'all', title }: AgenteCRMProps = {}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { leads: allLeads, loading, updateLeadStage, updateLead, createLead, deleteLead } = useLeads();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  
  const [simuladoresLead, setSimuladoresLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [callTimeFilter, setCallTimeFilter] = useState<CallTimeFilter | null>(null);
  const [viviendaFilter, setViviendaFilter] = useState(false);

  // Leads del ámbito de esta vista
  const leads = useMemo(() => {
    if (scope === 'castellon') {
      return allLeads.filter(lead => esZonaCastellon(lead.zona_interes, lead.ciudad_interes));
    }
    return allLeads;
  }, [allLeads, scope]);

  // Filtrar leads por nombre, horario de llamada y vivienda
  const filteredLeads = useMemo(() => {
    let result = leads;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const digits = q.replace(/\D/g, '');
      result = result.filter(lead =>
        lead.nombre_completo.toLowerCase().includes(q) ||
        (digits.length > 0 && (lead.telefono || '').replace(/\D/g, '').includes(digits))
      );
    }
    if (callTimeFilter) {
      result = result.filter(lead => matchesCallTime(lead, callTimeFilter));
    }
    if (viviendaFilter) {
      result = result.filter(lead => tieneVivienda(lead));
    }
    return result;
  }, [leads, searchQuery, callTimeFilter, viviendaFilter]);

  // Contadores
  const descualificadosCount = useMemo(() => 
    leads.filter(lead => lead.stage === 'descualificados').length, 
    [leads]
  );

  const cualificadosCount = useMemo(() => 
    leads.filter(lead => lead.stage !== 'descualificados').length, 
    [leads]
  );

  // Exportar leads descualificados
  const handleExportDescualificados = () => {
    const descualificados = leads.filter(lead => lead.stage === 'descualificados');
    if (descualificados.length === 0) {
      toast.info('No hay leads descualificados para exportar');
      return;
    }
    const csv = exportLeadsToCSV(descualificados, {});
    downloadCSV(csv, `leads-descualificados-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${descualificados.length} leads exportados`);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Logo size="sm" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  {title || 'CRM - Gestión de Leads'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Agente: {profile?.nombre}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <NotificationBell />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o teléfono..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span className="text-lg font-semibold">{cualificadosCount} Leads</span>
              </div>
              {descualificadosCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Ban className="h-3 w-3" />
                  {descualificadosCount} Descualificados
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StandaloneDocsButton />
            {descualificadosCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportDescualificados}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Descualificados
              </Button>
            )}
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Lead
            </Button>
          </div>
        </div>

        {/* Filtros por preferencia de llamada y vivienda */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-sm text-muted-foreground">Llamada:</span>
          {(
            [
              { key: 'manana', label: 'Mañana (hasta 13h)' },
              { key: 'tarde', label: 'Tarde (13h–16h)' },
              { key: 'noche', label: 'Noche (16h–21h)' },
            ] as { key: CallTimeFilter; label: string }[]
          ).map(opt => (
            <Button
              key={opt.key}
              size="sm"
              variant={callTimeFilter === opt.key ? 'default' : 'outline'}
              onClick={() => setCallTimeFilter(prev => (prev === opt.key ? null : opt.key))}
            >
              {opt.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={viviendaFilter ? 'default' : 'outline'}
            onClick={() => setViviendaFilter(v => !v)}
          >
            Tiene Vivienda
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
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron leads</h3>
            <p className="text-muted-foreground mb-4">Prueba a cambiar la búsqueda o los filtros</p>
          </div>
        ) : (
          <LeadKanban
            leads={filteredLeads}
            onStageChange={updateLeadStage}
            onViewDetails={setDetailsLead}
            onEdit={setEditingLead}
            onDelete={setDeleteLeadId}
            onDisqualify={(leadId) => updateLeadStage(leadId, 'descualificados')}
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
