import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ResultadoQualificacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "desqualificado" | "qualificado_cataluna" | "qualificado_general" | "agendamento_confirmado";
  tidycalLink?: string;
  nombreAgente?: string;
  telefonoAgente?: string;
  onConfirmarAgendamento?: () => void;
  isConfirming?: boolean;
}

export function ResultadoQualificacionModal({
  open,
  onOpenChange,
  tipo,
  tidycalLink,
  nombreAgente,
  telefonoAgente,
  onConfirmarAgendamento,
  isConfirming = false,
}: ResultadoQualificacionModalProps) {
  const [confirmAgendado, setConfirmAgendado] = useState(false);
  // Modal de desqualificação
  if (tipo === "desqualificado") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <DialogDescription className="text-center text-base space-y-4">
              <p>Agradecemos su tiempo e interés en Tu Hogar Posible.</p>
              <p>Desafortunadamente, debido a su situación, no podemos ayudarle en este momento.</p>
              <p className="font-medium">Un fuerte abrazo.</p>
              <p className="font-semibold">Equipo de Tu Hogar Posible</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal de agendamento confirmado
  if (tipo === "agendamento_confirmado") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl">¡Listo!</DialogTitle>
            <DialogDescription className="text-center text-base space-y-4">
              <p>Preste atención a la fecha de su llamada con nuestro agente. Si necesita reprogramarla, acceda al enlace de confirmación en su correo electrónico y no dude en hacerlo. Su presencia en la reunión es muy importante para nosotros. Esperamos que la pase bien hasta entonces.</p>
              <p className="font-medium">Muchas gracias por tu confianza.</p>
              <p className="font-medium">Un gran abrazo.</p>
              <p className="font-semibold">Equipo de Tu Hogar Posible</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => onOpenChange(false)}>
              Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal de qualificado com Tidycal embed
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <DialogTitle className="text-center text-2xl">¡Muchas gracias!</DialogTitle>
          <DialogDescription className="text-center text-base space-y-3">
            <p>Estás a un paso para que puedas tener tu hogar posible!</p>
            {nombreAgente && (
              <p className="font-semibold text-primary">
                Tu reunión será con <span className="underline">{nombreAgente}</span>
              </p>
            )}
            <p>En el calendario abajo puedes elegir el mejor momento para que hables con uno de nuestros agentes. Es importante que te comprometas a estar en la reunión, ya que nuestro agente se pondrá disponible para ayudarte con tu sueño.</p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6">
          {tidycalLink && (
            <iframe
              src={tidycalLink}
              title="Agendamiento Tidycal"
              className="w-full h-[600px] rounded-md border"
              frameBorder="0"
              loading="lazy"
            />
          )}
        </div>

        {/* Frase após Tidycal */}
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-900 dark:text-amber-100 text-center">
            Asegúrese de haber programado su reunión con uno de nuestros agentes y de que asistirá. 
            Si tiene alguna pregunta o necesita reprogramarla, comuníquese al número que figura a continuación.
          </p>
          <p className="text-center font-bold text-lg mt-2 text-primary">
            {telefonoAgente || "+34 614 17 36 85"}
          </p>
        </div>

        {/* Checkbox de confirmação */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <Checkbox 
            id="confirm-agendado" 
            checked={confirmAgendado}
            onCheckedChange={(checked) => setConfirmAgendado(checked === true)}
            className="mt-1"
          />
          <label 
            htmlFor="confirm-agendado" 
            className="text-sm text-blue-900 dark:text-blue-100 cursor-pointer flex-1"
          >
            ☑️ Confirmo que he agendado mi reunión con el agente y me comprometo a asistir en la fecha programada.
          </label>
        </div>

        {/* Botão de confirmação */}
        <div className="mt-6 flex justify-center">
          <Button 
            onClick={onConfirmarAgendamento} 
            size="lg" 
            className="w-full max-w-md"
            disabled={!confirmAgendado || isConfirming}
          >
            {isConfirming ? "Confirmando..." : "Finalizar Registro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
