import { useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileCheck, Users, User, CheckCircle2, Circle } from 'lucide-react';
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
      <div className="p-6 text-center text-muted-foreground">
        Cargando checklist...
      </div>
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

  // Calculate counts for sections
  const titularCount = DOCUMENT_CHECKLIST.filter(item => Boolean(checklist[item.key])).length;
  const parejaCount = checklist.compra_acompanado 
    ? PAREJA_DOCUMENT_CHECKLIST.filter(item => Boolean(checklist[item.key])).length 
    : 0;

  // Progress bar color based on percentage
  const getProgressColor = () => {
    if (progress < 33) return 'bg-destructive';
    if (progress < 66) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const renderDocumentItem = (item: typeof DOCUMENT_CHECKLIST[0]) => {
    const isChecked = Boolean(checklist[item.key]);
    
    return (
      <div
        key={item.key}
        className={cn(
          'flex items-center gap-3 p-2.5 rounded-md transition-all cursor-pointer group',
          isChecked 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-muted/30 border border-transparent hover:bg-muted/50'
        )}
        onClick={() => toggleItem(item.key)}
      >
        <div className="flex-shrink-0">
          {isChecked ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium truncate',
              isChecked && 'text-green-700 dark:text-green-400'
            )}>
              {item.label}
            </span>
            {item.required && !isChecked && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                Obligatorio
              </Badge>
            )}
            {item.conditional && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {item.conditional}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        </div>

        <Checkbox
          checked={isChecked}
          onCheckedChange={() => toggleItem(item.key)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Progress */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-3">
          <FileCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Checklist de Documentos</h3>
            <p className="text-xs text-muted-foreground">
              Todos los documentos deben estar en formato PDF
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-2xl font-bold',
            progress < 33 && 'text-destructive',
            progress >= 33 && progress < 66 && 'text-yellow-600 dark:text-yellow-400',
            progress >= 66 && 'text-green-600 dark:text-green-400'
          )}>
            {progress}%
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completado</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn('h-full transition-all duration-500', getProgressColor())}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Purchase Type Selector */}
      <div className="p-3 bg-muted/30 rounded-lg border">
        <Label className="text-xs font-medium mb-2 block text-muted-foreground">Tipo de compra</Label>
        <RadioGroup
          value={checklist.compra_acompanado ? 'acompanado' : 'solo'}
          onValueChange={handleTipoCompraChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="solo" id="solo" />
            <Label htmlFor="solo" className="flex items-center gap-1.5 cursor-pointer text-sm">
              <User className="h-3.5 w-3.5" />
              Solo/a
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="acompanado" id="acompanado" />
            <Label htmlFor="acompanado" className="flex items-center gap-1.5 cursor-pointer text-sm">
              <Users className="h-3.5 w-3.5" />
              Acompañado/a
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Accordion Sections */}
      <Accordion type="multiple" defaultValue={['titular']} className="space-y-2">
        {/* Documentos del Titular */}
        <AccordionItem value="titular" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium">Documentos del Titular</span>
              <Badge variant="secondary" className="ml-2">
                {titularCount}/{DOCUMENT_CHECKLIST.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-2">
              {DOCUMENT_CHECKLIST.map(renderDocumentItem)}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Documentos de la Pareja */}
        {checklist.compra_acompanado && (
          <AccordionItem value="pareja" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Documentos de la Pareja</span>
                <Badge variant="secondary" className="ml-2">
                  {parejaCount}/{PAREJA_DOCUMENT_CHECKLIST.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid gap-2">
                {PAREJA_DOCUMENT_CHECKLIST.map(renderDocumentItem)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span>Completado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="h-3.5 w-3.5" />
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-3.5">Obligatorio</Badge>
          <span>Requerido</span>
        </div>
      </div>
    </div>
  );
};
