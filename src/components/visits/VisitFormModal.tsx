import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LeadVisit, LeadVisitFormData } from '@/types/visits';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: LeadVisitFormData) => Promise<boolean>;
  visit?: LeadVisit | null;
  presetLeadId?: string;
  presetLeadName?: string;
}

interface LeadOption {
  id: string;
  nombre_completo: string;
}

export const VisitFormModal = ({ open, onClose, onSave, visit, presetLeadId, presetLeadName }: Props) => {
  const { user, isAdmin, profile } = useAuth();
  const [leadId, setLeadId] = useState('');
  const [leadLabel, setLeadLabel] = useState('');
  const [fecha, setFecha] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [tieneReserva, setTieneReserva] = useState(false);
  const [reservaUrl, setReservaUrl] = useState<string>('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (visit) {
      setLeadId(visit.lead_id);
      setLeadLabel(visit.lead_nombre || '');
      const d = new Date(visit.fecha_visita);
      const tzOffset = d.getTimezoneOffset() * 60000;
      setFecha(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      setUrls(visit.product_urls.length ? visit.product_urls : ['']);
      setTieneReserva(visit.tiene_reserva);
      setReservaUrl(visit.reserva_url || '');
      setNotas(visit.notas || '');
    } else {
      setLeadId(presetLeadId || '');
      setLeadLabel(presetLeadName || '');
      setFecha('');
      setUrls(['']);
      setTieneReserva(false);
      setReservaUrl('');
      setNotas('');
    }
  }, [open, visit, presetLeadId, presetLeadName]);

  // Fetch qualified leads for search
  useEffect(() => {
    if (!open || presetLeadId) return;
    const fetchLeads = async () => {
      let q = supabase
        .from('leads')
        .select('id, nombre_completo, agente_asignado_id, stage')
        .neq('stage', 'descualificados')
        .order('nombre_completo', { ascending: true })
        .limit(500);
      if (!isAdmin && profile?.role !== 'supervisor' && user) {
        q = q.eq('agente_asignado_id', user.id);
      }
      const { data, error } = await q;
      if (!error && data) setLeadOptions(data as any);
    };
    fetchLeads();
  }, [open, presetLeadId, isAdmin, profile?.role, user]);

  const filteredUrls = useMemo(() => urls.map(u => u.trim()).filter(Boolean), [urls]);

  const handleAddUrl = () => setUrls([...urls, '']);
  const handleRemoveUrl = (i: number) => {
    const next = urls.filter((_, idx) => idx !== i);
    setUrls(next.length ? next : ['']);
    // If reservaUrl was removed, clear it
    if (reservaUrl && !next.includes(reservaUrl)) setReservaUrl('');
  };
  const handleUrlChange = (i: number, val: string) => {
    const old = urls[i];
    const next = [...urls];
    next[i] = val;
    setUrls(next);
    if (reservaUrl === old) setReservaUrl(val);
  };

  const handleSubmit = async () => {
    if (!leadId) return toast.error('Selecciona un lead');
    if (!fecha) return toast.error('Selecciona fecha y hora');
    if (filteredUrls.length === 0) return toast.error('Añade al menos una URL');
    if (tieneReserva && !reservaUrl) return toast.error('Indica cuál producto fue reservado');

    setSaving(true);
    const ok = await onSave({
      lead_id: leadId,
      fecha_visita: new Date(fecha).toISOString(),
      product_urls: filteredUrls,
      tiene_reserva: tieneReserva,
      reserva_url: tieneReserva ? reservaUrl : null,
      notas: notas.trim() || null,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{visit ? 'Editar Visita' : 'Registrar Visita'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Lead</Label>
            {presetLeadId ? (
              <Input value={leadLabel} disabled />
            ) : (
              <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {leadLabel || 'Buscar lead...'}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre..." value={leadSearch} onValueChange={setLeadSearch} />
                    <CommandList>
                      <CommandEmpty>Sin resultados</CommandEmpty>
                      <CommandGroup>
                        {leadOptions
                          .filter(l => l.nombre_completo.toLowerCase().includes(leadSearch.toLowerCase()))
                          .slice(0, 50)
                          .map(l => (
                            <CommandItem
                              key={l.id}
                              value={l.nombre_completo}
                              onSelect={() => {
                                setLeadId(l.id);
                                setLeadLabel(l.nombre_completo);
                                setLeadSearchOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', leadId === l.id ? 'opacity-100' : 'opacity-0')} />
                              {l.nombre_completo}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fecha y hora de la visita</Label>
            <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>URLs de los productos</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddUrl}>
                <Plus className="h-4 w-4 mr-1" /> Añadir URL
              </Button>
            </div>
            {urls.map((u, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={u}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                />
                {urls.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveUrl(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label>¿Hubo reserva?</Label>
              <p className="text-xs text-muted-foreground">Marca si el lead reservó uno de los productos.</p>
            </div>
            <Switch checked={tieneReserva} onCheckedChange={setTieneReserva} />
          </div>

          {tieneReserva && (
            <div className="space-y-2">
              <Label>Producto reservado</Label>
              <Select value={reservaUrl} onValueChange={setReservaUrl}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la URL reservada" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUrls.map((u, i) => (
                    <SelectItem key={i} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
