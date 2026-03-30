import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, X, CheckCircle } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacion, type ResultadosSimulacionHipoteca, getTasaITP } from "@/lib/simuladorUtils";
import { type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionCombinadaPDF } from "@/lib/pdfGenerator";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { getMarketPrice } from "@/lib/marketPriceUtils";

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
  const { map: marketMap } = useMarketPrices();
  const totalDeudas = datos.creditos?.reduce((s, c) => s + c.cuotaMensual, 0) ?? 0;

  // Calculate max property price considering personal credit + savings
  const porcentajeFinanciamiento = resultadosHipoteca.porcentajeFinanciamiento || 80;
  const pctDecimal = porcentajeFinanciamiento / 100;

  // Constraint 1: mortgage ceiling
  const precioMaxHipoteca = pctDecimal > 0
    ? resultadosHipoteca.montoMaximoFinanciable / pctDecimal
    : 0;

  // Constraint 2: capital available (savings + max personal credit) must cover down payment + taxes + 2000€ fixed costs
  const tasaITP = getTasaITP(datos.comunidadAutonoma, datos.familiaNumerosa, datos.menorDe35);
  const fondosDisponibles = (datos.ahorrosDisponibles || 0) + resultadosPersonal.montoMaximoCredito;
  const denominadorCapital = (1 - pctDecimal) + tasaITP;
  const precioMaxCapital = denominadorCapital > 0
    ? (fondosDisponibles - 2000) / denominadorCapital
    : 0;

  // Effective max = min of both constraints (both must hold)
  const precioMaximoVivienda = Math.max(0, Math.min(precioMaxHipoteca, precioMaxCapital));

  // Market price for context
  const marketPrice = marketMap ? getMarketPrice(marketMap, datos.comunidadAutonoma) : null;

  // Calculate max personal credit cuota using French amortization
  const tasaMensualPersonal = datos.tasaAnual / 12 / 100;
  const cuotaMaxPersonal = tasaMensualPersonal > 0 && datos.plazoMeses > 0
    ? resultadosPersonal.montoMaximoCredito * (tasaMensualPersonal * Math.pow(1 + tasaMensualPersonal, datos.plazoMeses)) / (Math.pow(1 + tasaMensualPersonal, datos.plazoMeses) - 1)
    : resultadosPersonal.montoMaximoCredito / (datos.plazoMeses || 1);
  const cuotaMaxHipoteca = resultadosHipoteca.hipotecaMaximaMensual;
  const cuotaTotalMaxima = cuotaMaxPersonal + cuotaMaxHipoteca;

  const compromisoTotal = resultadosPersonal.cuotaMensual + resultadosHipoteca.cuotaMensual;
  const porcentajeIngresos = (compromisoTotal / datos.ingresosMensuales) * 100;
  const nivelRiesgo = porcentajeIngresos > 60 ? 'alto' : porcentajeIngresos > 50 ? 'medio' : 'bajo';

  // Combined approval logic: if personal credit covers the capital gap, mortgage is approvable
  const personalCubreGap = resultadosPersonal.cualificado &&
    resultadosPersonal.montoFinanciar <= resultadosPersonal.montoMaximoCredito;

  const otrosCriteriosHipotecaCumplen =
    resultadosHipoteca.cuotaMensual <= resultadosHipoteca.hipotecaMaximaMensual &&
    resultadosHipoteca.hipotecaMaximaMensual >= 350 &&
    resultadosHipoteca.montoFinanciable >= 70000 &&
    resultadosHipoteca.montoFinanciable <= resultadosHipoteca.montoMaximoFinanciable;

  const hipotecaAprobableConPersonal = !resultadosHipoteca.aprobable &&
    !resultadosHipoteca.capitalPropioSuficiente &&
    personalCubreGap &&
    otrosCriteriosHipotecaCumplen;

  const hipotecaAprobableFinal = resultadosHipoteca.aprobable || hipotecaAprobableConPersonal;

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
              <span className="text-primary-foreground font-bold text-lg">Crédito Personal de Acuerdo con Documentación</span>
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

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  <strong>Monto extra a financiar:</strong> {formatEuro(resultadosPersonal.montoFinanciar)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  El crédito personal será otorgado mediante la subida de documentación correspondiente.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                {resultadosPersonal.cualificado ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-sm py-1 px-4">✓ CANDIDATO CUALIFICADO</Badge>
                ) : (
                  <>
                    <Badge variant="destructive" className="text-sm py-1 px-4">⚠️ CANDIDATO NO CUALIFICADO</Badge>
                    <p className="text-xs text-destructive text-center max-w-md">
                      El monto solicitado ({formatEuro(resultadosPersonal.montoFinanciar)}) supera el crédito máximo disponible 
                      ({formatEuro(resultadosPersonal.montoMaximoCredito)}). 
                      Fórmula: máx. crédito = (ingresos × 20%) − deudas
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CRÉDITO HIPOTECARIO */}
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
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Hipoteca Máxima</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(resultadosHipoteca.montoMaximoFinanciable)}</p>
                      <div className="mt-1.5 pt-1.5 border-t border-green-200 dark:border-green-800">
                        <p className="text-[10px] text-muted-foreground">Cuota mensual máxima</p>
                        <p className="text-sm font-semibold text-primary">{formatEuro(cuotaMaxHipoteca)}/mes</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">35% ingresos líquidos</p>
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
                      <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">Hipoteca + Crédito personal + Ahorros</p>
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

              {!resultadosHipoteca.capitalPropioSuficiente && !hipotecaAprobableConPersonal && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Capital Propio Insuficiente</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Faltan: <strong>{formatEuro(resultadosHipoteca.capitalPropioNecesario - datos.ahorrosDisponibles)}</strong> para cubrir entrada e impuestos.
                  </p>
                </div>
              )}

              {!resultadosHipoteca.capitalPropioSuficiente && hipotecaAprobableConPersonal && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">Capital cubierto por crédito personal</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    El crédito personal cubre los <strong>{formatEuro(resultadosHipoteca.capitalPropioNecesario - datos.ahorrosDisponibles)}</strong> restantes para entrada e impuestos.
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
                {hipotecaAprobableFinal ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-sm py-1 px-4">
                    {hipotecaAprobableConPersonal ? '✓ HIPOTECA APROBABLE (con crédito personal)' : '✓ HIPOTECA APROBABLE'}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-sm py-1 px-4">✗ HIPOTECA NO APROBABLE</Badge>
                )}
              </div>

              {resultadosHipoteca.razonNoAprobado && !hipotecaAprobableConPersonal && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <p className="font-semibold text-destructive">Razón de No Aprobación:</p>
                  <p className="text-destructive/80 mt-1">{resultadosHipoteca.razonNoAprobado}</p>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: PLAN DE PAGOS TEMPORAL */}
          {(() => {
            const fase1Meses = datos.plazoMeses;
            const fase2Meses = resultadosHipoteca.plazoMaximoMeses - datos.plazoMeses;
            const cuotaFase1 = resultadosHipoteca.cuotaMensual + resultadosPersonal.cuotaMensual;
            const cuotaFase2 = resultadosHipoteca.cuotaMensual;
            const totalFase1 = fase1Meses * cuotaFase1;
            const totalFase2 = Math.max(0, fase2Meses) * cuotaFase2;
            const costoTotal = totalFase1 + totalFase2;
            const ahorroMensual = resultadosPersonal.cuotaMensual;

            const fase1Anios = Math.floor(fase1Meses / 12);
            const fase1MesesResto = fase1Meses % 12;
            const fase1Texto = fase1MesesResto > 0 ? `${fase1Anios} años y ${fase1MesesResto} meses` : `${fase1Anios} años`;

            const fase2AniosInicio = fase1Anios + (fase1MesesResto > 0 ? 1 : 0);
            const fase2Texto = fase2Meses > 0
              ? `Año ${fase1Anios + 1} – ${resultadosHipoteca.plazoMaximoAnios}`
              : null;

            const barFase1Pct = Math.min(100, (fase1Meses / resultadosHipoteca.plazoMaximoMeses) * 100);

            return (
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
                  <span className="font-bold text-lg">Plan de Pagos — Compromiso Financiero Total</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Timeline bar */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Línea temporal de pagos</p>
                    <div className="flex h-6 rounded-md overflow-hidden border">
                      <div
                        className="bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                        style={{ width: `${barFase1Pct}%` }}
                      >
                        Fase 1
                      </div>
                      {fase2Meses > 0 && (
                        <div
                          className="bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground"
                          style={{ width: `${100 - barFase1Pct}%` }}
                        >
                          Fase 2
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fase 1 */}
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-bold text-primary">Fase 1 — Primeros {fase1Texto}</p>
                    <p className="text-xs text-muted-foreground">Hipoteca + Crédito Personal</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold">{formatEuro(cuotaFase1)}/mes</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatEuro(resultadosHipoteca.cuotaMensual)} hipoteca + {formatEuro(resultadosPersonal.cuotaMensual)} personal)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {porcentajeIngresos.toFixed(1)}% de los ingresos netos
                    </p>
                  </div>

                  {/* Fase 2 */}
                  {fase2Meses > 0 && fase2Texto && (
                    <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 space-y-1">
                      <p className="text-sm font-bold text-secondary-foreground">Fase 2 — {fase2Texto}</p>
                      <p className="text-xs text-muted-foreground">Solo hipoteca (crédito personal liquidado)</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold">{formatEuro(cuotaFase2)}/mes</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ↓ Ahorro de {formatEuro(ahorroMensual)}/mes
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {((cuotaFase2 / datos.ingresosMensuales) * 100).toFixed(1)}% de los ingresos netos
                      </p>
                    </div>
                  )}

                  {/* Resumen total */}
                  <div className="bg-muted/50 border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Resumen del coste total de adquisición</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Fase 1 ({fase1Meses} cuotas)</p>
                        <p className="font-bold">{formatEuro(totalFase1)}</p>
                      </div>
                      {fase2Meses > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Fase 2 ({fase2Meses} cuotas)</p>
                          <p className="font-bold">{formatEuro(totalFase2)}</p>
                        </div>
                      )}
                      <div className="border-2 border-primary rounded-lg p-1">
                        <p className="text-xs text-primary font-medium">Total Pagado</p>
                        <p className="text-lg font-bold text-primary">{formatEuro(costoTotal)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Capital: {formatEuro(resultadosHipoteca.montoFinanciable + resultadosPersonal.montoFinanciar)}
                          {' · '}Intereses: {formatEuro(costoTotal - resultadosHipoteca.montoFinanciable - resultadosPersonal.montoFinanciar)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {nivelRiesgo === 'alto' && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-center">
                      <p className="font-semibold text-destructive">
                        Atención: el compromiso total en Fase 1 ({porcentajeIngresos.toFixed(1)}%) supera el 60% de los ingresos netos. Riesgo elevado de sobreendeudamiento.
                      </p>
                    </div>
                  )}
                  {nivelRiesgo === 'medio' && (
                    <div className="p-3 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-center">
                      <p className="font-semibold text-amber-800 dark:text-amber-200">
                        Atención: el compromiso total en Fase 1 ({porcentajeIngresos.toFixed(1)}%) supera el 50% de los ingresos netos.
                      </p>
                    </div>
                  )}
                  {nivelRiesgo === 'bajo' && (
                    <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
                      ✓ El compromiso financiero total está dentro de los parámetros recomendados.
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground text-center italic">
                    Este análisis es informativo. La cuota del crédito personal no afecta la aprobación hipotecaria. Las parcelas disminuyen tras liquidar el crédito personal.
                  </p>
                </div>
              </div>
            );
          })()}

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
