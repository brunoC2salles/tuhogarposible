import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DatabaseReserva {
  id: string;
  inmueble_id: string;
  agente_id: string;
  fecha_solicitud: string;
  fecha_visita?: string;
  hora_visita?: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  notas?: string;
  created_at: string;
  updated_at: string;
  // Relations
  inmuebles?: {
    ciudad: string;
    direccion: string;
    tipo: string;
    precio: number;
  };
  profiles?: {
    nombre: string;
    email: string;
  };
}

export interface CreateReservaData {
  inmueble_id: string;
  agente_id?: string; // Opcional para que admin pueda especificar el agente
  fecha_visita: string;
  hora_visita: string;
  notas?: string;
}

export const useReservas = () => {
  const { profile } = useAuth();
  const [reservas, setReservas] = useState<DatabaseReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservas = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('reservas')
        .select(`
          *,
          inmuebles (ciudad, direccion, tipo, precio),
          profiles (nombre, email)
        `)
        .order('created_at', { ascending: false });

      // Si es agente, solo ver sus propias reservas
      if (profile.role === 'agente') {
        query = query.eq('agente_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReservas(data || []);
      console.log('[Reservas] Fetched:', data?.length || 0, 'reservas');
    } catch (err: any) {
      console.error('[Reservas] Fetch error:', err);
      setError(err.message);
      toast.error('Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  };

  const createReserva = async (data: CreateReservaData) => {
    if (!profile) {
      toast.error('Debes estar autenticado para solicitar una visita');
      return { data: null, error: 'No authenticated' };
    }

    try {
      const reservaData = {
        ...data,
        agente_id: data.agente_id || profile.id, // Usar agente especificado o el usuario actual
      };

      const { data: newReserva, error } = await supabase
        .from('reservas')
        .insert([reservaData])
        .select(`
          *,
          inmuebles (ciudad, direccion, tipo, precio),
          profiles (nombre, email)
        `)
        .single();

      if (error) throw error;

      setReservas(prev => [newReserva, ...prev]);
      toast.success('Solicitud de visita enviada correctamente');
      console.log('[Reservas] Created:', newReserva.id);
      return { data: newReserva, error: null };
    } catch (err: any) {
      console.error('[Reservas] Create error:', err);
      toast.error('Error al solicitar la visita');
      return { data: null, error: err.message };
    }
  };

  const updateReservaEstado = async (id: string, estado: DatabaseReserva['estado']) => {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .update({ estado })
        .eq('id', id)
        .select(`
          *,
          inmuebles (ciudad, direccion, tipo, precio),
          profiles (nombre, email)
        `)
        .single();

      if (error) throw error;

      setReservas(prev => prev.map(reserva => 
        reserva.id === id ? data : reserva
      ));
      toast.success(`Reserva ${estado}`);
      console.log('[Reservas] Updated status:', id, estado);
      return { data, error: null };
    } catch (err: any) {
      console.error('[Reservas] Update error:', err);
      toast.error('Error al actualizar la reserva');
      return { data: null, error: err.message };
    }
  };

  const deleteReserva = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReservas(prev => prev.filter(reserva => reserva.id !== id));
      toast.success('Reserva eliminada correctamente');
      console.log('[Reservas] Deleted:', id);
      return { error: null };
    } catch (err: any) {
      console.error('[Reservas] Delete error:', err);
      toast.error('Error al eliminar la reserva');
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchReservas();
  }, [profile?.id]);

  const fetchReservasByInmueble = async (inmuebleId: string): Promise<DatabaseReserva[]> => {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('inmueble_id', inmuebleId)
        .in('estado', ['pendiente', 'confirmada']);
      
      if (error) {
        console.error('[Reservas] Error fetching by inmueble:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('[Reservas] Error:', err);
      return [];
    }
  };

  return {
    reservas,
    loading,
    error,
    fetchReservas,
    createReserva,
    updateReservaEstado,
    deleteReserva,
    fetchReservasByInmueble,
  };
};