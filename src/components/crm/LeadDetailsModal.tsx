import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lead, STAGE_LABELS, LeadHistorico } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calculator, Home, Clock, User, Building2 } from 'lucide-react';
import { useLeadInmuebles } from '@/hooks/useLeadInmuebles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onOpenSimulators: (lead: Lead) => void;
  onOpenRecomendaciones: (lead: Lead) => void;
}

export const LeadDetailsModal = ({
  open,
  onClose,
  lead,
  onOpenSimulators,
  onOpenRecomendaciones,
}: LeadDetailsModalProps) => {
  const { user } = useAuth();
  const { inmuebles, loading: inmueblesLoading, unlinkInmueble } = useLeadInmuebles(lead?.id);
  const [historico, setHistorico] = useState<LeadHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    if (lead && open) {
      fetchHistorico();
    }
  }, [lead?.id, open]);

  const fetchHistorico = async () => {
    if (!lead) return;

    try {
      setLoadingHistorico(true);
      const { data, error } = await supabase
        .from('lead_historico')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (err) {
      console.error('[LeadDetails] Error fetching historico:', err);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleUnlinkInmueble = async (inmuebleId: string) => {
    if (!lead || !user) return;
    const success = await unlinkInmueble(lead.id, inmuebleId);
    if (success) {
      toast.success('Inmueble desvinculado');
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{lead.nombre_completo}</DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            <Badge>{STAGE_LABELS[lead.stage]}</Badge>
            <span className="text-sm text-muted-foreground">
              Creado: {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="simulators">Simuladores</TabsTrigger>
            <TabsTrigger value="inmuebles">Inmuebles ({inmuebles.length})</TabsTrigger>
            <TabsTrigger value="historico">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{lead.telefono}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Preferencias
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ciudad</p>
                  <p className="font-medium">{lead.ciudad_interes || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zona</p>
                  <p className="font-medium">{lead.zona_interes || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Valor Deseado</p>
                  <p className="font-medium">{formatCurrency(lead.valor_inmueble_deseado)}</p>
                </div>
              </CardContent>
            </Card>

            {lead.notas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{lead.notas}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="simulators" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => onOpenSimulators(lead)}>
                <Calculator className="h-4 w-4 mr-2" />
                Ejecutar Simuladores
              </Button>
            </div>

            {lead.simulador_personal_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Crédito Personal</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monto Solicitado</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_personal_data.montoSolicitado)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_personal_data.cuotaMensual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plazo</p>
                    <p className="font-medium">{lead.simulador_personal_data.plazoMeses} meses</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa de Interés</p>
                    <p className="font-medium">{lead.simulador_personal_data.tasaInteres}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {lead.simulador_hipotecario_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Crédito Hipotecario</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Inmueble</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_hipotecario_data.valorInmueble)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_hipotecario_data.cuotaMensual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monto Máximo Crédito</p>
                    <p className="font-medium text-primary">{formatCurrency(lead.simulador_hipotecario_data.montoMaximoCredito)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capital Propio</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_hipotecario_data.capitalPropioNecesario)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!lead.simulador_personal_data && !lead.simulador_hipotecario_data && (
              <div className="text-center text-muted-foreground py-8">
                No hay datos de simuladores para este lead
              </div>
            )}
          </TabsContent>

          <TabsContent value="inmuebles" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => onOpenRecomendaciones(lead)}>
                <Building2 className="h-4 w-4 mr-2" />
                Ver Recomendaciones
              </Button>
            </div>

            {inmueblesLoading ? (
              <div className="text-center text-muted-foreground py-8">Cargando...</div>
            ) : inmuebles.length > 0 ? (
              <div className="grid gap-4">
                {inmuebles.map((inmueble) => (
                  <Card key={inmueble.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{inmueble.titulo || `${inmueble.tipo} en ${inmueble.ciudad}`}</p>
                        <p className="text-sm text-muted-foreground">{inmueble.direccion}</p>
                        <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(Number(inmueble.precio))}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkInmueble(inmueble.id)}
                      >
                        Desvincular
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No hay inmuebles vinculados a este lead
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            {loadingHistorico ? (
              <div className="text-center text-muted-foreground py-8">Cargando...</div>
            ) : historico.length > 0 ? (
              <div className="space-y-3">
                {historico.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {entry.stage_anterior && (
                            <>
                              <Badge variant="outline">{STAGE_LABELS[entry.stage_anterior]}</Badge>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge>{STAGE_LABELS[entry.stage_nuevo]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No hay historial de movimientos
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
