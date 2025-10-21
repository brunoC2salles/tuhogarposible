import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lead, LeadFormData } from '@/types/crm';

interface CreateEditLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: LeadFormData) => void;
  lead?: Lead | null;
}

export const CreateEditLeadModal = ({
  open,
  onClose,
  onSave,
  lead,
}: CreateEditLeadModalProps) => {
  const [formData, setFormData] = useState<LeadFormData>({
    nombre_completo: '',
    telefono: '',
    email: '',
    zona_interes: '',
    ciudad_interes: '',
    valor_inmueble_deseado: undefined,
    notas: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        nombre_completo: lead.nombre_completo,
        telefono: lead.telefono,
        email: lead.email,
        zona_interes: lead.zona_interes || '',
        ciudad_interes: lead.ciudad_interes || '',
        valor_inmueble_deseado: lead.valor_inmueble_deseado,
        notas: lead.notas || '',
      });
    } else {
      setFormData({
        nombre_completo: '',
        telefono: '',
        email: '',
        zona_interes: '',
        ciudad_interes: '',
        valor_inmueble_deseado: undefined,
        notas: '',
      });
    }
  }, [lead, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Crear Nuevo Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre Completo *</Label>
              <Input
                id="nombre_completo"
                required
                value={formData.nombre_completo}
                onChange={(e) =>
                  setFormData({ ...formData, nombre_completo: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                type="tel"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ciudad_interes">Ciudad de Interés</Label>
              <Input
                id="ciudad_interes"
                value={formData.ciudad_interes}
                onChange={(e) =>
                  setFormData({ ...formData, ciudad_interes: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona_interes">Zona de Interés</Label>
              <Input
                id="zona_interes"
                value={formData.zona_interes}
                onChange={(e) => setFormData({ ...formData, zona_interes: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_inmueble_deseado">Valor de Inmueble Deseado (CLP)</Label>
            <Input
              id="valor_inmueble_deseado"
              type="number"
              min="0"
              value={formData.valor_inmueble_deseado || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  valor_inmueble_deseado: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              rows={3}
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{lead ? 'Actualizar' : 'Crear'} Lead</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
