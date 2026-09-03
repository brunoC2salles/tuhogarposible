import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lead, LeadStage, STAGE_LABELS, STAGE_ORDER } from '@/types/crm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, DollarSign, Eye, Edit, Trash, UserCircle, XCircle, Target, CalendarClock, Send, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


interface LeadCardProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onDisqualify?: (leadId: string) => void;
  onStageChange?: (leadId: string, newStage: LeadStage) => void;
}

export const LeadCard = ({ lead, onViewDetails, onEdit, onDelete, onDisqualify, onStageChange }: LeadCardProps) => {
  const [resending, setResending] = useState(false);

  const handleResendBitrix = async () => {
    try {
      setResending(true);
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { action: 'resend_lead_to_bitrix', lead_id: lead.id },
      });
      if (error) throw error;
      if (data?.success) toast.success(`Lead reenviado al Bitrix (HTTP ${data.http_status})`);
      else toast.error(data?.error || 'No se pudo reenviar el lead');
    } catch (err: any) {
      console.error('[LeadCard] resend bitrix error:', err);
      toast.error('Error al reenviar al Bitrix');
    } finally {
      setResending(false);
    }
  };





  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove todos os caracteres não numéricos
    // Como o telefone JÁ VEM com código de país, apenas limpa formatação
    return phone.replace(/\D/g, '');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Extract ingresos from simulation data
  const ingresosMensuales = (lead.simulador_hipotecario_data as any)?.ingresosMensuales
    || (lead.simulador_personal_data as any)?.ingresosMensuales
    || null;

  // Precio Máximo de Inmueble Recomendado (Punto 1 + Punto 2)
  const precioMaximoInmueble = (lead.simulador_hipotecario_data as any)?.precio_maximo_inmueble || null;

  return (
    <Card className="hover:shadow-md transition-all duration-300 relative">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
            {lead.nombre_completo}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => onViewDetails(lead)}
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => onEdit(lead)}
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(lead.id)}
            >
              <Trash className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            {onDisqualify && lead.stage !== 'descualificados' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                onClick={() => onDisqualify(lead.id)}
                title="Descualificar lead"
              >
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://wa.me/${formatPhoneForWhatsApp(lead.telefono)}`, '_blank');
            }}
            className="text-green-600 border-green-600 hover:bg-green-50 text-xs h-7 flex-1"
          >
            <Phone className="h-3 w-3 mr-1" />
            <span className="hidden xs:inline">Llamar </span>WhatsApp
          </Button>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate text-xs">{lead.email}</span>
        </div>

        {lead.ciudad_interes && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">
              {lead.ciudad_interes}
              {lead.zona_interes && ` - ${lead.zona_interes}`}
            </span>
          </div>
        )}

        {lead.valor_inmueble_deseado && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">{formatCurrency(lead.valor_inmueble_deseado)}</span>
          </div>
        )}

        {ingresosMensuales && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">Ingresos: {formatCurrency(ingresosMensuales)}/mes</span>
          </div>
        )}

        {precioMaximoInmueble && (
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs font-medium">Hasta {formatCurrency(precioMaximoInmueble)}</span>
          </div>
        )}

        {(lead.fecha_reunion || lead.reunion_datetime || lead.hora_reunion_texto) && (
          <div className="flex items-center gap-2 text-primary">
            <CalendarClock className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs font-medium">
              Reunión: {lead.fecha_reunion
                ? `${lead.fecha_reunion}${lead.hora_reunion ? ` ${String(lead.hora_reunion).slice(0,5)}` : ''}`
                : (lead.hora_reunion_texto || '')}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 pt-1 sm:pt-2">
          {lead.simulador_personal_data && (
            <Badge variant="secondary" className="text-xs">
              Crédito Personal
            </Badge>
          )}
          {lead.simulador_hipotecario_data && (
            <Badge variant="secondary" className="text-xs">
              Crédito Hipotecario
            </Badge>
          )}
        </div>


        {onStageChange && (
          <div className="pt-1" onPointerDown={(e) => e.stopPropagation()}>
            <Select
              value={lead.stage}
              onValueChange={(v) => onStageChange(lead.id, v as LeadStage)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Mover a etapa..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {STAGE_ORDER.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs">
                    {STAGE_LABELS[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleResendBitrix(); }}
          disabled={resending}
          className="w-full text-xs h-7"
          title="Reenviar este lead al Bitrix"
        >
          <Send className="h-3 w-3 mr-1" />
          {resending ? 'Reenviando...' : 'Reenviar a Bitrix'}
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>Llegada: {format(new Date(lead.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}</span>
        </div>


        {lead.agente_nombre && (
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground pt-2 border-t mt-2">
            <UserCircle className="h-3 w-3" />
            <span>{lead.agente_nombre}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
