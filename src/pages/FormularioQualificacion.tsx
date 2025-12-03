import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  formularioQualificacionSchema,
  type FormularioQualificacionData,
} from "@/schemas/formularioQualificacionSchema";
import { qualificarLead, type QualificacionResult } from "@/lib/qualificacaoUtils";
import { useConfirmAgendamento } from "@/hooks/useConfirmAgendamento";
import { ResultadoQualificacionModal } from "@/components/formulario/ResultadoQualificacionModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const COMUNIDADES_AUTONOMAS = [
  "Andalucía",
  "Aragón",
  "Asturias",
  "Islas Baleares",
  "Canarias",
  "Cantabria",
  "Castilla y León",
  "Castilla-La Mancha",
  "Cataluña",
  "Comunidad Valenciana",
  "Extremadura",
  "Galicia",
  "Comunidad de Madrid",
  "Región de Murcia",
  "Comunidad Foral de Navarra",
  "País Vasco",
  "La Rioja",
];

export default function FormularioQualificacion() {
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('form_session_id');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('form_session_id', id);
    }
    return id;
  });

  const [modalState, setModalState] = useState<{
    open: boolean;
    tipo: "desqualificado" | "qualificado_cataluna" | "qualificado_general" | "agendamento_confirmado";
    tidycalLink?: string;
    nombreAgente?: string;
    telefonoAgente?: string;
  }>({
    open: false,
    tipo: "desqualificado",
  });

  // Estados temporários para armazenar dados antes da confirmação
  const [tempFormData, setTempFormData] = useState<FormularioQualificacionData | null>(null);
  const [tempResultado, setTempResultado] = useState<QualificacionResult | null>(null);
  const [tempAgenteData, setTempAgenteData] = useState<{
    id: string;
    nombre: string;
    telefono: string;
    tidycal_url: string;
  } | null>(null);

  const { confirmAgendamento, isConfirming } = useConfirmAgendamento();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormularioQualificacionData>({
    resolver: zodResolver(formularioQualificacionSchema),
    defaultValues: {
      nombre_completo: "",
      email: "",
      telefono: "",
      edad: undefined,
      comunidad_autonoma: "",
      ciudad_interes: "",
      valor_inmueble_deseado: undefined,
      finalidad_compra: "vivienda_habitual",
      ingresos_mensuales: undefined,
      entrada_disponible: undefined,
      situacion_laboral: "empleado",
      tiene_credito_vigente: false,
      deudas_actuales: 0,
      en_fichero_morosidad: false,
      compra_solo_acompanado: "solo",
      acompanante_nombre: "",
      acompanante_relacion: "",
      acompanante_aporte: 0,
      acepta_privacidad: false,
    },
  });

  const tieneCreditoVigente = form.watch("tiene_credito_vigente");
  const compraAcompanado = form.watch("compra_solo_acompanado") === "acompanado";

  // Auto-save para rastrear abandono
  const watchedFields = form.watch(['telefono', 'email', 'nombre_completo']);
  
  useEffect(() => {
    const [telefono, email, nombreCompleto] = watchedFields;
    
    if (telefono || email || nombreCompleto) {
      const savePartial = async () => {
        try {
          const formData = form.getValues();
          await supabase.from('form_partial_submissions').upsert({
            session_id: sessionId,
            telefono: telefono || null,
            email: email || null,
            nombre_completo: nombreCompleto || null,
            form_data: formData,
            step_reached: 1,
            abandoned: true,
            updated_at: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error saving partial form:', error);
        }
      };
      
      const timeoutId = setTimeout(savePartial, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [watchedFields, sessionId]);

  // Detectar abandono ao sair da página
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const formValues = form.getValues();
      if (formValues.telefono || formValues.email) {
        await supabase.from('form_partial_submissions').upsert({
          session_id: sessionId,
          telefono: formValues.telefono || null,
          email: formValues.email || null,
          nombre_completo: formValues.nombre_completo || null,
          form_data: formValues,
          abandoned: true,
          abandoned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  const onSubmit = async (data: FormularioQualificacionData) => {
    setIsSubmitting(true);
    
    try {
      // Executar lógica de qualificação
      const resultado = qualificarLead(data);

      // Se desqualificado, mostrar modal e NÃO salvar no banco
      if (!resultado.qualificado) {
        setModalState({
          open: true,
          tipo: "desqualificado",
        });
        return;
      }

      // Se qualificado, APENAS buscar agente e abrir modal (NÃO salvar ainda!)
      const region = data.comunidad_autonoma === "Cataluña" ? "Cataluña" : "General";
      
      const { data: agentData, error } = await supabase.functions.invoke('get-next-agent', {
        body: { region }
      });

      console.log('[FormularioQualificacion] Resposta completa do agente:', JSON.stringify(agentData));

      if (error || !agentData?.agent_id) {
        // IMPORTANTE: NUNCA bloquear - salvar lead sem agente
        console.error('[FormularioQualificacion] Erro ao buscar agente:', error);
        console.error('[FormularioQualificacion] Região:', region);
        console.error('[FormularioQualificacion] Resposta:', agentData);
        
        console.warn('[FormularioQualificacion] Salvando lead SEM agente atribuído');
        
        // Salvar lead diretamente sem agente
        const result = await confirmAgendamento(data, resultado, null);
        
        if (result.success) {
          // Mostrar modal de lead salvo sem agendamento
          setModalState({
            open: true,
            tipo: "agendamento_confirmado",
          });
          
          toast.warning("Tu solicitud ha sido registrada. Nuestro equipo te contactará pronto.");
          form.reset();
        } else {
          toast.error(result.error || "Error al guardar. Inténtalo de nuevo.");
        }
        
        return;
      }

      // Armazenar dados temporariamente
      setTempFormData(data);
      setTempResultado(resultado);
      setTempAgenteData({
        id: agentData.agent_id,
        nombre: agentData.nombre,
        telefono: agentData.telefono,
        tidycal_url: agentData.tidycal_url,
      });

      // Abrir modal com Tidycal (NÃO salvar no banco ainda!)
      const tipo = data.comunidad_autonoma === "Cataluña"
        ? "qualificado_cataluna"
        : "qualificado_general";

      setModalState({
        open: true,
        tipo,
        tidycalLink: agentData.tidycal_url,
        nombreAgente: agentData.nombre,
        telefonoAgente: agentData.telefono,
      });
    } catch (error) {
      toast.error("Error al procesar. Por favor, inténtalo de nuevo.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para confirmação no modal (após agendar no Tidycal)
  const handleConfirmarAgendamento = async () => {
    if (!tempFormData || !tempResultado || !tempAgenteData) {
      toast.error("Datos incompletos. Por favor, vuelve a intentarlo.");
      return;
    }

    const result = await confirmAgendamento(tempFormData, tempResultado, tempAgenteData);

    if (result.success) {
      // Fechar modal atual e abrir modal de confirmação final
      setModalState({
        open: true,
        tipo: "agendamento_confirmado",
      });
      
      // Limpar dados temporários
      setTempFormData(null);
      setTempResultado(null);
      setTempAgenteData(null);
      
      // Limpar sessão de abandono
      await supabase.from('form_partial_submissions')
        .update({ abandoned: false, recovered: true })
        .eq('session_id', sessionId);
      localStorage.removeItem('form_session_id');
      
      // Resetar formulário
      form.reset();
      
      toast.success("¡Registro completado con éxito!");
    } else {
      toast.error(result.error || "Error al confirmar. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-4 sm:py-6 md:py-8 px-2 sm:px-4">
        {/* Logo e Mensagem de Boas-Vindas */}
        <div className="text-center mb-6 sm:mb-8 space-y-3 sm:space-y-4">
          <Logo size="lg" className="mx-auto h-12 w-12 sm:h-16 sm:w-16" />
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground px-2">
              ¡Bienvenido a Tu Hogar Posible!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
              Agradecemos su interés y confiamos en poder ayudarle a encontrar su nuevo hogar. Complete cuidadosamente el formulario a continuación para que podamos dirigirle al mejor agente y la mejor oportunidad.
            </p>
          </div>
        </div>

        {/* Formulário */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
            {/* Seção 1: Dados Pessoais */}
            <div className="bg-card p-3 sm:p-4 md:p-6 rounded-lg border space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Datos Personales</h2>
              
              <FormField
                control={form.control}
                name="nombre_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input placeholder="+34 XXX XXX XXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="edad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Tu edad"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção 2: Interesse Imobiliário */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">Interés de la localidad de la vivienda en:</h2>
              
              <FormField
                control={form.control}
                name="comunidad_autonoma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿En qué zona estás interesado? *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una comunidad autónoma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMUNIDADES_AUTONOMAS.map((comunidad) => (
                          <SelectItem key={comunidad} value={comunidad}>
                            {comunidad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ciudad_interes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿En qué ciudad? *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la ciudad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_inmueble_deseado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Cuál es el valor del inmueble que deseas? *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Valor del inmueble deseado (€)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção 3: Situação Financeira */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">Situación Financiera</h2>
              
              <FormField
                control={form.control}
                name="ingresos_mensuales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingresos Mensuales Percibidos (€) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ingresos mensuales (€)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="situacion_laboral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situación Laboral *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu situación laboral" />
                        </SelectTrigger>
                      </FormControl>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="autonomo">Emprendedor</SelectItem>
                      <SelectItem value="pensionista">Pensionista</SelectItem>
                      <SelectItem value="desempleado">Desempleado</SelectItem>
                      <SelectItem value="inversor">Inversor</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tiene_credito_vigente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Tienes algún crédito vigente? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "si")}
                        value={field.value ? "si" : "no"}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="si" id="credito-si" />
                          <Label htmlFor="credito-si">Sí</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="credito-no" />
                          <Label htmlFor="credito-no">No</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tieneCreditoVigente && (
                <FormField
                  control={form.control}
                  name="deudas_actuales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Cuánto pagas mensualmente de crédito vigente? (€) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="300"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="entrada_disponible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Cuanto tienes ahorrado?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Valor de entrada disponible (€)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="en_fichero_morosidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Estás en algún fichero de morosidad? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === "si")}
                        value={field.value ? "si" : "no"}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="si" id="morosidad-si" />
                          <Label htmlFor="morosidad-si">Sí</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="morosidad-no" />
                          <Label htmlFor="morosidad-no">No</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção 4: Compra Individual ou Acompanhada */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">Información de Compra</h2>
              
              <FormField
                control={form.control}
                name="compra_solo_acompanado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Comprarás la vivienda solo(a) o con alguien más? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="solo" id="compra-solo" />
                          <Label htmlFor="compra-solo">Solo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="acompanado" id="compra-acompanado" />
                          <Label htmlFor="compra-acompanado">Acompañado(a)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {compraAcompanado && (
                <div className="space-y-4 pl-4 border-l-2 border-primary">
                  <p className="text-sm text-muted-foreground">Información del acompañante</p>
                  
                  <FormField
                    control={form.control}
                    name="acompanante_nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del acompañante" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acompanante_relacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relación *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Cónyuge, Pareja, Familiar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acompanante_aporte"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aporte (€) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Aporte mensual en euros"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Seção 5: Confirmação de Privacidade */}
            <div className="bg-card p-6 rounded-lg border">
              <FormField
                control={form.control}
                name="acepta_privacidad"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Acepto la Política de Privacidad y el tratamiento de mis datos conforme al RGPD *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Botão de Envio */}
            <div className="flex flex-col items-center gap-4">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[200px]"
              >
                {isSubmitting ? "Procesando..." : "Finalizar"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Si tienes alguna duda visita{' '}
                <a 
                  href="https://tuhogarposible.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  tuhogarposible.com
                </a>
              </p>
            </div>
          </form>
        </Form>
      </div>

      {/* Modal de Resultado */}
      <ResultadoQualificacionModal
        open={modalState.open}
        onOpenChange={(open) => setModalState({ ...modalState, open })}
        tipo={modalState.tipo}
        tidycalLink={modalState.tidycalLink}
        nombreAgente={modalState.nombreAgente}
        telefonoAgente={modalState.telefonoAgente}
        onConfirmarAgendamento={handleConfirmarAgendamento}
        isConfirming={isConfirming}
      />
    </div>
  );
}
