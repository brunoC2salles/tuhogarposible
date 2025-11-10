import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Inmueble } from '@/types/inventario';
import { Lead } from '@/types/crm';

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

      let query = supabase
        .from('inmuebles')
        .select('*')
        .eq('disponible', true);

      // Construir filtro combinado para cidade e zona
      if (lead.ciudad_interes && lead.zona_interes) {
        // Se tem AMBOS: (ciudad = X) OR (region = Y OR direccion = Y)
        query = query.or(
          `ciudad.ilike.%${lead.ciudad_interes}%,` +
          `region.ilike.%${lead.zona_interes}%,` +
          `direccion.ilike.%${lead.zona_interes}%`
        );
      } else if (lead.ciudad_interes) {
        // Se tem só CIDADE
        query = query.ilike('ciudad', `%${lead.ciudad_interes}%`);
      } else if (lead.zona_interes) {
        // Se tem só ZONA
        query = query.or(
          `region.ilike.%${lead.zona_interes}%,` +
          `direccion.ilike.%${lead.zona_interes}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Filtrar por valor: sempre usar ±20% do valor desejado, respeitando limite de crédito
      if (lead.valor_inmueble_deseado) {
        const desiredValue = lead.valor_inmueble_deseado;
        const margin = 0.2;
        const minValue = desiredValue * (1 - margin);
        const maxValueWithMargin = desiredValue * (1 + margin);

        // Se tem simulador hipotecário, limitar ao máximo de crédito
        if (lead.simulador_hipotecario_data) {
          const maxCreditValue = lead.simulador_hipotecario_data.montoFinanciable * 1.1;
          const maxValueFinal = Math.min(maxValueWithMargin, maxCreditValue);

          filteredData = filteredData.filter(inmueble => {
            const price = Number(inmueble.precio);
            return price >= minValue && price <= maxValueFinal;
          });
        } else {
          // Sem simulador: apenas ±20%
          filteredData = filteredData.filter(inmueble => {
            const price = Number(inmueble.precio);
            return price >= minValue && price <= maxValueWithMargin;
          });
        }

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
