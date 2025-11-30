import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, TestTube, Download, AlertCircle, CheckCircle, ImageIcon } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { exportLeadsToCSV, downloadCSV } from '@/lib/csvExporter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { webhookUrl, loading, saving, webhookLogs, saveWebhookUrl, testWebhook, refreshLogs } = useAdminSettings();
  const [localWebhookUrl, setLocalWebhookUrl] = useState('');
  const [localAbandonosWebhookUrl, setLocalAbandonosWebhookUrl] = useState('');
  const [localSlackChannelId, setLocalSlackChannelId] = useState('');
  const [exportFilter, setExportFilter] = useState<'all' | 'qualified'>('qualified');
  const [exporting, setExporting] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  
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

  // Atualizar local URL quando carregado
  useState(() => {
    if (webhookUrl && !localWebhookUrl) {
      setLocalWebhookUrl(webhookUrl);
    }
  });

  // Buscar stats de scraping ao carregar
  useEffect(() => {
    fetchScrapingStats();
    fetchAbandonosWebhookUrl();
    fetchSlackChannelId();
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

  const fetchAbandonosWebhookUrl = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_abandonos_url')
        .single();
      
      if (data?.value) {
        setLocalAbandonosWebhookUrl(data.value);
      }
    } catch (err) {
      console.error('Error fetching abandonos webhook:', err);
    }
  };

  const fetchSlackChannelId = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'slack_channel_id')
        .single();
      
      if (data?.value) {
        setLocalSlackChannelId(data.value);
      }
    } catch (err) {
      console.error('Error fetching Slack channel:', err);
    }
  };

  const saveAbandonosWebhookUrl = async () => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'webhook_abandonos_url',
          value: localAbandonosWebhookUrl,
          description: 'URL del webhook Make.com para abandonos'
        });

      if (error) throw error;
      toast.success('URL del webhook de abandonos guardada');
    } catch (err: any) {
      console.error('Error saving abandonos webhook:', err);
      toast.error('Error al guardar URL');
    }
  };

  const saveSlackChannelId = async () => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'slack_channel_id',
          value: localSlackChannelId,
          description: 'ID del canal de Slack'
        });

      if (error) throw error;
      toast.success('Channel ID de Slack guardado');
    } catch (err: any) {
      console.error('Error saving Slack channel:', err);
      toast.error('Error al guardar Channel ID');
    }
  };

  const testSlackConnection = async () => {
    try {
      setTestingSlack(true);
      const { data, error } = await supabase.functions.invoke('slack-api', {
        body: { action: 'get_messages' }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Conexión con Slack exitosa');
      } else {
        toast.error('Error al conectar con Slack');
      }
    } catch (err: any) {
      console.error('Error testing Slack:', err);
      toast.error('Error al probar conexión');
    } finally {
      setTestingSlack(false);
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
        fetchScrapingStats(); // Atualizar stats
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
      
      // Buscar submissions baseado no filtro
      let query = supabase.from('form_submissions').select('*').order('created_at', { ascending: false });
      
      if (exportFilter === 'qualified') {
        query = query.eq('qualificado', true);
      }

      const { data: submissions, error } = await query;

      if (error) throw error;

      if (!submissions || submissions.length === 0) {
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
      const csvContent = exportLeadsToCSV(submissions as any, agenteNomes);
      
      // Download
      const filename = `leads_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      downloadCSV(csvContent, filename);

      toast.success(`${submissions.length} leads exportados com sucesso`);
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
        {/* Gestión de Contratos */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Contratos</CardTitle>
            <CardDescription>
              Configure y administre los templates de contratos públicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/contract-templates')}>
              <FileText className="h-4 w-4 mr-2" />
              Administrar Templates de Contratos
            </Button>
          </CardContent>
        </Card>

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

        {/* Integração Make.com - Abandonos de Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Integración Make.com - Abandonos de Formulario</CardTitle>
            <CardDescription>
              Configure el webhook para enviar datos de leads que abandonaron el formulário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-abandonos-url">URL del Webhook (Abandonos)</Label>
              <Input
                id="webhook-abandonos-url"
                type="url"
                placeholder="https://hook.us1.make.com/..."
                value={localAbandonosWebhookUrl}
                onChange={(e) => setLocalAbandonosWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esta URL se disparará cuando el admin presione "Disparar Automação" en la página de Abandonos
              </p>
            </div>

            <Button onClick={saveAbandonosWebhookUrl}>
              <Save className="h-4 w-4 mr-2" />
              Guardar URL
            </Button>
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
              <p>• El archivo incluirá: datos personales, financieros, simulaciones y agente asignado</p>
              <p>• Formato de fecha: DD/MM/YYYY</p>
              <p>• Codificación: UTF-8 (compatible con Excel y Google Sheets)</p>
            </div>
          </CardContent>
        </Card>

        {/* Integración Slack */}
        <Card>
          <CardHeader>
            <CardTitle>Integración Slack</CardTitle>
            <CardDescription>
              Configure la conexión con Slack para comunicación del equipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Antes de usar esta integración, asegúrese de haber configurado los secretos SLACK_BOT_TOKEN y SLACK_CHANNEL_ID en Supabase.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="slack-channel-id">Channel ID de Slack</Label>
              <Input
                id="slack-channel-id"
                placeholder="C01234ABCDE"
                value={localSlackChannelId}
                onChange={(e) => setLocalSlackChannelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                El ID del canal de Slack donde se enviarán los mensajes
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveSlackChannelId}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Channel ID
              </Button>
              <Button 
                variant="outline" 
                onClick={testSlackConnection}
                disabled={testingSlack}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testingSlack ? 'Probando...' : 'Probar Conexión'}
              </Button>
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
