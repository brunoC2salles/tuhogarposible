import { useState } from "react";
import { useLeadDocumentAnalysis } from "@/hooks/useLeadDocumentAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import RequestDocumentsModal from "./RequestDocumentsModal";
import { format } from "date-fns";

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

const BeworAnalysisTab = ({ leadId, leadName, leadPhone, leadEmail }: Props) => {
  const { analyses, loading } = useLeadDocumentAnalysis(leadId);
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Análisis de documentos</h3>
          <p className="text-sm text-muted-foreground">
            Movimientos bancarios analizados automáticamente
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

                {a.status === "PROCESSING" || a.status === "CREATED" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Análisis en curso. Te notificaremos cuando termine.
                  </div>
                ) : null}

                {a.status === "ERROR" && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{a.error_message || "Ocurrió un error en el análisis"}</span>
                  </div>
                )}

                {a.status === "FINISHED" && v && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      {v.aprobable ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        {v.aprobable ? "Hipoteca viable (estimación)" : "Capacidad insuficiente"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted rounded p-2">
                        <p className="text-xs text-muted-foreground">Ingresos detectados</p>
                        <p className="font-semibold">
                          {Number(v.ingresos_detectados || 0).toLocaleString("es-ES")} €/mes
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
