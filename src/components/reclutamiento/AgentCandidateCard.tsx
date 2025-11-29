import { AgentCandidate } from '@/types/reclutamiento';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, FileText, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentCandidateCardProps {
  candidate: AgentCandidate;
  onEdit: (candidate: AgentCandidate) => void;
  onDelete: (candidateId: string) => void;
}

export const AgentCandidateCard = ({ candidate, onEdit, onDelete }: AgentCandidateCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      draggable
      onClick={() => onEdit(candidate)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              {candidate.nombre_completo}
            </h3>
            {candidate.dni && (
              <Badge variant="outline" className="text-xs">
                DNI: {candidate.dni}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(candidate);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(candidate.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3" />
            <span>{candidate.telefono}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span className="truncate">{candidate.email}</span>
          </div>
          {candidate.ciudad && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>{candidate.ciudad}</span>
            </div>
          )}
          {candidate.notas && (
            <div className="flex items-start gap-2 pt-1">
              <FileText className="h-3 w-3 mt-0.5" />
              <span className="line-clamp-2">{candidate.notas}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
