import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lead, LeadStage, STAGE_LABELS, STAGE_ORDER } from '@/types/crm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, DollarSign, Eye, Edit, Trash, UserCircle, XCircle, Target, CalendarClock, Clock, FileSignature, AlertTriangle, Home, MessageCircle, Copy, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MandatoContratoDialog } from './MandatoContratoDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';


interface LeadCardProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onDisqualify?: (leadId: string) => void;
  onStageChange?: (leadId: string, newStage: LeadStage) => void;
  onToggleVisitaAgendada?: (leadId: string, value: boolean) => void;
}

export const LeadCard = ({ lead, onViewDetails, onEdit, onDelete, onDisqualify, onStageChange, onToggleVisitaAgendada }: LeadCardProps) => {
  const [contratoOpen, setContratoOpen] = useState(false);
  const { profile } = useAuth();
  // Visita agendada: solo existe en Buscando Vivienda (la base de datos la quita al salir de la etapa)
  const enBuscandoVivienda = lead.stage === 'buscando_vivienda';
  const visitaAgendada = enBuscandoVivienda && !!lead.visita_agendada;

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

  // Vivienda a revisar: enlace dinámico de viviendas recomendadas (zona + máximo financiable del lead).
  // La página /viviendas calcula las opciones en el momento en que el cliente la abre.
  const idealistaUrl = String((lead.simulador_hipotecario_data as any)?.idealista_url || '');
  const linkRecomendaciones = lead.vivienda_revisar && idealistaUrl
    ? `https://www.tuhogarposible.com/viviendas?i=${encodeURIComponent(idealistaUrl)}`
    : null;

  const copiarRecomendaciones = async () => {
    if (!linkRecomendaciones) return;
    try {
      await navigator.clipboard.writeText(linkRecomendaciones);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const enviarRecomendacionesWhatsApp = () => {
    if (!linkRecomendaciones) return;
    let tel = String(lead.telefono || '').replace(/\D/g, '');
    if (tel.startsWith('00')) tel = tel.slice(2);
    if (tel.length === 9) tel = `34${tel}`;
    if (tel.length < 10) { toast.error('El lead no tiene un teléfono válido'); return; }
    const nombre = String(lead.nombre_completo || '').trim().split(/\s+/)[0] || '';
    const agente = profile?.nombre ? `soy ${profile.nombre.trim().split(/\s+/)[0]} de Tu Hogar Posible` : 'te escribimos de Tu Hogar Posible';
    const texto = `Hola ${nombre}, ${agente}. La vivienda que nos indicaste supera lo que podemos financiarte, pero hemos seleccionado estas opciones dentro de tu presupuesto: ${linkRecomendaciones}`;
    window.open(`https://web.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <>
    <MandatoContratoDialog open={contratoOpen} onOpenChange={setContratoOpen} leadId={lead.id} leadNombre={lead.nombre_completo} leadTelefono={lead.telefono} />
    <Card className="hover:shadow-md transition-all duration-300 relative">
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4 space-y-2">
        <CardTitle className="text-sm sm:text-base font-semibold leading-tight break-words flex items-start gap-1.5">
          <span className="min-w-0">{lead.nombre_completo}</span>
          {visitaAgendada && (
            <span
              className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              title="Visita agendada"
              aria-label="Visita agendada"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </CardTitle>
        {/* Acciones en una barra propia: no compiten con el nombre por el ancho de la columna */}
        <div className="border-t pt-1.5">
        <div className="flex items-center gap-0.5 -mx-1.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onViewDetails(lead)} title="Ver detalles">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:text-primary" onClick={() => setContratoOpen(true)} title="Mandato de compra">
            <FileSignature className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(lead)} title="Editar lead">
            <Edit className="h-4 w-4" />
          </Button>
          {onToggleVisitaAgendada && enBuscandoVivienda && (
            <Button
              size="icon"
              variant="ghost"
              className={cn('h-7 w-7', visitaAgendada ? 'text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary' : 'text-muted-foreground')}
              onClick={(e) => { e.stopPropagation(); onToggleVisitaAgendada(lead.id, !visitaAgendada); }}
              title={visitaAgendada ? 'Quitar visita agendada' : 'Marcar visita agendada'}
              aria-pressed={visitaAgendada}
            >
              <CalendarCheck className="h-4 w-4" />
            </Button>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {onDisqualify && lead.stage !== 'descualificados' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                onClick={() => onDisqualify(lead.id)}
                title="Descualificar lead"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(lead.id)}
              title="Eliminar lead"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-xs sm:text-sm px-3 sm:px-4 pb-3 sm:pb-4">
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

        {(lead.precio_vivienda || lead.precio_vivienda_texto) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Home className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">
              Vivienda: {lead.precio_vivienda ? formatCurrency(lead.precio_vivienda) : lead.precio_vivienda_texto}
            </span>
          </div>
        )}

        {lead.vivienda_revisar && lead.stage === 'buscando_vivienda' && (
          <div
            className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
            title={lead.vivienda_revisar_motivo || undefined}
          >
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Vivienda a revisar</p>
              {lead.vivienda_revisar_motivo && <p className="text-[11px] leading-snug">{lead.vivienda_revisar_motivo}</p>}
              {linkRecomendaciones && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => { e.stopPropagation(); enviarRecomendacionesWhatsApp(); }}
                    title="Abrir WhatsApp Web con el mensaje y el enlace de viviendas recomendadas"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />Enviar viviendas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] bg-white dark:bg-transparent"
                    onClick={(e) => { e.stopPropagation(); copiarRecomendaciones(); }}
                    title={linkRecomendaciones}
                  >
                    <Copy className="h-3 w-3 mr-1" />Copiar enlace
                  </Button>
                </div>
              )}
            </div>
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
    </>
  );
};
