import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, X, CheckCircle } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacionHipoteca } from "@/lib/simuladorUtils";
import { type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionCombinadaPDF } from "@/lib/pdfGenerator";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { getMarketPrice } from "@/lib/marketPriceUtils";

interface ResultadosCombinadosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: SimuladorHipotecaFormData;
  resultadosHipoteca: ResultadosSimulacionHipoteca;
}

export function ResultadosCombinados({
  open,
  onOpenChange,
  datos,
  resultadosHipoteca,
}: ResultadosCombinadosProps) {
  const { map: marketMap } = useMarketPrices();

  // Calculate max property price based on mortgage only + savings
  const porcentajeFinanciamiento = resultadosHipoteca.porcentajeFinanciamiento || 80;
  const pctDecimal = porcentajeFinanciamiento / 100;

  // Max price from mortgage ceiling
  const precioMaxHipoteca = pctDecimal > 0
    ? resultadosHipoteca.montoMaximoFinanciable / pctDecimal
    : 0;

  const precioMaximoVivienda = Math.max(0, precioMaxHipoteca);

  // Market price for context
  const marketPrice = marketMap ? getMarketPrice(marketMap, datos.comunidadAutonoma) : null;

  const cuotaMaxHipoteca = resultadosHipoteca.hipotecaMaximaMensual;

  // Capital gap: how much the client needs beyond savings
  const capitalFaltante = Math.max(0, resultadosHipoteca.capitalPropioNecesario - (datos.ahorrosDisponibles || 0));

  const plazoHipotecaTexto = resultadosHipoteca.plazoMaximoMeses % 12 === 0
    ? `${resultadosHipoteca.plazoMaximoAnios} años`
    : `${Math.floor(resultadosHipoteca.plazoMaximoAnios)} años y ${resultadosHipoteca.plazoMaximoMeses % 12} meses`;

  // Calculate cuota for max mortgage amount
  const tasaMensual = resultadosHipoteca.tasaAnualFija / 12 / 100;
  let cuotaHipotecaMaxima = 0;
  if (resultadosHipoteca.montoMaximoFinanciable > 0 && resultadosHipoteca.plazoMaximoMeses > 0 && tasaMensual > 0) {
    const factor = Math.pow(1 + tasaMensual, resultadosHipoteca.plazoMaximoMeses);
    cuotaHipotecaMaxima = resultadosHipoteca.montoMaximoFinanciable * (tasaMensual * factor) / (factor - 1);
  }

  const handleExportPDF = () => {
    generateSimulacionCombinadaPDF(datos, resultadosHipoteca);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resultados de la Simulación Hipotecaria</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {datos.nombreCompleto} · Fecha: {formatDateTime()}
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* SECCIÓN 1: CRÉDITO HIPOTECARIO */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-secondary px-4 py-3 flex items-center gap-2">
              <span className="text-secondary-foreground font-bold text-lg">Crédito Hipotecario</span>
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
                <div className="bg-primary/10 border-2 border-primary rounded-lg p-3">
                  <p className="text-xs text-primary mb-1">Cuota Mensual</p>
                  <p className="text-xl font-bold text-primary">{formatEuro(resultadosHipoteca.cuotaMensual)}/mes</p>
                  <p className="text-xs text-muted-foreground">{plazoHipotecaTexto} · {resultadosHipoteca.tasaAnualFija}% fijo</p>
                  <p className="text-[10px] text-muted-foreground mt-1">TIN 1,6% (primeros 10 años) · TAE 1,72% - Euribor + 0,35% (resto de años)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Ingresos Totales</p>
                  <p className="text-xl font-bold">{formatEuro(resultadosHipoteca.ingresosTotales)}/mes</p>
                </div>
              </div>

              {/* CAPACIDAD MÁXIMA DE COMPRA */}
              <div className="border-2 border-green-500 rounded-lg overflow-hidden">
                <div className="bg-green-500 px-4 py-2.5">
                  <span className="text-white font-bold text-sm uppercase tracking-wide">Capacidad Máxima de Compra</span>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-4 space-y-4">
                  {/* Row 1: Hipoteca Máxima + Ahorros */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Hipoteca Máxima Financiable</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(resultadosHipoteca.montoMaximoFinanciable)}</p>
                      <div className="mt-1.5 pt-1.5 border-t border-green-200 dark:border-green-800">
                        <p className="text-[10px] text-muted-foreground">Cuota mensual máxima</p>
                        <p className="text-sm font-semibold text-primary">{formatEuro(cuotaHipotecaMaxima)}/mes</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">35% ingresos líquidos · Tope: {datos.numeroTitulares === '1' ? '180.000€' : '210.000€'}</p>
                    </div>
                    <div className="bg-white dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Ahorros Disponibles</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(datos.ahorrosDisponibles || 0)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Capital propio</p>
                    </div>
                  </div>

                  {/* Row 2: Summary — max price + market */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-green-100 dark:bg-green-900 border-2 border-green-500 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-green-700 dark:text-green-300 font-semibold mb-1">Precio Máximo de Vivienda</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatEuro(precioMaximoVivienda)}</p>
                      <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">Basado en la hipoteca máxima financiable</p>
                    </div>
                    {marketPrice && (
                      <div className="bg-white dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                        <p className="text-[11px] text-muted-foreground font-medium mb-1">Precio Medio en {marketPrice.municipio}</p>
                        <p className="text-xl font-bold text-foreground">{formatEuro(marketPrice.precioMedio)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatEuro(marketPrice.precioM2)}/m²</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Capital gap warning */}
              {capitalFaltante > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Valor a completar con otros recursos</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Necesita <strong>{formatEuro(capitalFaltante)}</strong> adicionales (ahorros, crédito personal u otros) para cubrir la entrada e impuestos.
                  </p>
                </div>
              )}

              {resultadosHipoteca.hipotecaMaximaMensual < 350 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <p className="font-semibold text-destructive">Capacidad de Pago Insuficiente</p>
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

          {/* SECCIÓN 2: RESUMEN DE PAGOS */}
          <div className="border-2 border-green-500 rounded-lg overflow-hidden bg-green-50 dark:bg-green-950">
            <div className="bg-green-100 dark:bg-green-900 px-4 py-3">
              <span className="font-bold text-lg">Resumen de Pagos — Hipoteca</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-bold text-primary">Cuota Mensual Hipotecaria</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold">{formatEuro(resultadosHipoteca.cuotaMensual)}/mes</span>
                  <span className="text-xs text-muted-foreground">
                    durante {plazoHipotecaTexto}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((resultadosHipoteca.cuotaMensual / datos.ingresosMensuales) * 100).toFixed(1)}% de los ingresos netos
                </p>
              </div>

              {/* Total summary */}
              <div className="bg-muted/50 border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Coste total de la hipoteca</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Capital Financiado</p>
                    <p className="font-bold">{formatEuro(resultadosHipoteca.montoFinanciable)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Intereses</p>
                    <p className="font-bold">{formatEuro(resultadosHipoteca.totalIntereses)}</p>
                  </div>
                  <div className="border-2 border-primary rounded-lg p-1">
                    <p className="text-xs text-primary font-medium">Total a Pagar</p>
                    <p className="text-lg font-bold text-primary">{formatEuro(resultadosHipoteca.montoTotalPagar)}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center italic">
                Los costes de entrada e impuestos ({formatEuro(resultadosHipoteca.capitalPropioNecesario)}) se cubren con ahorros y/o crédito personal.
              </p>
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
              Exportar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
