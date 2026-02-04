import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Inmueble } from '@/types/inventario';
import { Lead } from '@/types/crm';
import { matchesSearch } from '@/lib/textUtils';

interface UseRecomendacionesParams {
  lead?: Lead;
  enabled?: boolean;
}

export const useRecomendaciones = ({ lead, enabled = true }: UseRecomendacionesParams) => {
  const [recomendaciones, setRecomendaciones] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecomendaciones = async () => {
    if (!lead || !enabled) return;

    try {
      setLoading(true);

      // Buscar todos os imóveis disponíveis e filtrar client-side com normalização
      // Isso resolve o problema de acentos (Málaga vs Malaga)
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .eq('disponible', true)
        .limit(500); // Limite razoável para filtragem client-side

      if (error) throw error;

      let filteredData = data || [];

      // Filtrar por cidade com normalização de acentos
      if (lead.ciudad_interes) {
        filteredData = filteredData.filter(inmueble => 
          matchesSearch(inmueble.ciudad, lead.ciudad_interes!)
        );
      }

      // Filtrar por zona com normalização de acentos (region OU direccion)
      if (lead.zona_interes) {
        filteredData = filteredData.filter(inmueble => 
          matchesSearch(inmueble.region, lead.zona_interes!) ||
          matchesSearch(inmueble.direccion, lead.zona_interes!)
        );
      }

      // Se não encontrou com cidade E zona, tentar apenas cidade OU zona
      if (filteredData.length === 0 && (lead.ciudad_interes || lead.zona_interes)) {
        filteredData = data || [];
        
        filteredData = filteredData.filter(inmueble => {
          const matchesCiudad = lead.ciudad_interes 
            ? matchesSearch(inmueble.ciudad, lead.ciudad_interes)
            : false;
          const matchesZona = lead.zona_interes
            ? matchesSearch(inmueble.region, lead.zona_interes) ||
              matchesSearch(inmueble.direccion, lead.zona_interes)
            : false;
          
          return matchesCiudad || matchesZona;
        });
      }

      // Filtrar por valor: sem limite inferior, limite superior 135% do valor desejado
      if (lead.valor_inmueble_deseado) {
        const desiredValue = lead.valor_inmueble_deseado;
        const maxValue = desiredValue * 1.35; // 135% do valor desejado

        filteredData = filteredData.filter(inmueble => {
          const price = Number(inmueble.precio);
          return price <= maxValue;
        });

        // Ordenar por proximidade ao valor desejado
        filteredData.sort((a, b) => {
          const diffA = Math.abs(Number(a.precio) - desiredValue);
          const diffB = Math.abs(Number(b.precio) - desiredValue);
          return diffA - diffB;
        });
      }

      // Converter dados do banco para o tipo Inmueble
      const converted = filteredData.map(item => ({
        ...item,
        agenteAsignado: item.agente_asignado,
        codigoInventario: item.codigo_inventario,
        imageUrl: item.image_url,
        urlExterna: item.url_externa,
        areaM2: item.area_m2,
        fechaCreacion: new Date(item.created_at),
      })) as Inmueble[];

      // Limitar a 10 recomendações
      setRecomendaciones(converted.slice(0, 10));
      console.log('[Recomendaciones] Found', converted.length, 'matches for', lead.ciudad_interes, '/', lead.zona_interes);
    } catch (err: any) {
      console.error('[Recomendaciones] Fetch error:', err);
      setRecomendaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && lead) {
      fetchRecomendaciones();
    }
  }, [lead, enabled]);

  return {
    recomendaciones,
    loading,
    refetch: fetchRecomendaciones,
  };
};
