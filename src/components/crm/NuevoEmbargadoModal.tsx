import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  EMBARGADOS_PREGUNTAS,
  EMBARGADOS_STAGE_LABELS,
  EMBARGADOS_STAGE_ORDER,
  EmbargadoStage,
  NuevoEmbargadoData,
} from '@/types/embargados';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: NuevoEmbargadoData) => Promise<boolean>;
}

const vacio = (): NuevoEmbargadoData => ({
  nombre_completo: '',
  telefono: '',
  email: '',
  ciudad: '',
  stage: 'contactado',
  respuestas: Object.fromEntries(EMBARGADOS_PREGUNTAS.map((p) => [p.key, ''])),
});

/** Alta manual de un lead en el CRM Embargados. Nombre y teléfono obligatorios. */
export const NuevoEmbargadoModal = ({ open, onOpenChange, onCreate }: Props) => {
  const [form, setForm] = useState<NuevoEmbargadoData>(vacio);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Omit<NuevoEmbargadoData, 'respuestas' | 'stage'>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setResp = (k: string, v: string) =>
    setForm((f) => ({ ...f, respuestas: { ...f.respuestas, [k]: v } }));

  const valido = form.nombre_completo.trim() !== '' && form.telefono.trim() !== '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setSaving(true);
    const ok = await onCreate(form);
    setSaving(false);
    if (ok) {
      setForm(vacio());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emb-nombre">Nombre y apellidos *</Label>
              <Input id="emb-nombre" value={form.nombre_completo} onChange={(e) => set('nombre_completo', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emb-tel">Teléfono *</Label>
              <Input id="emb-tel" type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emb-email">Email</Label>
              <Input id="emb-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emb-ciudad">Ciudad</Label>
              <Input id="emb-ciudad" value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v as EmbargadoStage }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMBARGADOS_STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{EMBARGADOS_STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            {EMBARGADOS_PREGUNTAS.map((p) => (
              <div key={p.key} className="space-y-1.5">
                <Label htmlFor={`emb-${p.key}`} className="leading-snug">{p.label}</Label>
                <Input id={`emb-${p.key}`} value={form.respuestas[p.key] || ''} onChange={(e) => setResp(p.key, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!valido || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Crear lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
