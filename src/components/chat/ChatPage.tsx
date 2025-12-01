import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { useChannels } from '@/hooks/useChannels';
import { useAuth } from '@/contexts/AuthContext';

const ChatPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { channels, loading } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  const handleGoBack = () => {
    if (profile?.role === 'admin') {
      navigate('/admin');
    } else if (profile?.role === 'supervisor') {
      navigate('/supervisor/crm');
    } else {
      navigate('/agente/crm');
    }
  };

  return (
    <div className="flex h-screen bg-background flex-col">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Chat Interno</h1>
            <p className="text-sm text-muted-foreground">Comunicación del equipo</p>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar 
          channels={channels}
          loading={loading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
        />
        
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <ChatMessages channel={selectedChannel} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Selecciona un canal o conversación
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;