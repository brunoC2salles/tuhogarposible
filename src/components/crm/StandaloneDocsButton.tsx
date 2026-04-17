import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, MessageCircle, Mail, Loader2, CheckCircle2, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { useStandaloneTokens } from "@/hooks/useLeadDocumentTokens";
import { format } from "date-fns";

const StandaloneDocsButton = () => {
  const [open, setOpen] = useState(false);
  const { tokens, loading, createToken, buildPublicUrl } = useStandaloneTokens();
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    const t = await createToken();
    setCreating(false);
    if (t) {
      const url = buildPublicUrl(t.token);
      setNewUrl(url);
      toast.success("Enlace generado");
    } else {
      toast.error("No se pudo generar el enlace");
    }
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const sendWhatsApp = (url: string) => {
    const text = encodeURIComponent(
      `Hola, por favor sube tus movimientos bancarios de los últimos 6 meses en este enlace seguro: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const sendEmail = (url: string) => {
    const subject = encodeURIComponent("Solicitud de documentación - Tu Hogar Posible");
    const body = encodeURIComponent(
      `Hola,\n\nPor favor sube tus movimientos bancarios de los últimos 6 meses en el siguiente enlace seguro:\n\n${url}\n\nGracias.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const activeTokens = tokens.filter(
    (t) => new Date(t.expires_at) > new Date()
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4 mr-2" />
        Enlaces de prueba
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enlaces de documentos sin lead</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Genera un enlace seguro para pruebas o para clientes que aún no están en el CRM.
              El análisis quedará en <strong>"Análisis sin asignar"</strong> hasta que lo vincules a un lead.
              Expira en 7 días.
            </p>

            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generar nuevo enlace
                </>
              )}
            </Button>

            {newUrl && (
              <Card className="border-primary">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Enlace listo
                  </div>
                  <div className="flex gap-2">
                    <Input value={newUrl} readOnly className="text-xs" />
                    <Button size="icon" variant="outline" onClick={() => copy(newUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => sendWhatsApp(newUrl)}>
                      <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => sendEmail(newUrl)}>
                      <Mail className="h-4 w-4 mr-2" /> Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTokens.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Enlaces activos ({activeTokens.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activeTokens.map((t) => {
                    const url = buildPublicUrl(t.token);
                    return (
                      <div key={t.id} className="flex items-center gap-2 text-xs">
                        <Input value={url} readOnly className="text-xs" />
                        <Button size="icon" variant="outline" onClick={() => copy(url)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.expires_at), "dd/MM")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {loading && <p className="text-xs text-muted-foreground">Cargando...</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StandaloneDocsButton;
