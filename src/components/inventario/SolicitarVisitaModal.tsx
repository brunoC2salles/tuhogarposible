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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Inmueble } from "@/types/inventario";
import { Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const getWeekNumber = (date: Date): number => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  // Función para extraer datas ocupadas das visitas existentes
  const getDatasOcupadas = (): Date[] => {
    return visitasExistentes
      .filter((v: any) => v.fecha_visita && v.estado !== 'cancelada')
      .map((v: any) => new Date(v.fecha_visita));
  };

  // Función para verificar se data está ocupada
  const isDateOccupied = (date: Date): boolean => {
    const ocupadas = getDatasOcupadas();
    return ocupadas.some(d => 
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !hora) {
      toast.error("Fecha y hora son obligatorios");
      return;
    }

    // Verificar se data está ocupada
    if (isDateOccupied(selectedDate)) {
      toast.error("Esta fecha ya tiene una visita agendada. Por favor, elige otra fecha.");
      return;
    }

    // Validar límite semanal
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
      const fechaString = format(selectedDate, 'yyyy-MM-dd');
      await onSubmit(fechaString, hora, notas);
      console.log("[Inventario] Solicitud de visita enviada", { inmuebleId: inmueble.id, fecha: fechaString, hora });
      onClose();
      setSelectedDate(undefined);
      setHora("");
      setNotas("");
    } catch (error) {
      console.error("[Inventario] Error al solicitar visita:", error);
    } finally {
      setLoading(false);
    }
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
            <Label>Fecha preferida</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  modifiers={{
                    occupied: (date) => isDateOccupied(date),
                  }}
                  modifiersClassNames={{
                    occupied: "bg-destructive/20 text-destructive line-through hover:bg-destructive/30 relative after:content-['×'] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:text-2xl after:font-bold after:pointer-events-none",
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
                
                <div className="p-3 border-t text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-destructive/20 border border-destructive/40 rounded"></div>
                    <span>Fechas ya ocupadas</span>
                  </div>
                  <p className="mt-2">Máximo 2 visitas por semana</p>
                </div>
              </PopoverContent>
            </Popover>
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