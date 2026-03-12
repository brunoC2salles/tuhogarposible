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
    plazoMeses: number;
    tasaAnual: number;
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
  const totalDeudas = datos.creditos?.reduce((s, c) => s + c.cuotaMensual, 0) ?? 0;

  const compromisoTotal = resultadosPersonal.cuotaMensual + resultadosHipoteca.cuotaMensual;
  const porcentajeIngresos = (compromisoTotal / datos.ingresosMensuales) * 100;
  const nivelRiesgo = porcentajeIngresos > 60 ? 'alto' : porcentajeIngresos > 50 ? 'medio' : 'bajo';

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
                  <p className="text-xs text-muted-foreground mb-1">Capital Propio Necesario</p>
                  <p className="font-bold">{formatEuro(resultadosPersonal.montoFinanciar + datos.ahorrosDisponibles)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Ahorros (Entrada)</p>
                  <p className="font-bold">{formatEuro(datos.ahorrosDisponibles)}</p>
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
                      ({formatEuro((datos.ingresosMensuales * 0.20) - totalDeudas)}/mes). 
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

              {!resultadosHipoteca.capitalPropioSuficiente && (
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

          {/* SECCIÓN 3: COMPROMISO FINANCIERO TOTAL */}
          <div className={`border-2 rounded-lg overflow-hidden ${
            nivelRiesgo === 'alto' ? 'border-destructive bg-destructive/5' :
            nivelRiesgo === 'medio' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' :
            'border-green-500 bg-green-50 dark:bg-green-950'
          }`}>
            <div className={`px-4 py-3 ${
              nivelRiesgo === 'alto' ? 'bg-destructive/10' :
              nivelRiesgo === 'medio' ? 'bg-amber-100 dark:bg-amber-900' :
              'bg-green-100 dark:bg-green-900'
            }`}>
              <span className="font-bold text-lg">📊 Compromiso Financiero Total</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                <div className="bg-background/80 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Cuota Hipotecaria</p>
                  <p className="text-lg font-bold">{formatEuro(resultadosHipoteca.cuotaMensual)}/mes</p>
                </div>
                <div className="bg-background/80 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Cuota Crédito Personal</p>
                  <p className="text-lg font-bold">{formatEuro(resultadosPersonal.cuotaMensual)}/mes</p>
                </div>
                <div className={`rounded-lg p-3 border-2 ${
                  nivelRiesgo === 'alto' ? 'border-destructive bg-destructive/10' :
                  nivelRiesgo === 'medio' ? 'border-amber-500 bg-amber-100 dark:bg-amber-900' :
                  'border-green-500 bg-green-100 dark:bg-green-900'
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Total Mensual</p>
                  <p className="text-xl font-bold">{formatEuro(compromisoTotal)}/mes</p>
                  <p className="text-xs text-muted-foreground">{porcentajeIngresos.toFixed(1)}% de ingresos</p>
                </div>
              </div>

              {nivelRiesgo === 'alto' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-center">
                  <p className="font-semibold text-destructive">
                    ⚠️ Atención: el compromiso total ({porcentajeIngresos.toFixed(1)}%) supera el 60% de los ingresos netos.
                    Riesgo elevado de sobreendeudamiento.
                  </p>
                </div>
              )}
              {nivelRiesgo === 'medio' && (
                <div className="p-3 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-center">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    ⚠️ Atención: el compromiso total ({porcentajeIngresos.toFixed(1)}%) supera el 50% de los ingresos netos.
                  </p>
                </div>
              )}
              {nivelRiesgo === 'bajo' && (
                <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
                  ✓ El compromiso financiero total está dentro de los parámetros recomendados.
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center italic">
                Este análisis es informativo. La cuota del crédito personal no afecta la aprobación hipotecaria.
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
              Exportar PDF Combinado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
