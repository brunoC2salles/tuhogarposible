import { useState, useEffect } from "react";
import { useLeadDocumentAnalysis } from "@/hooks/useLeadDocumentAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Download,
  Calculator,
  User,
  Save,
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

/** Cartão destacado com todos os dados extraídos + edição manual */
const ExtractedDataCard = ({
  analysis,
  onSaved,
}: {
  analysis: any;
  onSaved: () => void;
}) => {
  const [dni, setDni] = useState(analysis.holder_dni || "");
  const [income, setIncome] = useState<string>(
    analysis.monthly_income != null ? String(analysis.monthly_income) : ""
  );
  const [saving, setSaving] = useState(false);

  // Sincroniza quando o registro é atualizado (realtime)
  useEffect(() => {
    setDni(analysis.holder_dni || "");
    setIncome(analysis.monthly_income != null ? String(analysis.monthly_income) : "");
  }, [analysis.holder_dni, analysis.monthly_income]);

  const v = (analysis.viabilidade_sugerida as any) || {};
  const docFields =
    (analysis.result as any)?.document_fields ||
    (analysis.result as any)?.result?.document_fields ||
    {};
  const pages = v.pages || (analysis.result as any)?.result?.pages || analysis.analysis_input?.files?.reduce?.((s: number, f: any) => s + Number(f.pages || 0), 0) || "—";
  const confidence = v.confidence ?? (analysis.result as any)?.result?.confidence ?? null;
  const isInternal = analysis.analysis_provider === "internal";
  const extracted = analysis.extracted_financials || analysis.result?.ai_result || {};
  const period = analysis.period_start
    ? `Desde ${format(new Date(analysis.period_start), "dd/MM/yyyy")}`
    : docFields.period_start_date
      ? `${docFields.period_start_date} → ${docFields.period_end_date || "?"}`
      : "—";

  const handleSave = async () => {
    setSaving(true);
    const monthlyIncomeNum = income.trim() ? Number(income.replace(",", ".")) : null;
    const { error } = await supabase
      .from("lead_document_analysis")
      .update({
        holder_dni: dni.trim() || null,
        monthly_income: monthlyIncomeNum,
      })
      .eq("id", analysis.id);

    if (error) {
      toast.error("No se pudieron guardar los datos");
    } else {
      toast.success("Datos guardados");
      onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-primary">Datos extraídos del documento</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-background rounded p-2">
          <p className="text-xs text-muted-foreground">Titular</p>
          <p className="font-medium truncate">
            {analysis.holder_name && !analysis.holder_name.includes("[object Object]")
              ? analysis.holder_name
              : "—"}
          </p>
        </div>
        <div className="bg-background rounded p-2">
          <p className="text-xs text-muted-foreground">Banco</p>
          <p className="font-medium truncate">{analysis.bank_name || "—"}</p>
        </div>
        <div className="bg-background rounded p-2 col-span-2">
          <p className="text-xs text-muted-foreground">IBAN</p>
          <p className="font-mono text-xs break-all">{analysis.iban || "—"}</p>
        </div>
        <div className="bg-background rounded p-2">
          <p className="text-xs text-muted-foreground">Período</p>
          <p className="text-xs">{period}</p>
        </div>
        <div className="bg-background rounded p-2">
          <p className="text-xs text-muted-foreground">Páginas / Confianza</p>
          <p className="text-xs">
            {pages} {confidence !== null ? `• ${Math.round(Number(confidence) * 100)}%` : ""}
          </p>
        </div>
        {isInternal && (
          <>
            <div className="bg-background rounded p-2">
              <p className="text-xs text-muted-foreground">Meses detectados</p>
              <p className="font-medium">{analysis.months_detected ?? v.months_detected ?? "—"}/12</p>
            </div>
            <div className="bg-background rounded p-2">
              <p className="text-xs text-muted-foreground">Ahorros</p>
              <p className="font-medium">{Number(v.ahorros_detectados || 0).toLocaleString("es-ES")} €</p>
            </div>
          </>
        )}
      </div>

      {isInternal && Array.isArray(extracted.titulares) && extracted.titulares.length > 0 && (
        <div className="rounded border border-border bg-background p-2 space-y-1">
          <p className="text-xs font-medium">Titulares detectados</p>
          {extracted.titulares.map((h: any) => (
            <p key={h.index} className="text-xs text-muted-foreground">
              Titular {h.index}: {Number(h.monthly_recurring_income || h.average_monthly_income || 0).toLocaleString("es-ES")} €/mes ingresos · {Number(h.monthly_debts || 0).toLocaleString("es-ES")} €/mes deudas
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="space-y-1">
          <Label htmlFor={`dni-${analysis.id}`} className="text-xs">
            DNI / NIE
          </Label>
          <Input
            id={`dni-${analysis.id}`}
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Ej: 12345678A"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`income-${analysis.id}`} className="text-xs">
            Ingresos mensuales (€)
          </Label>
          <Input
            id={`income-${analysis.id}`}
            type="number"
            inputMode="decimal"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="Ej: 1850"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Guardar datos del documento
      </Button>
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
    // Prioriza monthly_income manual; cai para ingresos_detectados automáticos
    const v = a.viabilidade_sugerida as any;
    const ingresosToApply = a.monthly_income ?? v?.ingresos_detectados ?? 0;
    if (!ingresosToApply || ingresosToApply <= 0) {
      toast.error("No hay ingresos para aplicar. Introduce los ingresos manualmente y guarda.");
      return;
    }
    setApplyingId(a.id);
    const { data: lead } = await supabase
      .from("leads")
      .select("simulador_hipotecario_data")
      .eq("id", leadId)
      .single();

    const existing = (lead?.simulador_hipotecario_data as any) || {};
    const updated = {
      ...existing,
      ingresos: Number(ingresosToApply),
      deudas: Number(v?.deudas_detectadas || 0),
      _statement_analysis_applied_at: new Date().toISOString(),
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
            Extractos bancarios analizados automáticamente
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
                  const ingresosAuto = Number(v.ingresos_detectados || 0);
                  const ingresosManual = Number(a.monthly_income || 0);
                  const ingresosFinal = ingresosManual > 0 ? ingresosManual : ingresosAuto;
                  const isInternal = a.analysis_provider === "internal";
                  const legacyStatus = (v.bewor_status || "").toString().toUpperCase();
                  const warnings: string[] = Array.isArray(v.bewor_warnings) ? v.bewor_warnings : [];
                  const kos: string[] = Array.isArray(v.bewor_kos) ? v.bewor_kos : [];
                  const needsManualReview = !!v.needs_manual_review;
                  const hasLegacyFlags = !isInternal && (warnings.length > 0 || kos.length > 0);

                  const translateReason = (txt: string) => {
                    const t = (txt || "").toUpperCase();
                    if (t.includes("IBAN") && t.includes("INVALID")) return "IBAN inválido";
                    if (t.includes("PAGES") || t.includes("PAGE_COUNT")) return "Pocas páginas analizadas";
                    if (t.includes("HOLDER")) return "Titular no detectado";
                    if (t.includes("AMOUNT")) return "Importes no detectados";
                    if (t.includes("PERIOD")) return "Período no detectado";
                    return txt;
                  };

                  const legacyFlagsBlock = hasLegacyFlags ? (
                    <div className={`rounded-md border p-3 space-y-2 ${
                      legacyStatus === "KO"
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-muted"
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Avisos del análisis</p>
                        <Badge variant={legacyStatus === "KO" ? "destructive" : legacyStatus === "OK" ? "default" : "secondary"}>
                          {legacyStatus || "—"}
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
                    </div>
                  ) : null;

                  if (isInternal && v.incomplete_months) {
                    return (
                      <div className="space-y-3 border-t border-border pt-3">
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                          <p className="text-sm font-semibold">Extracto incompleto</p>
                          <p className="text-xs text-muted-foreground mt-1">{v.razon}</p>
                        </div>
                        <ExtractedDataCard analysis={a} onSaved={refetch} />
                        <Button size="sm" variant="outline" onClick={() => handleDownload(a.file_path, a.id)} disabled={!a.file_path || downloadingId === a.id} className="w-full">
                          {downloadingId === a.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                          Descargar PDF original
                        </Button>
                      </div>
                    );
                  }

                  // Cenário 1: análisis no válido — documento inválido
                  if (!isInternal && legacyStatus === "KO") {
                    return (
                      <div className="space-y-3 border-t border-border pt-3">
                        {legacyFlagsBlock}
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                          <p className="text-sm font-semibold">Documento no válido</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {v.razon || "El documento no es un extracto bancario válido."}
                          </p>
                        </div>
                        <ExtractedDataCard analysis={a} onSaved={refetch} />
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

                  // Cenário 2: Documento validado mas el análisis no extrajo ingresos
                  if (needsManualReview && ingresosFinal === 0) {
                    return (
                      <div className="space-y-3 border-t border-border pt-3">
                        {legacyFlagsBlock}
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-primary">
                                Documento validado — revisión manual de ingresos
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {v.razon}
                              </p>
                            </div>
                          </div>
                        </div>
                        <ExtractedDataCard analysis={a} onSaved={refetch} />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(a.file_path, a.id)}
                            disabled={!a.file_path || downloadingId === a.id}
                            className="flex-1"
                          >
                            {downloadingId === a.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            Descargar PDF original
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // Cenário 3: Análise completa com cálculo automático ou ingresos manuais já preenchidos
                  return (
                    <div className="space-y-3 border-t border-border pt-3">
                      {legacyFlagsBlock}
                      <ExtractedDataCard analysis={a} onSaved={refetch} />
                      <ViabilityLight
                        aprobable={!!v.aprobable || ingresosFinal > 0}
                        hipoteca={Number(v.hipoteca_maxima || 0)}
                      />
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted rounded p-2">
                          <p className="text-xs text-muted-foreground">
                            Ingresos {ingresosManual > 0 ? "(manual)" : "(auto)"}
                          </p>
                          <p className="font-semibold">
                            {ingresosFinal.toLocaleString("es-ES")} €/mes
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
                      {v.razon && <p className="text-xs text-muted-foreground">{v.razon}</p>}

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyToSimulator(a)}
                          disabled={applyingId === a.id || ingresosFinal === 0}
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
