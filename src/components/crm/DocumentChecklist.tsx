import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCheck, AlertCircle } from 'lucide-react';
import { useLeadDocumentChecklist, DOCUMENT_CHECKLIST } from '@/hooks/useLeadDocumentChecklist';
import { cn } from '@/lib/utils';

interface DocumentChecklistProps {
  leadId: string;
}

export const DocumentChecklist = ({ leadId }: DocumentChecklistProps) => {
  const { checklist, isLoading, createChecklist, toggleItem, progress } = useLeadDocumentChecklist(leadId);

  useEffect(() => {
    if (!checklist && !isLoading && leadId) {
      createChecklist.mutate(leadId);
    }
  }, [checklist, isLoading, leadId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Cargando checklist...</div>
        </CardContent>
      </Card>
    );
  }

  if (!checklist) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Checklist de Documentos
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{progress}%</div>
            <div className="text-xs text-muted-foreground">Completado</div>
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Todos los documentos deben estar en formato <strong>PDF</strong>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {DOCUMENT_CHECKLIST.map((item) => {
            const isChecked = Boolean(checklist[item.key]);
            
            return (
              <div
                key={item.key}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  isChecked ? 'bg-muted/50 border-primary/20' : 'border-border hover:bg-muted/30'
                )}
              >
                <Checkbox
                  id={item.key}
                  checked={isChecked}
                  onCheckedChange={() => toggleItem(item.key)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={item.key}
                    className={cn(
                      'text-sm font-medium leading-none cursor-pointer',
                      isChecked && 'line-through text-muted-foreground'
                    )}
                  >
                    {item.label}
                    {item.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  {item.conditional && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {item.conditional}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Documentos obligatorios
        </div>
      </CardContent>
    </Card>
  );
};
