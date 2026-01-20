import { useState, useRef, useEffect } from 'react';
import { Lead, LeadStage, STAGE_LABELS, STAGE_ORDER } from '@/types/crm';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { Ban, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const getLeadsByStage = (stage: LeadStage) => {
    return leads.filter((lead) => lead.stage === stage);
  };

  // Force scroll to start on mount and update arrow visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollLeft = 0;
      updateArrowVisibility();
    }
  }, []);

  const updateArrowVisibility = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftArrow(container.scrollLeft > 10);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -320, behavior: 'smooth' });
      setTimeout(updateArrowVisibility, 350);
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 320, behavior: 'smooth' });
      setTimeout(updateArrowVisibility, 350);
    }
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
    <div className="relative w-full">
      {/* Left navigation arrow */}
      {showLeftArrow && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/95 shadow-lg hover:bg-accent"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Right navigation arrow */}
      {showRightArrow && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/95 shadow-lg hover:bg-accent"
          onClick={scrollRight}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}

      {/* Scrollable Kanban container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 h-full overflow-x-auto pb-4 px-8 scroll-smooth"
        onScroll={updateArrowVisibility}
      >
        {STAGE_ORDER.map((stage) => {
          const stageLeads = getLeadsByStage(stage);
          const isDragOver = dragOverStage === stage;
          const isNoCualificadoColumn = isNoCualificado(stage);
          const isNuevoLeadColumn = isNuevoLead(stage);

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72 sm:w-80 flex flex-col min-w-0"
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className={cn(
                "flex items-center justify-between mb-3 px-1",
                isNoCualificadoColumn && "text-destructive",
                isNuevoLeadColumn && "text-primary"
              )}>
                <div className="flex items-center gap-2">
                  {isNoCualificadoColumn && <Ban className="h-4 w-4" />}
                  {isNuevoLeadColumn && <Sparkles className="h-4 w-4" />}
                  <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  isNoCualificadoColumn 
                    ? "bg-destructive/10 text-destructive" 
                    : isNuevoLeadColumn
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground bg-muted"
                )}>
                  {stageLeads.length}
                </span>
              </div>

              <div
                className={cn(
                  'flex-1 rounded-lg border-2 border-dashed p-2 transition-colors overflow-y-auto max-h-[calc(100vh-280px)]',
                  isNoCualificadoColumn && 'border-destructive/30 bg-destructive/5',
                  isNuevoLeadColumn && 'border-primary/30 bg-primary/5',
                  isDragOver && 'border-primary bg-primary/5',
                  !isDragOver && !isNoCualificadoColumn && !isNuevoLeadColumn && 'border-border bg-muted/20'
                )}
              >
                <div className="space-y-3 min-h-[200px] relative">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="cursor-move relative z-0"
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
