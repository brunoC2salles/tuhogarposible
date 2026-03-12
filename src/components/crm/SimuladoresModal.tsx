import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/crm';
import { Calculator, ExternalLink } from 'lucide-react';

interface SimuladoresModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (leadId: string, updates: Partial<Lead>) => void;
}

export const SimuladoresModal = ({ open, onClose, lead }: SimuladoresModalProps) => {
  if (!lead) return null;

  const handleOpenSimulador = () => {
    window.open(
      `/simuladores?leadId=${lead.id}&leadNombre=${encodeURIComponent(lead.nombre_completo)}`, 
      '_blank'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Simulador para {lead.nombre_completo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Abra el simulador financiero integrado que calcula simultáneamente el crédito personal e hipotecario.
          </p>
          
          <div className="border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Simulador Financiero</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Crédito personal + hipotecario en un solo formulario
            </p>
            <Button onClick={handleOpenSimulador} className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Simulador
            </Button>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> El simulador se abrirá en una nueva pestaña con los datos del lead pre-cargados.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
