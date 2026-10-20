import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Clock, Copy, Download, FileSignature, Link2, Loader2, MessageCircle, PenLine, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  HONORARIOS_DEFECTO,
  LeadContrato,
  contratoExpirado,
  contratoUrl,
  useLeadContratos,
} from '@/hooks/useLeadContratos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNombre: string;
  leadTelefono?: string | null;
}

// Teléfono para WhatsApp: solo dígitos, sin 00 inicial y con 34 si viene sin prefijo (9 cifras)
const telefonoWhatsApp = (tel?: string | null) => {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9) d = `34${d}`;
  return d.length >= 10 ? d : null;
};
const fechaCorta = (iso: string) => format(new Date(iso), "d 'de' MMMM", { locale: es });

const fmt = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es });
const eur = (n: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n)} €`;
const archivo = (c: LeadContrato, firmado: boolean) =>
  `Mandato_de_compra_${(c.datos?.nombre || 'THP').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_')}${firmado ? '_firmado' : ''}.pdf`;

const EstadoBadge = ({ c }: { c: LeadContrato }) => {
  if (c.estado === 'firmado') return <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Firmado</Badge>;
  if (c.estado === 'firmando') return <Badge className="bg-amber-500 hover:bg-amber-500"><PenLine className="h-3 w-3 mr-1" />Pendiente de firma</Badge>;
  if (contratoExpirado(c)) return <Badge variant="secondary">Enlace caducado</Badge>;
  return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Esperando datos del cliente</Badge>;
};

/** Mandato de compra: genera el enlace para el cliente y muestra el estado del contrato */
export const MandatoContratoDialog = ({ open, onOpenChange, leadId, leadNombre, leadTelefono }: Props) => {
  const { profile } = useAuth();
  const telefono = telefonoWhatsApp(leadTelefono);
  const { contratos, loading, fetchContratos, crearContrato, descargar } = useLeadContratos(open ? leadId : null);
  const [honorarios, setHonorarios] = useState(String(HONORARIOS_DEFECTO));
  const [creando, setCreando] = useState(false);

  const importe = Number(honorarios.replace(/\./g, '').replace(',', '.'));
  const importeValido = Number.isFinite(importe) && importe > 0;

  const copiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(contratoUrl(token));
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  // Mensaje según la etapa: aún sin datos -> rellenar y firmar; con datos -> solo falta firmar
  const mensajeWhatsApp = (c: LeadContrato) => {
    const nombre = (c.datos?.nombre || leadNombre).trim().split(/\s+/)[0];
    const agente = profile?.nombre ? `, soy ${profile.nombre.trim().split(/\s+/)[0]} de Tu Hogar Posible` : ', te escribimos de Tu Hogar Posible';
    const url = contratoUrl(c.token);
    if (c.estado === 'firmando') {
      return `Hola ${nombre}${agente}. Tu mandato de compra ya está listo con tus datos, solo falta tu firma. Puedes firmarlo online desde este enlace:\n\n${url}\n\nSi tienes cualquier duda, dímelo por aquí.`;
    }
    return `Hola ${nombre}${agente}. Te envío el enlace para tu mandato de compra:\n\n${url}\n\nSolo tienes que rellenar tus datos, descargar el contrato y firmarlo online. Te llevará unos minutos. El enlace es válido hasta el ${fechaCorta(c.expires_at)}.\n\nSi tienes cualquier duda, dímelo por aquí.`;
  };

  const enviarWhatsApp = (c: LeadContrato) => {
    if (!telefono) return;
    window.open(`https://web.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensajeWhatsApp(c))}`, '_blank');
  };

  const generar = async () => {
    if (!importeValido) return;
    setCreando(true);
    const c = await crearContrato(Math.round(importe * 100) / 100);
    setCreando(false);
    if (c) await copiar(c.token);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />Mandato de compra
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{leadNombre}</p>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="honorarios">Honorarios (exentos de IVA)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="honorarios"
                  inputMode="decimal"
                  value={honorarios}
                  onChange={(e) => setHonorarios(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
              <Button onClick={generar} disabled={!importeValido || creando}>
                {creando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Generar enlace
              </Button>
            </div>
            {!importeValido && <p className="text-xs text-destructive">Introduce un importe válido.</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            El enlace es válido 7 días. El cliente rellena nombre, DNI/NIE, domicilio y email, descarga el contrato y lo firma con Lumin.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Contratos generados</h4>
          <Button variant="ghost" size="sm" onClick={fetchContratos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading && !contratos.length ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !contratos.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aún no se ha generado ningún enlace.</p>
        ) : (
          <div className="space-y-3">
            {contratos.map((c) => (
              <div key={c.id} className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <EstadoBadge c={c} />
                  <span className="text-xs text-muted-foreground">{eur(Number(c.honorarios))}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Creado: {fmt(c.created_at)}{c.estado === 'pendiente' ? ` · caduca ${fmt(c.expires_at)}` : ''}</p>
                  {c.enviado_at && <p>Datos enviados: {fmt(c.enviado_at)}</p>}
                  {c.firmado_at && <p>Firmado: {fmt(c.firmado_at)}</p>}
                  {c.datos && <p>{c.datos.nombre} · {c.datos.dni} · {c.datos.email}</p>}
                  {c.error && c.estado === 'pendiente' && <p className="text-destructive">Último error: {c.error}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.estado !== 'firmado' && !contratoExpirado(c) && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => enviarWhatsApp(c)}
                        disabled={!telefono}
                        title={telefono ? 'Abrir WhatsApp Web con el mensaje preparado' : 'El lead no tiene un teléfono válido'}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />Enviar por WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copiar(c.token)}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />Copiar enlace
                      </Button>
                    </>
                  )}
                  {c.firmado_path ? (
                    <Button size="sm" onClick={() => descargar(c.firmado_path!, archivo(c, true))}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />Contrato firmado
                    </Button>
                  ) : c.pdf_path ? (
                    <Button size="sm" variant="outline" onClick={() => descargar(c.pdf_path!, archivo(c, false))}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />Contrato sin firmar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
