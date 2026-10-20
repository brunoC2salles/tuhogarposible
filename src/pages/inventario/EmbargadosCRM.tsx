import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, Loader2, Phone, PhoneCall, Search, Shield, Users, Workflow, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Logo from '@/components/Logo';
import AuthButton from '@/components/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useEmbargadosAccess, useEmbargadosLeads } from '@/hooks/useEmbargados';
import {
  EMBARGADOS_STAGE_LABELS,
  EMBARGADOS_STAGE_ORDER,
  EmbargadoLead,
  EmbargadoStage,
} from '@/types/embargados';

const STAGE_STYLE: Record<EmbargadoStage, { col: string; head: string; badge: string; icon: JSX.Element }> = {
  contactado: {
    col: 'border-primary/30 bg-primary/5',
    head: 'text-primary border-primary/20',
    badge: 'bg-primary/10 text-primary',
    icon: <PhoneCall className="h-4 w-4" />,
  },
  en_proceso: {
    col: 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/20',
    head: 'text-amber-600 dark:text-amber-400 border-amber-500/20',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    icon: <Workflow className="h-4 w-4" />,
  },
  exito: {
    col: 'border-green-500/30 bg-green-50 dark:bg-green-950/20',
    head: 'text-green-600 dark:text-green-400 border-green-500/20',
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  descualificados: {
    col: 'border-destructive/30 bg-destructive/5',
    head: 'text-destructive border-destructive/20',
    badge: 'bg-destructive/10 text-destructive',
    icon: <Ban className="h-4 w-4" />,
  },
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const EmbargadosCRM = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const access = useEmbargadosAccess();
  const { leads, loading, changeStage, updateLead } = useEmbargadosLeads();
  const [search, setSearch] = useState('');
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<EmbargadoStage | null>(null);
  const [selected, setSelected] = useState<EmbargadoLead | null>(null);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.nombre_completo, l.telefono, l.email, l.ciudad].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [leads, search]);

  const byStage = useMemo(() => {
    const g = Object.fromEntries(EMBARGADOS_STAGE_ORDER.map((s) => [s, [] as EmbargadoLead[]])) as Record<EmbargadoStage, EmbargadoLead[]>;
    filtered.forEach((l) => g[l.stage]?.push(l));
    return g;
  }, [filtered]);

  if (access.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!access.allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground mb-6">No tienes permisos para acceder al CRM Embargados.</p>
            <Button variant="outline" onClick={() => navigate('/')}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openLead = (l: EmbargadoLead) => {
    setSelected(l);
    setNotas(l.notas || '');
  };

  const saveNotas = async () => {
    if (!selected) return;
    setSaving(true);
    const ok = await updateLead(selected.id, { notas });
    setSaving(false);
    if (ok) setSelected(null);
  };

  const onDrop = async (e: React.DragEvent, stage: EmbargadoStage) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === dragged);
    setDragged(null);
    setDragOver(null);
    if (lead && lead.stage !== stage) await changeStage(lead.id, stage);
  };

  const respuestas = selected
    ? Object.entries(selected.respuestas || {}).filter(([k, v]) => !k.startsWith('_') && v !== '' && v != null)
    : [];
  const activos = leads.filter((l) => l.stage !== 'descualificados').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Logo size="sm" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">CRM Embargados</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.nombre}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="text-lg font-semibold">{activos} Leads</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {EMBARGADOS_STAGE_ORDER.map((stage) => {
                const st = STAGE_STYLE[stage];
                const items = byStage[stage];
                const over = dragOver === stage;
                return (
                  <div
                    key={stage}
                    className={cn('w-72 flex-shrink-0 rounded-lg border transition-colors', over ? 'border-primary bg-primary/10' : st.col)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => onDrop(e, stage)}
                  >
                    <div className={cn('sticky top-0 z-10 flex items-center justify-between p-3 rounded-t-lg border-b bg-inherit', st.head)}>
                      <div className="flex items-center gap-2">
                        {st.icon}
                        <h3 className="font-semibold text-xs">{EMBARGADOS_STAGE_LABELS[stage]}</h3>
                      </div>
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', st.badge)}>{items.length}</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {items.map((l) => (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={(e) => { setDragged(l.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onClick={() => openLead(l)}
                          className="cursor-move rounded-lg border bg-card p-3 shadow-sm hover:border-primary transition-colors"
                        >
                          <p className="font-semibold text-sm truncate">{l.nombre_completo}</p>
                          {l.telefono && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {l.telefono}
                            </p>
                          )}
                          {l.ciudad && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                              <MapPin className="h-3 w-3" /> {l.ciudad}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-muted-foreground">{fecha(l.created_at)}</p>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div className={cn(
                          'h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground',
                          over ? 'border-primary/50 bg-primary/5' : 'border-muted',
                        )}>
                          {over ? 'Soltar aquí' : 'Sin leads'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.nombre_completo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  {selected.telefono && (
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />
                      <a className="text-primary hover:underline" href={`tel:${selected.telefono}`}>{selected.telefono}</a></p>
                  )}
                  {selected.email && (
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />
                      <a className="text-primary hover:underline" href={`mailto:${selected.email}`}>{selected.email}</a></p>
                  )}
                  {selected.ciudad && (
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{selected.ciudad}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Etapa</p>
                  <Select
                    value={selected.stage}
                    onValueChange={async (v) => {
                      const ok = await changeStage(selected.id, v as EmbargadoStage);
                      if (ok) setSelected({ ...selected, stage: v as EmbargadoStage });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMBARGADOS_STAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{EMBARGADOS_STAGE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selected.motivo_descualificacion && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Motivo de descualificación</p>
                    <p>{selected.motivo_descualificacion}</p>
                  </div>
                )}

                {respuestas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Respuestas del formulario</p>
                    <div className="rounded-lg border divide-y">
                      {respuestas.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 px-3 py-2">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="text-right font-medium">{String(v ?? '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Notas</p>
                  <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={4} />
                </div>
                <p className="text-xs text-muted-foreground">Entró el {fecha(selected.created_at)}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
                  <Button onClick={saveNotas} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmbargadosCRM;
