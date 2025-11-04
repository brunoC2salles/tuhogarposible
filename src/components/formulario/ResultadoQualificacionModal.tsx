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
            Si tiene alguna pregunta o necesita reprogramarla, comuníquese con nosotros.
          </p>
          <div className="flex justify-center mt-3">
            <Button 
              asChild
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <a 
                href="https://wa.me/34621495705" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                ¡Contáctanos!
              </a>
            </Button>
          </div>
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
