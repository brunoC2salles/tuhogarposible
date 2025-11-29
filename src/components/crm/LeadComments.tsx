import { useState } from 'react';
import { useLeadComments } from '@/hooks/useLeadComments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Upload, Trash2, FileAudio, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeadCommentsProps {
  leadId: string;
}

export const LeadComments = ({ leadId }: LeadCommentsProps) => {
  const { comments, loading, uploading, addComment, uploadRecording, deleteComment } = useLeadComments(leadId);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }

    setSubmitting(true);
    await addComment(newComment);
    setNewComment('');
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('El archivo no puede superar los 50MB');
      return;
    }

    await uploadRecording(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lista de comentarios */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay comentarios aún
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.user_nome?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{comment.user_nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comentario}</p>
                  {comment.arquivo_url && (
                    <div className="flex items-center gap-2 mt-2">
                      <FileAudio className="h-4 w-4 text-primary" />
                      <a 
                        href={comment.arquivo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {comment.arquivo_nome || 'Ver grabación'}
                      </a>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteComment(comment.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Formulário para novo comentário */}
      <div className="space-y-3 pt-4 border-t">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario..."
          className="min-h-[80px]"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !newComment.trim()}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Añadir Comentario'
            )}
          </Button>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => document.getElementById('recording-upload')?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir Grabación
              </>
            )}
          </Button>
          <input
            id="recording-upload"
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
