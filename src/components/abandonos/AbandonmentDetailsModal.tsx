import { FormAbandonment } from '@/hooks/useFormAbandonments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Zap,
  CheckCircle,
  User,
  MapPin,
  Briefcase,
  Home,
  DollarSign,
  Users,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface AbandonmentDetailsModalProps {
  abandonment: FormAbandonment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWhatsApp: (telefono: string, nombre: string) => void;
  onTriggerWebhook: (abandonment: FormAbandonment) => void;
  onMarkRecovered: (id: string) => void;
}

export function AbandonmentDetailsModal({
  abandonment,
  open,
  onOpenChange,
  onWhatsApp,
  onTriggerWebhook,
  onMarkRecovered,
}: AbandonmentDetailsModalProps) {
  if (!abandonment) return null;

  const formData = abandonment.form_data || {};

  const InfoSection = ({ title, icon: Icon, children }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="pl-6 space-y-1 text-sm">{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{value}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Detalles del Lead Abandonado</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Información completa del formulario
              </p>
            </div>
            {abandonment.recovered ? (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Contactado
              </Badge>
            ) : (
              <Badge variant="destructive">Pendiente</Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Datos de Contacto */}
            <InfoSection title="Datos de Contacto" icon={User}>
              <InfoRow label="Nombre" value={abandonment.nombre_completo} />
              <InfoRow label="Teléfono" value={abandonment.telefono} />
              <InfoRow label="Email" value={abandonment.email} />
              {abandonment.abandoned_at && (
                <InfoRow
                  label="Fecha de Abandono"
                  value={format(new Date(abandonment.abandoned_at), 'dd/MM/yyyy HH:mm')}
                />
              )}
              <InfoRow label="Paso Alcanzado" value={`${abandonment.step_reached || 0} de 9`} />
            </InfoSection>

            <Separator />

            {/* Ubicación */}
            {(formData.comunidad_autonoma || formData.ciudad_interes) && (
              <>
                <InfoSection title="Ubicación" icon={MapPin}>
                  <InfoRow label="Comunidad Autónoma" value={formData.comunidad_autonoma} />
                  <InfoRow label="Ciudad de Interés" value={formData.ciudad_interes} />
                  <InfoRow label="Zona de Interés" value={formData.zona_interes} />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Situación Laboral */}
            {(formData.situacion_laboral || formData.ingresos_mensuales) && (
              <>
                <InfoSection title="Situación Laboral" icon={Briefcase}>
                  <InfoRow label="Tipo de Contrato" value={formData.situacion_laboral} />
                  <InfoRow
                    label="Ingresos Mensuales"
                    value={formData.ingresos_mensuales ? `€${formData.ingresos_mensuales.toLocaleString()}` : null}
                  />
                  <InfoRow label="Edad" value={formData.edad} />
                  <InfoRow label="Menor de 35 años" value={formData.menor_de_35 ? 'Sí' : 'No'} />
                  <InfoRow label="Familia Numerosa" value={formData.familia_numerosa ? 'Sí' : 'No'} />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Interés de Compra */}
            {(formData.valor_inmueble_deseado || formData.entrada_disponible) && (
              <>
                <InfoSection title="Interés de Compra" icon={Home}>
                  <InfoRow
                    label="Valor Inmueble Deseado"
                    value={formData.valor_inmueble_deseado ? `€${formData.valor_inmueble_deseado.toLocaleString()}` : null}
                  />
                  <InfoRow
                    label="Entrada Disponible"
                    value={formData.entrada_disponible ? `€${formData.entrada_disponible.toLocaleString()}` : null}
                  />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Situación Financiera */}
            {(formData.deudas_actuales !== undefined || formData.en_fichero_morosidad !== undefined) && (
              <>
                <InfoSection title="Situación Financiera" icon={DollarSign}>
                  <InfoRow
                    label="Deudas Actuales"
                    value={formData.deudas_actuales ? `€${formData.deudas_actuales.toLocaleString()}` : 'Sin deudas'}
                  />
                  <InfoRow
                    label="Fichero de Morosidad"
                    value={formData.en_fichero_morosidad ? 'Sí' : 'No'}
                  />
                </InfoSection>
                <Separator />
              </>
            )}

            {/* Acompañante */}
            {formData.compra_solo_acompanado && (
              <>
                <InfoSection title="Acompañante" icon={Users}>
                  <InfoRow label="Compra con Acompañante" value={formData.compra_solo_acompanado} />
                  <InfoRow label="Nombre del Acompañante" value={formData.acompanante_nombre} />
                  <InfoRow label="Relación" value={formData.acompanante_relacion} />
                  <InfoRow
                    label="Aporte del Acompañante"
                    value={formData.acompanante_aporte ? `€${formData.acompanante_aporte.toLocaleString()}` : null}
                  />
                </InfoSection>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {abandonment.telefono && (
            <Button
              onClick={() => onWhatsApp(abandonment.telefono!, abandonment.nombre_completo || 'Lead')}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          <Button variant="outline" onClick={() => onTriggerWebhook(abandonment)}>
            <Zap className="h-4 w-4 mr-2" />
            Disparar Automação
          </Button>
          {!abandonment.recovered && (
            <Button variant="secondary" onClick={() => onMarkRecovered(abandonment.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar Contactado
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
