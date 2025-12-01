import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChannels } from '@/hooks/useChannels';
import { useAgentes } from '@/hooks/useAgentes';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';

interface StartDirectChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StartDirectChatModal = ({ open, onOpenChange }: StartDirectChatModalProps) => {
  const { user } = useAuth();
  const { createDirectChannel } = useChannels();
  const { agentes } = useAgentes();
  const [starting, setStarting] = useState(false);

  const handleStartChat = async (agente: typeof agentes[0]) => {
    setStarting(true);
    try {
      const { error } = await createDirectChannel(agente.id, agente.nombre);
      if (!error) {
        onOpenChange(false);
      }
    } finally {
      setStarting(false);
    }
  };

  // Filtrar usuário atual e supervisores
  const availableUsers = agentes.filter(a => a.id !== user?.id && a.role !== 'supervisor');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Conversación Privada</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableUsers.map(agente => (
            <button
              key={agente.id}
              onClick={() => handleStartChat(agente)}
              disabled={starting}
              className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors flex items-center gap-3 border"
            >
              <User className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{agente.nombre}</p>
                <p className="text-xs text-muted-foreground">{agente.email}</p>
              </div>
            </button>
          ))}

          {availableUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No hay usuarios disponibles
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};