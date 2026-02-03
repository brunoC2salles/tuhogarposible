import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/crm';
import { Mail, Phone, MapPin, DollarSign, Eye, Edit, Trash, UserCircle, Home, ExternalLink, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLeadInmuebles } from '@/hooks/useLeadInmuebles';

interface LeadCardProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onDisqualify?: (leadId: string) => void;
}

export const LeadCard = ({ lead, onViewDetails, onEdit, onDelete, onDisqualify }: LeadCardProps) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const { inmuebles } = useLeadInmuebles(lead.id);

  const MIN_SWIPE_DISTANCE = 50;

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove todos os caracteres não numéricos
    // Como o telefone JÁ VEM com código de país, apenas limpa formatação
    return phone.replace(/\D/g, '');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    if (!touchStart) return;
    
    const distance = touchStart - e.targetTouches[0].clientX;
    
    if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
      setSwiping(true);
      setSwipeDirection(distance > 0 ? 'left' : 'right');
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;
    
    if (isLeftSwipe) {
      onDelete(lead.id);
    }
    
    if (isRightSwipe) {
      onEdit(lead);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setSwiping(false);
    setSwipeDirection(null);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-300 relative",
        swiping && swipeDirection === 'left' && "translate-x-[-20px] bg-destructive/10",
        swiping && swipeDirection === 'right' && "translate-x-[20px] bg-primary/10"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {swiping && swipeDirection === 'left' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-destructive z-10">
          <Trash className="h-5 w-5" />
        </div>
      )}
      {swiping && swipeDirection === 'right' && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10">
          <Edit className="h-5 w-5" />
        </div>
      )}
      
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

        {inmuebles.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Home className="h-3 w-3" />
              Inmuebles vinculados ({inmuebles.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {inmuebles.slice(0, 2).map((inmueble) => (
                <a
                  key={inmueble.id}
                  href={`/produto/${inmueble.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {inmueble.titulo || inmueble.direccion}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
              {inmuebles.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{inmuebles.length - 2} más
                </span>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-1">
          {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}
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
