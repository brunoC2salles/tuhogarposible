import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Inmueble } from '@/types/inventario';

export const useLeadInmuebles = (leadId?: string) => {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeadInmuebles = async () => {
    if (!leadId) return;

    try {
      setLoading(true);

      // Buscar IDs dos imóveis vinculados ao lead
      const { data: linkedData, error: linkedError } = await supabase
        .from('lead_inmuebles')
        .select('inmueble_id')
        .eq('lead_id', leadId);

      if (linkedError) throw linkedError;

      if (!linkedData || linkedData.length === 0) {
        setInmuebles([]);
        return;
      }

      const inmuebleIds = linkedData.map(item => item.inmueble_id);

      // Buscar dados completos dos imóveis
      const { data: inmueblesData, error: inmueblesError } = await supabase
        .from('inmuebles')
        .select('*')
        .in('id', inmuebleIds);

      if (inmueblesError) throw inmueblesError;

      // Converter dados do banco para o tipo Inmueble
      const converted = (inmueblesData || []).map(item => ({
        ...item,
        agenteAsignado: item.agente_asignado,
        codigoInventario: item.codigo_inventario,
        imageUrl: item.image_url,
        urlExterna: item.url_externa,
        areaM2: item.area_m2,
        fechaCreacion: new Date(item.created_at),
      })) as Inmueble[];

      setInmuebles(converted);
    } catch (err: any) {
      console.error('[LeadInmuebles] Fetch error:', err);
      toast.error('Error al cargar inmuebles vinculados');
    } finally {
      setLoading(false);
    }
  };

  const linkInmueble = async (leadId: string, inmuebleId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('lead_inmuebles')
        .insert({
          lead_id: leadId,
          inmueble_id: inmuebleId,
          vinculado_por: userId
        });

      if (error) {
        // Se já existe, ignora erro silenciosamente
        if (error.code === '23505') {
          toast.info('Este inmueble ya está vinculado al lead');
          return false;
        }
        throw error;
      }

      toast.success('Inmueble vinculado al lead');
      await fetchLeadInmuebles();
      return true;
    } catch (err: any) {
      console.error('[LeadInmuebles] Link error:', err);
      toast.error('Error al vincular inmueble');
      return false;
    }
  };

  const unlinkInmueble = async (leadId: string, inmuebleId: string) => {
    try {
      const { error } = await supabase
        .from('lead_inmuebles')
        .delete()
        .eq('lead_id', leadId)
        .eq('inmueble_id', inmuebleId);

      if (error) throw error;

      toast.success('Inmueble desvinculado');
      await fetchLeadInmuebles();
      return true;
    } catch (err: any) {
      console.error('[LeadInmuebles] Unlink error:', err);
      toast.error('Error al desvincular inmueble');
      return false;
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLeadInmuebles();
    }
  }, [leadId]);

  return {
    inmuebles,
    loading,
    fetchLeadInmuebles,
    linkInmueble,
    unlinkInmueble,
  };
};
