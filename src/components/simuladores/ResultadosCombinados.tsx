import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, X, CheckCircle } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacion, type ResultadosSimulacionHipoteca } from "@/lib/simuladorUtils";
import { type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionCombinadaPDF } from "@/lib/pdfGenerator";

interface ResultadosCombinadosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: SimuladorHipotecaFormData & {
    // Campos extra del crédito personal
    entrada: number;
    plazoMeses: number;
    tasaAnual: number;
    deudasActuales: number;
    valorInmueble: number;
  };
  resultadosPersonal: ResultadosSimulacion;
  resultadosHipoteca: ResultadosSimulacionHipoteca;
}

export function ResultadosCombinados({
  open,
  onOpenChange,
  datos,
  resultadosPersonal,
  resultadosHipoteca,
}: ResultadosCombinadosProps) {
  const handleExportPDF = () => {
    generateSimulacionCombinadaPDF(datos, resultadosPersonal, resultadosHipoteca);
  };

  const plazoPersonalAnios = Math.floor(datos.plazoMeses / 12);
  const plazoPersonalMeses = datos.plazoMeses % 12;
  const plazoPersonalTexto = plazoPersonalMeses > 0
    ? `${plazoPersonalAnios} años y ${plazoPersonalMeses} meses`
    : `${plazoPersonalAnios} años`;

  const plazoHipotecaTexto = resultadosHipoteca.plazoMaximoMeses % 12 === 0
    ? `${resultadosHipoteca.plazoMaximoAnios} años`
    : `${Math.floor(resultadosHipoteca.plazoMaximoAnios)} años y ${resultadosHipoteca.plazoMaximoMeses % 12} meses`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resultados de la Simulación Combinada</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {datos.nombreCompleto} · Fecha: {formatDateTime()}
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* SECCIÓN 1: CRÉDITO PERSONAL */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary px-4 py-3 flex items-center gap-2">
              <span className="text-primary-foreground font-bold text-lg">💳 Crédito Personal</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Importe a Financiar</p>
                  <p className="font-bold">{formatEuro(resultadosPersonal.montoFinanciar + datos.entrada)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Entrada</p>
                  <p className="font-bold">{formatEuro(datos.entrada)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Plazo</p>
                  <p className="font-bold">{plazoPersonalTexto}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tasa</p>
                  <p className="font-bold">{datos.tasaAnual}% anual</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-300 mb-1">Máximo Crédito Personal</p>
                  <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatEuro(resultadosPersonal.montoMaximoCredito)}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">20% de ingresos - deudas</p>
                </div>
                <div className="bg-primary/10 border-2 border-primary rounded-lg p-3">
                  <p className="text-xs text-primary mb-1">Cuota Mensual</p>
                  <p className="text-xl font-bold text-primary">{formatEuro(resultadosPersonal.cuotaMensual)}/mes</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total a Pagar</p>
                  <p className="text-xl font-bold">{formatEuro(resultadosPersonal.montoTotalPagar)}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                {resultadosPersonal.cualificado ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-sm py-1 px-4">✓ CANDIDATO CUALIFICADO</Badge>
                ) : (
                  <>
                    <Badge variant="destructive" className="text-sm py-1 px-4">⚠️ CANDIDATO NO CUALIFICADO</Badge>
                    <p className="text-xs text-destructive text-center max-w-md">
                      La cuota mensual ({formatEuro(resultadosPersonal.cuotaMensual)}) supera la capacidad de pago 
                      ({formatEuro((datos.ingresosMensuales * 0.20) - datos.deudasActuales)}/mes). 
                      Fórmula: cuota ≤ (ingresos × 20%) − deudas
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CRÉDITO HIPOTECARIO */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-secondary px-4 py-3 flex items-center gap-2">
              <span className="text-secondary-foreground font-bold text-lg">🏠 Crédito Hipotecario</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Precio Vivienda</p>
                  <p className="font-bold">{formatEuro(datos.precioVivienda)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Capital Propio Necesario</p>
                  <p className="font-bold">{formatEuro(resultadosHipoteca.capitalPropioNecesario)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Monto a Financiar ({resultadosHipoteca.porcentajeFinanciamiento.toFixed(0)}%)</p>
                  <p className="font-bold">{formatEuro(resultadosHipoteca.montoFinanciable)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Gastos e Impuestos</p>
                  <p className="font-bold">{formatEuro(resultadosHipoteca.gastosImpuestos)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-300 mb-1">Máximo Financiable</p>
                  <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatEuro(resultadosHipoteca.montoMaximoFinanciable)}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Según capacidad de pago</p>
                </div>
                <div className="bg-primary/10 border-2 border-primary rounded-lg p-3">
                  <p className="text-xs text-primary mb-1">Cuota Mensual</p>
                  <p className="text-xl font-bold text-primary">{formatEuro(resultadosHipoteca.cuotaMensual)}/mes</p>
                  <p className="text-xs text-muted-foreground">{plazoHipotecaTexto} · {resultadosHipoteca.tasaAnualFija}% fijo</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Ingresos Totales</p>
                  <p className="text-xl font-bold">{formatEuro(resultadosHipoteca.ingresosTotales)}/mes</p>
                </div>
              </div>

              {!resultadosHipoteca.capitalPropioSuficiente && resultadosHipoteca.aprobable && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">⚠️ Capital Propio Insuficiente</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Faltan: <strong>{formatEuro(resultadosHipoteca.capitalPropioNecesario - datos.ahorrosDisponibles)}</strong> para cubrir entrada e impuestos.
                  </p>
                </div>
              )}

              {resultadosHipoteca.hipotecaMaximaMensual < 350 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <p className="font-semibold text-destructive">⚠️ Capacidad de Pago Insuficiente</p>
                  <p className="text-destructive/80 mt-1">
                    Capacidad mensual: <strong>{formatEuro(resultadosHipoteca.hipotecaMaximaMensual)}</strong> — Mínimo requerido: <strong>350€/mes</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-center">
                {resultadosHipoteca.aprobable ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-sm py-1 px-4">✓ HIPOTECA APROBABLE</Badge>
                ) : (
                  <Badge variant="destructive" className="text-sm py-1 px-4">✗ HIPOTECA NO APROBABLE</Badge>
                )}
              </div>

              {resultadosHipoteca.razonNoAprobado && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <p className="font-semibold text-destructive">Razón de No Aprobación:</p>
                  <p className="text-destructive/80 mt-1">{resultadosHipoteca.razonNoAprobado}</p>
                </div>
              )}
            </div>
          </div>

          {/* RGPD */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Política de Privacidad aceptada conforme al RGPD
            </span>
          </div>

          {/* Disclaimer */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs italic text-muted-foreground text-center">
              Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos y sujetos a aprobación crediticia.
              Esta simulación no constituye una oferta vinculante. Para información oficial, consulte con nuestros asesores.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
            <Button onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF Combinado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
