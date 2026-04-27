import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText, Clock } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";

const MAX_SIZE = 10 * 1024 * 1024;
const SUPABASE_URL = "https://tnzgpzablwfptagfbnvb.supabase.co";

type ProcessingStatus = "uploading" | "processing" | "finished" | "error" | "timeout";

const MAX_POLL_ATTEMPTS = 24; // 24 × 5s = 2 minutos

const PublicDocumentUpload = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [numTitulares, setNumTitulares] = useState<1 | 2>(1);
  const [holderScopes, setHolderScopes] = useState<string[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [statusFlow, setStatusFlow] = useState<ProcessingStatus>("uploading");
  const [aprobable, setAprobable] = useState<boolean | null>(null);
  const [hipotecaMax, setHipotecaMax] = useState<number>(0);
  const [cuotaMax, setCuotaMax] = useState<number>(0);
  const [inconclusive, setInconclusive] = useState<boolean>(false);
  const [inconclusiveReason, setInconclusiveReason] = useState<string | null>(null);
  const [documentValidated, setDocumentValidated] = useState<boolean>(false);
  const [validatedMessage, setValidatedMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);
  const attemptsRef = useRef<number>(0);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/bewor-get-token-info?token=${encodeURIComponent(token || "")}`
        );
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError(data.error || "El enlace no es válido");
          setValid(false);
        } else {
          setValid(true);
          setNombre(data.nombre || "");
        }
      } catch {
        setError("No se pudo verificar el enlace");
      } finally {
        setLoading(false);
      }
    };
    if (token) check();
  }, [token]);

  // Polling do status
  useEffect(() => {
    if (!analysisId || !done) return;
    attemptsRef.current = 0;

    const stopPolling = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/bewor-public-status?analysis_id=${analysisId}`
        );
        const data = await res.json();
        if (data.status === "FINISHED") {
          setStatusFlow("finished");
          setAprobable(data.aprobable);
          setHipotecaMax(Number(data.hipoteca_maxima || 0));
          setCuotaMax(Number(data.cuota_max || 0));
          setInconclusive(!!data.inconclusive);
          setInconclusiveReason(data.inconclusive_reason || null);
          setDocumentValidated(!!data.document_validated);
          setValidatedMessage(data.validated_message || null);
          stopPolling();
        } else if (data.status === "ERROR") {
          setStatusFlow("error");
          stopPolling();
        } else {
          setStatusFlow("processing");
          if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
            setStatusFlow("timeout");
            stopPolling();
          }
        }
      } catch (e) {
        console.error("polling error:", e);
        if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
          setStatusFlow("timeout");
          stopPolling();
        }
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 5000);

    return () => {
      stopPolling();
    };
  }, [analysisId, done]);

  const handleFiles = (selected: FileList | File[] | null) => {
    const next = Array.from(selected || []);
    if (next.length === 0) return;
    if (next.length > 3) {
      toast.error("Máximo 3 documentos PDF");
      return;
    }
    for (const f of next) {
      if (f.type !== "application/pdf") {
        toast.error("Solo se permiten archivos PDF");
        return;
      }
      if (f.size > MAX_SIZE) {
        toast.error("Cada archivo debe tener como máximo 10 MB");
        return;
      }
    }
    setFiles(next);
    setHolderScopes(next.map((_, index) => holderScopes[index] || "titular_1"));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("num_titulares", String(numTitulares));
      files.forEach((file, index) => {
        fd.append("files", file);
        fd.append(`holder_scope_${index}`, holderScopes[index] || "titular_1");
      });
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bewor-public-upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar el documento");
      } else {
        setDone(true);
        setAnalysisId(data.analysis_id || null);
        setStatusFlow("processing");
      }
    } catch {
      toast.error("No se pudo enviar el documento");
    } finally {
      setUploading(false);
    }
  };

  const StepIndicator = ({
    label,
    state,
  }: {
    label: string;
    state: "done" | "active" | "pending" | "error";
  }) => (
    <div className="flex items-center gap-3">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          state === "done"
            ? "bg-primary text-primary-foreground"
            : state === "active"
              ? "bg-primary/20 text-primary"
              : state === "error"
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground"
        }`}
      >
        {state === "done" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "error" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>
      <span
        className={`text-sm ${state === "pending" ? "text-muted-foreground" : "font-medium"}`}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border py-4 flex justify-center">
        <Logo size="md" />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardContent className="p-8">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verificando enlace...</p>
              </div>
            )}

            {!loading && !valid && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <h2 className="text-xl font-semibold">Enlace no válido</h2>
                <p className="text-muted-foreground">
                  {error || "Este enlace ya no está disponible. Contacta con tu agente."}
                </p>
              </div>
            )}

            {!loading && valid && done && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-2">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                  <h2 className="text-2xl font-semibold">¡Documento recibido!</h2>
                  <p className="text-muted-foreground text-sm">
                    Estamos procesando tu información de forma segura.
                  </p>
                  {statusFlow === "processing" && (
                    <p className="text-xs text-muted-foreground">
                      Esto suele tardar entre 15 y 30 segundos.
                    </p>
                  )}
                </div>

                <div className="space-y-4 border-t border-border pt-4">
                  <StepIndicator label="Documento subido" state="done" />
                  <StepIndicator
                    label="Analizando con OCR"
                    state={
                      statusFlow === "finished"
                        ? "done"
                        : statusFlow === "error"
                          ? "error"
                          : "active"
                    }
                  />
                  <StepIndicator
                    label="Análisis listo"
                    state={
                      statusFlow === "finished"
                        ? "done"
                        : statusFlow === "error"
                          ? "error"
                          : "pending"
                    }
                  />
                </div>

                {statusFlow === "finished" && inconclusive && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">
                            Hubo un problema con el documento
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {inconclusiveReason ||
                              "Hubo un problema procesando tu extracto. Por favor, contacta con tu agente para que te ayude a subir el documento correcto."}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDone(false);
                        setFiles([]);
                        setHolderScopes([]);
                        setAnalysisId(null);
                        setStatusFlow("uploading");
                        setAprobable(null);
                        setHipotecaMax(0);
                        setCuotaMax(0);
                        setInconclusive(false);
                        setInconclusiveReason(null);
                        setDocumentValidated(false);
                        setValidatedMessage(null);
                      }}
                    >
                      Subir otro documento
                    </Button>
                  </div>
                )}

                {statusFlow === "finished" && !inconclusive && aprobable === true && (
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                        Hipoteca aprobable
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background rounded-md p-3 text-center">
                        <p className="text-xs text-muted-foreground">Hipoteca máxima estimada</p>
                        <p className="text-lg font-bold text-foreground">
                          {hipotecaMax.toLocaleString("es-ES")} €
                        </p>
                      </div>
                      <div className="bg-background rounded-md p-3 text-center">
                        <p className="text-xs text-muted-foreground">Cuota mensual máx.</p>
                        <p className="text-lg font-bold text-foreground">
                          {cuotaMax.toLocaleString("es-ES")} €
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Estimación basada en OCR. Tu agente confirmará los términos finales contigo.
                    </p>
                  </div>
                )}

                {statusFlow === "finished" && !inconclusive && aprobable === false && (
                  <div className="rounded-lg border border-border bg-muted p-4 space-y-2 text-center">
                    <p className="text-sm font-semibold">Análisis recibido</p>
                    <p className="text-xs text-muted-foreground">
                      Según los movimientos analizados, la capacidad actual es limitada. Tu agente
                      te contactará para revisar opciones contigo.
                    </p>
                  </div>
                )}

                {statusFlow === "error" && (
                  <div className="bg-destructive/10 rounded-lg p-4 text-center">
                    <p className="text-sm text-destructive">
                      Hubo un problema al procesar el documento. Tu agente se pondrá en contacto.
                    </p>
                  </div>
                )}

                {statusFlow === "timeout" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Tu análisis está tardando más de lo habitual</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Hemos recibido tu documento correctamente y tu agente lo revisará en breve.
                            No es necesario que esperes en esta página.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDone(false);
                        setFiles([]);
                        setHolderScopes([]);
                        setAnalysisId(null);
                        setStatusFlow("uploading");
                        setAprobable(null);
                        setHipotecaMax(0);
                        setCuotaMax(0);
                        setInconclusive(false);
                        setInconclusiveReason(null);
                        setDocumentValidated(false);
                        setValidatedMessage(null);
                      }}
                    >
                      Subir otro documento
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!loading && valid && !done && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold text-foreground">
                    Hola{nombre ? `, ${nombre}` : ""}
                  </h1>
                  <p className="text-muted-foreground">
                    Sube tus <strong>movimientos bancarios de los últimos 6 meses</strong> en formato PDF.
                  </p>
                  <p className="text-sm text-muted-foreground">Tamaño máximo: 10 MB</p>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-foreground space-y-1">
                      <p className="font-semibold">Importante para un análisis válido:</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        <li>Extracto <strong>completo</strong> de los últimos 6 meses</li>
                        <li>Mínimo 4-5 páginas (no solo la portada o el resumen)</li>
                        <li>Debe incluir los movimientos detallados con fechas e importes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <p>Haz clic o arrastra tu PDF aquí</p>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!file || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar documento"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Tu información es tratada de forma confidencial y solo será utilizada para evaluar
                  tu viabilidad hipotecaria.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PublicDocumentUpload;
