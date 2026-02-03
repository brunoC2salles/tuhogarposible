import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, RefreshCw, Clock, Package, AlertCircle } from 'lucide-react';
import { useInmovillaSync } from '@/hooks/useInmovillaSync';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface InmovillaSyncSectionProps {
  onSyncComplete?: () => void;
}

export const InmovillaSyncSection = ({ onSyncComplete }: InmovillaSyncSectionProps) => {
  const { isSyncing, syncProducts, stats, loading } = useInmovillaSync();
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    errors: number;
  } | null>(null);

  const handleSync = async () => {
    const result = await syncProducts();
    if (result.success && result.synced !== undefined) {
      setLastSyncResult({
        synced: result.synced,
        errors: result.errors || 0,
      });
      onSyncComplete?.();
    }
  };

  const formatLastSync = () => {
    if (!stats.lastSyncAt) return 'Nunca sincronizado';
    
    try {
      const date = new Date(stats.lastSyncAt);
      const distance = formatDistanceToNow(date, { addSuffix: true, locale: es });
      return distance;
    } catch {
      return 'Fecha desconocida';
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Productos Inmovilla
                <Badge variant="outline" className="text-xs">
                  Colaboración
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm">
                Sincroniza productos del catálogo de Inmovilla
              </CardDescription>
            </div>
          </div>
          
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>
              {loading ? '...' : (
                <>
                  <strong className="text-foreground">{stats.totalProducts}</strong> productos sincronizados
                </>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Última sync: {loading ? '...' : formatLastSync()}</span>
          </div>
        </div>
        
        {lastSyncResult && (
          <Alert className="mt-4" variant={lastSyncResult.errors > 0 ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Resultado de la sincronización</AlertTitle>
            <AlertDescription>
              {lastSyncResult.synced} productos sincronizados correctamente.
              {lastSyncResult.errors > 0 && ` ${lastSyncResult.errors} errores.`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
