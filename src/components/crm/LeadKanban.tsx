import { useState } from 'react';
import { Lead, LeadStage, STAGE_LABELS, STAGE_ORDER } from '@/types/crm';
import { LeadCard } from './LeadCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LeadKanbanProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onViewDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

export const LeadKanban = ({
  leads,
  onStageChange,
  onViewDetails,
  onEdit,
  onDelete,
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

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {STAGE_ORDER.map((stage) => {
        const stageLeads = getLeadsByStage(stage);
        const isDragOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            className="flex-shrink-0 w-80 flex flex-col"
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {stageLeads.length}
              </span>
            </div>

            <ScrollArea
              className={cn(
                'flex-1 rounded-lg border-2 border-dashed p-2 transition-colors',
                isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
              )}
            >
              <div className="space-y-3 min-h-[200px]">
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
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
