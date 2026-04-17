import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";

const MAX_SIZE = 5 * 1024 * 1024;

const PublicDocumentUpload = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const SUPABASE_URL = "https://tnzgpzablwfptagfbnvb.supabase.co";

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
      } catch (e) {
        setError("No se pudo verificar el enlace");
      } finally {
        setLoading(false);
      }
    };
    if (token) check();
  }, [token]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("El archivo supera 5 MB");
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
      }
    } catch (e) {
      toast.error("No se pudo enviar el documento");
    } finally {
      setUploading(false);
    }
  };

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
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <h2 className="text-2xl font-semibold">¡Documento recibido!</h2>
                <p className="text-muted-foreground">
                  Hemos recibido tu documentación. Tu agente la revisará y te contactará en breve.
                </p>
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
                  <p className="text-sm text-muted-foreground">Tamaño máximo: 5 MB</p>
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
