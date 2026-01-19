import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  formularioDescubiertaSchema, 
  type FormularioDescubiertaData,
  type TitularData 
} from "@/schemas/formularioDescubiertaSchema";
import { ResultadosDescubiertaModal } from "@/components/descubierta/ResultadosDescubiertaModal";

const defaultTitular: TitularData = {
  nombreApellidos: '',
  fechaNacimiento: '',
  dniNie: '',
  estadoCivil: 'soltero',
  numHijos: 0,
  telefono: '',
  profesion: '',
  tipoContrato: 'indefinido',
  antiguedad: '',
  ingresosTotales: 0,
  otrosIngresos: '',
  activosInmobiliarios: '',
  tienePrestamosPersonales: false,
  tieneDeudas: false,
};

function TitularFields({ 
  prefix, 
  register, 
  watch, 
  setValue, 
  errors 
}: { 
  prefix: 'titular1' | 'titular2';
  register: any;
  watch: any;
  setValue: any;
  errors: any;
}) {
  const titularErrors = errors[prefix] || {};
  
  return (
    <div className="space-y-3">
      {/* Row: Nombre */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Nombre y Apellidos *</Label>
        <div>
          <Input {...register(`${prefix}.nombreApellidos`)} placeholder="Nombre completo" />
          {titularErrors.nombreApellidos && <p className="text-xs text-destructive mt-1">{titularErrors.nombreApellidos.message}</p>}
        </div>
      </div>

      {/* Row: Fecha Nacimiento */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Fecha de Nacimiento *</Label>
        <div>
          <Input type="date" {...register(`${prefix}.fechaNacimiento`)} />
          {titularErrors.fechaNacimiento && <p className="text-xs text-destructive mt-1">{titularErrors.fechaNacimiento.message}</p>}
        </div>
      </div>

      {/* Row: DNI/NIE */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">DNI/NIE Permanente *</Label>
        <div>
          <Input {...register(`${prefix}.dniNie`)} placeholder="12345678A" />
          {titularErrors.dniNie && <p className="text-xs text-destructive mt-1">{titularErrors.dniNie.message}</p>}
        </div>
      </div>

      {/* Row: Estado Civil */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Estado Civil *</Label>
        <Select 
          value={watch(`${prefix}.estadoCivil`)} 
          onValueChange={(v) => setValue(`${prefix}.estadoCivil`, v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="soltero">Soltero/a</SelectItem>
            <SelectItem value="casado">Casado/a</SelectItem>
            <SelectItem value="divorciado">Divorciado/a</SelectItem>
            <SelectItem value="viudo">Viudo/a</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row: Nº Hijos */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Nº de Hijos *</Label>
        <Input 
          type="number" 
          {...register(`${prefix}.numHijos`, { valueAsNumber: true })} 
          min="0" 
          className="w-[100px]"
        />
      </div>

      {/* Row: Teléfono */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Teléfono *</Label>
        <div>
          <Input {...register(`${prefix}.telefono`)} placeholder="+34 XXX XXX XXX" />
          {titularErrors.telefono && <p className="text-xs text-destructive mt-1">{titularErrors.telefono.message}</p>}
        </div>
      </div>

      {/* Row: Profesión */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Profesión *</Label>
        <div>
          <Input {...register(`${prefix}.profesion`)} placeholder="Ej: Ingeniero, Médico..." />
          {titularErrors.profesion && <p className="text-xs text-destructive mt-1">{titularErrors.profesion.message}</p>}
        </div>
      </div>

      {/* Row: Tipo Contrato */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Tipo de Contrato *</Label>
        <Select 
          value={watch(`${prefix}.tipoContrato`)} 
          onValueChange={(v) => setValue(`${prefix}.tipoContrato`, v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="funcionario">Funcionario</SelectItem>
            <SelectItem value="indefinido">Indefinido</SelectItem>
            <SelectItem value="interino">Interino</SelectItem>
            <SelectItem value="fijo_discontinuo">Fijo Discontinuo</SelectItem>
            <SelectItem value="temporal">Temporal</SelectItem>
            <SelectItem value="autonomo">Autónomo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row: Antigüedad */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Antigüedad *</Label>
        <div>
          <Input {...register(`${prefix}.antiguedad`)} placeholder="Ej: 2 años 6 meses" />
          {titularErrors.antiguedad && <p className="text-xs text-destructive mt-1">{titularErrors.antiguedad.message}</p>}
        </div>
      </div>

      {/* Row: Ingresos */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Ingresos Totales (12 pagas) *</Label>
        <div className="flex items-center gap-2">
          <Input 
            type="number" 
            {...register(`${prefix}.ingresosTotales`, { valueAsNumber: true })} 
            min="0" 
            className="w-[150px]"
          />
          <span className="text-muted-foreground">€</span>
        </div>
      </div>

      {/* Row: Otros Ingresos */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Otros Ingresos o Inversiones</Label>
        <Input {...register(`${prefix}.otrosIngresos`)} placeholder="Opcional" />
      </div>

      {/* Row: Activos Inmobiliarios */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">Activos Inmobiliarios</Label>
        <Input {...register(`${prefix}.activosInmobiliarios`)} placeholder="Con o sin hipoteca" />
      </div>

      {/* Row: Préstamos Personales */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">¿Tiene Préstamos Personales? *</Label>
        <div className="flex items-center gap-4">
          <Switch 
            checked={watch(`${prefix}.tienePrestamosPersonales`)} 
            onCheckedChange={(v) => setValue(`${prefix}.tienePrestamosPersonales`, v)} 
          />
          <span className="text-sm text-muted-foreground">
            {watch(`${prefix}.tienePrestamosPersonales`) ? 'Sí' : 'No'}
          </span>
        </div>
      </div>

      {/* Row: Deudas */}
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
        <Label className="text-right font-medium">¿Tiene Alguna Deuda? *</Label>
        <div className="flex items-center gap-4">
          <Switch 
            checked={watch(`${prefix}.tieneDeudas`)} 
            onCheckedChange={(v) => setValue(`${prefix}.tieneDeudas`, v)} 
          />
          <span className="text-sm text-muted-foreground">
            {watch(`${prefix}.tieneDeudas`) ? 'Sí' : 'No'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FormularioDescubierta() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormularioDescubiertaData | null>(null);

  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue, 
    reset,
    formState: { errors } 
  } = useForm<FormularioDescubiertaData>({
    resolver: zodResolver(formularioDescubiertaSchema),
    defaultValues: {
      titular1: defaultTitular,
      tieneSegundoTitular: false,
      titular2: defaultTitular,
      porcentajeFinanciacion: "80",
      precioCompraventa: 0,
      valorTasacionAproximado: 0,
      conPrestamoPersonal: false,
      aceptaPrivacidad: false,
    },
  });

  const tieneSegundoTitular = watch("tieneSegundoTitular");
  const aceptaPrivacidad = watch("aceptaPrivacidad");

  const onSubmit = async (data: FormularioDescubiertaData) => {
    setIsSubmitting(true);

    try {
      // Criar lead no banco
      const { error } = await supabase.from('leads').insert({
        nombre_completo: data.titular1.nombreApellidos,
        telefono: data.titular1.telefono,
        email: `pendiente_${Date.now()}@tuhogarposible.com`, // Email placeholder
        stage: 'recopilacion_expediente',
        source: 'manual',
        notas: `FICHA DESCUBIERTA\n\n` +
          `TITULAR 1:\n` +
          `- DNI: ${data.titular1.dniNie}\n` +
          `- Profesión: ${data.titular1.profesion}\n` +
          `- Contrato: ${data.titular1.tipoContrato}\n` +
          `- Ingresos: ${data.titular1.ingresosTotales}€\n` +
          (data.tieneSegundoTitular && data.titular2 ? 
            `\nTITULAR 2:\n` +
            `- Nombre: ${data.titular2.nombreApellidos}\n` +
            `- DNI: ${data.titular2.dniNie}\n` +
            `- Ingresos: ${data.titular2.ingresosTotales}€\n` 
          : '') +
          `\nOPERACIÓN:\n` +
          `- Financiación: ${data.porcentajeFinanciacion}%\n` +
          `- Precio: ${data.precioCompraventa}€\n` +
          `- Tasación: ${data.valorTasacionAproximado}€\n` +
          `- Con préstamo: ${data.conPrestamoPersonal ? 'Sí' : 'No'}`,
        valor_inmueble_deseado: data.precioCompraventa,
        agente_asignado_id: null,
      });

      if (error) throw error;

      setSubmittedData(data);
      setModalOpen(true);
      toast.success("Lead creado con éxito");
    } catch (error) {
      console.error("Error al crear lead:", error);
      toast.error("Error al crear el lead. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <Logo size="lg" className="mx-auto" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Formulario Descubierta
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Complete los datos del cliente para crear un nuevo lead en el CRM.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* TITULAR 1 */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-4 text-primary">DATOS DE TITULAR 1</h2>
            <TitularFields 
              prefix="titular1" 
              register={register} 
              watch={watch} 
              setValue={setValue}
              errors={errors}
            />
          </div>

          {/* Toggle Segundo Titular */}
          <div className="flex items-center gap-3 px-2">
            <Checkbox 
              id="segundoTitular"
              checked={tieneSegundoTitular}
              onCheckedChange={(checked) => setValue("tieneSegundoTitular", !!checked)}
            />
            <Label htmlFor="segundoTitular" className="font-medium cursor-pointer">
              Añadir Segundo Titular
            </Label>
          </div>

          {/* TITULAR 2 */}
          {tieneSegundoTitular && (
            <div className="bg-card p-6 rounded-lg border border-green-200 bg-green-50/30">
              <h2 className="text-lg font-semibold mb-4 text-green-700">DATOS DE TITULAR 2</h2>
              <TitularFields 
                prefix="titular2" 
                register={register} 
                watch={watch} 
                setValue={setValue}
                errors={errors}
              />
            </div>
          )}

          {/* DATOS DE LA OPERACIÓN */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-4 text-primary">DATOS DE LA OPERACIÓN</h2>
            
            <div className="space-y-4">
              {/* Porcentaje Financiación */}
              <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                <Label className="text-right font-medium">Porcentaje de Financiación *</Label>
                <RadioGroup 
                  value={watch("porcentajeFinanciacion")}
                  onValueChange={(v) => setValue("porcentajeFinanciacion", v as "80" | "90" | "100")}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="80" id="fin-80" />
                    <Label htmlFor="fin-80">80%</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="90" id="fin-90" />
                    <Label htmlFor="fin-90">90%</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="100" id="fin-100" />
                    <Label htmlFor="fin-100">100%</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Precio Compraventa */}
              <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                <Label className="text-right font-medium">Precio de Compraventa *</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    {...register("precioCompraventa", { valueAsNumber: true })} 
                    min="0" 
                    className="w-[180px]"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
              </div>

              {/* Valor Tasación */}
              <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                <Label className="text-right font-medium">Valor de Tasación Aproximado *</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    {...register("valorTasacionAproximado", { valueAsNumber: true })} 
                    min="0" 
                    className="w-[180px]"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
              </div>

              {/* Con Préstamo Personal */}
              <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                <Label className="text-right font-medium">¿Va con Préstamo Personal? *</Label>
                <RadioGroup 
                  value={watch("conPrestamoPersonal") ? "si" : "no"}
                  onValueChange={(v) => setValue("conPrestamoPersonal", v === "si")}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="si" id="prestamo-si" />
                    <Label htmlFor="prestamo-si">Sí</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="prestamo-no" />
                    <Label htmlFor="prestamo-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Privacidad + Submit */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-2">
              <Checkbox 
                id="privacidad"
                checked={aceptaPrivacidad}
                onCheckedChange={(checked) => setValue("aceptaPrivacidad", !!checked)}
              />
              <Label htmlFor="privacidad" className="text-sm cursor-pointer leading-relaxed">
                Acepto la Política de Privacidad y el tratamiento de mis datos conforme al RGPD *
              </Label>
            </div>
            {errors.aceptaPrivacidad && (
              <p className="text-sm text-destructive px-2">{errors.aceptaPrivacidad.message}</p>
            )}

            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={isSubmitting || !aceptaPrivacidad}
            >
              {isSubmitting ? "Enviando..." : "Enviar Formulario"}
            </Button>
          </div>
        </form>

        {/* Modal de Resultados */}
        <ResultadosDescubiertaModal 
          open={modalOpen}
          onClose={handleCloseModal}
          data={submittedData}
        />
      </div>
    </div>
  );
}
