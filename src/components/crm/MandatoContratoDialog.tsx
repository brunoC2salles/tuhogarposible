import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Clock, Copy, Download, FileSignature, Link2, Loader2, PenLine, RefreshCw } from 'lucide-react';
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
}

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
export const MandatoContratoDialog = ({ open, onOpenChange, leadId, leadNombre }: Props) => {
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
                    <Button size="sm" variant="outline" onClick={() => copiar(c.token)}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />Copiar enlace
                    </Button>
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
