import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Save, TestTube, Download, AlertCircle, CheckCircle, ImageIcon } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { exportLeadsToCSV, downloadCSV } from '@/lib/csvExporter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminSettings = () => {
  const { 
    webhookUrl, 
    metaBitrixWebhookUrl,
    disqualifiedWebhookUrl,
    inmovillaUrl,
    loading, 
    saving, 
    savingMetaBitrix,
    savingDisqualified,
    savingInmovilla,
    testingDisqualified,
    webhookLogs, 
    metaBitrixLogs,
    saveWebhookUrl, 
    saveMetaBitrixWebhookUrl,
    saveDisqualifiedWebhookUrl,
    saveInmovillaUrl,
    testWebhook, 
    testMetaBitrixWebhook,
    testDisqualifiedWebhook,
    refreshLogs,
    refreshMetaBitrixLogs
  } = useAdminSettings();
  const [localWebhookUrl, setLocalWebhookUrl] = useState('');
  const [localMetaBitrixWebhookUrl, setLocalMetaBitrixWebhookUrl] = useState('');
  const [localDisqualifiedWebhookUrl, setLocalDisqualifiedWebhookUrl] = useState('');
  const [localInmovillaUrl, setLocalInmovillaUrl] = useState('');
  const [exportFilter, setExportFilter] = useState<'all' | 'qualified'>('qualified');
  const [exporting, setExporting] = useState(false);
  
  // Scraping states
  const [scrapingStats, setScrapingStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    progress: 0
  });
  const [scrapingProcessing, setScrapingProcessing] = useState(false);
  const [scrapingMessage, setScrapingMessage] = useState('');

  useEffect(() => {
    if (webhookUrl && !localWebhookUrl) {
      setLocalWebhookUrl(webhookUrl);
    }
  }, [webhookUrl]);

  useEffect(() => {
    if (metaBitrixWebhookUrl && !localMetaBitrixWebhookUrl) {
      setLocalMetaBitrixWebhookUrl(metaBitrixWebhookUrl);
    }
  }, [metaBitrixWebhookUrl]);

  useEffect(() => {
    if (disqualifiedWebhookUrl && !localDisqualifiedWebhookUrl) {
      setLocalDisqualifiedWebhookUrl(disqualifiedWebhookUrl);
    }
  }, [disqualifiedWebhookUrl]);

  useEffect(() => {
    if (inmovillaUrl && !localInmovillaUrl) {
      setLocalInmovillaUrl(inmovillaUrl);
    }
  }, [inmovillaUrl]);

  useEffect(() => {
    fetchScrapingStats();
  }, []);

  const fetchScrapingStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scraping-status');
      if (data?.success) {
        setScrapingStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching scraping stats:', err);
    }
  };

  const handleProcessBatch = async () => {
    setScrapingProcessing(true);
    setScrapingMessage('');
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-all-products');
      
      if (data?.success) {
        toast.success(`${data.processed} productos procesados exitosamente`);
        setScrapingMessage(data.message);
        fetchScrapingStats();
      } else {
        toast.error('Error al procesar lote');
      }
    } catch (err) {
      toast.error('Error al conectar con el servidor');
    } finally {
      setScrapingProcessing(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!localWebhookUrl.trim()) {
      const confirmar = window.confirm(
        '⚠️ Estás a punto de eliminar la URL del webhook. ¿Continuar?'
      );
      if (!confirmar) return;
    }

    const success = await saveWebhookUrl(localWebhookUrl);
    if (success) {
      refreshLogs();
    }
  };

  const handleTestWebhook = async () => {
    if (!localWebhookUrl.trim()) {
      toast.error('Por favor, insira uma URL válida');
      return;
    }
    await testWebhook(localWebhookUrl);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      // Buscar leads do CRM
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      
      if (exportFilter === 'qualified') {
        query = query.neq('stage', 'no_cualificado');
      }

      const { data: leads, error } = await query;

      if (error) throw error;

      if (!leads || leads.length === 0) {
        toast.error('Nenhum dado para exportar');
        return;
      }

      // Buscar nomes dos agentes
      const { data: agentes } = await supabase.from('profiles').select('id, nombre');
      const agenteNomes: Record<string, string> = {};
      agentes?.forEach(a => {
        agenteNomes[a.id] = a.nombre;
      });

      // Gerar CSV
      const csvContent = exportLeadsToCSV(leads as any, agenteNomes);
      
      // Download
      const filename = `leads_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      downloadCSV(csvContent, filename);

      toast.success(`${leads.length} leads exportados com sucesso`);
    } catch (err: any) {
      console.error('[Export] Error:', err);
      toast.error('Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  const webhooksHoje = webhookLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const webhooksErro = webhookLogs.filter(log => log.status === 'error').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Cargando configuraciones...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Configuraciones del Sistema</h1>
          <p className="text-muted-foreground mt-1">Gestión de integraciones y exportaciones</p>
        </div>

        {/* Integração Make.com - Leads Qualificados */}
        <Card>
          <CardHeader>
            <CardTitle>Integración Make.com - Leads Qualificados</CardTitle>
            <CardDescription>
              Configure el webhook para enviar leads qualificados automáticamente al Bitrix24 via Make.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL del Webhook</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hook.us1.make.com/..."
                value={localWebhookUrl}
                onChange={(e) => setLocalWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esta URL se disparará automáticamente cada vez que un lead sea qualificado y asignado a un agente
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveWebhook} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={handleTestWebhook} disabled={!localWebhookUrl.trim()}>
                <TestTube className="h-4 w-4 mr-2" />
                Probar Conexión
              </Button>
            </div>

            {/* Status */}
            <div className="flex gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Webhooks Hoje</p>
                <p className="text-2xl font-bold">{webhooksHoje}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Con Errores</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{webhooksErro}</p>
                  {webhooksErro > 0 && <Badge variant="destructive">Revisar</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integração Make.com - Meta Ads → Bitrix24 */}
        <Card>
          <CardHeader>
            <CardTitle>Integración Make.com - Meta Ads → Bitrix24</CardTitle>
            <CardDescription>
              Configure el webhook para enviar leads qualificados del Meta Ads automáticamente al Bitrix24
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este webhook se dispara automáticamente cuando un lead del Meta Ads es qualificado y guardado en la plataforma.
                Configure un escenario separado en Make.com para recibir estos datos y crear deals en Bitrix24.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="webhook-meta-bitrix-url">URL del Webhook (Meta Ads → Bitrix24)</Label>
              <Input
                id="webhook-meta-bitrix-url"
                type="url"
                placeholder="https://hook.eu2.make.com/..."
                value={localMetaBitrixWebhookUrl}
                onChange={(e) => setLocalMetaBitrixWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cree un nuevo escenario en Make.com con un Webhook trigger y pegue la URL aquí
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  const success = await saveMetaBitrixWebhookUrl(localMetaBitrixWebhookUrl);
                  if (success) refreshMetaBitrixLogs();
                }} 
                disabled={savingMetaBitrix}
              >
                <Save className="h-4 w-4 mr-2" />
                {savingMetaBitrix ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => testMetaBitrixWebhook(localMetaBitrixWebhookUrl)} 
                disabled={!localMetaBitrixWebhookUrl.trim()}
                title="Envía los datos del último lead del CRM al webhook"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Probar con Último Lead
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La prueba enviará los datos reales del último lead creado en el CRM
            </p>

            {/* Status */}
            <div className="flex gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Webhooks Meta Ads Hoy</p>
                <p className="text-2xl font-bold">
                  {metaBitrixLogs.filter(log => {
                    const logDate = new Date(log.created_at);
                    const today = new Date();
                    return logDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Con Errores</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {metaBitrixLogs.filter(log => log.status === 'error').length}
                  </p>
                  {metaBitrixLogs.filter(log => log.status === 'error').length > 0 && (
                    <Badge variant="destructive">Revisar</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integração Make.com - Leads Descualificados */}
        <Card>
          <CardHeader>
            <CardTitle>Integración Make.com - Leads Descualificados</CardTitle>
            <CardDescription>
              Configure el webhook para enviar leads descualificados y disparar emails de agradecimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este webhook se dispara automáticamente cuando un lead es movido a "Descualificados".
                Configure un escenario en Make.com para enviar un email de agradecimiento explicando el motivo.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="webhook-disqualified-url">URL del Webhook (Descualificados)</Label>
              <Input
                id="webhook-disqualified-url"
                type="url"
                placeholder="https://hook.eu2.make.com/..."
                value={localDisqualifiedWebhookUrl}
                onChange={(e) => setLocalDisqualifiedWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                El payload incluye: nombre, email, teléfono, zona de interés y razón de descualificación
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  const success = await saveDisqualifiedWebhookUrl(localDisqualifiedWebhookUrl);
                  if (success) refreshLogs();
                }} 
                disabled={savingDisqualified}
              >
                <Save className="h-4 w-4 mr-2" />
                {savingDisqualified ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button 
                variant="outline" 
                onClick={testDisqualifiedWebhook} 
                disabled={testingDisqualified || !localDisqualifiedWebhookUrl.trim()}
                title="Probar con el último lead descualificado"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testingDisqualified ? 'Probando...' : 'Probar Webhook'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La prueba enviará los datos del último lead descualificado al webhook configurado
            </p>
          </CardContent>
        </Card>
        {/* Logs de Webhook */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Webhooks</CardTitle>
            <CardDescription>Últimos 20 webhooks disparados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {webhookLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ningún webhook disparado aún
                </p>
              ) : (
                webhookLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {log.status === 'success' ? 'Enviado correctamente' : 'Error al enviar'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inmovilla Widget URL */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Inmovilla</CardTitle>
            <CardDescription>
              Configure la URL del iframe de Inmovilla para mostrar en la página inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inmovilla-url">URL del Iframe Inmovilla</Label>
              <Input
                id="inmovilla-url"
                type="url"
                placeholder="https://crm.inmovilla.com/panel/..."
                value={localInmovillaUrl}
                onChange={(e) => setLocalInmovillaUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esta URL se mostrará como un iframe en la página de inicio para los agentes
              </p>
            </div>

            <Button 
              onClick={async () => {
                await saveInmovillaUrl(localInmovillaUrl);
              }} 
              disabled={savingInmovilla}
            >
              <Save className="h-4 w-4 mr-2" />
              {savingInmovilla ? 'Guardando...' : 'Guardar'}
            </Button>
          </CardContent>
        </Card>

        {/* Exportação CSV */}
        <Card>
          <CardHeader>
            <CardTitle>Exportación de Datos</CardTitle>
            <CardDescription>
              Descargue los datos de los leads en formato CSV para análisis externo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-filter">Filtro de Exportación</Label>
              <Select value={exportFilter} onValueChange={(v) => setExportFilter(v as 'all' | 'qualified')}>
                <SelectTrigger id="export-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los leads</SelectItem>
                  <SelectItem value="qualified">Solo qualificados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExportCSV} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>• El archivo incluirá: datos personales, ciudad, zona y valor deseado</p>
              <p>• Formato de fecha: DD/MM/YYYY</p>
              <p>• Codificación: UTF-8 (compatible con Excel y Google Sheets)</p>
            </div>
          </CardContent>
        </Card>

        {/* Scraping de Imagens */}
        <Card>
          <CardHeader>
            <CardTitle>Scraping de Imágenes</CardTitle>
            <CardDescription>
              Procesar imágenes de los productos en lote desde las URLs externas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{scrapingStats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{scrapingStats.pending}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold text-green-600">{scrapingStats.completed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Errores</p>
                <p className="text-2xl font-bold text-red-600">{scrapingStats.failed}</p>
              </div>
            </div>

            {/* Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{scrapingStats.progress}%</span>
              </div>
              <Progress value={scrapingStats.progress} />
            </div>

            {/* Botão de Processamento */}
            <Button 
              onClick={handleProcessBatch} 
              disabled={scrapingProcessing || scrapingStats.pending === 0}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {scrapingProcessing ? 'Procesando...' : 'Procesar Lote (50 productos)'}
            </Button>

            {/* Mensagem de status */}
            {scrapingMessage && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{scrapingMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
