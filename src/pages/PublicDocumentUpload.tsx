import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText, Clock } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";

const MAX_SIZE = 10 * 1024 * 1024;
const SUPABASE_URL = "https://tnzgpzablwfptagfbnvb.supabase.co";

type ProcessingStatus = "uploading" | "processing" | "finished" | "error";

const PublicDocumentUpload = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [statusFlow, setStatusFlow] = useState<ProcessingStatus>("uploading");
  const [aprobable, setAprobable] = useState<boolean | null>(null);
  const [hipotecaMax, setHipotecaMax] = useState<number>(0);
  const [cuotaMax, setCuotaMax] = useState<number>(0);
  const [inconclusive, setInconclusive] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

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

    const poll = async () => {
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
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (data.status === "ERROR") {
          setStatusFlow("error");
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else {
          setStatusFlow("processing");
        }
      } catch (e) {
        console.error("polling error:", e);
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 5000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [analysisId, done]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("El archivo supera 10 MB");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("file", file);
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

                {statusFlow === "finished" && (
                  <div className="bg-muted rounded-lg p-4 text-center space-y-1">
                    <p className="text-sm font-medium">Tu agente revisará el resultado</p>
                    <p className="text-xs text-muted-foreground">
                      {aprobable === true
                        ? "Hemos detectado capacidad para una hipoteca. Te contactaremos en breve."
                        : aprobable === false
                          ? "Tu agente analizará el resultado y te contactará para discutir las opciones."
                          : "Te contactaremos con los próximos pasos."}
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
