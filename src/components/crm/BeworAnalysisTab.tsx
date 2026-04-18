import { useState } from "react";
import { useLeadDocumentAnalysis } from "@/hooks/useLeadDocumentAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Download,
  Calculator,
} from "lucide-react";
import RequestDocumentsModal from "./RequestDocumentsModal";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "FINISHED":
      return <Badge className="bg-primary text-primary-foreground">Completado</Badge>;
    case "PROCESSING":
    case "CREATED":
      return <Badge variant="secondary">Procesando</Badge>;
    case "ERROR":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

/** Indicador semáforo de viabilidad */
const ViabilityLight = ({ aprobable, hipoteca }: { aprobable: boolean; hipoteca: number }) => {
  let color = "bg-red-500";
  let label = "No viable";
  if (aprobable && hipoteca >= 100000) {
    color = "bg-green-500";
    label = "Viable - Capacidad alta";
  } else if (aprobable) {
    color = "bg-yellow-500";
    label = "Viable - Capacidad limitada";
  }
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${color}`} aria-label={label} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};

const BeworAnalysisTab = ({ leadId, leadName, leadPhone, leadEmail }: Props) => {
  const { analyses, loading, refetch } = useLeadDocumentAnalysis(leadId);
  const [requestOpen, setRequestOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleDownload = async (filePath: string | null, analysisId: string) => {
    if (!filePath) {
      toast.error("Archivo no disponible");
      return;
    }
    setDownloadingId(analysisId);
    const { data, error } = await supabase.storage
      .from("lead-documents")
      .createSignedUrl(filePath, 60 * 5);
    setDownloadingId(null);
    if (error || !data?.signedUrl) {
      toast.error("No se pudo generar el enlace de descarga");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleApplyToSimulator = async (a: any) => {
    const v = a.viabilidade_sugerida as any;
    if (!v?.ingresos_detectados) {
      toast.error("No hay ingresos detectados para aplicar");
      return;
    }
    setApplyingId(a.id);
    // Buscar dados existentes do simulador para preservar outros campos
    const { data: lead } = await supabase
      .from("leads")
      .select("simulador_hipotecario_data")
      .eq("id", leadId)
      .single();

    const existing = (lead?.simulador_hipotecario_data as any) || {};
    const updated = {
      ...existing,
      ingresos: v.ingresos_detectados,
      deudas: v.deudas_detectadas || 0,
      _bewor_applied_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("leads")
      .update({ simulador_hipotecario_data: updated })
      .eq("id", leadId);

    setApplyingId(null);
    if (error) {
      toast.error("No se pudo aplicar al simulador");
      return;
    }
    toast.success("Datos aplicados al simulador del lead");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Análisis de documentos</h3>
          <p className="text-sm text-muted-foreground">
            Movimientos bancarios analizados automáticamente (Bewor OCR)
          </p>
        </div>
        <Button onClick={() => setRequestOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          Solicitar documentos
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {!loading && analyses.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay análisis aún. Genera un enlace para que el cliente suba sus documentos.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {analyses.map((a) => {
          const v = a.viabilidade_sugerida as any;
          return (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Movimientos bancarios</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  {statusBadge(a.status)}
                </div>

                {(a.status === "PROCESSING" || a.status === "CREATED") && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Análisis en curso. Te notificaremos cuando termine.
                  </div>
                )}

                {a.status === "ERROR" && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{a.error_message || "Ocurrió un error en el análisis"}</span>
                  </div>
                )}

                {a.status === "FINISHED" && v && (() => {
                  const ingresos = Number(v.ingresos_detectados || 0);
                  const inconclusive = ingresos === 0;
                  const docFields = (a.result as any)?.document_fields || (a.result as any)?.result?.document_fields || {};
                  const holders = Array.isArray(docFields.holders)
                    ? docFields.holders.join(", ")
                    : docFields.holders || "—";
                  const iban = docFields.iban || docFields.IBAN || "—";
                  const bank = docFields.bank || docFields.bank_name || "—";
                  const period = docFields.period_start_date
                    ? `${docFields.period_start_date} → ${docFields.period_end_date || "?"}`
                    : "—";
                  const pages = v.pages || (a.result as any)?.pages_processed || (a.result as any)?.num_pages || "—";
                  const confidence = v.confidence ?? (a.result as any)?.confidence ?? null;
                  const beworStatus = (v.bewor_status || "").toString().toUpperCase();
                  const warnings: string[] = Array.isArray(v.bewor_warnings) ? v.bewor_warnings : [];
                  const kos: string[] = Array.isArray(v.bewor_kos) ? v.bewor_kos : [];
                  const hasBeworFlags = beworStatus === "WARNING" || beworStatus === "KO" || warnings.length > 0 || kos.length > 0;

                  const translateReason = (txt: string) => {
                    const t = (txt || "").toUpperCase();
                    if (t.includes("IBAN") && t.includes("INVALID")) return "IBAN inválido";
                    if (t.includes("PAGES") || t.includes("PAGE_COUNT")) return "Pocas páginas analizadas";
                    if (t.includes("HOLDER")) return "Titular no detectado";
                    if (t.includes("AMOUNT")) return "Importes no detectados";
                    if (t.includes("PERIOD")) return "Período no detectado";
                    return txt;
                  };

                  const beworFlagsBlock = hasBeworFlags ? (
                    <div className={`rounded-md border p-3 space-y-2 ${
                      beworStatus === "KO"
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-muted"
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Avisos del análisis Bewor</p>
                        <Badge variant={beworStatus === "KO" ? "destructive" : beworStatus === "OK" ? "default" : "secondary"}>
                          {beworStatus || "—"}
                        </Badge>
                      </div>
                      {kos.length > 0 && (
                        <ul className="text-xs text-destructive space-y-0.5 list-disc list-inside">
                          {kos.map((k, i) => <li key={`ko-${i}`}>{translateReason(k)}</li>)}
                        </ul>
                      )}
                      {warnings.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                          {warnings.map((w, i) => <li key={`w-${i}`}>{translateReason(w)}</li>)}
                        </ul>
                      )}
                      <p className="text-xs text-muted-foreground italic">
                        Sugerencia: pedir al cliente el extracto completo de los últimos 6 meses (mínimo 4-5 páginas).
                      </p>
                    </div>
                  ) : null;

                  if (inconclusive) {
                    return (
                      <div className="space-y-3 border-t border-border pt-3">
                        <div className="rounded-md border border-border bg-muted p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold">
                                OCR no detectó movimientos
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Se extrajeron datos del documento pero no las transacciones. Posiblemente el tipo enviado a Bewor sea de validación documental, no de extracción de transacciones. Revisar configuración.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-muted rounded p-2">
                            <p className="text-xs text-muted-foreground">Titular</p>
                            <p className="font-medium truncate">{holders}</p>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <p className="text-xs text-muted-foreground">Banco</p>
                            <p className="font-medium truncate">{bank}</p>
                          </div>
                          <div className="bg-muted rounded p-2 col-span-2">
                            <p className="text-xs text-muted-foreground">IBAN</p>
                            <p className="font-mono text-xs">{iban}</p>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <p className="text-xs text-muted-foreground">Período</p>
                            <p className="text-xs">{period}</p>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <p className="text-xs text-muted-foreground">Páginas / Confianza</p>
                            <p className="text-xs">
                              {pages} {confidence !== null ? `• ${Math.round(Number(confidence) * 100)}%` : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(a.file_path, a.id)}
                          disabled={!a.file_path || downloadingId === a.id}
                          className="w-full"
                        >
                          {downloadingId === a.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Descargar PDF original
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 border-t border-border pt-3">
                      <ViabilityLight
                        aprobable={!!v.aprobable}
                        hipoteca={Number(v.hipoteca_maxima || 0)}
                      />
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted rounded p-2">
                          <p className="text-xs text-muted-foreground">Ingresos detectados</p>
                          <p className="font-semibold">
                            {ingresos.toLocaleString("es-ES")} €/mes
                          </p>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <p className="text-xs text-muted-foreground">Deudas detectadas</p>
                          <p className="font-semibold">
                            {Number(v.deudas_detectadas || 0).toLocaleString("es-ES")} €/mes
                          </p>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <p className="text-xs text-muted-foreground">Cuota máx.</p>
                          <p className="font-semibold">
                            {Number(v.cuota_max || 0).toLocaleString("es-ES")} €/mes
                          </p>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <p className="text-xs text-muted-foreground">Hipoteca máx.</p>
                          <p className="font-semibold">
                            {Number(v.hipoteca_maxima || 0).toLocaleString("es-ES")} €
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{v.razon}</p>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyToSimulator(a)}
                          disabled={applyingId === a.id || !v.ingresos_detectados}
                          className="flex-1"
                        >
                          {applyingId === a.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Calculator className="h-4 w-4 mr-2" />
                          )}
                          Aplicar al simulador
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(a.file_path, a.id)}
                          disabled={!a.file_path || downloadingId === a.id}
                        >
                          {downloadingId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {a.status !== "FINISHED" && a.file_path && (
                  <div className="border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(a.file_path, a.id)}
                      disabled={downloadingId === a.id}
                    >
                      {downloadingId === a.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Descargar PDF original
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RequestDocumentsModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        leadId={leadId}
        leadName={leadName}
        leadPhone={leadPhone}
        leadEmail={leadEmail}
      />
    </div>
  );
};

export default BeworAnalysisTab;
