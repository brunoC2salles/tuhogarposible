import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileCheck, AlertCircle, Users, User } from 'lucide-react';
import { useLeadDocumentChecklist, DOCUMENT_CHECKLIST, PAREJA_DOCUMENT_CHECKLIST } from '@/hooks/useLeadDocumentChecklist';
import { cn } from '@/lib/utils';

interface DocumentChecklistProps {
  leadId: string;
}

export const DocumentChecklist = ({ leadId }: DocumentChecklistProps) => {
  const { checklist, isLoading, createChecklist, toggleItem, updateChecklist, progress } = useLeadDocumentChecklist(leadId);

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

  const handleTipoCompraChange = (value: string) => {
    updateChecklist.mutate({
      id: checklist.id,
      updates: { compra_acompanado: value === 'acompanado' },
    });
  };

  const renderDocumentItem = (item: typeof DOCUMENT_CHECKLIST[0]) => {
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
  };

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

        {/* Selector de tipo de compra */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <Label className="text-sm font-medium mb-3 block">Tipo de compra</Label>
          <RadioGroup
            value={checklist.compra_acompanado ? 'acompanado' : 'solo'}
            onValueChange={handleTipoCompraChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solo" id="solo" />
              <Label htmlFor="solo" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Comprador solo/a
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="acompanado" id="acompanado" />
              <Label htmlFor="acompanado" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                Acompañado/a
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Documentos del Titular */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <User className="h-4 w-4" />
            Documentos del Titular
          </h3>
          {DOCUMENT_CHECKLIST.map(renderDocumentItem)}
        </div>

        {/* Documentos de la Pareja (solo si acompañado) */}
        {checklist.compra_acompanado && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4" />
              Documentos de la Pareja
            </h3>
            {PAREJA_DOCUMENT_CHECKLIST.map(renderDocumentItem)}
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Documentos obligatorios
        </div>
      </CardContent>
    </Card>
  );
};