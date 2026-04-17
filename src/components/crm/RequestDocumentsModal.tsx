import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, MessageCircle, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLeadDocumentTokens } from "@/hooks/useLeadDocumentTokens";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
}

const RequestDocumentsModal = ({ open, onOpenChange, leadId, leadName, leadPhone, leadEmail }: Props) => {
  const { tokens, loading, createToken, buildPublicUrl } = useLeadDocumentTokens(leadId);
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
      `Hola ${leadName}, por favor sube tus movimientos bancarios de los últimos 6 meses en este enlace seguro: ${url}`
    );
    const phone = (leadPhone || "").replace(/\D/g, "");
    const link = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(link, "_blank");
  };

  const sendEmail = (url: string) => {
    const subject = encodeURIComponent("Solicitud de documentación - Tu Hogar Posible");
    const body = encodeURIComponent(
      `Hola ${leadName},\n\nPor favor sube tus movimientos bancarios de los últimos 6 meses en el siguiente enlace seguro:\n\n${url}\n\nGracias.`
    );
    window.open(`mailto:${leadEmail || ""}?subject=${subject}&body=${body}`);
  };

  const activeTokens = tokens.filter((t) => new Date(t.expires_at) > new Date() && !t.used_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar documentos al cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Genera un enlace seguro para que <strong>{leadName}</strong> suba sus movimientos bancarios
            (PDF, máx. 5 MB). El enlace expira en 7 días.
          </p>

          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
              </>
            ) : (
              "Generar nuevo enlace"
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
              <p className="text-sm font-medium mb-2">Enlaces activos</p>
              <div className="space-y-2">
                {activeTokens.map((t) => {
                  const url = buildPublicUrl(t.token);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <Input value={url} readOnly className="text-xs" />
                      <Button size="icon" variant="outline" onClick={() => copy(url)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <span className="text-muted-foreground whitespace-nowrap">
                        Exp: {format(new Date(t.expires_at), "dd/MM")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-muted-foreground">Cargando enlaces...</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDocumentsModal;
