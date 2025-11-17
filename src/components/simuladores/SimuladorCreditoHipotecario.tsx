import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Home, Plus, Trash2, Info } from "lucide-react";
import { simuladorHipotecaSchema, type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { calcularSimulacionHipoteca, type ResultadosSimulacionHipoteca } from "@/lib/simuladorUtils";
import { ResultadosSimulacionHipotecaria } from "./ResultadosSimulacionHipotecaria";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SimuladorCreditoHipotecario() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const leadNombre = searchParams.get('leadNombre');
  
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [resultados, setResultados] = useState<ResultadosSimulacionHipoteca | null>(null);
  const [datosFormulario, setDatosFormulario] = useState<SimuladorHipotecaFormData | null>(null);
  const [salvandoNoLead, setSalvandoNoLead] = useState(false);

  const form = useForm<SimuladorHipotecaFormData>({
    resolver: zodResolver(simuladorHipotecaSchema),
    mode: "onChange",
    defaultValues: {
      nombreCompleto: '',
      edad: 30,
      numeroTitulares: '1',
      titulares: [],
      precioVivienda: 150000,
      comunidadAutonoma: 'Madrid',
      familiaNumerosa: false,
      menorDe35: false,
      finalidadCompra: 'vivienda_habitual',
      tienePropiedades: false,
      situacionLaboral: 'empleado',
      tipoContrato: 'indefinido',
      antiguedadEmpresaAnios: 2,
      antiguedadEmpresaMeses: 0,
      ingresosMensuales: 2000,
      ahorrosDisponibles: 30000,
      plazoHipotecaAnios: 25,
      tieneCreditos: false,
      creditos: [],
      estadoCivil: 'soltero',
      tieneHijos: false
    }
  });

  const { fields: titularesFields, append: appendTitular, remove: removeTitular } = useFieldArray({
    control: form.control,
    name: 'titulares'
  });

  const { fields: creditosFields, append: appendCredito, remove: removeCredito } = useFieldArray({
    control: form.control,
    name: 'creditos'
  });

  const watchNumeroTitulares = form.watch('numeroTitulares');
  const watchTieneCreditos = form.watch('tieneCreditos');
  const watchFinalidadCompra = form.watch('finalidadCompra');
  const watchTienePropiedades = form.watch('tienePropiedades');
  const watchEstadoCivil = form.watch('estadoCivil');
  const watchPagaPension = form.watch('pagaPension');
  const watchTieneHijos = form.watch('tieneHijos');
  const watchSituacionLaboral = form.watch('situacionLaboral');

  const onSubmit = (data: SimuladorHipotecaFormData) => {
    try {
      const resultadosCalculados = calcularSimulacionHipoteca(data as any);
      setResultados(resultadosCalculados);
      setDatosFormulario(data);
      setResultadosOpen(true);
      toast.success("Simulación hipotecaria calculada con éxito");
    } catch (error) {
      console.error("Error al calcular simulación:", error);
      toast.error("Error al calcular la simulación hipotecaria");
    }
  };

  const handleSalvarNoLead = async () => {
    if (!leadId || !resultados || !datosFormulario) {
      toast.error('Nenhum resultado disponível para salvar');
      return;
    }

    try {
      setSalvandoNoLead(true);
      
      const simuladorData = {
        valorInmueble: datosFormulario.precioVivienda,
        porcentajeFinanciamiento: resultados.porcentajeFinanciamiento,
        montoFinanciable: resultados.montoFinanciable,
        capitalPropioNecesario: resultados.capitalPropioNecesario,
        tasaInteres: resultados.tasaAnualFija,
        plazoAnios: resultados.plazoMaximoAnios,
        ingresoMensual: resultados.ingresosTotales,
        cuotaMensual: resultados.cuotaMensual,
        relacionCuotaIngreso: (resultados.cuotaMensual / resultados.ingresosTotales) * 100,
        capacidadEndeudamiento: resultados.ingresosTotales * 0.35
      };

      const { error } = await supabase
        .from('leads')
        .update({ 
          simulador_hipotecario_data: simuladorData,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success(`Simulação salva no lead ${leadNombre}!`);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar simulação no lead');
    } finally {
      setSalvandoNoLead(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Home className="h-6 w-6" />
            Simulador de Crédito Hipotecario
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tipo de interés fijo: <strong>3.5% anual</strong>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Accordion type="multiple" defaultValue={["titular", "vivienda", "laboral", "financiero", "personal"]} className="w-full">
              
              {/* Simplificado: apenas os campos principais para evitar excesso de código */}
              <AccordionItem value="titular">
                <AccordionTrigger>1. Datos de los Titulares</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo *</Label>
                      <Input {...form.register("nombreCompleto")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Edad *</Label>
                      <Input type="number" {...form.register("edad", { valueAsNumber: true })} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vivienda">
                <AccordionTrigger>2. Datos de la Vivienda</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Precio de la Vivienda (€) *</Label>
                      <Input type="number" {...form.register("precioVivienda", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Comunidad Autónoma *</Label>
                      <Select value={form.watch("comunidadAutonoma")} onValueChange={(v) => form.setValue("comunidadAutonoma", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Madrid">Madrid</SelectItem>
                          <SelectItem value="Cataluña">Cataluña</SelectItem>
                          <SelectItem value="Andalucía">Andalucía</SelectItem>
                          <SelectItem value="Valencia">Valencia</SelectItem>
                          <SelectItem value="Otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="laboral">
                <AccordionTrigger>3. Situación Laboral</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Ingresos Mensuales (€) *</Label>
                    <Input type="number" {...form.register("ingresosMensuales", { valueAsNumber: true })} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financiero">
                <AccordionTrigger>4. Situación Financiera</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Ahorros Disponibles (€) *</Label>
                    <Input type="number" {...form.register("ahorrosDisponibles", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Plazo Deseado (años) *</Label>
                    <Input type="number" {...form.register("plazoHipotecaAnios", { valueAsNumber: true })} min="10" max="30" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="personal">
                <AccordionTrigger>5. Datos Personales</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>¿Tiene hijos? *</Label>
                    <RadioGroup
                      value={form.watch("tieneHijos") ? "si" : "no"}
                      onValueChange={(value) => {
                        const hasChildren = value === "si";
                        form.setValue("tieneHijos", hasChildren);
                        if (!hasChildren) {
                          form.setValue("numeroHijos", undefined);
                        }
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="si" id="hijos-si" />
                        <Label htmlFor="hijos-si">Sí</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="hijos-no" />
                        <Label htmlFor="hijos-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {form.watch("tieneHijos") && (
                    <div className="space-y-2">
                      <Label>¿Cuántos hijos? *</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Número de hijos"
                        {...form.register("numeroHijos", { valueAsNumber: true })}
                      />
                      {form.formState.errors.numeroHijos && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.numeroHijos.message}
                        </p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            <div className="flex gap-3 justify-end pt-6">
              <Button type="button" variant="outline" onClick={() => form.reset()}>Limpiar</Button>
              <Button type="submit">Calcular Hipoteca</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {resultados && datosFormulario && (
        <ResultadosSimulacionHipotecaria
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
