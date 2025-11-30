import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFormAbandonments } from '@/hooks/useFormAbandonments';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Users, Settings, LogOut, MessageCircle, Phone, Mail, CheckCircle, Zap } from 'lucide-react';
import Logo from '@/components/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AbandonosFormulario = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { abandonments, loading, filters, setFilters, markAsRecovered } = useFormAbandonments();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const openWhatsApp = (telefono: string, nombre: string) => {
    const message = encodeURIComponent(
      `Hola ${nombre}, vimos que empezaste el proceso de cualificación en Tu Hogar Posible. ¿Podemos ayudarte a completarlo?`
    );
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const triggerWebhook = async (abandonment: any) => {
    try {
      // Buscar URL do webhook
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_abandonos_url')
        .single();

      const webhookUrl = settings?.value;
      
      if (!webhookUrl) {
        toast.error('URL del webhook no configurada');
        return;
      }

      // Preparar payload
      const payload = {
        trigger: 'form_abandonment',
        timestamp: new Date().toISOString(),
        lead: {
          id: abandonment.id,
          nombre_completo: abandonment.nombre_completo,
          telefono: abandonment.telefono,
          email: abandonment.email,
          step_reached: abandonment.step_reached,
          abandoned_at: abandonment.abandoned_at,
          form_data: abandonment.form_data
        }
      };

      // Enviar webhook
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });

      toast.success('Automación disparada exitosamente');
    } catch (error) {
      console.error('Error triggering webhook:', error);
      toast.error('Error al disparar automación');
    }
  };

  const handleMarkAsRecovered = async (id: string) => {
    await markAsRecovered(id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold">Abandonos de Formulario</h1>
                <p className="text-sm text-muted-foreground">
                  Gestión de leads que abandonaron el proceso de cualificación
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/inventario/admin/crm')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al CRM
              </Button>

              <NotificationBell />

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Configuración</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/agentes')}
              >
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Agentes</span>
              </Button>

              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {profile?.nombre?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{profile?.nombre}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
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
              const formData = abandonment.form_data || {};
              
              return (
                <Card key={abandonment.id}>
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
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Paso: <strong>{abandonment.step_reached || 0}</strong>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {abandonment.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{abandonment.telefono}</span>
                          </div>
                        )}
                        {abandonment.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{abandonment.email}</span>
                          </div>
                        )}
                        {abandonment.abandoned_at && (
                          <div className="text-sm text-muted-foreground">
                            Abandonado: <strong>{format(new Date(abandonment.abandoned_at), 'dd/MM/yyyy HH:mm')}</strong>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Form Data Details */}
                      {Object.keys(formData).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {formData.comunidad_autonoma && (
                            <div>
                              <span className="text-muted-foreground">Comunidad: </span>
                              <strong>{formData.comunidad_autonoma}</strong>
                            </div>
                          )}
                          {formData.ciudad_interes && (
                            <div>
                              <span className="text-muted-foreground">Ciudad: </span>
                              <strong>{formData.ciudad_interes}</strong>
                            </div>
                          )}
                          {formData.situacion_laboral && (
                            <div>
                              <span className="text-muted-foreground">Situación Laboral: </span>
                              <strong>{formData.situacion_laboral}</strong>
                            </div>
                          )}
                          {formData.ingresos_mensuales && (
                            <div>
                              <span className="text-muted-foreground">Ingresos: </span>
                              <strong>€{formData.ingresos_mensuales.toLocaleString()}</strong>
                            </div>
                          )}
                          {formData.valor_inmueble_deseado && (
                            <div>
                              <span className="text-muted-foreground">Valor Deseado: </span>
                              <strong>€{formData.valor_inmueble_deseado.toLocaleString()}</strong>
                            </div>
                          )}
                          {formData.entrada_disponible && (
                            <div>
                              <span className="text-muted-foreground">Entrada: </span>
                              <strong>€{formData.entrada_disponible.toLocaleString()}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {abandonment.telefono && (
                          <Button
                            onClick={() => openWhatsApp(abandonment.telefono!, abandonment.nombre_completo || 'Lead')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => triggerWebhook(abandonment)}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Disparar Automação
                        </Button>
                        {!abandonment.recovered && (
                          <Button
                            variant="secondary"
                            onClick={() => handleMarkAsRecovered(abandonment.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Contactado
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AbandonosFormulario;