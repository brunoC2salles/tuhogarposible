import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calculator } from "lucide-react";
import { simuladorCreditoSchema, type SimuladorCreditoFormData } from "@/schemas/simuladorSchema";
import { calcularAmortizacionFrancesa, type ResultadosSimulacion as ResultadosType } from "@/lib/simuladorUtils";
import { ResultadosSimulacion } from "./ResultadosSimulacion";
import { toast } from "sonner";

export function SimuladorCreditoPersonal() {
  const [open, setOpen] = useState(false);
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [resultados, setResultados] = useState<ResultadosType | null>(null);
  const [datosFormulario, setDatosFormulario] = useState<SimuladorCreditoFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<SimuladorCreditoFormData>({
    resolver: zodResolver(simuladorCreditoSchema),
    mode: "onChange"
  });

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
      setOpen(false);
      setResultadosOpen(true);
      
      toast.success("Simulación calculada con éxito");
    } catch (error) {
      console.error("Error al calcular simulación:", error);
      toast.error("Error al calcular la simulación");
    }
  };

  const handleDialogClose = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full">
            <Calculator className="mr-2 h-5 w-5" />
            Abrir Simulador
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Simulador de Crédito Personal</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Accordion type="single" collapsible defaultValue="datos-personales" className="w-full">
              {/* Datos Personales */}
              <AccordionItem value="datos-personales">
                <AccordionTrigger className="text-lg font-semibold">
                  Datos Personales
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
                    <Input
                      id="nombreCompleto"
                      {...register("nombreCompleto")}
                      placeholder="Juan Pérez García"
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
                      placeholder="30"
                      min="18"
                      max="55"
                    />
                    {errors.edad && (
                      <p className="text-sm text-destructive">{errors.edad.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Edad entre 18 y 55 años</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Datos Financieros */}
              <AccordionItem value="datos-financieros">
                <AccordionTrigger className="text-lg font-semibold">
                  Datos Financieros
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ingresosMensuales">Ingresos Mensuales (€) *</Label>
                    <Input
                      id="ingresosMensuales"
                      type="number"
                      step="0.01"
                      {...register("ingresosMensuales", { valueAsNumber: true })}
                      placeholder="3000.00"
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
                      placeholder="500.00"
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
                      placeholder="0.00"
                      min="0"
                    />
                    {errors.entrada && (
                      <p className="text-sm text-destructive">{errors.entrada.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      No puede ser mayor que el valor del inmueble
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Datos del Préstamo */}
              <AccordionItem value="datos-prestamo">
                <AccordionTrigger className="text-lg font-semibold">
                  Datos del Préstamo
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="valorInmueble">Valor del Inmueble Deseado (€) *</Label>
                    <Input
                      id="valorInmueble"
                      type="number"
                      step="0.01"
                      {...register("valorInmueble", { valueAsNumber: true })}
                      placeholder="100000.00"
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
                      placeholder="72"
                      min="60"
                      max="144"
                    />
                    {errors.plazoMeses && (
                      <p className="text-sm text-destructive">{errors.plazoMeses.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Entre 60 meses (5 años) y 144 meses (12 años)
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid}>
                <Calculator className="mr-2 h-4 w-4" />
                Calcular
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Resultados */}
      {resultados && datosFormulario && (
        <ResultadosSimulacion
          open={resultadosOpen}
          onOpenChange={setResultadosOpen}
          datos={datosFormulario}
          resultados={resultados}
        />
      )}
    </>
  );
}
