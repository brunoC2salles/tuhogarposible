// Sync: 2025-02-03 - Blue color scheme update
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator } from "lucide-react";
import { simuladorCreditoSchema, type SimuladorCreditoFormData } from "@/schemas/simuladorSchema";
import { calcularAmortizacionFrancesa, type ResultadosSimulacion as ResultadosType } from "@/lib/simuladorUtils";
import { ResultadosSimulacion } from "./ResultadosSimulacion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SimuladorCreditoPersonal() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const leadNombre = searchParams.get('leadNombre');
  
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [resultados, setResultados] = useState<ResultadosType | null>(null);
  const [datosFormulario, setDatosFormulario] = useState<SimuladorCreditoFormData | null>(null);
  const [salvandoNoLead, setSalvandoNoLead] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue
  } = useForm<SimuladorCreditoFormData>({
    resolver: zodResolver(simuladorCreditoSchema),
    mode: "onChange",
    defaultValues: {
      aceptaPrivacidad: false
    }
  });
  
  const watchAceptaPrivacidad = watch("aceptaPrivacidad");

  const onSubmit = (data: SimuladorCreditoFormData) => {
    try {
      const resultadosCalculados = calcularAmortizacionFrancesa({
        valorInmueble: data.valorInmueble,
        entrada: data.entrada,
        plazoMeses: data.plazoMeses,
        tasaAnual: data.tasaAnual,
        ingresos: data.ingresosMensuales,
        deudas: data.deudasActuales
      });

      setResultados(resultadosCalculados);
      setDatosFormulario(data);
      setResultadosOpen(true);
      
      toast.success("Simulación calculada con éxito");
    } catch (error) {
      console.error("Error al calcular simulación:", error);
      toast.error("Error al calcular la simulación");
    }
  };

  const handleSalvarNoLead = async () => {
    if (!leadId || !resultados || !datosFormulario) {
      toast.error('Ningún resultado disponible para guardar');
      return;
    }

    try {
      setSalvandoNoLead(true);
      
      const simuladorData = {
        montoSolicitado: resultados.montoFinanciar,
        plazoMeses: datosFormulario.plazoMeses,
        tasaInteres: datosFormulario.tasaAnual,
        cuotaMensual: resultados.cuotaMensual,
        totalPagar: resultados.montoTotalPagar,
        totalIntereses: resultados.totalIntereses
      };

      const { error } = await supabase
        .from('leads')
        .update({ 
          simulador_personal_data: simuladorData,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success(`Simulación guardada en el lead ${leadNombre}!`);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Error al guardar simulación en el lead');
    } finally {
      setSalvandoNoLead(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Simulador de Crédito Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Datos Personales</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
                  <Input
                    id="nombreCompleto"
                    {...register("nombreCompleto")}
                    placeholder="Ingrese su nombre completo"
                  />
                  {errors.nombreCompleto && (
                    <p className="text-sm text-destructive">{errors.nombreCompleto.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edad">Edad *</Label>
                  <Input
                    id="edad"
                    type="number"
                    {...register("edad", { valueAsNumber: true })}
                    placeholder="Edad (18-55 años)"
                    min="18"
                    max="55"
                  />
                  {errors.edad && (
                    <p className="text-sm text-destructive">{errors.edad.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Edad entre 18 y 55 años</p>
                </div>
              </div>
            </div>

            {/* Datos Financieros */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Datos Financieros</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ingresosMensuales">Ingresos Mensuales (€) *</Label>
                  <Input
                    id="ingresosMensuales"
                    type="number"
                    step="0.01"
                    {...register("ingresosMensuales", { valueAsNumber: true })}
                    placeholder="Ingrese sus ingresos mensuales"
                    min="1050"
                  />
                  {errors.ingresosMensuales && (
                    <p className="text-sm text-destructive">{errors.ingresosMensuales.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Ingresos mínimos: 1.050€</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deudasActuales">Deudas Actuales (€) *</Label>
                  <Input
                    id="deudasActuales"
                    type="number"
                    step="0.01"
                    {...register("deudasActuales", { valueAsNumber: true })}
                    placeholder="Ingrese el total de sus deudas"
                    min="0"
                  />
                  {errors.deudasActuales && (
                    <p className="text-sm text-destructive">{errors.deudasActuales.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entrada">Entrada - Pago Inicial (€) *</Label>
                  <Input
                    id="entrada"
                    type="number"
                    step="0.01"
                    {...register("entrada", { valueAsNumber: true })}
                    placeholder="Ingrese el pago inicial"
                    min="0"
                  />
                  {errors.entrada && (
                    <p className="text-sm text-destructive">{errors.entrada.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    No puede ser mayor que el valor del inmueble
                  </p>
                </div>
              </div>
            </div>

            {/* Datos del Préstamo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Datos del Préstamo</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorInmueble">Valor del Inmueble Deseado (€) *</Label>
                  <Input
                    id="valorInmueble"
                    type="number"
                    step="0.01"
                    {...register("valorInmueble", { valueAsNumber: true })}
                    placeholder="Valor del inmueble deseado"
                    min="1000"
                  />
                  {errors.valorInmueble && (
                    <p className="text-sm text-destructive">{errors.valorInmueble.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazoMeses">Plazo Deseado (meses) *</Label>
                  <Input
                    id="plazoMeses"
                    type="number"
                    {...register("plazoMeses", { valueAsNumber: true })}
                    placeholder="Plazo en meses (60-144)"
                    min="60"
                    max="144"
                  />
                  {errors.plazoMeses && (
                    <p className="text-sm text-destructive">{errors.plazoMeses.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Entre 60 meses (5 anos) y 144 meses (12 años)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tasaAnual">Tasa Anual de Interés (%) *</Label>
                  <Input
                    id="tasaAnual"
                    type="number"
                    step="0.01"
                    {...register("tasaAnual", { valueAsNumber: true })}
                    placeholder="6.00"
                    min="3"
                    max="12"
                  />
                  {errors.tasaAnual && (
                    <p className="text-sm text-destructive">{errors.tasaAnual.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Entre 3% y 12%</p>
                </div>
              </div>
            </div>

            {/* Checkbox de Política de Privacidad */}
            <div className="space-y-2 pt-4 border-t">
            <div className="flex items-start space-x-3 p-4 border-2 border-sky-blue/50 rounded-lg bg-sky-blue-light/20">
                <Checkbox 
                  id="aceptaPrivacidad" 
                  checked={watchAceptaPrivacidad}
                  onCheckedChange={(checked) => setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="aceptaPrivacidad" className="text-sm font-medium cursor-pointer">
                    <span className="font-bold text-sky-blue-dark block mb-1">LECTURA IMPORTANTE AL CLIENTE:</span>
                    <a 
                      href="/docs/consentimiento-hipotecario.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary underline hover:text-primary/80"
                    >
                      CONSENTIMIENTO PARA LA RECOLECCIÓN Y TRATAMIENTO DE DOCUMENTACIÓN HIPOTECARIA
                    </a>
                    <span className="block mt-1 text-xs text-muted-foreground">
                      Al marcar esta casilla, declaro haber leído y aceptar el documento de consentimiento *
                    </span>
                  </label>
                </div>
              </div>
              {errors.aceptaPrivacidad && (
                <p className="text-sm text-destructive">{errors.aceptaPrivacidad.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Limpiar
              </Button>
              <Button type="submit" disabled={!isValid}>
                <Calculator className="mr-2 h-4 w-4" />
                Calcular
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal de Resultados */}
      {resultados && datosFormulario && (
        <ResultadosSimulacion
          open={resultadosOpen}
          onOpenChange={setResultadosOpen}
          datos={datosFormulario}
          resultados={resultados}
          onSalvarNoLead={leadId ? handleSalvarNoLead : undefined}
          salvandoNoLead={salvandoNoLead}
          leadNombre={leadNombre ? decodeURIComponent(leadNombre) : undefined}
        />
      )}
    </div>
  );
}
