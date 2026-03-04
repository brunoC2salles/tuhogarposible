import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, CheckCircle } from "lucide-react";
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resultados de la Simulación</DialogTitle>
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

          {/* Resumen de la Operación */}
          <div>
            <h3 className="font-semibold mb-3">DATOS FINANCIEROS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Valor del inmueble</p>
                <p className="text-xl font-bold">{formatEuro(datos.valorInmueble)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Entrada inicial</p>
                <p className="text-xl font-bold">{formatEuro(datos.entrada)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Monto a financiar</p>
                <p className="text-xl font-bold">{formatEuro(resultados.montoFinanciar)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Plazo</p>
                <p className="text-xl font-bold">{plazoTexto}</p>
                <p className="text-xs text-muted-foreground mt-1">({datos.plazoMeses} meses)</p>
              </div>
            </div>
          </div>

          {/* Resultado Principal */}
          <div>
            <h3 className="font-semibold mb-3">RESUMEN DEL CRÉDITO</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Cuota Mensual</p>
                <p className="text-4xl font-bold text-primary">{formatEuro(resultados.cuotaMensual)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total a pagar</p>
                  <p className="text-2xl font-bold">{formatEuro(resultados.montoTotalPagar)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total intereses</p>
                  <p className="text-2xl font-bold">{formatEuro(resultados.totalIntereses)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Análisis de Capacidad */}
          <div>
            <h3 className="font-semibold mb-3">ANÁLISIS DE CAPACIDAD DE PAGO</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-sm">Ingresos mensuales</span>
                <span className="font-semibold">{formatEuro(datos.ingresosMensuales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-sm">Deudas actuales</span>
                <span className="font-semibold">{formatEuro(datos.deudasActuales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-sm">Nueva cuota</span>
                <span className="font-semibold">{formatEuro(resultados.cuotaMensual)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded border border-primary/20">
                <span className="text-sm font-medium">Total comprometido mensual</span>
                <span className="font-bold text-primary">{formatEuro(datos.deudasActuales + resultados.cuotaMensual)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                <span className="text-sm">% de ingresos comprometido</span>
                <Badge variant={(datos.deudasActuales + resultados.cuotaMensual) / datos.ingresosMensuales * 100 <= 25 ? "default" : "destructive"}>
                  {((datos.deudasActuales + resultados.cuotaMensual) / datos.ingresosMensuales * 100).toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Condiciones */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Condiciones del crédito</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Tasa de interés: <strong>{datos.tasaAnual}% anual</strong></li>
              <li>• Tipo de amortización: <strong>Sistema Francés (cuotas fijas)</strong></li>
              <li>• Relación cuota/ingreso: <strong>{((datos.deudasActuales + resultados.cuotaMensual) / datos.ingresosMensuales * 100).toFixed(2)}%</strong> {((datos.deudasActuales + resultados.cuotaMensual) / datos.ingresosMensuales * 100) <= 25 ? '✓' : '⚠️'}</li>
              <li>• Regla: cuota ≤ <strong>25% de (ingresos − deudas)</strong></li>
            </ul>
          </div>

          {/* Badge de Política de Privacidad */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Política de Privacidad aceptada conforme al RGPD
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            {onSalvarNoLead && leadNombre && (
              <Button 
                onClick={onSalvarNoLead} 
                disabled={salvandoNoLead}
                className="w-full"
                size="lg"
              >
                {salvandoNoLead ? 'Guardando...' : `Guardar en Lead: ${leadNombre}`}
              </Button>
            )}
            
            <Button onClick={handleExportPDF} variant="outline" className="w-full" size="lg">
              <FileDown className="h-5 w-5 mr-2" />
              Exportar a PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
