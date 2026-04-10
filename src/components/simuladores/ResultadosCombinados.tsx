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

  const porcentajeFinanciamiento = resultadosHipoteca.porcentajeFinanciamiento || 80;

  const marketPrice = marketMap ? getMarketPrice(marketMap, datos.comunidadAutonoma) : null;

  const capitalFaltante = Math.max(0, resultadosHipoteca.capitalPropioNecesario - (datos.ahorrosDisponibles || 0));

  const plazoHipotecaTexto = resultadosHipoteca.plazoMaximoMeses % 12 === 0
    ? `${resultadosHipoteca.plazoMaximoAnios} años`
    : `${Math.floor(resultadosHipoteca.plazoMaximoAnios)} años y ${resultadosHipoteca.plazoMaximoMeses % 12} meses`;

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

        <div className="space-y-6">
          {/* SECCIÓN: CRÉDITO HIPOTECARIO */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-secondary px-4 py-3">
              <span className="text-secondary-foreground font-bold text-lg">Crédito Hipotecario</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Datos principales */}
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

              {/* Cuota e ingresos */}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Ratio cuota/ingresos: {((resultadosHipoteca.cuotaMensual / resultadosHipoteca.ingresosTotales) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Coste Total de la Hipoteca</p>
                  <p className="text-lg font-bold">{formatEuro(resultadosHipoteca.montoTotalPagar)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Capital: {formatEuro(resultadosHipoteca.montoFinanciable)} · Intereses: {formatEuro(resultadosHipoteca.totalIntereses)}
                  </p>
                </div>
              </div>

              {/* CAPACIDAD MÁXIMA — HIPOTECA */}
              <div className="border-2 border-primary rounded-lg overflow-hidden">
                <div className="bg-primary px-4 py-2.5">
                  <span className="text-primary-foreground font-bold text-sm uppercase tracking-wide">Capacidad Máxima — Hipoteca</span>
                </div>
                <div className="bg-primary/5 dark:bg-primary/10 p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 text-center">
                      <p className="text-[11px] text-primary font-semibold mb-1">Cuota Mensual Máxima</p>
                      <p className="text-2xl font-bold text-primary">{formatEuro(cuotaHipotecaMaxima)}/mes</p>
                      <p className="text-[9px] text-muted-foreground mt-1">35% ingresos líquidos · Tope: {datos.numeroTitulares === '1' ? '180.000€' : '210.000€'}</p>
                    </div>
                    <div className="bg-background border border-primary/20 rounded-lg p-4 text-center">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Hipoteca Máxima Financiable</p>
                      <p className="text-2xl font-bold text-foreground">{formatEuro(resultadosHipoteca.montoMaximoFinanciable)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Valor máximo que el banco puede financiar</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-background border border-primary/20 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Ahorros Disponibles</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(datos.ahorrosDisponibles || 0)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Capital propio</p>
                    </div>
                    {marketPrice && (
                      <div className="bg-background border border-primary/20 rounded-lg p-3 text-center">
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
                <div className="p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg text-sm">
                  <p className="font-semibold text-foreground">Valor a completar con otros recursos</p>
                  <p className="text-muted-foreground mt-1">
                    Necesita <strong>{formatEuro(capitalFaltante)}</strong> adicionales (ahorros, crédito personal y otros) para cubrir la entrada e impuestos.
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

              {/* Approval verdict */}
              <div className="flex justify-center">
                {resultadosHipoteca.aprobable ? (
                  <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-1 px-4">HIPOTECA APROBABLE</Badge>
                ) : (
                  <Badge variant="destructive" className="text-sm py-1 px-4">HIPOTECA NO APROBABLE</Badge>
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
          <div className="flex items-center gap-2 p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground font-medium">
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
