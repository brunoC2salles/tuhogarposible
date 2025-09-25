import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateReservaData } from "@/hooks/useReservas";
import { DatabaseInmueble } from "@/hooks/useInmuebles";
import { toast } from "sonner";

interface CreateReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateReserva: (data: CreateReservaData) => Promise<{ error: any }>;
  inmuebles: DatabaseInmueble[];
  agentes: { id: string; nombre: string }[];
  isSubmitting: boolean;
}

export const CreateReservaModal = ({
  open,
  onOpenChange,
  onCreateReserva,
  inmuebles,
  agentes,
  isSubmitting
}: CreateReservaModalProps) => {
  const [formData, setFormData] = useState<{
    inmueble_id: string;
    agente_id: string;
    fecha_visita: string;
    hora_visita: string;
    notas: string;
  }>({
    inmueble_id: "",
    agente_id: "",
    fecha_visita: "",
    hora_visita: "",
    notas: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.inmueble_id || !formData.agente_id || !formData.fecha_visita || !formData.hora_visita) {
      toast.error("Por favor, complete todos los campos obligatorios");
      return;
    }

    const reservaData: CreateReservaData = {
      inmueble_id: formData.inmueble_id,
      agente_id: formData.agente_id,
      fecha_visita: formData.fecha_visita,
      hora_visita: formData.hora_visita,
      notas: formData.notas || undefined,
    };

    const { error } = await onCreateReserva(reservaData);

    if (!error) {
      setFormData({
        inmueble_id: "",
        agente_id: "",
        fecha_visita: "",
        hora_visita: "",
        notas: "",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Reserva</DialogTitle>
          <DialogDescription>
            Programa una nueva visita para un agente
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inmueble">Inmueble *</Label>
            <Select 
              value={formData.inmueble_id} 
              onValueChange={(value) => setFormData(prev => ({...prev, inmueble_id: value}))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar inmueble" />
              </SelectTrigger>
              <SelectContent>
                {inmuebles.filter(i => i.disponible).map((inmueble) => (
                  <SelectItem key={inmueble.id} value={inmueble.id}>
                    {inmueble.direccion}, {inmueble.ciudad} - €{inmueble.precio.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agente">Agente *</Label>
            <Select 
              value={formData.agente_id} 
              onValueChange={(value) => setFormData(prev => ({...prev, agente_id: value}))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar agente" />
              </SelectTrigger>
              <SelectContent>
                {agentes.map((agente) => (
                  <SelectItem key={agente.id} value={agente.id}>
                    {agente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de Visita *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha_visita}
                onChange={(e) => setFormData(prev => ({...prev, fecha_visita: e.target.value}))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora *</Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora_visita}
                onChange={(e) => setFormData(prev => ({...prev, hora_visita: e.target.value}))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({...prev, notas: e.target.value}))}
              placeholder="Notas adicionales para la visita..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Reserva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};