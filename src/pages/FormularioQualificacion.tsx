import { useState } from "react";
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
import { qualificarLead } from "@/lib/qualificacaoUtils";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { ResultadoQualificacionModal } from "@/components/formulario/ResultadoQualificacionModal";
import { toast } from "sonner";

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
  const [modalState, setModalState] = useState<{
    open: boolean;
    tipo: "desqualificado" | "qualificado_cataluna" | "qualificado_general" | "agendamento_confirmado";
    tidycalLink?: string;
    nombreAgente?: string;
  }>({
    open: false,
    tipo: "desqualificado",
  });

  const { submitFormulario, isSubmitting } = useFormSubmission();

  const form = useForm<FormularioQualificacionData>({
    resolver: zodResolver(formularioQualificacionSchema),
    defaultValues: {
      nombre_completo: "",
      email: "",
      telefono: "",
      edad: 0,
      comunidad_autonoma: "",
      ciudad_interes: "",
      valor_inmueble_deseado: 0,
      ingresos_mensuales: 0,
      entrada_disponible: 0,
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

  const onSubmit = async (data: FormularioQualificacionData) => {
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

    // Se qualificado, salvar no banco
    const submissionResult = await submitFormulario(data, resultado);

    if (!submissionResult.success) {
      toast.error("Error al enviar el formulario. Por favor, inténtalo de nuevo.");
      return;
    }

    // Mostrar modal com Tidycal baseado na comunidade
    const tipo = data.comunidad_autonoma === "Cataluña"
      ? "qualificado_cataluna"
      : "qualificado_general";

    setModalState({
      open: true,
      tipo,
      tidycalLink: submissionResult.tidycal_url,
      nombreAgente: submissionResult.nombre_agente,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-8 px-4">
        {/* Logo e Mensagem de Boas-Vindas */}
        <div className="text-center mb-8 space-y-4">
          <Logo size="lg" className="mx-auto" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              ¡Bienvenido a Tu Hogar Posible!
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Agradecemos su interés y confiamos en poder ayudarle a encontrar su nuevo hogar. Complete cuidadosamente el formulario a continuación para que podamos dirigirle al mejor agente y la mejor oportunidad.
            </p>
          </div>
        </div>

        {/* Formulário */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Seção 1: Dados Pessoais */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">Datos Personales</h2>
              
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção 2: Interesse Imobiliário */}
            <div className="bg-card p-6 rounded-lg border space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">Interés Inmobiliario</h2>
              
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
                    <FormLabel>¿Qué ciudad? *</FormLabel>
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
                        placeholder="Ej: 150000"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        placeholder="1500"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <FormLabel>¿Cuánto tienes disponible para entrada?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[200px]"
              >
                {isSubmitting ? "Enviando..." : "Enviar y Continuar"}
              </Button>
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
      />
    </div>
  );
}
