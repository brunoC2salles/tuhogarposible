import { useState } from 'react';
import { AgentCandidate, AgentCandidateStage, CANDIDATE_STAGE_LABELS, CANDIDATE_STAGE_ORDER } from '@/types/reclutamiento';
import { AgentCandidateCard } from './AgentCandidateCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AgentCandidateKanbanProps {
  candidates: AgentCandidate[];
  onStageChange: (candidateId: string, newStage: AgentCandidateStage) => void;
  onEdit: (candidate: AgentCandidate) => void;
  onDelete: (candidateId: string) => void;
}

export const AgentCandidateKanban = ({ 
  candidates, 
  onStageChange, 
  onEdit,
  onDelete 
}: AgentCandidateKanbanProps) => {
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<AgentCandidateStage | null>(null);

  const getCandidatesByStage = (stage: AgentCandidateStage) => {
    return candidates.filter(c => c.stage === stage);
  };

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    setDraggedCandidate(candidateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: AgentCandidateStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: AgentCandidateStage) => {
    e.preventDefault();
    
    if (draggedCandidate) {
      onStageChange(draggedCandidate, stage);
    }
    
    setDraggedCandidate(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CANDIDATE_STAGE_ORDER.map((stage) => {
        const stageCandidates = getCandidatesByStage(stage);
        const isOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            className="flex-shrink-0 w-80"
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className={cn(
              "bg-muted/50 rounded-lg p-4 h-full transition-colors",
              isOver && "bg-primary/10 ring-2 ring-primary"
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">
                  {CANDIDATE_STAGE_LABELS[stage]}
                </h3>
                <span className="text-xs bg-background px-2 py-1 rounded-full">
                  {stageCandidates.length}
                </span>
              </div>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-3 pr-4">
                  {stageCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, candidate.id)}
                    >
                      <AgentCandidateCard
                        candidate={candidate}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  ))}
                  
                  {stageCandidates.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Sin candidatos
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      })}
    </div>
  );
};
