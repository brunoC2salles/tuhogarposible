import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Image } from "lucide-react";
import { toast } from "sonner";

interface ScrapingStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalImages: number;
  progressPercentage: number;
}

export const ScrapingModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<ScrapingStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalImages: 0,
    progressPercentage: 0
  });

  // Polling de status
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('scraping-status');
        
        if (error) {
          console.error('Erro ao buscar status:', error);
          return;
        }
        
        if (data?.stats) {
          setStats({
            total: data.stats.total || 0,
            pending: data.stats.pending || 0,
            processing: data.stats.processing || 0,
            completed: data.stats.completed || 0,
            failed: data.stats.failed || 0,
            totalImages: data.stats.totalImages || 0,
            progressPercentage: parseFloat(data.progress_percentage) || 0
          });
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchInitialStats = async () => {
    try {
      const { data } = await supabase.functions.invoke('scraping-status');
      
      if (data?.stats) {
        setStats({
          total: data.stats.total || 0,
          pending: data.stats.pending || 0,
          processing: data.stats.processing || 0,
          completed: data.stats.completed || 0,
          failed: data.stats.failed || 0,
          totalImages: data.stats.totalImages || 0,
          progressPercentage: parseFloat(data.progress_percentage) || 0
        });
        
        if (data.stats.pending === 0) {
          toast.info('Não há produtos pendentes para processar');
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Erro ao buscar stats iniciais:', error);
      toast.error('Erro ao verificar status do scraping');
      return false;
    }
  };

  const startScraping = async () => {
    const hasPending = await fetchInitialStats();
    if (!hasPending) return;
    
    setIsRunning(true);
    toast.info('Scraping iniciado...');
    
    // Loop de batches
    let allCompleted = false;
    
    while (!allCompleted) {
      try {
        const { data, error } = await supabase.functions.invoke('scrape-all-products');
        
        if (error) {
          console.error('Erro no batch:', error);
          toast.error('Erro ao processar batch');
          break;
        }
        
        if (data?.allCompleted) {
          allCompleted = true;
          break;
        }
        
        // Aguardar 3 segundos antes do próximo batch
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error('Erro no scraping:', error);
        toast.error('Erro ao processar produtos');
        break;
      }
    }
    
    setIsRunning(false);
    
    // Fetch final stats
    await fetchInitialStats();
    toast.success('Scraping concluído!');
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchInitialStats();
  };

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <Image className="w-4 h-4 mr-2" />
        Scraping de Imagens
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scraping de Imagens</DialogTitle>
            <DialogDescription>
              Processar todos os produtos pendentes do inventário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Barra de progresso */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold">
                  {stats.progressPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.progressPercentage} />
            </div>
            
            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pendentes:</span>
                <span className="font-semibold text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processando:</span>
                <span className="font-semibold text-blue-600">{stats.processing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concluídos:</span>
                <span className="font-semibold text-green-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Falhados:</span>
                <span className="font-semibold text-red-600">{stats.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Imagens:</span>
                <span className="font-semibold text-primary">{stats.totalImages}</span>
              </div>
            </div>
            
            {/* Botões */}
            <div className="flex gap-2">
              {!isRunning ? (
                <Button onClick={startScraping} className="flex-1">
                  Iniciar Scraping
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsRunning(false)} 
                  variant="outline"
                  className="flex-1"
                >
                  Parar Atualização
                </Button>
              )}
              <Button 
                onClick={() => setIsOpen(false)} 
                variant="outline"
                disabled={isRunning}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
