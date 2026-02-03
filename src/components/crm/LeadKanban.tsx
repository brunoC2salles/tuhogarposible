import { useState, useMemo } from 'react';
import { Lead, LeadStage, STAGE_LABELS, STAGE_ORDER } from '@/types/crm';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { Ban, Sparkles, FileText, Building2, UserCheck } from 'lucide-react';

interface LeadKanbanProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onViewDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onDisqualify?: (leadId: string) => void;
}

export const LeadKanban = ({
  leads,
  onStageChange,
  onViewDetails,
  onEdit,
  onDelete,
  onDisqualify,
}: LeadKanbanProps) => {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  // OPTIMIZED: Pre-compute leads by stage once per data change (O(n) instead of O(n × stages))
  const leadsByStage = useMemo(() => {
    const grouped: Record<LeadStage, Lead[]> = {} as Record<LeadStage, Lead[]>;
    STAGE_ORDER.forEach(stage => { grouped[stage] = []; });
    leads.forEach(lead => {
      if (grouped[lead.stage]) {
        grouped[lead.stage].push(lead);
      }
    });
    return grouped;
  }, [leads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    if (draggedLead) {
      onStageChange(draggedLead, targetStage);
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const getStageIcon = (stage: LeadStage) => {
    switch (stage) {
      case 'nuevo_lead':
        return <Sparkles className="h-4 w-4" />;
      case 'preparacion_expediente':
        return <FileText className="h-4 w-4" />;
      case 'precualificacion':
        return <UserCheck className="h-4 w-4" />;
      case 'subida_expediente_bancos':
        return <Building2 className="h-4 w-4" />;
      case 'descualificados':
        return <Ban className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStageStyles = (stage: LeadStage, isDragOver: boolean) => {
    const baseStyles = 'w-64 flex-shrink-0 rounded-lg border transition-colors';
    
    if (isDragOver) {
      return cn(baseStyles, 'border-primary bg-primary/10');
    }
    
    switch (stage) {
      case 'nuevo_lead':
        return cn(baseStyles, 'border-primary/30 bg-primary/5');
      case 'preparacion_expediente':
        return cn(baseStyles, 'border-blue-500/30 bg-blue-50 dark:bg-blue-950/20');
      case 'precualificacion':
        return cn(baseStyles, 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/20');
      case 'subida_expediente_bancos':
        return cn(baseStyles, 'border-green-500/30 bg-green-50 dark:bg-green-950/20');
      case 'descualificados':
        return cn(baseStyles, 'border-destructive/30 bg-destructive/5');
      default:
        return cn(baseStyles, 'border-border bg-card');
    }
  };

  const getHeaderStyles = (stage: LeadStage) => {
    switch (stage) {
      case 'nuevo_lead':
        return 'text-primary border-primary/20';
      case 'preparacion_expediente':
        return 'text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'precualificacion':
        return 'text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'subida_expediente_bancos':
        return 'text-green-600 dark:text-green-400 border-green-500/20';
      case 'descualificados':
        return 'text-destructive border-destructive/20';
      default:
        return 'border-border';
    }
  };

  const getBadgeStyles = (stage: LeadStage) => {
    switch (stage) {
      case 'nuevo_lead':
        return 'bg-primary/10 text-primary';
      case 'preparacion_expediente':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'precualificacion':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'subida_expediente_bancos':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'descualificados':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* Container horizontal com colunas lado a lado - TODAS as etapas sempre visíveis */}
      <div className="flex gap-4 min-w-max">
        {STAGE_ORDER.map((stage) => {
          const stageLeads = leadsByStage[stage] || [];
          const isDragOver = dragOverStage === stage;

          return (
            <div
              key={stage}
              className={getStageStyles(stage, isDragOver)}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Cabeçalho fixo do estágio */}
              <div 
                className={cn(
                  "sticky top-0 z-10 flex items-center justify-between p-3 rounded-t-lg border-b bg-inherit",
                  getHeaderStyles(stage)
                )}
              >
                <div className="flex items-center gap-2">
                  {getStageIcon(stage)}
                  <h3 className="font-semibold text-xs">{STAGE_LABELS[stage]}</h3>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  getBadgeStyles(stage)
                )}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards crescem verticalmente - sem scroll interno */}
              <div className="p-3 space-y-3">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className="cursor-move"
                  >
                    <LeadCard
                      lead={lead}
                      onViewDetails={onViewDetails}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onDisqualify={onDisqualify}
                    />
                  </div>
                ))}
                
                {/* Placeholder quando vazio */}
                {stageLeads.length === 0 && (
                  <div className={cn(
                    "h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground",
                    isDragOver ? "border-primary/50 bg-primary/5" : "border-muted"
                  )}>
                    {isDragOver ? "Soltar aquí" : "Sin leads"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
