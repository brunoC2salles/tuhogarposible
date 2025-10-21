import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
import { simuladorHipotecaSchema, type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { calcularSimulacionHipoteca, type ResultadosSimulacionHipoteca } from "@/lib/simuladorUtils";
import { ResultadosSimulacionHipotecaria } from "./ResultadosSimulacionHipotecaria";
import { toast } from "sonner";

export function SimuladorCreditoHipotecario() {
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [resultados, setResultados] = useState<ResultadosSimulacionHipoteca | null>(null);
  const [datosFormulario, setDatosFormulario] = useState<SimuladorHipotecaFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset
  } = useForm<SimuladorHipotecaFormData>({
    resolver: zodResolver(simuladorHipotecaSchema),
    mode: "onChange",
    defaultValues: {
      familiaNumerosa: false,
      menorDe35: false,
      porcentajeFinanciamiento: 100
    }
  });

  const familiaNumerosa = watch("familiaNumerosa");
  const menorDe35 = watch("menorDe35");

  const onSubmit = (data: SimuladorHipotecaFormData) => {
    try {
      const resultadosCalculados = calcularSimulacionHipoteca({
        precioVivienda: data.precioVivienda,
        comunidadAutonoma: data.comunidadAutonoma,
        familiaNumerosa: data.familiaNumerosa,
        menorDe35: data.menorDe35,
        situacionLaboral: data.situacionLaboral,
        ingresosMensuales: data.ingresosMensuales,
        creditosPendientes: data.creditosPendientes,
        edad: data.edad,
        tasaAnual: data.tasaAnual,
        porcentajeFinanciamiento: data.porcentajeFinanciamiento
      });

      setResultados(resultadosCalculados);
      setDatosFormulario(data);
      setResultadosOpen(true);
      
      toast.success("Simulación hipotecaria calculada con éxito");
    } catch (error) {
      console.error("Error al calcular simulación:", error);
      toast.error("Error al calcular la simulación hipotecaria");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Home className="h-6 w-6" />
            Simulador de Crédito Hipotecario
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
                    max="65"
                  />
                  {errors.edad && (
                    <p className="text-sm text-destructive">{errors.edad.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Edad entre 18 y 65 años</p>
                </div>
              </div>
            </div>

            {/* Datos de la Vivienda */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Datos de la Vivienda</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioVivienda">Precio de la Vivienda (€) *</Label>
                  <Input
                    id="precioVivienda"
                    type="number"
                    step="0.01"
                    {...register("precioVivienda", { valueAsNumber: true })}
                    placeholder="200000.00"
                    min="10000"
                  />
                  {errors.precioVivienda && (
                    <p className="text-sm text-destructive">{errors.precioVivienda.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comunidadAutonoma">Comunidad Autónoma *</Label>
                  <Select onValueChange={(value) => setValue("comunidadAutonoma", value as any, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una comunidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Madrid">Madrid (6%)</SelectItem>
                      <SelectItem value="Cataluña">Cataluña (10%)</SelectItem>
                      <SelectItem value="Andalucía">Andalucía (8%)</SelectItem>
                      <SelectItem value="Valencia">Valencia (10%)</SelectItem>
                      <SelectItem value="Otros">Otros (9%)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.comunidadAutonoma && (
                    <p className="text-sm text-destructive">{errors.comunidadAutonoma.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Gastos e impuestos según comunidad</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="familiaNumerosa"
                    checked={familiaNumerosa}
                    onCheckedChange={(checked) => setValue("familiaNumerosa", checked === true, { shouldValidate: true })}
                  />
                  <Label htmlFor="familiaNumerosa" className="cursor-pointer">
                    Familia Numerosa (50% de descuento en gastos)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="menorDe35"
                    checked={menorDe35}
                    onCheckedChange={(checked) => setValue("menorDe35", checked === true, { shouldValidate: true })}
                  />
                  <Label htmlFor="menorDe35" className="cursor-pointer">
                    Menor de 35 años (10% de descuento adicional)
                  </Label>
                </div>
              </div>
            </div>

            {/* Datos Financieros */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Datos Financieros</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="situacionLaboral">Situación Laboral *</Label>
                  <Select onValueChange={(value) => setValue("situacionLaboral", value as any, { shouldValidate: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione situación laboral" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="autonomo">Autónomo</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.situacionLaboral && (
                    <p className="text-sm text-destructive">{errors.situacionLaboral.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingresosMensuales">Ingresos Mensuales (€) *</Label>
                  <Input
                    id="ingresosMensuales"
                    type="number"
                    step="0.01"
                    {...register("ingresosMensuales", { valueAsNumber: true })}
                    placeholder="3000.00"
                    min="1"
                  />
                  {errors.ingresosMensuales && (
                    <p className="text-sm text-destructive">{errors.ingresosMensuales.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditosPendientes">Créditos Pendientes - Cuotas Mensuales (€) *</Label>
                  <Input
                    id="creditosPendientes"
                    type="number"
                    step="0.01"
                    {...register("creditosPendientes", { valueAsNumber: true })}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.creditosPendientes && (
                    <p className="text-sm text-destructive">{errors.creditosPendientes.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cuotas mensuales de otros préstamos o créditos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tasaAnual">Tasa Anual de Interés (%) *</Label>
                  <Input
                    id="tasaAnual"
                    type="number"
                    step="0.01"
                    {...register("tasaAnual", { valueAsNumber: true })}
                    placeholder="3.50"
                    min="1"
                    max="15"
                  />
                  {errors.tasaAnual && (
                    <p className="text-sm text-destructive">{errors.tasaAnual.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Entre 1% y 15% (típicamente 3-5%)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="porcentajeFinanciamiento">Porcentaje de Financiamiento (%) *</Label>
                  <Input
                    id="porcentajeFinanciamiento"
                    type="number"
                    step="1"
                    {...register("porcentajeFinanciamiento", { valueAsNumber: true })}
                    placeholder="100"
                    min="1"
                    max="100"
                  />
                  {errors.porcentajeFinanciamiento && (
                    <p className="text-sm text-destructive">{errors.porcentajeFinanciamiento.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Porcentaje del valor de la vivienda a financiar (default: 100%)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Limpiar
              </Button>
              <Button type="submit" disabled={!isValid}>
                <Home className="mr-2 h-4 w-4" />
                Calcular
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal de Resultados */}
      {resultados && datosFormulario && (
        <ResultadosSimulacionHipotecaria
          open={resultadosOpen}
          onOpenChange={setResultadosOpen}
          datos={datosFormulario}
          resultados={resultados}
        />
      )}
    </div>
  );
}
