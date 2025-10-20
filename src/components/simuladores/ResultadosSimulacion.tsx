import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, X } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacion as ResultadosType } from "@/lib/simuladorUtils";
import { type SimuladorCreditoFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionPDF } from "@/lib/pdfGenerator";

interface ResultadosSimulacionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: SimuladorCreditoFormData;
  resultados: ResultadosType;
}

export function ResultadosSimulacion({ 
  open, 
  onOpenChange, 
  datos, 
  resultados 
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
          <div className="flex gap-3 justify-end pt-4 border-t">
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
      </DialogContent>
    </Dialog>
  );
}
