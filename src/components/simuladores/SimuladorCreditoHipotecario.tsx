// Sync: 2025-02-03 - Consent checkbox update
import { useState, useEffect } from "react";
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
      comunidadAutonoma: 'Comunidad de Madrid',
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
      esResidenteFiscalEspana: true,
      ahorrosDisponibles: undefined,
      plazoHipotecaAnios: 30,
      tieneCreditos: false,
      creditos: [],
      estadoCivil: 'soltero',
      pagaManutención: false,
      valorManutención: undefined,
      aceptaPrivacidad: false
    }
  });
  
  const watchAceptaPrivacidad = form.watch('aceptaPrivacidad');

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
  const watchPagaManutención = form.watch('pagaManutención');
  const watchSituacionLaboral = form.watch('situacionLaboral');
  const watchEdad = form.watch('edad');

  // Ajustar prazo automaticamente baseado na idade (máximo: 75 - idade)
  useEffect(() => {
    if (watchEdad && watchEdad >= 45) {
      const plazoMaximo = Math.max(1, 75 - watchEdad);
      const plazoAtual = form.getValues('plazoHipotecaAnios');
      if (plazoAtual > plazoMaximo) {
        form.setValue('plazoHipotecaAnios', plazoMaximo);
      }
    }
  }, [watchEdad, form]);

  // Calcular prazo máximo permitido
  const plazoMaximoPermitido = watchEdad && watchEdad >= 45 ? Math.min(30, 75 - watchEdad) : 30;

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
                  {/* Número de Titulares */}
                  <div className="space-y-2">
                    <Label>Número de Titulares *</Label>
                    <RadioGroup 
                      value={watchNumeroTitulares} 
                      onValueChange={(v) => form.setValue("numeroTitulares", v as any)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="titular-1" />
                        <Label htmlFor="titular-1">1 Titular</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="titular-2" />
                        <Label htmlFor="titular-2">2 Titulares</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Formulário para Segundo Titular */}
                  {watchNumeroTitulares === '2' && (
                    <div className="space-y-4 mt-6 border-t pt-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Complete los datos del segundo titular. <strong>Importante:</strong> Solo se considerarán los ingresos de titulares con contrato indefinido.
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => appendTitular({
                          nombreCompleto: '',
                          edad: 30,
                          relacionPrincipal: 'pareja',
                          situacionLaboral: 'empleado',
                          tipoContrato: 'indefinido',
                          antiguedadEmpresaAnios: 0,
                          antiguedadEmpresaMeses: 0,
                          antiguedadContinuadaAnios: 0,
                          antiguedadContinuadaMeses: 0,
                          ingresosMensuales: 0,
                          numeroPagas: 12,
                          cobraBonusAnual: false,
                          valorBonusAnual: 0,
                          ahorrosDisponibles: 0
                        })}
                        disabled={titularesFields.length >= 1}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Agregar Segundo Titular
                      </Button>

                      {titularesFields.map((field, index) => (
                        <div key={field.id} className="border p-4 rounded-lg space-y-4 bg-muted/30">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-lg">Titular {index + 2}</h4>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeTitular(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* CAMPOS BÁSICOS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nombre Completo *</Label>
                              <Input {...form.register(`titulares.${index}.nombreCompleto`)} placeholder="Nombre completo" />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Edad *</Label>
                              <Input 
                                type="number" 
                                {...form.register(`titulares.${index}.edad`, { valueAsNumber: true })} 
                                min="18" 
                                max="65"
                                placeholder="Edad"
                              />
                            </div>
                          </div>
                          
                          {/* Relación con Titular Principal */}
                          <div className="space-y-2">
                            <Label>Relación con Titular Principal *</Label>
                            <Select 
                              value={form.watch(`titulares.${index}.relacionPrincipal`)} 
                              onValueChange={(v) => form.setValue(`titulares.${index}.relacionPrincipal`, v as any)}
                            >
                              <SelectTrigger><SelectValue placeholder="Seleccione relación" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pareja">Pareja</SelectItem>
                                <SelectItem value="marido_mujer">Marido/Mujer</SelectItem>
                                <SelectItem value="padre_madre_hijo">Padre/Madre/Hijo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-3">Situación Laboral</h5>
                            
                            {/* Situación Laboral */}
                            <div className="space-y-2 mb-4">
                              <Label>Situación Laboral *</Label>
                              <RadioGroup 
                                value={form.watch(`titulares.${index}.situacionLaboral`)} 
                                onValueChange={(v) => form.setValue(`titulares.${index}.situacionLaboral`, v as any)}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="empleado" id={`empleado-${index}`} />
                                  <Label htmlFor={`empleado-${index}`}>Empleado</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="autonomo" id={`autonomo-${index}`} />
                                  <Label htmlFor={`autonomo-${index}`}>Autónomo</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            
                            {/* Tipo de Contrato */}
                            <div className="space-y-2 mb-4">
                              <Label>Tipo de Contrato *</Label>
                              <Select 
                                value={form.watch(`titulares.${index}.tipoContrato`)} 
                                onValueChange={(v) => form.setValue(`titulares.${index}.tipoContrato`, v as any)}
                              >
                                <SelectTrigger><SelectValue placeholder="Seleccione tipo" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="funcionario">Funcionario</SelectItem>
                                  <SelectItem value="indefinido">Indefinido</SelectItem>
                                  <SelectItem value="interino">Interino</SelectItem>
                                  <SelectItem value="fijo_discontinuo">Fijo Discontinuo</SelectItem>
                                  <SelectItem value="temporal">Temporal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Alerta se temporal */}
                            {form.watch(`titulares.${index}.tipoContrato`) === 'temporal' && (
                              <Alert variant="destructive" className="mb-4">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  <strong>Atención:</strong> Los contratos temporales no son considerados por los bancos. Solo se computarán los ingresos de titulares con contrato indefinido.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {/* Antigüedad Empresa */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label>Antigüedad Empresa (Años)</Label>
                                <Input 
                                  type="number" 
                                  {...form.register(`titulares.${index}.antiguedadEmpresaAnios`, { valueAsNumber: true })} 
                                  min="0"
                                  placeholder="Años"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Antigüedad Empresa (Meses)</Label>
                                <Input 
                                  type="number" 
                                  {...form.register(`titulares.${index}.antiguedadEmpresaMeses`, { valueAsNumber: true })} 
                                  min="0" 
                                  max="11"
                                  placeholder="Meses"
                                />
                              </div>
                            </div>
                            
                            {/* Antigüedad Continuada */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label>Antigüedad Continuada (Años)</Label>
                                <Input 
                                  type="number" 
                                  {...form.register(`titulares.${index}.antiguedadContinuadaAnios`, { valueAsNumber: true })} 
                                  min="0"
                                  placeholder="Años"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Antigüedad Continuada (Meses)</Label>
                                <Input 
                                  type="number" 
                                  {...form.register(`titulares.${index}.antiguedadContinuadaMeses`, { valueAsNumber: true })} 
                                  min="0" 
                                  max="11"
                                  placeholder="Meses"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-3">Situación Financiera</h5>
                            
                            {/* Ingresos Mensuales NETO */}
                            <div className="space-y-2 mb-4">
                              <Label>Ingresos Mensuales NETO (€) *</Label>
                              <Input 
                                type="number" 
                                {...form.register(`titulares.${index}.ingresosMensuales`, { valueAsNumber: true })} 
                                placeholder="Ingresos netos mensuales"
                                min="0"
                              />
                              <p className="text-xs text-muted-foreground">Indique ingresos netos (después de impuestos)</p>
                            </div>
                            
                            {/* Número de Pagas */}
                            <div className="space-y-2 mb-4">
                              <Label>Número de Pagas Anuales *</Label>
                              <Select 
                                value={form.watch(`titulares.${index}.numeroPagas`)?.toString()} 
                                onValueChange={(v) => form.setValue(`titulares.${index}.numeroPagas`, parseInt(v))}
                              >
                                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="12">12 pagas</SelectItem>
                                  <SelectItem value="13">13 pagas</SelectItem>
                                  <SelectItem value="14">14 pagas</SelectItem>
                                  <SelectItem value="15">15+ pagas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Bonus Anual */}
                            <div className="space-y-2 mb-4">
                              <Label>¿Cobra bonus anual por objetivos?</Label>
                              <RadioGroup 
                                value={form.watch(`titulares.${index}.cobraBonusAnual`) ? "true" : "false"} 
                                onValueChange={(v) => form.setValue(`titulares.${index}.cobraBonusAnual`, v === "true")}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="false" id={`no-bonus-${index}`} />
                                  <Label htmlFor={`no-bonus-${index}`}>No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="true" id={`si-bonus-${index}`} />
                                  <Label htmlFor={`si-bonus-${index}`}>Sí</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            
                            {/* Valor Bonus (condicional) */}
                            {form.watch(`titulares.${index}.cobraBonusAnual`) && (
                              <div className="space-y-2 mb-4">
                                <Label>Valor del Bonus Anual (€)</Label>
                                <Input 
                                  type="number" 
                                  {...form.register(`titulares.${index}.valorBonusAnual`, { valueAsNumber: true })} 
                                  placeholder="Valor del bonus"
                                  min="0"
                                />
                              </div>
                            )}
                            
                            {/* Ahorros Disponibles */}
                            <div className="space-y-2">
                              <Label>Ahorros Disponibles (€) *</Label>
                              <Input 
                                type="number" 
                                {...form.register(`titulares.${index}.ahorrosDisponibles`, { valueAsNumber: true })} 
                                placeholder="Total de ahorros disponibles"
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
                          <SelectItem value="Andalucía">Andalucía</SelectItem>
                          <SelectItem value="Aragón">Aragón</SelectItem>
                          <SelectItem value="Asturias">Asturias</SelectItem>
                          <SelectItem value="Baleares">Baleares</SelectItem>
                          <SelectItem value="Canarias">Canarias</SelectItem>
                          <SelectItem value="Cantabria">Cantabria</SelectItem>
                          <SelectItem value="Castilla-La Mancha">Castilla-La Mancha</SelectItem>
                          <SelectItem value="Castilla y León">Castilla y León</SelectItem>
                          <SelectItem value="Cataluña">Cataluña</SelectItem>
                          <SelectItem value="Ceuta">Ceuta</SelectItem>
                          <SelectItem value="Comunidad de Madrid">Comunidad de Madrid</SelectItem>
                          <SelectItem value="Comunidad Valenciana">Comunidad Valenciana</SelectItem>
                          <SelectItem value="Extremadura">Extremadura</SelectItem>
                          <SelectItem value="Galicia">Galicia</SelectItem>
                          <SelectItem value="La Rioja">La Rioja</SelectItem>
                          <SelectItem value="Melilla">Melilla</SelectItem>
                          <SelectItem value="Murcia">Murcia</SelectItem>
                          <SelectItem value="Navarra">Navarra</SelectItem>
                          <SelectItem value="País Vasco">País Vasco</SelectItem>
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
                        <SelectItem value="funcionario">Funcionario</SelectItem>
                        <SelectItem value="indefinido">Indefinido</SelectItem>
                        <SelectItem value="interino">Interino</SelectItem>
                        <SelectItem value="fijo_discontinuo">Fijo Discontinuo</SelectItem>
                        <SelectItem value="temporal">Temporal</SelectItem>
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

                  {/* Ingresos Mensuales NETO */}
                  <div className="space-y-2">
                    <Label>Ingresos Mensuales NETO (€) *</Label>
                    <Input 
                      type="number" 
                      {...form.register("ingresosMensuales", { valueAsNumber: true })} 
                      placeholder="Ingresos netos mensuales" 
                      min="0" 
                    />
                    <p className="text-xs text-muted-foreground">Indique sus ingresos netos (después de impuestos)</p>
                  </div>

                  {/* Número de Pagas */}
                  <div className="space-y-2">
                    <Label>Número de Pagas Anuales *</Label>
                    <Select 
                      value={form.watch("numeroPagas")?.toString()} 
                      onValueChange={(v) => form.setValue("numeroPagas", parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione número de pagas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 pagas</SelectItem>
                        <SelectItem value="13">13 pagas</SelectItem>
                        <SelectItem value="14">14 pagas</SelectItem>
                        <SelectItem value="15">15+ pagas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bonus Anual */}
                  <div className="space-y-2">
                    <Label>¿Cobra bonus anual por objetivos?</Label>
                    <RadioGroup 
                      value={form.watch("cobraBonusAnual") ? "true" : "false"} 
                      onValueChange={(v) => form.setValue("cobraBonusAnual", v === "true")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="no-bonus" />
                        <Label htmlFor="no-bonus">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="si-bonus" />
                        <Label htmlFor="si-bonus">Sí</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {form.watch("cobraBonusAnual") && (
                    <div className="space-y-2">
                      <Label>Valor del Bonus Anual (€)</Label>
                      <Input 
                        type="number" 
                        {...form.register("valorBonusAnual", { valueAsNumber: true })} 
                        placeholder="Valor del bonus anual"
                        min="0"
                      />
                    </div>
                  )}

                  {/* Residente Fiscal en España */}
                  <div className="space-y-2">
                    <Label>¿Eres residente fiscal en España? *</Label>
                    <RadioGroup 
                      value={form.watch("esResidenteFiscalEspana") ? "true" : "false"} 
                      onValueChange={(v) => form.setValue("esResidenteFiscalEspana", v === "true")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="si-residente" />
                        <Label htmlFor="si-residente">Sí</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="no-residente" />
                        <Label htmlFor="no-residente">No</Label>
                      </div>
                    </RadioGroup>
                    
                    {!form.watch("esResidenteFiscalEspana") && (
                      <Alert className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Como no residente fiscal, el financiamiento máximo será del 70%
                        </AlertDescription>
                      </Alert>
                    )}
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
                    <Input 
                      type="number" 
                      {...form.register("plazoHipotecaAnios", { valueAsNumber: true })} 
                      min="10" 
                      max={plazoMaximoPermitido} 
                    />
                    {watchEdad && watchEdad >= 45 && (
                      <p className="text-xs text-muted-foreground">
                        Máximo {plazoMaximoPermitido} años (75 - {watchEdad} años de edad)
                      </p>
                    )}
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

                  {/* ¿Pagas Manutención? */}
                  {watchEstadoCivil === 'divorciado' && (
                    <>
                      <div className="space-y-2">
                        <Label>¿Pagas Manutención? *</Label>
                        <RadioGroup 
                          value={watchPagaManutención ? "true" : "false"} 
                          onValueChange={(v) => form.setValue("pagaManutención", v === "true")}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="no-manutencion" />
                            <Label htmlFor="no-manutencion">No</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="si-manutencion" />
                            <Label htmlFor="si-manutencion">Sí</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {watchPagaManutención && (
                        <div className="space-y-2">
                          <Label>Valor de la Manutención (€/mes) *</Label>
                          <Input 
                            type="number" 
                            {...form.register("valorManutención", { valueAsNumber: true })} 
                            min="0"
                            placeholder="Valor mensual"
                          />
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* Checkbox de Política de Privacidad */}
            <div className="space-y-2 pt-6">
              <div className="flex items-start space-x-3 p-4 border-2 border-amber-500/50 rounded-lg bg-amber-50/50">
                <Checkbox 
                  id="aceptaPrivacidadHipoteca" 
                  checked={watchAceptaPrivacidad}
                  onCheckedChange={(checked) => form.setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="aceptaPrivacidadHipoteca" className="text-sm font-medium cursor-pointer">
                    <span className="font-bold text-amber-700 block mb-1">LECTURA IMPORTANTE AL CLIENTE:</span>
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
              {form.formState.errors.aceptaPrivacidad && (
                <p className="text-sm text-destructive">{form.formState.errors.aceptaPrivacidad.message}</p>
              )}
            </div>

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
