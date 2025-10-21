import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/crm';
import { Calculator, TrendingUp, ExternalLink } from 'lucide-react';

interface SimuladoresModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (leadId: string, updates: Partial<Lead>) => void;
}

export const SimuladoresModal = ({ open, onClose, lead }: SimuladoresModalProps) => {
  if (!lead) return null;

  const handleOpenPersonal = () => {
    window.open('/simuladores/credito-personal', '_blank');
  };

  const handleOpenHipotecario = () => {
    window.open('/simuladores/credito-hipotecario', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Simuladores para {lead.nombre_completo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Escolha o tipo de simulação que deseja executar. Os simuladores abrirão em uma nova aba.
          </p>
          
          <div className="grid gap-4">
            {/* Personal Credit Button */}
            <div className="border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Crédito Personal</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Simule crédito pessoal com prazos de 5 a 12 anos
                  </p>
                  <Button onClick={handleOpenPersonal} className="w-full" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Simulador Personal
                  </Button>
                </div>
              </div>
            </div>

            {/* Mortgage Credit Button */}
            <div className="border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Crédito Hipotecário</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Simule hipoteca com benefícios fiscais incluídos
                  </p>
                  <Button onClick={handleOpenHipotecario} className="w-full" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Simulador Hipotecário
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> Os simuladores abrirão em páginas separadas. Para integrar os resultados ao lead, 
              use a funcionalidade de edição após concluir as simulações.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
