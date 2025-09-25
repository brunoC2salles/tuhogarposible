import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DatabaseInmueble {
  id: string;
  ciudad: string;
  region: string;
  tipo: 'apartamento' | 'casa' | 'local_comercial' | 'terreno' | 'oficina';
  precio: number;
  direccion: string;
  proveedor: string;
  disponible: boolean;
  agente_asignado?: string;
  created_at: string;
  updated_at: string;
  codigo_inventario?: string;
}

export interface CreateInmuebleData {
  ciudad: string;
  region: string;
  tipo: 'apartamento' | 'casa' | 'local_comercial' | 'terreno' | 'oficina';
  precio: number;
  direccion: string;
  proveedor: string;
  agente_asignado?: string;
  codigo_inventario?: string;
}

export const useInmuebles = () => {
  const [inmuebles, setInmuebles] = useState<DatabaseInmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInmuebles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInmuebles(data || []);
      console.log('[Inmuebles] Fetched:', data?.length || 0, 'inmuebles');
    } catch (err: any) {
      console.error('[Inmuebles] Fetch error:', err);
      setError(err.message);
      toast.error('Error al cargar inmuebles');
    } finally {
      setLoading(false);
    }
  };

  const createInmueble = async (data: CreateInmuebleData) => {
    try {
      const { data: newInmueble, error } = await supabase
        .from('inmuebles')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      setInmuebles(prev => [newInmueble, ...prev]);
      toast.success('Inmueble creado correctamente');
      console.log('[Inmuebles] Created:', newInmueble.id);
      return { data: newInmueble, error: null };
    } catch (err: any) {
      console.error('[Inmuebles] Create error:', err);
      toast.error('Error al crear inmueble');
      return { data: null, error: err.message };
    }
  };

  const updateInmueble = async (id: string, updates: Partial<CreateInmuebleData>) => {
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setInmuebles(prev => prev.map(inmueble => 
        inmueble.id === id ? data : inmueble
      ));
      toast.success('Inmueble actualizado correctamente');
      console.log('[Inmuebles] Updated:', id);
      return { data, error: null };
    } catch (err: any) {
      console.error('[Inmuebles] Update error:', err);
      toast.error('Error al actualizar inmueble');
      return { data: null, error: err.message };
    }
  };

  const deleteInmueble = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inmuebles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInmuebles(prev => prev.filter(inmueble => inmueble.id !== id));
      toast.success('Inmueble eliminado correctamente');
      console.log('[Inmuebles] Deleted:', id);
      return { error: null };
    } catch (err: any) {
      console.error('[Inmuebles] Delete error:', err);
      toast.error('Error al eliminar inmueble');
      return { error: err.message };
    }
  };

  const deleteMultipleInmuebles = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('inmuebles')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setInmuebles(prev => prev.filter(inmueble => !ids.includes(inmueble.id)));
      toast.success(`${ids.length} inmuebles eliminados correctamente`);
      console.log('[Inmuebles] Deleted multiple:', ids.length);
      return { error: null };
    } catch (err: any) {
      console.error('[Inmuebles] Delete multiple error:', err);
      toast.error('Error al eliminar inmuebles');
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchInmuebles();
  }, []);

  return {
    inmuebles,
    loading,
    error,
    fetchInmuebles,
    createInmueble,
    updateInmueble,
    deleteInmueble,
    deleteMultipleInmuebles,
  };
};