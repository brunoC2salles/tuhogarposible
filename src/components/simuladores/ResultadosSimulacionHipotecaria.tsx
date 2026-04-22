import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Save, Loader2, CheckCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatEuro, formatDateTime, type ResultadosSimulacionHipoteca } from "@/lib/simuladorUtils";
import { type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { generateSimulacionHipotecariaPDF } from "@/lib/pdfGenerator";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { comparePriceToMarket, formatMarketComparison } from "@/lib/marketPriceUtils";

interface ResultadosSimulacionHipotecariaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datos: SimuladorHipotecaFormData;
  resultados: ResultadosSimulacionHipoteca;
  onSalvarNoLead?: () => void;
  salvandoNoLead?: boolean;
  leadNombre?: string;
}

export function ResultadosSimulacionHipotecaria({
  open,
  onOpenChange,
  datos,
  resultados,
  onSalvarNoLead,
  salvandoNoLead,
  leadNombre
}: ResultadosSimulacionHipotecariaProps) {
  const { map: marketPrices } = useMarketPrices();
  
  const handleExportPDF = () => {
    generateSimulacionHipotecariaPDF(datos, resultados);
  };

  const plazoTexto = resultados.plazoMaximoMeses % 12 === 0 
    ? `${resultados.plazoMaximoAnios} años`
    : `${Math.floor(resultados.plazoMaximoAnios)} años y ${resultados.plazoMaximoMeses % 12} meses`;

  // Market comparison - use comunidad autónoma as proxy for municipality
  const marketComparison = marketPrices 
    ? comparePriceToMarket(marketPrices, datos.precioVivienda, null, datos.comunidadAutonoma)
    : null;

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
                <p className="text-xs text-muted-foreground mt-1">(35% ingresos - créditos - hijos - manutención)</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-500">
                <p className="text-sm text-muted-foreground mb-1">💰 Monto máximo a financiar</p>
                <p className="text-2xl font-bold text-green-600">{formatEuro(resultados.montoMaximoFinanciable)}</p>
                <p className="text-xs text-muted-foreground mt-1">(basado en su capacidad de pago mensual)</p>
              </div>
            </div>
          </div>

          {/* Precio Máximo de Inmueble Recomendado (Punto 1 + Punto 2) */}
          {resultados.aprobable && resultados.precioMaximoInmueble !== undefined && resultados.precioMaximoInmueble > 0 && (
            <div className="p-5 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">PRECIO MÁXIMO DE INMUEBLE RECOMENDADO</p>
                  <p className="text-3xl font-bold text-primary">{formatEuro(resultados.precioMaximoInmueble)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Guía para buscar ofertas dentro de la capacidad real del cliente
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t pt-3">
                <div>
                  <p className="text-muted-foreground">Tope por ahorros (Punto 1)</p>
                  <p className="font-semibold">{formatEuro(resultados.precioMaxPorAhorros || 0)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    CPmax {formatEuro(resultados.creditoPersonalMaximo || 0)} / {((resultados.tasaITPAplicada || 0) * 100).toFixed(1).replace('.', ',')}% ITP
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tope por ingresos (Punto 2)</p>
                  <p className="font-semibold">{formatEuro(resultados.precioMaxPorIngresos || 0)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Hipoteca máx. {formatEuro(resultados.montoMaximoFinanciable)} / {resultados.porcentajeFinanciamiento.toFixed(0)}% financiación
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 italic">
                Se aplica el menor de los dos topes (regla del más restrictivo).
              </p>
            </div>
          )}

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

          {/* Contexto de Mercado */}
          {marketComparison && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {marketComparison.diferenciaPorcentaje > 5 ? (
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                ) : marketComparison.diferenciaPorcentaje < -5 ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                CONTEXTO DE MERCADO
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Precio medio en <strong>{marketComparison.municipio}</strong>: {formatEuro(marketComparison.precioMedioMercado)}
                {marketComparison.precioM2Mercado > 0 && ` (${marketComparison.precioM2Mercado.toLocaleString('es-ES')}€/m²)`}
              </p>
              <Badge 
                variant={Math.abs(marketComparison.diferenciaPorcentaje) <= 5 ? 'secondary' : 'outline'}
                className={
                  marketComparison.diferenciaPorcentaje > 20 ? 'border-destructive text-destructive' :
                  marketComparison.diferenciaPorcentaje > 5 ? 'border-amber-500 text-amber-600' :
                  marketComparison.diferenciaPorcentaje < -5 ? 'border-green-500 text-green-600' : ''
                }
              >
                {formatMarketComparison(marketComparison)}
              </Badge>
              {marketComparison.totalInformados < 10 && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  ⚠️ Datos basados en una muestra pequeña ({marketComparison.totalInformados} inmuebles)
                </p>
              )}
            </div>
          )}

          {/* Badge de Aprobação */}
          <div className="flex flex-col items-center gap-3">
            {resultados.aprobable ? (
              <>
                <Badge className="text-base px-6 py-2 bg-green-500 hover:bg-green-600">
                  ✓ HIPOTECA APROBABLE
                </Badge>
                {!resultados.capitalPropioSuficiente && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm max-w-2xl">
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">⚠️ Capital Propio Insuficiente</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      <strong>Capital propio necesario:</strong> {formatEuro(resultados.capitalPropioNecesario)}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      <strong>Ahorros disponibles:</strong> {formatEuro(datos.ahorrosDisponibles)}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-2">
                      <strong>Faltan:</strong> {formatEuro(resultados.capitalPropioNecesario - datos.ahorrosDisponibles)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      La hipoteca es aprobable por capacidad de pago, pero necesitarás más capital propio para cubrir entrada e impuestos.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <Badge variant="destructive" className="text-base px-6 py-2">
                  ✗ HIPOTECA NO APROBABLE
                </Badge>
                {resultados.razonNoAprobado && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm max-w-2xl">
                    <p className="font-semibold text-red-800 dark:text-red-200 mb-2">❌ Razón de No Aprobación</p>
                    <p className="text-red-700 dark:text-red-300">
                      {resultados.razonNoAprobado}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Se requiere un mínimo de 3 meses de antigüedad tanto en la empresa como continuada para todos los titulares.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detalles adicionales */}
          <div className="text-sm text-muted-foreground space-y-2 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-1">Datos de la Vivienda</p>
                <p><strong>Comunidad:</strong> {datos.comunidadAutonoma}</p>
                <p><strong>Familia numerosa:</strong> {datos.familiaNumerosa ? 'Sí' : 'No'}</p>
                <p><strong>Menor de 35 años:</strong> {datos.menorDe35 ? 'Sí' : 'No'}</p>
                <p><strong>Finalidad:</strong> {datos.finalidadCompra.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Situación Laboral</p>
                <p><strong>Titular principal:</strong> {datos.situacionLaboral === 'autonomo' ? 'Autónomo' : 'Empleado'}</p>
                <p><strong>Tipo de contrato:</strong> {datos.tipoContrato.replace(/_/g, ' ')}</p>
                <p><strong>Antigüedad empresa:</strong> {datos.antiguedadEmpresaAnios}a {datos.antiguedadEmpresaMeses}m</p>
                <p><strong>Antigüedad continuada:</strong> {datos.antiguedadContinuadaAnios}a {datos.antiguedadContinuadaMeses}m</p>
              </div>
            </div>
            
            {datos.numeroTitulares !== '1' && datos.titulares && datos.titulares.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold mb-1">Titulares Adicionales</p>
                {datos.titulares.map((titular, index) => (
                  <div key={index} className="ml-4 mb-2">
                    <p><strong>Titular {index + 2}:</strong> {titular.nombreCompleto} ({titular.edad} años)</p>
                    <p className="text-xs">
                      {titular.situacionLaboral === 'autonomo' ? 'Autónomo' : 'Empleado'} • 
                      Ingresos: {formatEuro(titular.ingresosMensuales)}/mes • 
                      Antigüedad continuada: {titular.antiguedadContinuadaAnios}a {titular.antiguedadContinuadaMeses}m
                    </p>
                  </div>
                ))}
              </div>
            )}

            {datos.tieneCreditos && datos.creditos && datos.creditos.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold mb-1">Créditos Pendientes</p>
                {datos.creditos.map((credito, index) => (
                  <p key={index} className="ml-4 text-xs">
                    • {credito.tipo.replace(/_/g, ' ')}: {formatEuro(credito.cuotaMensual)}/mes
                  </p>
                ))}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-1">Datos Personales</p>
                <p><strong>Estado civil:</strong> {datos.estadoCivil}</p>
                {datos.estadoCivil === 'casado' && datos.regimenMatrimonial && (
                  <p><strong>Régimen:</strong> {datos.regimenMatrimonial.replace(/_/g, ' ')}</p>
                )}
                {datos.estadoCivil === 'divorciado' && datos.pagaManutención && datos.valorManutención && (
                  <p><strong>Manutención:</strong> {formatEuro(datos.valorManutención)}/mes</p>
                )}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground italic bg-muted/30 p-4 rounded">
            Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos 
            y sujetos a aprobación crediticia. Esta simulación no constituye una oferta vinculante. 
            Para información oficial, consulte con nuestros asesores.
          </div>

          {/* Badge de Política de Privacidad */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Política de Privacidad aceptada conforme al RGPD
            </span>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col gap-2">
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
            
            <Button onClick={handleExportPDF} variant="outline" className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Exportar a PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
