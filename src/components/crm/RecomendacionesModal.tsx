import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/crm';
import { useRecomendaciones } from '@/hooks/useRecomendaciones';
import { useLeadInmuebles } from '@/hooks/useLeadInmuebles';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { comparePriceToMarket, getMarketBadgeColor } from '@/lib/marketPriceUtils';
import { Building2, MapPin, Bed, Bath, Maximize, CheckCircle2, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecomendacionesModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const RecomendacionesModal = ({ open, onClose, lead }: RecomendacionesModalProps) => {
  const { user } = useAuth();
  const { recomendaciones, loading } = useRecomendaciones({ lead: lead || undefined, enabled: open });
  const { inmuebles: linkedInmuebles, linkInmueble } = useLeadInmuebles(lead?.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const isLinked = (inmuebleId: string) => {
    return linkedInmuebles.some((i) => i.id === inmuebleId);
  };

  const handleLink = async (inmuebleId: string) => {
    if (!lead || !user) return;
    await linkInmueble(lead.id, inmuebleId, user.id);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Inmuebles Recomendados para {lead.nombre_completo}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Basado en: {lead.ciudad_interes && `Ciudad: ${lead.ciudad_interes}`}
            {lead.zona_interes && `, Zona: ${lead.zona_interes}`}
            {lead.simulador_hipotecario_data && ` • Capacidad: ${formatCurrency(lead.simulador_hipotecario_data.montoFinanciable)}`}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Cargando recomendaciones...</div>
          ) : recomendaciones.length > 0 ? (
            <div className="grid gap-4">
              {recomendaciones.map((inmueble) => {
                const linked = isLinked(inmueble.id);
                const precio = Number(inmueble.precio);
                const withinBudget = lead.simulador_hipotecario_data
                  ? precio <= lead.simulador_hipotecario_data.montoFinanciable * 1.1
                  : true;

                return (
                  <Card key={inmueble.id} className={linked ? 'border-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {inmueble.imageUrl && (
                          <img
                            src={inmueble.imageUrl}
                            alt={inmueble.titulo || 'Inmueble'}
                            className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold">
                                {inmueble.titulo || `${inmueble.tipo} en ${inmueble.ciudad}`}
                              </h4>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                <span>{inmueble.direccion}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-primary">{formatCurrency(precio)}</p>
                              {!withinBudget && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Sobre presupuesto
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {inmueble.quartos && (
                              <div className="flex items-center gap-1">
                                <Bed className="h-4 w-4" />
                                <span>{inmueble.quartos}</span>
                              </div>
                            )}
                            {inmueble.banheiros && (
                              <div className="flex items-center gap-1">
                                <Bath className="h-4 w-4" />
                                <span>{inmueble.banheiros}</span>
                              </div>
                            )}
                            {inmueble.areaM2 && (
                              <div className="flex items-center gap-1">
                                <Maximize className="h-4 w-4" />
                                <span>{inmueble.areaM2}m²</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-2">
                              <Badge variant="secondary">{inmueble.tipo}</Badge>
                              <Badge variant="outline">{inmueble.ciudad}</Badge>
                            </div>

                            {linked ? (
                              <Button disabled variant="outline" size="sm">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Vinculado
                              </Button>
                            ) : (
                              <Button onClick={() => handleLink(inmueble.id)} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Vincular
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron inmuebles que coincidan con los criterios del lead</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
