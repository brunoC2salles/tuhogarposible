// Sync: 2026-03-17 - Unified simulator form + lead auto-fill
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Home, Plus, Trash2, Info, Calculator, Search } from "lucide-react";
import { simuladorHipotecaSchema, type SimuladorHipotecaFormData } from "@/schemas/simuladorSchema";
import { calcularAmortizacionFrancesa, calcularSimulacionHipoteca } from "@/lib/simuladorUtils";
import { ResultadosCombinados } from "@/components/simuladores/ResultadosCombinados";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Extended type: only plazoMeses and tasaAnual are personal-credit-specific
type SimuladorUnificadoFormData = SimuladorHipotecaFormData & {
  plazoMeses: number;
  tasaAnual: number;
};

const simuladorUnificadoSchema = simuladorHipotecaSchema.and(
  z.object({
    plazoMeses: z.number().int().min(60, "Plazo mínimo: 60 meses").max(144, "Plazo máximo: 144 meses"),
    tasaAnual: z.number().min(3, "Tasa mínima: 3%").max(12, "Tasa máxima: 12%"),
  })
);

const SimuladoresIndex = () => {
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [resultadosPersonal, setResultadosPersonal] = useState<any>(null);
  const [resultadosHipoteca, setResultadosHipoteca] = useState<any>(null);
  const [datosFormulario, setDatosFormulario] = useState<SimuladorUnificadoFormData | null>(null);
  
  // Lead auto-fill state
  const [leadSuggestions, setLeadSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const form = useForm<SimuladorUnificadoFormData>({
    resolver: zodResolver(simuladorUnificadoSchema),
    mode: "onChange",
    defaultValues: {
      nombreCompleto: '',
      edad: 30,
      tipoDocumento: undefined as any,
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
      aceptaPrivacidad: false,
      // Personal credit fields
      plazoMeses: 84,
      tasaAnual: 6,
    }
  });

  const watchAceptaPrivacidad = form.watch('aceptaPrivacidad');
  const watchNumeroTitulares = form.watch('numeroTitulares');
  const watchTieneCreditos = form.watch('tieneCreditos');
  const watchFinalidadCompra = form.watch('finalidadCompra');
  const watchTienePropiedades = form.watch('tienePropiedades');
  const watchEstadoCivil = form.watch('estadoCivil');
  const watchPagaManutención = form.watch('pagaManutención');
  const watchSituacionLaboral = form.watch('situacionLaboral');
  const watchEdad = form.watch('edad');

  const { fields: titularesFields, append: appendTitular, remove: removeTitular } = useFieldArray({
    control: form.control,
    name: 'titulares'
  });

  const { fields: creditosFields, append: appendCredito, remove: removeCredito } = useFieldArray({
    control: form.control,
    name: 'creditos'
  });

  // Check if user is authenticated (for lead auto-fill)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
  }, []);

  // Lead name search with debounce
  const searchLeads = useCallback((name: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isAuthenticated || name.length < 2) {
      setLeadSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, nombre_completo, telefono, email, valor_inmueble_deseado, simulador_hipotecario_data, simulador_personal_data')
        .ilike('nombre_completo', `%${name}%`)
        .limit(5);
      if (data && data.length > 0) {
        setLeadSuggestions(data);
        setShowSuggestions(true);
      } else {
        setLeadSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, [isAuthenticated]);

  const selectLead = useCallback((lead: any) => {
    form.setValue('nombreCompleto', lead.nombre_completo);
    if (lead.valor_inmueble_deseado) {
      form.setValue('precioVivienda', lead.valor_inmueble_deseado);
    }
    // Pre-fill from stored simulation data
    const simData = lead.simulador_hipotecario_data as any;
    if (simData) {
      if (simData.edad) form.setValue('edad', simData.edad);
      if (simData.tipoDocumento) form.setValue('tipoDocumento', simData.tipoDocumento);
      if (simData.precioVivienda) form.setValue('precioVivienda', simData.precioVivienda);
      if (simData.ingresosMensuales) form.setValue('ingresosMensuales', simData.ingresosMensuales);
      if (simData.ahorrosDisponibles !== undefined) form.setValue('ahorrosDisponibles', simData.ahorrosDisponibles);
      if (simData.situacionLaboral) form.setValue('situacionLaboral', simData.situacionLaboral);
      if (simData.tipoContrato) form.setValue('tipoContrato', simData.tipoContrato);
      if (simData.comunidadAutonoma) form.setValue('comunidadAutonoma', simData.comunidadAutonoma);
      if (simData.estadoCivil) form.setValue('estadoCivil', simData.estadoCivil);
      if (simData.numeroPagas) form.setValue('numeroPagas', simData.numeroPagas);
      if (simData.plazoHipotecaAnios) form.setValue('plazoHipotecaAnios', simData.plazoHipotecaAnios);
    }
    const simPersonal = lead.simulador_personal_data as any;
    if (simPersonal) {
      if (simPersonal.plazoMeses) form.setValue('plazoMeses', simPersonal.plazoMeses);
      if (simPersonal.tasaAnual) form.setValue('tasaAnual', simPersonal.tasaAnual);
    }
    setShowSuggestions(false);
    setLeadSuggestions([]);
    toast.success(`Datos del lead "${lead.nombre_completo}" cargados`);
  }, [form]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (watchEdad && watchEdad >= 45) {
      const plazoMaximo = Math.max(1, 75 - watchEdad);
      const plazoAtual = form.getValues('plazoHipotecaAnios');
      if (plazoAtual > plazoMaximo) {
        form.setValue('plazoHipotecaAnios', plazoMaximo);
      }
    }
  }, [watchEdad, form]);

  const plazoMaximoPermitido = watchEdad && watchEdad >= 45 ? Math.min(30, 75 - watchEdad) : 30;

  // Helper to get error class for inputs
  const errorClass = (fieldName: string) => {
    const keys = fieldName.split('.');
    let err: any = form.formState.errors;
    for (const k of keys) {
      if (!err) return '';
      err = err[k];
    }
    return err ? 'border-destructive' : '';
  };

  const onSubmit = (data: SimuladorUnificadoFormData) => {
    try {
      // 1. Calculate hipoteca FIRST to get capitalPropioNecesario
      const resHipoteca = calcularSimulacionHipoteca(data as any);

      // 2. Derive personal credit inputs from unified fields
      const totalDeudas = data.creditos?.reduce((s, c) => s + c.cuotaMensual, 0) ?? 0;

      // 3. Calculate personal credit using capitalPropioNecesario as the amount to finance
      const resPersonal = calcularAmortizacionFrancesa({
        valorInmueble: resHipoteca.capitalPropioNecesario,
        entrada: data.ahorrosDisponibles,
        plazoMeses: data.plazoMeses,
        tasaAnual: data.tasaAnual,
        ingresos: data.ingresosMensuales,
        deudas: totalDeudas,
      });

      setResultadosPersonal(resPersonal);
      setResultadosHipoteca(resHipoteca);
      setDatosFormulario(data);
      setResultadosOpen(true);
      toast.success("Simulación calculada con éxito");
    } catch (error) {
      console.error("Error al calcular simulación:", error);
      toast.error("Error al calcular la simulación");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <Logo size="sm" />
              <span className="text-base sm:text-lg md:text-xl font-semibold">Tu Hogar Posible</span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Volver al Inicio</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Simulador Financiero</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Calcula simultáneamente tu crédito personal e hipotecario
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                Formulario Unificado
              </CardTitle>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Complete todos los campos marcados con <strong>*</strong>. Se calcularán simultáneamente el <strong>crédito personal</strong> y el <strong>crédito hipotecario</strong>.
                  <br />
                  <span className="text-xs">Hipoteca: tasa fija <strong>2.5%</strong> anual · Personal: tasa configurable</span>
                </AlertDescription>
              </Alert>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Accordion type="multiple" defaultValue={["titular", "personal_credit", "vivienda", "laboral", "financiero", "personal"]} className="w-full">

                  {/* === SECTION 1: TITULAR DATA === */}
                  <AccordionItem value="titular">
                    <AccordionTrigger>1. Datos del Titular</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre Completo *</Label>
                          <Input className={errorClass('nombreCompleto')} {...form.register("nombreCompleto")} placeholder="Ingrese su nombre completo" />
                          {form.formState.errors.nombreCompleto && (
                            <p className="text-sm text-destructive">{form.formState.errors.nombreCompleto.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Edad *</Label>
                          <Input className={errorClass('edad')} type="number" {...form.register("edad", { valueAsNumber: true })} min="18" max="65" placeholder="Edad (18-65 años)" />
                          {form.formState.errors.edad && (
                            <p className="text-sm text-destructive">{form.formState.errors.edad.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Documento *</Label>
                        <RadioGroup value={form.watch("tipoDocumento")} onValueChange={(v) => form.setValue("tipoDocumento", v as any, { shouldValidate: true })}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dni" id="doc-dni" />
                            <Label htmlFor="doc-dni">DNI (Ciudadano español)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="nie" id="doc-nie" />
                            <Label htmlFor="doc-nie">NIE (Residente extranjero)</Label>
                          </div>
                        </RadioGroup>
                        {form.formState.errors.tipoDocumento && (
                          <p className="text-sm text-destructive">{form.formState.errors.tipoDocumento.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Número de Titulares *</Label>
                        <RadioGroup value={watchNumeroTitulares} onValueChange={(v) => form.setValue("numeroTitulares", v as any)}>
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

                      {watchNumeroTitulares === '2' && (
                        <div className="space-y-4 mt-4 border-t pt-4">
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>Solo se considerarán los ingresos de titulares con contrato indefinido.</AlertDescription>
                          </Alert>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendTitular({
                              nombreCompleto: '', edad: 30, relacionPrincipal: 'pareja',
                              situacionLaboral: 'empleado', tipoContrato: 'indefinido',
                              antiguedadEmpresaAnios: 0, antiguedadEmpresaMeses: 0,
                              antiguedadContinuadaAnios: 0, antiguedadContinuadaMeses: 0,
                              ingresosMensuales: 0, numeroPagas: 12, cobraBonusAnual: false,
                              valorBonusAnual: 0, ahorrosDisponibles: 0
                            })}
                            disabled={titularesFields.length >= 1}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Agregar Segundo Titular
                          </Button>

                          {titularesFields.map((field, index) => (
                            <div key={field.id} className="border p-4 rounded-lg space-y-4 bg-muted/30">
                              <div className="flex justify-between items-center">
                                <h4 className="font-semibold">Titular {index + 2}</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeTitular(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Nombre Completo *</Label>
                                  <Input {...form.register(`titulares.${index}.nombreCompleto`)} placeholder="Nombre completo" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Edad *</Label>
                                  <Input type="number" {...form.register(`titulares.${index}.edad`, { valueAsNumber: true })} min="18" max="65" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Relación *</Label>
                                <Select value={form.watch(`titulares.${index}.relacionPrincipal`)} onValueChange={(v) => form.setValue(`titulares.${index}.relacionPrincipal`, v as any)}>
                                  <SelectTrigger><SelectValue placeholder="Seleccione relación" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pareja">Pareja</SelectItem>
                                    <SelectItem value="marido_mujer">Marido/Mujer</SelectItem>
                                    <SelectItem value="padre_madre_hijo">Padre/Madre/Hijo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Situación Laboral *</Label>
                                  <RadioGroup value={form.watch(`titulares.${index}.situacionLaboral`)} onValueChange={(v) => form.setValue(`titulares.${index}.situacionLaboral`, v as any)}>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="empleado" id={`emp-${index}`} /><Label htmlFor={`emp-${index}`}>Empleado</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="autonomo" id={`aut-${index}`} /><Label htmlFor={`aut-${index}`}>Autónomo</Label></div>
                                  </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                  <Label>Tipo Contrato *</Label>
                                  <Select value={form.watch(`titulares.${index}.tipoContrato`)} onValueChange={(v) => form.setValue(`titulares.${index}.tipoContrato`, v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="funcionario">Funcionario</SelectItem>
                                      <SelectItem value="indefinido">Indefinido</SelectItem>
                                      <SelectItem value="interino">Interino</SelectItem>
                                      <SelectItem value="fijo_discontinuo">Fijo Discontinuo</SelectItem>
                                      <SelectItem value="temporal">Temporal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Antigüedad Empresa (A/M)</Label>
                                  <div className="flex gap-2">
                                    <Input type="number" {...form.register(`titulares.${index}.antiguedadEmpresaAnios`, { valueAsNumber: true })} min="0" placeholder="Años" />
                                    <Input type="number" {...form.register(`titulares.${index}.antiguedadEmpresaMeses`, { valueAsNumber: true })} min="0" max="11" placeholder="Meses" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Antigüedad Continuada (A/M)</Label>
                                  <div className="flex gap-2">
                                    <Input type="number" {...form.register(`titulares.${index}.antiguedadContinuadaAnios`, { valueAsNumber: true })} min="0" placeholder="Años" />
                                    <Input type="number" {...form.register(`titulares.${index}.antiguedadContinuadaMeses`, { valueAsNumber: true })} min="0" max="11" placeholder="Meses" />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Ingresos Mensuales NETO (€) *</Label>
                                <Input type="number" {...form.register(`titulares.${index}.ingresosMensuales`, { valueAsNumber: true })} placeholder="Ingresos netos" min="0" />
                              </div>
                              <div className="space-y-2">
                                <Label>Número de Pagas</Label>
                                <Select value={form.watch(`titulares.${index}.numeroPagas`)?.toString()} onValueChange={(v) => form.setValue(`titulares.${index}.numeroPagas`, parseInt(v))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="12">12 pagas</SelectItem>
                                    <SelectItem value="13">13 pagas</SelectItem>
                                    <SelectItem value="14">14 pagas</SelectItem>
                                    <SelectItem value="15">15+ pagas</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* === SECTION 2: CRÉDITO PERSONAL (only plazo + tasa) === */}
                  <AccordionItem value="personal_credit">
                    <AccordionTrigger>2. Crédito Personal — Plazo e Interés</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          El crédito personal financia el <strong>capital propio necesario</strong> (entrada + impuestos) calculado por la hipoteca.
                          Los ahorros y deudas se toman de la sección financiera.
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Plazo Deseado (meses) *</Label>
                          <Input className={errorClass('plazoMeses')} type="number" {...form.register("plazoMeses", { valueAsNumber: true })} placeholder="60-144 meses" min="60" max="144" />
                          <p className="text-xs text-muted-foreground">Entre 60 (5 años) y 144 (12 años)</p>
                          {form.formState.errors.plazoMeses && (
                            <p className="text-sm text-destructive">{(form.formState.errors.plazoMeses as any).message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Tasa Anual de Interés (%) *</Label>
                          <Input className={errorClass('tasaAnual')} type="number" step="0.01" {...form.register("tasaAnual", { valueAsNumber: true })} placeholder="6.00" min="3" max="12" />
                          <p className="text-xs text-muted-foreground">Entre 3% y 12%</p>
                          {form.formState.errors.tasaAnual && (
                            <p className="text-sm text-destructive">{(form.formState.errors.tasaAnual as any).message}</p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* === SECTION 3: VIVIENDA (HIPOTECA) === */}
                  <AccordionItem value="vivienda">
                    <AccordionTrigger>3. Datos de la Vivienda — Hipoteca</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Precio de la Vivienda (€) *</Label>
                          <Input className={errorClass('precioVivienda')} type="number" {...form.register("precioVivienda", { valueAsNumber: true })} min="10000" placeholder="Precio de la vivienda" />
                          {form.formState.errors.precioVivienda && (
                            <p className="text-sm text-destructive">{form.formState.errors.precioVivienda.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Comunidad Autónoma *</Label>
                          <Select value={form.watch("comunidadAutonoma")} onValueChange={(v) => form.setValue("comunidadAutonoma", v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['Andalucía','Aragón','Asturias','Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Cataluña','Ceuta','Comunidad de Madrid','Comunidad Valenciana','Extremadura','Galicia','La Rioja','Melilla','Murcia','Navarra','País Vasco'].map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
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
                      <div className="space-y-2">
                        <Label>¿Tiene otras propiedades? *</Label>
                        <RadioGroup value={watchTienePropiedades ? "true" : "false"} onValueChange={(v) => form.setValue("tienePropiedades", v === "true")}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="no-prop" /><Label htmlFor="no-prop">No</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="si-prop" /><Label htmlFor="si-prop">Sí</Label></div>
                        </RadioGroup>
                      </div>
                      {watchTienePropiedades && (
                        <div className="space-y-2">
                          <Label>¿Propiedades libres de cargas? *</Label>
                          <RadioGroup value={form.watch("propiedadesLibreCargas") ? "true" : "false"} onValueChange={(v) => form.setValue("propiedadesLibreCargas", v === "true")}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="libre-si" /><Label htmlFor="libre-si">Sí</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="libre-no" /><Label htmlFor="libre-no">No</Label></div>
                          </RadioGroup>
                        </div>
                      )}
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="familiaNumerosa" checked={form.watch("familiaNumerosa")} onCheckedChange={(c) => form.setValue("familiaNumerosa", c as boolean)} />
                          <Label htmlFor="familiaNumerosa" className="font-normal">¿Familia numerosa?</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="menorDe35" checked={form.watch("menorDe35")} onCheckedChange={(c) => form.setValue("menorDe35", c as boolean)} />
                          <Label htmlFor="menorDe35" className="font-normal">¿Menor de 35 años?</Label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* === SECTION 4: SITUACIÓN LABORAL === */}
                  <AccordionItem value="laboral">
                    <AccordionTrigger>4. Situación Laboral</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Situación Laboral *</Label>
                        <RadioGroup value={watchSituacionLaboral} onValueChange={(v) => form.setValue("situacionLaboral", v as any)}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="empleado" id="empleado" /><Label htmlFor="empleado">Empleado</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="autonomo" id="autonomo" /><Label htmlFor="autonomo">Autónomo</Label></div>
                        </RadioGroup>
                      </div>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Antigüedad Continuada (Años) *</Label>
                          <Input type="number" {...form.register("antiguedadContinuadaAnios", { valueAsNumber: true })} min="0" />
                          <p className="text-xs text-muted-foreground">Antigüedad trabajando continuamente</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Antigüedad Continuada (Meses) *</Label>
                          <Input type="number" {...form.register("antiguedadContinuadaMeses", { valueAsNumber: true })} min="0" max="11" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ingresos Mensuales NETO (€) *</Label>
                        <Input className={errorClass('ingresosMensuales')} type="number" {...form.register("ingresosMensuales", { valueAsNumber: true })} placeholder="Ingresos netos mensuales" min="0" />
                        <p className="text-xs text-muted-foreground">Ingresos netos (después de impuestos)</p>
                        {form.formState.errors.ingresosMensuales && (
                          <p className="text-sm text-destructive">{form.formState.errors.ingresosMensuales.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Número de Pagas Anuales *</Label>
                        <Select value={form.watch("numeroPagas")?.toString()} onValueChange={(v) => form.setValue("numeroPagas", parseInt(v))}>
                          <SelectTrigger><SelectValue placeholder="Seleccione número de pagas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12">12 pagas</SelectItem>
                            <SelectItem value="13">13 pagas</SelectItem>
                            <SelectItem value="14">14 pagas</SelectItem>
                            <SelectItem value="15">15+ pagas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>¿Cobra bonus anual por objetivos?</Label>
                        <RadioGroup value={form.watch("cobraBonusAnual") ? "true" : "false"} onValueChange={(v) => form.setValue("cobraBonusAnual", v === "true")}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="no-bonus" /><Label htmlFor="no-bonus">No</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="si-bonus" /><Label htmlFor="si-bonus">Sí</Label></div>
                        </RadioGroup>
                      </div>
                      {form.watch("cobraBonusAnual") && (
                        <div className="space-y-2">
                          <Label>Valor del Bonus Anual (€)</Label>
                          <Input type="number" {...form.register("valorBonusAnual", { valueAsNumber: true })} placeholder="Valor del bonus anual" min="0" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>¿Eres residente fiscal en España? *</Label>
                        <RadioGroup value={form.watch("esResidenteFiscalEspana") ? "true" : "false"} onValueChange={(v) => form.setValue("esResidenteFiscalEspana", v === "true")}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="si-res" /><Label htmlFor="si-res">Sí</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="no-res" /><Label htmlFor="no-res">No</Label></div>
                        </RadioGroup>
                        {!form.watch("esResidenteFiscalEspana") && (
                          <Alert className="mt-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription>Como no residente fiscal, el financiamiento máximo será del 70%</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* === SECTION 5: SITUACIÓN FINANCIERA === */}
                  <AccordionItem value="financiero">
                    <AccordionTrigger>5. Situación Financiera</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Los ahorros se usan como <strong>entrada</strong> tanto para la hipoteca como para el crédito personal.
                          Los créditos activos se descuentan de la capacidad de pago en ambos cálculos.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Ahorros Disponibles (€) *</Label>
                        <Input className={errorClass('ahorrosDisponibles')} type="number" {...form.register("ahorrosDisponibles", { valueAsNumber: true })} placeholder="Total de ahorros disponibles" min="0" />
                        {form.formState.errors.ahorrosDisponibles && (
                          <p className="text-sm text-destructive">{form.formState.errors.ahorrosDisponibles.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Plazo Hipoteca Deseado (años) *</Label>
                        <Input className={errorClass('plazoHipotecaAnios')} type="number" {...form.register("plazoHipotecaAnios", { valueAsNumber: true })} min="10" max={plazoMaximoPermitido} />
                        {watchEdad && watchEdad >= 45 && (
                          <p className="text-xs text-muted-foreground">Máximo {plazoMaximoPermitido} años (75 - {watchEdad} años de edad)</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>¿Tiene créditos activos? *</Label>
                        <RadioGroup value={watchTieneCreditos ? "true" : "false"} onValueChange={(v) => form.setValue("tieneCreditos", v === "true")}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="no-cred" /><Label htmlFor="no-cred">No</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="si-cred" /><Label htmlFor="si-cred">Sí</Label></div>
                        </RadioGroup>
                      </div>
                      {watchTieneCreditos && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Créditos Activos *</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendCredito({ tipo: 'personal', cuotaMensual: 0 })}>
                              <Plus className="h-4 w-4 mr-1" /> Agregar Crédito
                            </Button>
                          </div>
                          {creditosFields.map((field, index) => (
                            <div key={field.id} className="border p-4 rounded-lg space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium">Crédito {index + 1}</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeCredito(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>Tipo</Label>
                                  <Select value={form.watch(`creditos.${index}.tipo`)} onValueChange={(v) => form.setValue(`creditos.${index}.tipo`, v as any)}>
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
                                  <Input type="number" {...form.register(`creditos.${index}.cuotaMensual`, { valueAsNumber: true })} min="0" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* === SECTION 6: DATOS PERSONALES === */}
                  <AccordionItem value="personal">
                    <AccordionTrigger>6. Datos Personales</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Estado Civil *</Label>
                        <RadioGroup value={watchEstadoCivil} onValueChange={(v) => form.setValue("estadoCivil", v as any)}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="soltero" id="soltero" /><Label htmlFor="soltero">Soltero/a</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="casado" id="casado" /><Label htmlFor="casado">Casado/a</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="divorciado" id="divorciado" /><Label htmlFor="divorciado">Divorciado/a</Label></div>
                        </RadioGroup>
                      </div>
                      {watchEstadoCivil === 'casado' && (
                        <div className="space-y-2">
                          <Label>Régimen Matrimonial *</Label>
                          <Select value={form.watch("regimenMatrimonial")} onValueChange={(v) => form.setValue("regimenMatrimonial", v as any)}>
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
                            <Label>¿Pagas Manutención? *</Label>
                            <RadioGroup value={watchPagaManutención ? "true" : "false"} onValueChange={(v) => form.setValue("pagaManutención", v === "true")}>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="no-manu" /><Label htmlFor="no-manu">No</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="si-manu" /><Label htmlFor="si-manu">Sí</Label></div>
                            </RadioGroup>
                          </div>
                          {watchPagaManutención && (
                            <div className="space-y-2">
                              <Label>Valor de la Manutención (€/mes) *</Label>
                              <Input type="number" {...form.register("valorManutención", { valueAsNumber: true })} min="0" placeholder="Valor mensual" />
                            </div>
                          )}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>

                {/* Privacy Consent */}
                <div className="space-y-2 pt-6">
                  <div className={cn(
                    "flex items-start space-x-3 p-4 border-2 rounded-lg bg-primary/5",
                    form.formState.errors.aceptaPrivacidad ? "border-destructive" : "border-primary/30"
                  )}>
                    <Checkbox
                      id="aceptaPrivacidad"
                      checked={watchAceptaPrivacidad}
                      onCheckedChange={(checked) => form.setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="aceptaPrivacidad" className="text-sm font-medium cursor-pointer">
                        <span className="font-bold text-primary block mb-1">LECTURA IMPORTANTE AL CLIENTE:</span>
                        <a href="/docs/consentimiento-hipotecario.pdf" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
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
                  <Button type="submit" disabled={!form.formState.isValid} className={!form.formState.isValid ? 'opacity-50 cursor-not-allowed' : ''}>
                    {form.formState.isValid ? (
                      <><Calculator className="mr-2 h-4 w-4" />Calcular Simulación</>
                    ) : (
                      <><Info className="mr-2 h-4 w-4" />Complete todos los campos</>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Los resultados son solo simulaciones y no constituyen una oferta de crédito.
              Las condiciones finales estarán sujetas al análisis de crédito.
            </p>
          </div>
        </div>
      </main>

      {/* Resultados Combinados */}
      {resultadosPersonal && resultadosHipoteca && datosFormulario && (
        <ResultadosCombinados
          open={resultadosOpen}
          onOpenChange={setResultadosOpen}
          datos={datosFormulario}
          resultadosPersonal={resultadosPersonal}
          resultadosHipoteca={resultadosHipoteca}
        />
      )}
    </div>
  );
};

export default SimuladoresIndex;
