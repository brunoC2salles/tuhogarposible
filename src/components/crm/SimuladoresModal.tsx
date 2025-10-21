import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/crm';
import { SimuladorCreditoPersonal } from '@/components/simuladores/SimuladorCreditoPersonal';
import { SimuladorCreditoHipotecario } from '@/components/simuladores/SimuladorCreditoHipotecario';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface SimuladoresModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (leadId: string, updates: Partial<Lead>) => void;
}

export const SimuladoresModal = ({ open, onClose, lead, onSave }: SimuladoresModalProps) => {
  const [personalData, setPersonalData] = useState(lead?.simulador_personal_data);
  const [hipotecarioData, setHipotecarioData] = useState(lead?.simulador_hipotecario_data);

  const handleSave = () => {
    if (!lead) return;

    onSave(lead.id, {
      simulador_personal_data: personalData,
      simulador_hipotecario_data: hipotecarioData,
    });

    toast.success('Datos de simuladores guardados');
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simuladores para {lead.nombre_completo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Los simuladores se ejecutarán en la página de Simuladores. Los resultados se guardarán automáticamente.
          </p>
          
          <div className="flex gap-2">
            <Button onClick={() => window.open('/simuladores', '_blank')} className="flex-1">
              Abrir Simulador de Crédito Personal
            </Button>
            <Button onClick={() => window.open('/simuladores', '_blank')} className="flex-1">
              Abrir Simulador Hipotecario
            </Button>
          </div>
          
          <div className="text-center text-xs text-muted-foreground pt-4">
            Nota: Después de ejecutar los simuladores, actualiza manualmente los datos del lead con los resultados obtenidos.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
