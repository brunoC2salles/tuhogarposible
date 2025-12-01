import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { useChannels } from '@/hooks/useChannels';

const ChatPage = () => {
  const { channels, loading } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="flex h-screen bg-background">
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
  );
};

export default ChatPage;