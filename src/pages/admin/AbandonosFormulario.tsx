import { useState } from 'react';
import { useFormAbandonments, FormAbandonment } from '@/hooks/useFormAbandonments';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AbandonmentDetailsModal } from '@/components/abandonos/AbandonmentDetailsModal';

const AbandonosFormulario = () => {
  const { abandonments, loading, filters, setFilters, markAsRecovered } = useFormAbandonments();
  const [selectedAbandonment, setSelectedAbandonment] = useState<FormAbandonment | null>(null);

  const openWhatsApp = (telefono: string, nombre: string) => {
    const message = encodeURIComponent(
      `Hola ${nombre}, vimos que empezaste el proceso de cualificación en Tu Hogar Posible. ¿Podemos ayudarte a completarlo?`
    );
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const triggerWebhook = async (abandonment: FormAbandonment) => {
    try {
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_abandonos_url')
        .single();

      const webhookUrl = settings?.value;
      
      if (!webhookUrl) {
        toast.error('URL del webhook no configurada. Configure en Settings.');
        return;
      }

      const formData = abandonment.form_data || {};
      
      // Payload completo y estructurado
      const payload = {
        trigger: 'form_abandonment',
        timestamp: new Date().toISOString(),
        session_id: abandonment.session_id,
        abandoned_at: abandonment.abandoned_at,
        contact: {
          nombre_completo: abandonment.nombre_completo,
          telefono: abandonment.telefono,
          email: abandonment.email,
        },
        location: {
          comunidad_autonoma: formData.comunidad_autonoma || null,
          ciudad_interes: formData.ciudad_interes || null,
          zona_interes: formData.zona_interes || null,
        },
        employment: {
          situacion_laboral: formData.situacion_laboral || null,
          ingresos_mensuales: formData.ingresos_mensuales || null,
          edad: formData.edad || null,
          menor_de_35: formData.menor_de_35 || null,
          familia_numerosa: formData.familia_numerosa || null,
        },
        purchase_interest: {
          valor_inmueble_deseado: formData.valor_inmueble_deseado || null,
          entrada_disponible: formData.entrada_disponible || null,
        },
        financial: {
          deudas_actuales: formData.deudas_actuales || null,
          en_fichero_morosidad: formData.en_fichero_morosidad || null,
        },
        companion: {
          compra_solo_acompanado: formData.compra_solo_acompanado || null,
          acompanante_nombre: formData.acompanante_nombre || null,
          acompanante_relacion: formData.acompanante_relacion || null,
          acompanante_aporte: formData.acompanante_aporte || null,
        },
        step_reached: abandonment.step_reached,
      };

      console.log('[Webhook] Payload enviado:', payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Automatización disparada con éxito');
      } else {
        toast.warning('Webhook enviado, pero hubo un problema en la respuesta');
      }
    } catch (error) {
      console.error('[Webhook] Error:', error);
      toast.error('Error al disparar automación');
    }
  };

  const handleMarkAsRecovered = async (id: string) => {
    await markAsRecovered(id);
    setSelectedAbandonment(null);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Abandonos de Formulario</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de leads que abandonaron el proceso de cualificación
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="recovered">Estado de Recuperación</Label>
                <Select
                  value={filters.recovered}
                  onValueChange={(value: 'all' | 'true' | 'false') => 
                    setFilters({ ...filters, recovered: value })
                  }
                >
                  <SelectTrigger id="recovered">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="false">No Contactados</SelectItem>
                    <SelectItem value="true">Contactados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Abandonos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{abandonments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">No Contactados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">
                {abandonments.filter(a => !a.recovered).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contactados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {abandonments.filter(a => a.recovered).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Abandonments List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando abandonos...</p>
          </div>
        ) : abandonments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay abandonos con los filtros seleccionados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {abandonments.map((abandonment) => {
              return (
                <Card
                  key={abandonment.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedAbandonment(abandonment)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {abandonment.nombre_completo || 'Sin nombre'}
                          </h3>
                          {abandonment.recovered ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Contactado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Pendiente</Badge>
                          )}
                          {abandonment.automation_triggered && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Automatización enviada
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Paso: <strong>{abandonment.step_reached || 0}</strong>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className={`text-sm ${!abandonment.telefono ? 'text-destructive italic' : ''}`}>
                            {abandonment.telefono || 'No informado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className={`text-sm ${!abandonment.email ? 'text-destructive italic' : ''}`}>
                            {abandonment.email || 'No informado'}
                          </span>
                        </div>
                        {abandonment.abandoned_at && (
                          <div className="text-sm text-muted-foreground">
                            Abandonado: <strong>{format(new Date(abandonment.abandoned_at), 'dd/MM/yyyy HH:mm')}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de Detalhes */}
        <AbandonmentDetailsModal
          abandonment={selectedAbandonment}
          open={!!selectedAbandonment}
          onOpenChange={(open) => !open && setSelectedAbandonment(null)}
          onWhatsApp={openWhatsApp}
          onTriggerWebhook={triggerWebhook}
          onMarkRecovered={handleMarkAsRecovered}
        />
      </div>
    </AdminLayout>
  );
};

export default AbandonosFormulario;