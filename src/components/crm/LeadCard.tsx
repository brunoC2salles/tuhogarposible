import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lead } from '@/types/crm';
import { Mail, Phone, MapPin, DollarSign, Eye, Edit, Trash, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LeadCardProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

export const LeadCard = ({ lead, onViewDetails, onEdit, onDelete }: LeadCardProps) => {
  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove todos os caracteres não numéricos
    // Como o telefone JÁ VEM com código de país, apenas limpa formatação
    return phone.replace(/\D/g, '');
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
    <Card className="hover:shadow-md transition-shadow">
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
