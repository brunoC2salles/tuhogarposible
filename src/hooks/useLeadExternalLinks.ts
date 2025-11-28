import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadExternalLink {
  id: string;
  lead_id: string;
  url: string;
  titulo?: string;
  created_at: string;
  created_by?: string;
}

export const useLeadExternalLinks = (leadId?: string) => {
  const [links, setLinks] = useState<LeadExternalLink[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLinks = async () => {
    if (!leadId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_external_links')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (err) {
      console.error('[useLeadExternalLinks] Error fetching links:', err);
      toast.error('Error al cargar enlaces externos');
    } finally {
      setLoading(false);
    }
  };

  const addLink = async (url: string, titulo?: string): Promise<boolean> => {
    if (!leadId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debe estar autenticado');
        return false;
      }

      const { error } = await supabase
        .from('lead_external_links')
        .insert({
          lead_id: leadId,
          url,
          titulo,
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Enlace añadido exitosamente');
      await fetchLinks();
      return true;
    } catch (err) {
      console.error('[useLeadExternalLinks] Error adding link:', err);
      toast.error('Error al añadir enlace');
      return false;
    }
  };

  const deleteLink = async (linkId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lead_external_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Enlace eliminado');
      await fetchLinks();
      return true;
    } catch (err) {
      console.error('[useLeadExternalLinks] Error deleting link:', err);
      toast.error('Error al eliminar enlace');
      return false;
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLinks();
    }
  }, [leadId]);

  return {
    links,
    loading,
    addLink,
    deleteLink,
    refetch: fetchLinks
  };
};
