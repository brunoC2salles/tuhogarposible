import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Inmueble } from "@/types/inventario";
import { Calendar, Clock } from "lucide-react";

interface SolicitarVisitaModalProps {
  inmueble: Inmueble;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fecha: string, hora: string, notas?: string) => void;
}

export function SolicitarVisitaModal({
  inmueble,
  isOpen,
  onClose,
  onSubmit,
}: SolicitarVisitaModalProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fecha || !hora) {
      console.log("[Inventario] Fecha y hora son requeridas");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(fecha, hora, notas);
      console.log("[Inventario] Solicitud de visita enviada", { inmuebleId: inmueble.id, fecha, hora });
      onClose();
      setFecha("");
      setHora("");
      setNotas("");
    } catch (error) {
      console.error("[Inventario] Error al solicitar visita:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Solicitar visita
          </DialogTitle>
          <DialogDescription>
            Solicita una visita para el inmueble en {inmueble.direccion}, {inmueble.ciudad}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha preferida</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={getTomorrowDate()}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora">Hora preferida</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas adicionales (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Alguna preferencia especial o comentario..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Solicitar visita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}