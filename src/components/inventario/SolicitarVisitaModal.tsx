import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

interface SolicitarVisitaModalProps {
  inmueble: Inmueble;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fecha: string, hora: string, notas?: string) => void;
  visitasExistentes?: any[];
}

export function SolicitarVisitaModal({
  inmueble,
  isOpen,
  onClose,
  onSubmit,
  visitasExistentes = []
}: SolicitarVisitaModalProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fecha || !hora) {
      toast.error("Fecha y hora son obligatorios");
      return;
    }

    // Validar límite semanal
    const selectedDate = new Date(fecha);
    const selectedWeek = getWeekNumber(selectedDate);
    const selectedYear = selectedDate.getFullYear();
    
    const visitasNaSemana = visitasExistentes.filter((v: any) => {
      if (!v.fecha_visita || v.estado === 'cancelada') return false;
      const visitaDate = new Date(v.fecha_visita);
      return getWeekNumber(visitaDate) === selectedWeek && 
             visitaDate.getFullYear() === selectedYear;
    });
    
    if (visitasNaSemana.length >= 2) {
      toast.error("Ya hay 2 visitas agendadas para esta semana. Por favor, elige otra semana.");
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

        {visitasExistentes.length > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visitas ya agendadas ({visitasExistentes.length}/2):
            </p>
            <div className="space-y-2">
              {visitasExistentes
                .filter((v: any) => v.estado !== 'cancelada')
                .map((visita: any) => (
                  <div key={visita.id} className="text-sm flex items-center justify-between bg-background p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {visita.fecha_visita 
                          ? new Date(visita.fecha_visita).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short'
                            })
                          : 'Fecha pendiente'}
                        {' '}
                        {visita.hora_visita && `a las ${visita.hora_visita}`}
                      </span>
                    </div>
                    <Badge variant={visita.estado === 'confirmada' ? 'default' : 'secondary'} className="text-xs">
                      {visita.estado}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

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