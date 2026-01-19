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
    <div className="space-y-2">
      {/* Row 1: Nombre (full width) */}
      <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
        <Label className="text-right text-xs font-medium">Nombre y Apellidos *</Label>
        <div>
          <Input {...register(`${prefix}.nombreApellidos`)} placeholder="Nombre completo" className="h-8 text-sm" />
          {titularErrors.nombreApellidos && <p className="text-xs text-destructive mt-0.5">{titularErrors.nombreApellidos.message}</p>}
        </div>
      </div>

      {/* Row 2: Fecha Nacimiento + DNI */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Fecha Nacimiento *</Label>
          <Input type="date" {...register(`${prefix}.fechaNacimiento`)} className="h-8 text-sm" />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">DNI/NIE *</Label>
          <Input {...register(`${prefix}.dniNie`)} placeholder="12345678A" className="h-8 text-sm" />
        </div>
      </div>

      {/* Row 3: Estado Civil + Nº Hijos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Estado Civil *</Label>
          <Select 
            value={watch(`${prefix}.estadoCivil`)} 
            onValueChange={(v) => setValue(`${prefix}.estadoCivil`, v)}
          >
            <SelectTrigger className="h-8 text-sm">
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
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Nº Hijos *</Label>
          <Input 
            type="number" 
            {...register(`${prefix}.numHijos`, { valueAsNumber: true })} 
            min="0" 
            className="h-8 text-sm w-20"
          />
        </div>
      </div>

      {/* Row 4: Teléfono + Profesión */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Teléfono *</Label>
          <Input {...register(`${prefix}.telefono`)} placeholder="+34 XXX XXX XXX" className="h-8 text-sm" />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Profesión *</Label>
          <Input {...register(`${prefix}.profesion`)} placeholder="Ej: Ingeniero" className="h-8 text-sm" />
        </div>
      </div>

      {/* Row 5: Tipo Contrato + Antigüedad */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Tipo Contrato *</Label>
          <Select 
            value={watch(`${prefix}.tipoContrato`)} 
            onValueChange={(v) => setValue(`${prefix}.tipoContrato`, v)}
          >
            <SelectTrigger className="h-8 text-sm">
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
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Antigüedad *</Label>
          <Input {...register(`${prefix}.antiguedad`)} placeholder="2 años 6 meses" className="h-8 text-sm" />
        </div>
      </div>

      {/* Row 6: Ingresos + Otros Ingresos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Ingresos (12 pagas) *</Label>
          <div className="flex items-center gap-1">
            <Input 
              type="number" 
              {...register(`${prefix}.ingresosTotales`, { valueAsNumber: true })} 
              min="0" 
              className="h-8 text-sm w-24"
            />
            <span className="text-xs text-muted-foreground">€</span>
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">Otros Ingresos</Label>
          <Input {...register(`${prefix}.otrosIngresos`)} placeholder="Opcional" className="h-8 text-sm" />
        </div>
      </div>

      {/* Row 7: Activos Inmobiliarios */}
      <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
        <Label className="text-right text-xs font-medium">Activos Inmobiliarios</Label>
        <Input {...register(`${prefix}.activosInmobiliarios`)} placeholder="Con o sin hipoteca" className="h-8 text-sm" />
      </div>

      {/* Row 8: Préstamos + Deudas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">¿Préstamos? *</Label>
          <div className="flex items-center gap-2">
            <Switch 
              checked={watch(`${prefix}.tienePrestamosPersonales`)} 
              onCheckedChange={(v) => setValue(`${prefix}.tienePrestamosPersonales`, v)} 
            />
            <span className="text-xs text-muted-foreground">
              {watch(`${prefix}.tienePrestamosPersonales`) ? 'Sí' : 'No'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <Label className="text-right text-xs font-medium">¿Deudas? *</Label>
          <div className="flex items-center gap-2">
            <Switch 
              checked={watch(`${prefix}.tieneDeudas`)} 
              onCheckedChange={(v) => setValue(`${prefix}.tieneDeudas`, v)} 
            />
            <span className="text-xs text-muted-foreground">
              {watch(`${prefix}.tieneDeudas`) ? 'Sí' : 'No'}
            </span>
          </div>
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
      titular2: undefined, // Importante: undefined ao invés de defaultTitular
      porcentajeFinanciacion: "80",
      precioCompraventa: 0,
      valorTasacionAproximado: 0,
      conPrestamoPersonal: false,
      aceptaPrivacidad: false,
    },
  });

  const tieneSegundoTitular = watch("tieneSegundoTitular");
  const aceptaPrivacidad = watch("aceptaPrivacidad");

  // Quando ativa segundo titular, inicializar com valores default
  const handleSegundoTitularChange = (checked: boolean) => {
    setValue("tieneSegundoTitular", checked);
    if (checked) {
      setValue("titular2", defaultTitular);
    } else {
      setValue("titular2", undefined);
    }
  };

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
      <div className="container max-w-5xl mx-auto py-4 px-4">
        {/* Header compacto */}
        <div className="text-center mb-4">
          <Logo size="md" className="mx-auto" />
          <h1 className="text-xl font-bold text-foreground mt-2">
            Formulario Descubierta
          </h1>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* TITULAR 1 */}
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-sm font-semibold mb-3 text-primary">DATOS DE TITULAR 1</h2>
            <TitularFields 
              prefix="titular1" 
              register={register} 
              watch={watch} 
              setValue={setValue}
              errors={errors}
            />
          </div>

          {/* Toggle Segundo Titular */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox 
              id="segundoTitular"
              checked={tieneSegundoTitular}
              onCheckedChange={handleSegundoTitularChange}
            />
            <Label htmlFor="segundoTitular" className="text-sm font-medium cursor-pointer">
              Añadir Segundo Titular
            </Label>
          </div>

          {/* TITULAR 2 */}
          {tieneSegundoTitular && (
            <div className="bg-card p-4 rounded-lg border border-green-200 bg-green-50/30">
              <h2 className="text-sm font-semibold mb-3 text-green-700">DATOS DE TITULAR 2</h2>
              <TitularFields 
                prefix="titular2" 
                register={register} 
                watch={watch} 
                setValue={setValue}
                errors={errors}
              />
            </div>
          )}

          {/* DATOS DE LA OPERACIÓN - Layout compacto */}
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-sm font-semibold mb-3 text-primary">DATOS DE LA OPERACIÓN</h2>
            
            <div className="space-y-2">
              {/* Row 1: Financiación */}
              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                <Label className="text-right text-xs font-medium">Financiación *</Label>
                <RadioGroup 
                  value={watch("porcentajeFinanciacion")}
                  onValueChange={(v) => setValue("porcentajeFinanciacion", v as "80" | "90" | "100")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="80" id="fin-80" />
                    <Label htmlFor="fin-80" className="text-xs">80%</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="90" id="fin-90" />
                    <Label htmlFor="fin-90" className="text-xs">90%</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="100" id="fin-100" />
                    <Label htmlFor="fin-100" className="text-xs">100%</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Row 2: Precio + Tasación + Préstamo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <Label className="text-right text-xs font-medium">Precio *</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      {...register("precioCompraventa", { valueAsNumber: true })} 
                      min="0" 
                      className="h-8 text-sm w-28"
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                  <Label className="text-right text-xs font-medium">Tasación *</Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      {...register("valorTasacionAproximado", { valueAsNumber: true })} 
                      min="0" 
                      className="h-8 text-sm w-28"
                    />
                    <span className="text-xs text-muted-foreground">€</span>
                  </div>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <Label className="text-right text-xs font-medium">¿Con Préstamo?</Label>
                  <RadioGroup 
                    value={watch("conPrestamoPersonal") ? "si" : "no"}
                    onValueChange={(v) => setValue("conPrestamoPersonal", v === "si")}
                    className="flex gap-3"
                  >
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="si" id="prestamo-si" />
                      <Label htmlFor="prestamo-si" className="text-xs">Sí</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="no" id="prestamo-no" />
                      <Label htmlFor="prestamo-no" className="text-xs">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          {/* Privacidad + Submit */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 px-2">
              <Checkbox 
                id="privacidad"
                checked={aceptaPrivacidad}
                onCheckedChange={(checked) => setValue("aceptaPrivacidad", !!checked)}
              />
              <Label htmlFor="privacidad" className="text-xs cursor-pointer leading-relaxed">
                Acepto la Política de Privacidad y el tratamiento de mis datos conforme al RGPD *
              </Label>
            </div>
            {errors.aceptaPrivacidad && (
              <p className="text-xs text-destructive px-2">{errors.aceptaPrivacidad.message}</p>
            )}

            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Guardando..." : "Enviar Formulario"}
            </Button>
          </div>
        </form>
      </div>

      <ResultadosDescubiertaModal 
        open={modalOpen}
        onClose={handleCloseModal}
        data={submittedData}
      />
    </div>
  );
}