import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EmbargadoLead, EmbargadoStage } from '@/types/embargados';

// Tablas nuevas (19/10/2026) aún no incluidas en los tipos generados de Supabase
const db = supabase as any;

/** Acceso al CRM Embargados: admin o usuarios en embargados_acceso (Albert) */
export const useEmbargadosAccess = () => {
  const { user, isAdmin, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setAllowed(false); return; }
    if (isAdmin) { setAllowed(true); return; }
    let active = true;
    db.from('embargados_acceso').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }: { data: unknown }) => { if (active) setAllowed(!!data); });
    return () => { active = false; };
  }, [user, isAdmin, loading]);

  return { allowed, loading: loading || allowed === null };
};

export const useEmbargadosLeads = () => {
  const [leads, setLeads] = useState<EmbargadoLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from('embargados_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Embargados] Fetch error:', error);
      toast.error('Error al cargar leads');
    } else {
      setLeads((data || []) as EmbargadoLead[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: Partial<EmbargadoLead>) => {
    const { error } = await db.from('embargados_leads').update(updates).eq('id', id);
    if (error) {
      console.error('[Embargados] Update error:', error);
      toast.error('Error al actualizar el lead');
      return false;
    }
    await fetchLeads();
    return true;
  };

  const changeStage = (id: string, stage: EmbargadoStage) => updateLead(id, { stage });

  return { leads, loading, fetchLeads, updateLead, changeStage };
};
