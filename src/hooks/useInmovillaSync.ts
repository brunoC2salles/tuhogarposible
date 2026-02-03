import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  synced?: number;
  errors?: number;
  markedUnavailable?: number;
  total?: number;
  error?: string;
}

interface SyncStats {
  totalProducts: number;
  lastSyncAt: string | null;
}

export const useInmovillaSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats>({
    totalProducts: 0,
    lastSyncAt: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetch current stats
  const fetchStats = useCallback(async () => {
    try {
      // Get count of Inmovilla products
      const { count, error } = await supabase
        .from('inmuebles')
        .select('*', { count: 'exact', head: true })
        .eq('proveedor', 'Inmovilla')
        .eq('disponible', true);

      if (error) throw error;

      // Get last sync timestamp from admin_settings
      const { data: settingsData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'inmovilla_last_sync')
        .maybeSingle();

      setStats({
        totalProducts: count || 0,
        lastSyncAt: settingsData?.value || null,
      });
    } catch (err) {
      console.error('Error fetching Inmovilla stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Sync products from Inmovilla API
  const syncProducts = async (): Promise<SyncResult> => {
    setIsSyncing(true);
    
    try {
      toast.info('Sincronizando productos de Inmovilla...', {
        description: 'Este proceso puede tomar unos minutos.',
        duration: 5000,
      });

      const { data, error } = await supabase.functions.invoke('sync-inmovilla-products', {
        method: 'POST',
      });

      if (error) throw error;

      if (data?.success) {
        // Update last sync timestamp
        await supabase
          .from('admin_settings')
          .upsert({
            key: 'inmovilla_last_sync',
            value: new Date().toISOString(),
            description: 'Última sincronización de productos Inmovilla',
          }, { onConflict: 'key' });

        toast.success(`Sincronización completada`, {
          description: `${data.synced} productos sincronizados. ${data.errors || 0} errores.`,
        });

        // Refresh stats
        await fetchStats();

        return data;
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      toast.error('Error al sincronizar', {
        description: err.message || 'No se pudo conectar con Inmovilla',
      });
      return { success: false, error: String(err) };
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    syncProducts,
    stats,
    loading,
    refreshStats: fetchStats,
  };
};
