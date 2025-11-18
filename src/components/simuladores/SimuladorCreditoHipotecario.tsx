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
import { Home, Plus, Trash2, Info, Calculator } from "lucide-react";
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
      antiguedadContinuadaAnios: 2,
      antiguedadContinuadaMeses: 0,
      ingresosMensuales: undefined,
      numeroPagas: 12,
      cobraBonusAnual: false,
      ahorrosDisponibles: undefined,
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
      toast.error('Ningún resultado disponible para guardar');
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

      toast.success(`Simulación guardada en el lead ${leadNombre}!`);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Error al guardar simulación en el lead');
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
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Complete todos los campos marcados con <strong>*</strong> para calcular su hipoteca.
            </AlertDescription>
          </Alert>
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
              <Input {...form.register("nombreCompleto")} placeholder="Ingrese su nombre completo" />
                    </div>
                    <div className="space-y-2">
                      <Label>Edad *</Label>
                      <Input type="number" {...form.register("edad", { valueAsNumber: true })} min="18" max="65" placeholder="Edad (18-65 años)" />
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
                      <Input type="number" {...form.register("precioVivienda", { valueAsNumber: true })} min="1000" placeholder="Precio de la vivienda en euros" />
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

                  {/* Finalidad de Compra */}
                  <div className="space-y-2">
                    <Label>Finalidad de la Compra *</Label>
                    <Select value={watchFinalidadCompra} onValueChange={(v) => form.setValue("finalidadCompra", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vivienda_habitual">Vivienda Habitual</SelectItem>
                        <SelectItem value="segunda_residencia">Segunda Residencia</SelectItem>
                        <SelectItem value="inversion">Inversión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ¿Tiene propiedades? */}
                  <div className="space-y-2">
                    <Label>¿Tiene otras propiedades? *</Label>
                    <RadioGroup 
                      value={watchTienePropiedades ? "true" : "false"} 
                      onValueChange={(v) => form.setValue("tienePropiedades", v === "true")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="no-prop" />
                        <Label htmlFor="no-prop">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="si-prop" />
                        <Label htmlFor="si-prop">Sí</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {watchTienePropiedades && (
                    <div className="space-y-2">
                      <Label>¿Propiedades libres de cargas? *</Label>
                      <RadioGroup 
                        value={form.watch("propiedadesLibreCargas") ? "true" : "false"} 
                        onValueChange={(v) => form.setValue("propiedadesLibreCargas", v === "true")}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="libre-si" />
                          <Label htmlFor="libre-si">Sí</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="libre-no" />
                          <Label htmlFor="libre-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Familia Numerosa y Menor de 35 */}
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="familiaNumerosa" 
                        checked={form.watch("familiaNumerosa")}
                        onCheckedChange={(checked) => form.setValue("familiaNumerosa", checked as boolean)}
                      />
                      <Label htmlFor="familiaNumerosa" className="font-normal">
                        ¿Familia numerosa?
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="menorDe35" 
                        checked={form.watch("menorDe35")}
                        onCheckedChange={(checked) => form.setValue("menorDe35", checked as boolean)}
                      />
                      <Label htmlFor="menorDe35" className="font-normal">
                        ¿Menor de 35 años?
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="laboral">
                <AccordionTrigger>3. Situación Laboral</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* Situação Laboral */}
                  <div className="space-y-2">
                    <Label>Situación Laboral *</Label>
                    <RadioGroup 
                      value={watchSituacionLaboral} 
                      onValueChange={(v) => form.setValue("situacionLaboral", v as any)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="empleado" id="empleado" />
                        <Label htmlFor="empleado">Empleado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="autonomo" id="autonomo" />
                        <Label htmlFor="autonomo">Autónomo</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Tipo de Contrato */}
                  <div className="space-y-2">
                    <Label>Tipo de Contrato *</Label>
                    <Select value={form.watch("tipoContrato")} onValueChange={(v) => form.setValue("tipoContrato", v as any)}>
                      <SelectTrigger><SelectValue placeholder="Seleccione tipo de contrato" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indefinido">Indefinido</SelectItem>
                        <SelectItem value="temporal">Temporal</SelectItem>
                        <SelectItem value="fijo_discontinuo">Fijo Discontinuo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Antigüedad Empresa */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Antigüedad Empresa (Años) *</Label>
                      <Input type="number" {...form.register("antiguedadEmpresaAnios", { valueAsNumber: true })} min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Antigüedad Empresa (Meses) *</Label>
                      <Input type="number" {...form.register("antiguedadEmpresaMeses", { valueAsNumber: true })} min="0" max="11" />
                    </div>
                  </div>

                  {/* Antigüedad Continuada (CRÍTICO - ESTAVA FALTANDO!) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Antigüedad Continuada (Años) *</Label>
                      <Input type="number" {...form.register("antiguedadContinuadaAnios", { valueAsNumber: true })} min="0" />
                      <p className="text-xs text-muted-foreground">Antigüedad trabajando continuamente (puede incluir varios empleos)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Antigüedad Continuada (Meses) *</Label>
                      <Input type="number" {...form.register("antiguedadContinuadaMeses", { valueAsNumber: true })} min="0" max="11" />
                    </div>
                  </div>

                  {/* Ingresos Mensuales */}
            <div className="space-y-2">
              <Label>Ingresos Mensuales (€) *</Label>
              <Input type="number" {...form.register("ingresosMensuales", { valueAsNumber: true })} placeholder="Ingresos mensuales netos" min="0" />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financiero">
                <AccordionTrigger>4. Situación Financiera</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Ahorros Disponibles (€) *</Label>
              <Input type="number" {...form.register("ahorrosDisponibles", { valueAsNumber: true })} placeholder="Total de ahorros disponibles" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Plazo Deseado (años) *</Label>
                    <Input type="number" {...form.register("plazoHipotecaAnios", { valueAsNumber: true })} min="10" max="30" />
                  </div>

                  {/* ¿Tiene créditos? */}
                  <div className="space-y-2">
                    <Label>¿Tiene créditos activos? *</Label>
                    <RadioGroup 
                      value={watchTieneCreditos ? "true" : "false"} 
                      onValueChange={(v) => form.setValue("tieneCreditos", v === "true")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="no-cred" />
                        <Label htmlFor="no-cred">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="si-cred" />
                        <Label htmlFor="si-cred">Sí</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {watchTieneCreditos && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Créditos Activos *</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => appendCredito({ tipo: 'personal', cuotaMensual: 0 })}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Agregar Crédito
                        </Button>
                      </div>
                      {creditosFields.map((field, index) => (
                        <div key={field.id} className="border p-4 rounded-lg space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Crédito {index + 1}</h4>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeCredito(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Tipo</Label>
                              <Select 
                                value={form.watch(`creditos.${index}.tipo`)} 
                                onValueChange={(v) => form.setValue(`creditos.${index}.tipo`, v as any)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="personal">Personal</SelectItem>
                                  <SelectItem value="reformas">Reformas</SelectItem>
                                  <SelectItem value="unificacion">Unificación</SelectItem>
                                  <SelectItem value="financiacion_compra">Financiación Compra</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Cuota Mensual (€)</Label>
                              <Input 
                                type="number" 
                                {...form.register(`creditos.${index}.cuotaMensual`, { valueAsNumber: true })} 
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="personal">
                <AccordionTrigger>5. Datos Personales</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* Estado Civil */}
                  <div className="space-y-2">
                    <Label>Estado Civil *</Label>
                    <RadioGroup 
                      value={watchEstadoCivil} 
                      onValueChange={(v) => form.setValue("estadoCivil", v as any)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="soltero" id="soltero" />
                        <Label htmlFor="soltero">Soltero/a</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="casado" id="casado" />
                        <Label htmlFor="casado">Casado/a</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="divorciado" id="divorciado" />
                        <Label htmlFor="divorciado">Divorciado/a</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {watchEstadoCivil === 'casado' && (
                    <div className="space-y-2">
                      <Label>Régimen Matrimonial *</Label>
                      <Select 
                        value={form.watch("regimenMatrimonial")} 
                        onValueChange={(v) => form.setValue("regimenMatrimonial", v as any)}
                      >
                        <SelectTrigger><SelectValue placeholder="Seleccione régimen" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gananciales">Gananciales</SelectItem>
                          <SelectItem value="separacion_bienes">Separación de Bienes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {watchEstadoCivil === 'divorciado' && (
                    <>
                      <div className="space-y-2">
                        <Label>¿Paga pensión? *</Label>
                        <RadioGroup 
                          value={watchPagaPension ? "true" : "false"} 
                          onValueChange={(v) => form.setValue("pagaPension", v === "true")}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="no-pension" />
                            <Label htmlFor="no-pension">No</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="si-pension" />
                            <Label htmlFor="si-pension">Sí</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {watchPagaPension && (
                        <div className="space-y-2">
                          <Label>Valor de la Pensión (€/mes) *</Label>
                          <Input 
                            type="number" 
                            {...form.register("valorPension", { valueAsNumber: true })} 
                            min="0"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* ¿Tiene hijos? */}
                  <div className="space-y-2">
                    <Label>¿Tiene hijos? *</Label>
                    <RadioGroup
                      value={watchTieneHijos ? "si" : "no"}
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
                  
                  {watchTieneHijos && (
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
              <Button 
                type="submit" 
                disabled={!form.formState.isValid}
                className={!form.formState.isValid ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {form.formState.isValid ? (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular Hipoteca
                  </>
                ) : (
                  <>
                    <Info className="mr-2 h-4 w-4" />
                    Complete todos los campos
                  </>
                )}
              </Button>
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
