import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel } from '@/hooks/useChannels';
import { useMessages } from '@/hooks/useMessages';
import { ChatInput } from './ChatInput';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessagesProps {
  channel: Channel;
}

export const ChatMessages = ({ channel }: ChatMessagesProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, uploadFile } = useMessages(channel.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <h2 className="font-semibold text-lg">{channel.name}</h2>
        {channel.description && (
          <p className="text-sm text-muted-foreground">{channel.description}</p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(message.user?.nombre || 'U')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">{message.user?.nombre || 'Usuario'}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), 'HH:mm', { locale: es })}
                    </span>
                  </div>
                  {message.content && (
                    <p className="text-sm mt-1 whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open(message.file_url!, '_blank')}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      {message.file_name || 'Archivo adjunto'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput onSendMessage={sendMessage} onUploadFile={uploadFile} />
    </div>
  );
};