import { useState } from 'react';
import { Lead, LeadStage, STAGE_LABELS, STAGE_ORDER } from '@/types/crm';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { Ban, Sparkles } from 'lucide-react';

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

  const getLeadsByStage = (stage: LeadStage) => {
    return leads.filter((lead) => lead.stage === stage);
  };

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

  const isNoCualificado = (stage: LeadStage) => stage === 'no_cualificado';
  const isNuevoLead = (stage: LeadStage) => stage === 'nuevo_lead';

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* Container horizontal com colunas lado a lado - TODAS as etapas sempre visíveis */}
      <div className="flex gap-4 min-w-max">
        {STAGE_ORDER.map((stage) => {
          const stageLeads = getLeadsByStage(stage);
          const isDragOver = dragOverStage === stage;
          const isNoCualificadoColumn = isNoCualificado(stage);
          const isNuevoLeadColumn = isNuevoLead(stage);

          return (
            <div
              key={stage}
              className={cn(
                'w-72 flex-shrink-0 rounded-lg border transition-colors',
                isNoCualificadoColumn && 'border-destructive/30 bg-destructive/5',
                isNuevoLeadColumn && 'border-primary/30 bg-primary/5',
                isDragOver && 'border-primary bg-primary/10',
                !isDragOver && !isNoCualificadoColumn && !isNuevoLeadColumn && 'border-border bg-card'
              )}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Cabeçalho fixo do estágio */}
              <div 
                className={cn(
                  "sticky top-0 z-10 flex items-center justify-between p-3 rounded-t-lg border-b bg-inherit",
                  isNoCualificadoColumn && "text-destructive border-destructive/20",
                  isNuevoLeadColumn && "text-primary border-primary/20",
                  !isNoCualificadoColumn && !isNuevoLeadColumn && "border-border"
                )}
              >
                <div className="flex items-center gap-2">
                  {isNoCualificadoColumn && <Ban className="h-4 w-4" />}
                  {isNuevoLeadColumn && <Sparkles className="h-4 w-4" />}
                  <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  isNoCualificadoColumn 
                    ? "bg-destructive/10 text-destructive" 
                    : isNuevoLeadColumn
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground bg-muted"
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
