import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, X, Save, Loader2 } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacion as ResultadosType } from "@/lib/simuladorUtils";
import { type SimuladorCreditoFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionPDF } from "@/lib/pdfGenerator";

interface ResultadosSimulacionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: SimuladorCreditoFormData;
  resultados: ResultadosType;
  onSalvarNoLead?: () => void;
  salvandoNoLead?: boolean;
  leadNombre?: string;
}

export function ResultadosSimulacion({ 
  open, 
  onOpenChange, 
  datos, 
  resultados,
  onSalvarNoLead,
  salvandoNoLead,
  leadNombre
}: ResultadosSimulacionProps) {
  const handleExportPDF = () => {
    generateSimulacionPDF(datos, resultados);
  };

  const plazoAnios = Math.floor(datos.plazoMeses / 12);
  const plazoMesesRestantes = datos.plazoMeses % 12;
  const plazoTexto = plazoMesesRestantes > 0 
    ? `${plazoAnios} años y ${plazoMesesRestantes} meses` 
    : `${plazoAnios} años`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resultados de la Simulación</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fecha de simulación: {formatDateTime()}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cliente */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h3>
            <p className="text-lg font-semibold">{datos.nombreCompleto}</p>
          </div>

          {/* Condiciones del Préstamo */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Condiciones del Préstamo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Valor del Inmueble</p>
                <p className="text-xl font-bold">{formatEuro(datos.valorInmueble)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Entrada (pago inicial)</p>
                <p className="text-xl font-bold">{formatEuro(datos.entrada)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Plazo</p>
                <p className="text-xl font-bold">{datos.plazoMeses} meses</p>
                <p className="text-xs text-muted-foreground">({plazoTexto})</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Tasa de interés</p>
                <p className="text-xl font-bold">{datos.tasaAnual}% anual</p>
              </div>
            </div>
          </div>

          {/* Máximo de Crédito Personal */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border-2 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Máximo de Crédito Personal
                </p>
                <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                  {formatEuro(resultados.montoMaximoCredito)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Basado en el 35% de tus ingresos
                </p>
              </div>
              <div className="bg-green-500 text-white rounded-full p-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Resultados del Cálculo */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Resultados del Cálculo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Cantidad solicitada</p>
                <p className="text-xl font-bold">{formatEuro(resultados.montoFinanciar)}</p>
              </div>
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
                <p className="text-sm text-primary font-medium mb-1">Cuota mensual</p>
                <p className="text-2xl font-bold text-primary">
                  {formatEuro(resultados.cuotaMensual)}
                </p>
                <p className="text-xs text-muted-foreground">/mes</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Monto total a pagar</p>
                <p className="text-xl font-bold">{formatEuro(resultados.montoTotalPagar)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Total de intereses</p>
                <p className="text-xl font-bold">{formatEuro(resultados.totalIntereses)}</p>
              </div>
            </div>
          </div>

          {/* Badge de Cualificación */}
          {!resultados.cualificado && (
            <div className="flex justify-center">
              <Badge variant="destructive" className="text-sm py-2 px-4">
                ⚠️ Candidato no cualificado
              </Badge>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs italic text-muted-foreground text-center">
              Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son 
              orientativos y sujetos a aprobación crediticia. Esta simulación no constituye 
              una oferta vinculante.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {onSalvarNoLead && leadNombre && (
              <Button 
                onClick={onSalvarNoLead} 
                disabled={salvandoNoLead}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {salvandoNoLead ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar en Lead: {leadNombre}
                  </>
                )}
              </Button>
            )}
            
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" />
                Cerrar
              </Button>
              <Button onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar a PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
