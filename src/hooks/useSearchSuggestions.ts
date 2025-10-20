import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchSuggestions {
  ciudades: string[];
  regiones: string[];
  tipos: string[];
  direcciones: string[];
}

export const useSearchSuggestions = (searchTerm: string) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Não buscar se termo for muito curto
    if (!searchTerm || searchTerm.length < 1) {
      setSuggestions(null);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const searchLower = `%${searchTerm.toLowerCase()}%`;

        // Buscar sugestões em paralelo
        const [ciudadesRes, regionesRes, tiposRes, direccionesRes] = await Promise.all([
          supabase
            .from('inmuebles')
            .select('ciudad')
            .eq('disponible', true)
            .ilike('ciudad', searchLower)
            .limit(5),
          
          supabase
            .from('inmuebles')
            .select('region')
            .eq('disponible', true)
            .ilike('region', searchLower)
            .limit(5),
          
          supabase
            .from('inmuebles')
            .select('tipo')
            .eq('disponible', true)
            .limit(100), // Buscar todos os tipos para filtrar client-side
          
          supabase
            .from('inmuebles')
            .select('direccion')
            .eq('disponible', true)
            .ilike('direccion', searchLower)
            .limit(5)
        ]);

        // Tipos precisam filtrar client-side por causa do display name
        const tipoDisplayNames: Record<string, string> = {
          'apartamento': 'Piso',
          'casa': 'Casa',
          'local_comercial': 'Local comercial',
          'terreno': 'Terreno',
          'oficina': 'Oficina'
        };

        const tiposFiltrados = [...new Set(tiposRes.data?.map(i => i.tipo) || [])]
          .filter(t => {
            const displayName = tipoDisplayNames[t] || t;
            return t.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   displayName.toLowerCase().includes(searchTerm.toLowerCase());
          })
          .slice(0, 5);

        setSuggestions({
          ciudades: [...new Set(ciudadesRes.data?.map(i => i.ciudad) || [])],
          regiones: [...new Set(regionesRes.data?.map(i => i.region) || [])],
          tipos: tiposFiltrados,
          direcciones: [...new Set(direccionesRes.data?.map(i => i.direccion) || [])]
        });
      } catch (error) {
        console.error('[useSearchSuggestions] Error:', error);
        setSuggestions(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce de 500ms
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const totalSuggestions = suggestions 
    ? suggestions.ciudades.length + suggestions.regiones.length + 
      suggestions.tipos.length + suggestions.direcciones.length
    : 0;

  return {
    suggestions: totalSuggestions > 0 ? suggestions : null,
    loading
  };
};
