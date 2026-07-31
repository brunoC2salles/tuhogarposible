import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, TestTube, Download, AlertCircle, CheckCircle, ImageIcon, FileText } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { exportLeadsToCSV, downloadCSV } from '@/lib/csvExporter';
import { generateLeadsReport, defaultLast7Days } from '@/lib/leadsReportGenerator';
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
    secondaryQualifiedUrl,
    secondaryEnabled,
    savingSecondaryEnabled,
    inmovillaUrl,
    loading, 
    saving, 
    savingMetaBitrix,
    savingSecondary,
    savingInmovilla,
    webhookLogs, 
    metaBitrixLogs,
    secondaryLogs,
    saveWebhookUrl, 
    saveMetaBitrixWebhookUrl,
    saveSecondaryQualifiedUrl,
    saveSecondaryEnabled,
    saveInmovillaUrl,
    testWebhook, 
    testMetaBitrixWebhook,
    testSecondaryQualifiedWebhook,
    replayQualifiedSince,
    refreshLogs,
    refreshMetaBitrixLogs,
    refreshSecondaryLogs
  } = useAdminSettings();
  const [localWebhookUrl, setLocalWebhookUrl] = useState('');
  const [localMetaBitrixWebhookUrl, setLocalMetaBitrixWebhookUrl] = useState('');
  const [localSecondaryQualifiedUrl, setLocalSecondaryQualifiedUrl] = useState('');
  const [localInmovillaUrl, setLocalInmovillaUrl] = useState('');
  const [exportFilter, setExportFilter] = useState<'all' | 'qualified'>('qualified');
  const [exporting, setExporting] = useState(false);
  const [replaySince, setReplaySince] = useState('2026-06-08T11:49');
  const [replaying, setReplaying] = useState(false);
  const defaults = defaultLast7Days();
  const [reportStart, setReportStart] = useState(defaults.start);
  const [reportEnd, setReportEnd] = useState(defaults.end);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  const [scrapingStats, setScrapingStats] = useState({
    total: 0, pending: 0, completed: 0, failed: 0, progress: 0
  });
  const [scrapingProcessing, setScrapingProcessing] = useState(false);
  const [scrapingMessage, setScrapingMessage] = useState('');

  useEffect(() => {
    if (webhookUrl && !localWebhookUrl) setLocalWebhookUrl(webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    if (metaBitrixWebhookUrl && !localMetaBitrixWebhookUrl) setLocalMetaBitrixWebhookUrl(metaBitrixWebhookUrl);
  }, [metaBitrixWebhookUrl]);

  useEffect(() => {
    if (inmovillaUrl && !localInmovillaUrl) setLocalInmovillaUrl(inmovillaUrl);
  }, [inmovillaUrl]);

  useEffect(() => {
    if (secondaryQualifiedUrl && !localSecondaryQualifiedUrl) setLocalSecondaryQualifiedUrl(secondaryQualifiedUrl);
  }, [secondaryQualifiedUrl]);

  useEffect(() => {
    fetchScrapingStats();
  }, []);

  const handleReplay = async () => {
    setReplaying(true);
    const sinceIso = new Date(replaySince).toISOString();
    await replayQualifiedSince(sinceIso);
    setReplaying(false);
  };

  const handleGenerateReport = async (mode: 'last7' | 'custom') => {
    let start = reportStart;
    let end = reportEnd;
    if (mode === 'last7') {
      const d = defaultLast7Days();
      start = d.start;
      end = d.end;
      setReportStart(d.start);
      setReportEnd(d.end);
    }
    if (!start || !end || start > end) {
      toast.error('Rango de fechas inválido');
      return;
    }
    try {
      setGeneratingReport(true);
      toast.info('Generando informe...');
      const { filename, blob } = await generateLeadsReport(start, end);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Informe generado');
    } catch (err: any) {
      console.error('[Report] Error:', err);
      toast.error('Error al generar el informe');
    } finally {
      setGeneratingReport(false);
    }
  };

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

        {/* Informe de cualificación de leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informe de cualificación de leads
            </CardTitle>
            <CardDescription>
              Genera un PDF en español con métricas de cualificación por día, fuente y motivos de descualificación.
              Los cortes se calculan por días de calendario en zona <code>Europe/Madrid</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleGenerateReport('last7')} disabled={generatingReport}>
                <FileText className="h-4 w-4 mr-2" />
                {generatingReport ? 'Generando...' : 'Generar informe (últimos 7 días)'}
              </Button>
            </div>

            <div className="pt-3 border-t space-y-3">
              <p className="text-sm font-medium">Período personalizado</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label htmlFor="report-start" className="text-xs">Fecha inicio</Label>
                  <Input
                    id="report-start"
                    type="date"
                    value={reportStart}
                    onChange={(e) => setReportStart(e.target.value)}
                    className="w-[170px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="report-end" className="text-xs">Fecha fin</Label>
                  <Input
                    id="report-end"
                    type="date"
                    value={reportEnd}
                    onChange={(e) => setReportEnd(e.target.value)}
                    className="w-[170px]"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateReport('custom')}
                  disabled={generatingReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generar informe personalizado
                </Button>
              </div>
            </div>
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

            {localWebhookUrl.trim() &&
              localMetaBitrixWebhookUrl.trim() &&
              localWebhookUrl.trim() === localMetaBitrixWebhookUrl.trim() && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atención:</strong> esta URL es <em>idéntica</em> a la del webhook
                    "Meta Ads → Bitrix24". Si ambos apuntan al mismo escenario en Make, vas a recibir
                    payloads mezclados (el ping técnico + el payload Bitrix real). Usa URLs distintas
                    para evitar confusión.
                  </AlertDescription>
                </Alert>
              )}

            <div className="flex gap-2">
              <Button onClick={handleSaveWebhook} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={handleTestWebhook} disabled={!localWebhookUrl.trim()}>
                <TestTube className="h-4 w-4 mr-2" />
                Probar Conexión (ping técnico)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Este botón envía solo un <strong>ping técnico</strong> (sin datos de lead, sin campos
              financieros). Para probar el payload Bitrix real con el último lead, usa el botón
              "Probar Meta → Bitrix (payload real)" en la sección de abajo.
            </p>

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
                title="Envía el payload Bitrix real del último lead del CRM al webhook"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Probar Meta → Bitrix (payload real)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La prueba enviará el payload Bitrix real (con los mismos campos que recibe Make en producción) usando el último lead creado en el CRM
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

        {/* Webhook WhatsApp — Leads Cualificados (fan-out) */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Webhook WhatsApp — Datos de Leads Cualificados</CardTitle>
                <CardDescription>
                  Envía automáticamente el <strong>payload completo</strong> de cada lead cualificado al servicio de recordatorios por WhatsApp
                  (u otra automatización externa). Se dispara <em>en paralelo</em> al webhook Bitrix, sin bloquearlo.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <Switch
                  checked={secondaryEnabled}
                  disabled={savingSecondaryEnabled}
                  onCheckedChange={(v) => saveSecondaryEnabled(v)}
                  aria-label="Activar envío WhatsApp"
                />
                <span className="text-sm font-medium">
                  {secondaryEnabled ? 'Envío activo' : 'Envío pausado'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Método: <code>POST</code> · Content-Type: <code>application/json</code> · Header <code>Authorization: Bearer &lt;WHATSAPP_WEBHOOK_BEARER_TOKEN&gt;</code> (configurado como secret). Ver especificación del payload debajo del formulario.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="webhook-secondary-url">URL del Webhook WhatsApp</Label>
              <Input
                id="webhook-secondary-url"
                type="url"
                placeholder="https://lead-reminder.vercel.app/api/jobs/send-pending-messages"
                value={localSecondaryQualifiedUrl}
                onChange={(e) => setLocalSecondaryQualifiedUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deje vacío para desactivar el envío. Token Bearer gestionado vía secret <code>WHATSAPP_WEBHOOK_BEARER_TOKEN</code>.
              </p>
            </div>


            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  const success = await saveSecondaryQualifiedUrl(localSecondaryQualifiedUrl);
                  if (success) refreshSecondaryLogs();
                }} 
                disabled={savingSecondary}
              >
                <Save className="h-4 w-4 mr-2" />
                {savingSecondary ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button 
                variant="outline" 
                onClick={testSecondaryQualifiedWebhook} 
                disabled={!localSecondaryQualifiedUrl.trim()}
                title="Envía el payload completo del último lead cualificado al webhook WhatsApp"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Probar con último lead cualificado
              </Button>
            </div>

            {/* Especificación */}
            <details className="border rounded-md p-3 bg-muted/30">
              <summary className="cursor-pointer text-sm font-medium">
                📋 Especificación del payload (para el equipo que reciba los datos)
              </summary>
              <div className="mt-3 space-y-2 text-xs">
                <p><strong>Endpoint:</strong> el que configures arriba · <strong>Método:</strong> POST · <strong>Content-Type:</strong> application/json</p>
                <p><strong>Cuándo se dispara:</strong> cada vez que un lead entra al sistema y pasa las reglas de cualificación (Meta Ads, Tally, manual).</p>
                <p><strong>Respuesta esperada:</strong> HTTP 2xx. Cualquier otro código se registra como error en <code>webhook_logs</code>. Sin reintentos automáticos.</p>
                <p><strong>Idempotencia:</strong> el campo <code>lead.id</code> (UUID) es único. Usarlo como clave para deduplicar.</p>
                <pre className="bg-background border rounded p-3 overflow-x-auto text-[11px] leading-tight">{`{
  "event": "lead.qualified",
  "sent_at": "2026-07-21T12:00:00.000Z",   // ISO 8601 UTC
  "source": "meta_ads" | "tally" | "manual",

  "lead": {
    "id": "uuid",                          // clave única para idempotencia
    "nombre_completo": "string",
    "telefono": "+34XXXXXXXXX",
    "email": "string",
    "ciudad_interes": "string | null",
    "zona_interes": "string | null",
    "valor_inmueble_deseado": number | null,
    "stage": "nuevo_lead" | ...,
    "notas": "string | null",
    "agente_asignado_id": "uuid | null",
    "source": "meta_ads" | "tally" | ...,
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
    // + resto de columnas de la tabla leads
  },

  "agente": {                              // agente asignado (null si no hay)
    "id": "uuid",
    "nombre": "string",
    "email": "string",
    "telefono": "string | null",
    "tidycal_url": "string | null"
  } | null,

  "simulador_personal": { ... } | null,    // datos del simulador de crédito personal
  "simulador_hipotecario": { ... } | null, // datos del simulador hipotecario

  "reunion": {
    "fecha": "YYYY-MM-DD" | null,
    "hora": "HH:mm" | null,
    "hora_texto": "string | null",         // texto original ("mañana por la tarde")
    "zona_horaria": "Europe/Madrid",
    "datetime_iso": "YYYY-MM-DDTHH:mm:ss" | null,
    "confidence": "exact" | "pending_time" | null,
    "a_definir": boolean                   // true = requiere confirmación manual
  },

  "cualificacion": {
    "cualificado": true,
    "region_detectada": "string | null",
    "edad": "string | null"
  },

  "documento_link": "https://tuhogarposible.lovable.app/documentos/{token}" | null
}`}</pre>
                <p className="pt-2"><strong>Diagnóstico:</strong> revisa el historial abajo, o filtra <code>webhook_logs</code> por <code>webhook_url LIKE '%(secondary_qualified)%'</code>.</p>
              </div>
            </details>

            {/* Status */}
            <div className="flex gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Envíos Hoy</p>
                <p className="text-2xl font-bold">
                  {secondaryLogs.filter(log => {
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
                    {secondaryLogs.filter(log => log.status === 'error').length}
                  </p>
                  {secondaryLogs.filter(log => log.status === 'error').length > 0 && (
                    <Badge variant="destructive">Revisar</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Reenviar leads qualificados */}
        <Card>
          <CardHeader>
            <CardTitle>Reenviar leads qualificados al Bitrix</CardTitle>
            <CardDescription>
              Reenvía al webhook Meta Ads → Bitrix los leads qualificados creados a partir de la fecha indicada.
              Los leads que ya tienen un envío con éxito son ignorados automáticamente (no duplica deals).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="replay-since">Desde (fecha y hora)</Label>
              <Input
                id="replay-since"
                type="datetime-local"
                value={replaySince}
                onChange={(e) => setReplaySince(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sugerencia: 08/06/2026 11:49 UTC — momento del primer error reciente.
              </p>
            </div>
            <Button onClick={handleReplay} disabled={replaying}>
              <TestTube className="h-4 w-4 mr-2" />
              {replaying ? 'Reenviando...' : 'Reenviar leads qualificados'}
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
              <p>• El archivo incluirá: datos personales, ciudad, zona y valor deseado</p>
              <p>• Formato de fecha: DD/MM/YYYY</p>
              <p>• Codificación: UTF-8 (compatible con Excel y Google Sheets)</p>
            </div>
          </CardContent>
        </Card>




      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
