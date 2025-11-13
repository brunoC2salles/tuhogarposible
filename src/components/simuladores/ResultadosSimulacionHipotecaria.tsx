import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacionHipoteca } from "@/lib/simuladorUtils";
import { type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionHipotecariaPDF } from "@/lib/pdfGenerator";

interface ResultadosSimulacionHipotecariaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: SimuladorHipotecaFormData;
  resultados: ResultadosSimulacionHipoteca;
}

export function ResultadosSimulacionHipotecaria({
  open,
  onOpenChange,
  datos,
  resultados
}: ResultadosSimulacionHipotecariaProps) {
  const handleExportPDF = () => {
    generateSimulacionHipotecariaPDF(datos, resultados);
  };

  const plazoTexto = resultados.plazoMaximoMeses % 12 === 0 
    ? `${resultados.plazoMaximoAnios} años`
    : `${Math.floor(resultados.plazoMaximoAnios)} años y ${resultados.plazoMaximoMeses % 12} meses`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resultados de la Simulación Hipotecaria</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fecha de simulación: {formatDateTime()}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cliente */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Cliente</h3>
            <p className="text-lg font-medium">{datos.nombreCompleto} ({datos.edad} años)</p>
          </div>

          {/* Datos de la Vivienda */}
          <div>
            <h3 className="font-semibold mb-3">DATOS DE LA VIVIENDA</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Precio de la vivienda</p>
                <p className="text-xl font-bold">{formatEuro(datos.precioVivienda)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Capital propio necesario</p>
                <p className="text-xl font-bold">{formatEuro(resultados.capitalPropioNecesario)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Monto a financiar ({resultados.porcentajeFinanciamiento.toFixed(2)}%)</p>
                <p className="text-xl font-bold">{formatEuro(resultados.montoFinanciable)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Gastos e impuestos</p>
                <p className="text-xl font-bold">{formatEuro(resultados.gastosImpuestos)}</p>
              </div>
            </div>
          </div>

          {/* Condiciones Financieras */}
          <div>
            <h3 className="font-semibold mb-3">CONDICIONES FINANCIERAS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tipo de interés</p>
                <p className="text-xl font-bold">{resultados.tasaAnualFija}% anual (fijo)</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ingresos totales</p>
                <p className="text-xl font-bold">{formatEuro(resultados.ingresosTotales)}/mes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Plazo máximo</p>
                <p className="text-xl font-bold">{plazoTexto}</p>
                <p className="text-xs text-muted-foreground mt-1">({resultados.plazoMaximoMeses} meses)</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <p className="text-sm text-muted-foreground mb-1">🔵 Cuota mensual</p>
                <p className="text-2xl font-bold text-primary">{formatEuro(resultados.cuotaMensual)}/mes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Hipoteca máxima permitida</p>
                <p className="text-xl font-bold">{formatEuro(resultados.hipotecaMaximaMensual)}/mes</p>
                <p className="text-xs text-muted-foreground mt-1">(30% ingresos - créditos - hijos - pensión)</p>
              </div>
            </div>
          </div>

          {/* Resumen Total */}
          <div>
            <h3 className="font-semibold mb-3">RESUMEN TOTAL</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total a pagar</p>
                <p className="text-xl font-bold">{formatEuro(resultados.montoTotalPagar)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total de intereses</p>
                <p className="text-xl font-bold">{formatEuro(resultados.totalIntereses)}</p>
              </div>
            </div>
          </div>

          {/* Badge de Aprobación */}
          <div className="flex justify-center">
            {resultados.aprobable ? (
              <Badge className="text-base px-6 py-2 bg-green-500 hover:bg-green-600">
                ✓ HIPOTECA APROBABLE
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-base px-6 py-2">
                ✗ HIPOTECA NO APROBABLE
              </Badge>
            )}
          </div>

          {/* Detalles adicionales */}
          <div className="text-sm text-muted-foreground space-y-1 border-t pt-4">
            <p><strong>Comunidad:</strong> {datos.comunidadAutonoma}</p>
            <p><strong>Familia numerosa:</strong> {datos.familiaNumerosa ? 'Sí' : 'No'}</p>
            <p><strong>Menor de 35 años:</strong> {datos.menorDe35 ? 'Sí' : 'No'}</p>
            <p><strong>Situación laboral:</strong> {datos.situacionLaboral === 'autonomo' ? 'Autónomo' : 'Empleado'}</p>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground italic bg-muted/30 p-4 rounded">
            Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos 
            y sujetos a aprobación crediticia. Esta simulación no constituye una oferta vinculante. 
            Para información oficial, consulte con nuestros asesores.
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar a PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
