import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { useChannels } from '@/hooks/useChannels';

const ChatPage = () => {
  const navigate = useNavigate();
  const { channels, loading } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Página Principal
        </Button>
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