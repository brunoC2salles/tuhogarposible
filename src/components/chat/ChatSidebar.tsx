import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Hash, User } from 'lucide-react';
import { Channel } from '@/hooks/useChannels';
import { CreateChannelModal } from './CreateChannelModal';
import { StartDirectChatModal } from './StartDirectChatModal';
import { useAuth } from '@/contexts/AuthContext';

interface ChatSidebarProps {
  channels: Channel[];
  loading: boolean;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

export const ChatSidebar = ({ channels, loading, selectedChannelId, onSelectChannel }: ChatSidebarProps) => {
  const { isAdmin } = useAuth();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showStartDirectChat, setShowStartDirectChat] = useState(false);

  const groupChannels = channels.filter(c => !c.is_direct);
  const directChats = channels.filter(c => c.is_direct);

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg mb-3">Chat Interno</h2>
        <div className="flex flex-col gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowCreateChannel(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Canal
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowStartDirectChat(true)} className="w-full">
            <User className="h-4 w-4 mr-2" />
            Chat Privado
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Canales */}
          {groupChannels.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">CANALES</p>
              {groupChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 ${
                    selectedChannelId === channel.id ? 'bg-accent' : ''
                  }`}
                >
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{channel.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mensagens Diretas */}
          {directChats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">MENSAJES DIRECTOS</p>
              {directChats.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 ${
                    selectedChannelId === channel.id ? 'bg-accent' : ''
                  }`}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{channel.name}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && channels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay canales disponibles
            </p>
          )}
        </div>
      </ScrollArea>

      <CreateChannelModal open={showCreateChannel} onOpenChange={setShowCreateChannel} />
      <StartDirectChatModal open={showStartDirectChat} onOpenChange={setShowStartDirectChat} />
    </div>
  );
};