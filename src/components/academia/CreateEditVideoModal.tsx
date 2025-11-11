import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { VideoCategory, CATEGORIA_LABELS, TrainingVideo } from "@/types/academia";

interface CreateEditVideoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (video: Partial<TrainingVideo>) => void;
  video?: TrainingVideo;
}

const CreateEditVideoModal = ({ open, onClose, onSave, video }: CreateEditVideoModalProps) => {
  const [formData, setFormData] = useState({
    titulo: video?.titulo || '',
    descripcion: video?.descripcion || '',
    url_embed: video?.url_embed || '',
    categoria: video?.categoria || 'uso_plataforma' as VideoCategory,
    orden: video?.orden || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar URL embed
    const isYouTube = /youtube\.com\/embed\/|youtu\.be\//.test(formData.url_embed);
    const isVimeo = /player\.vimeo\.com\/video\//.test(formData.url_embed);
    
    if (!isYouTube && !isVimeo) {
      toast.error('La URL debe ser de YouTube o Vimeo en formato embed', {
        description: 'Ejemplo: https://www.youtube.com/embed/VIDEO_ID'
      });
      return;
    }
    
    onSave({
      ...formData,
      activo: true,
      ...(video && { id: video.id })
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{video ? 'Editar Video' : 'Agregar Video'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="url_embed">URL Embed (YouTube/Vimeo) *</Label>
            <Input
              id="url_embed"
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
              value={formData.url_embed}
              onChange={(e) => setFormData({ ...formData, url_embed: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              <span className="font-medium">YouTube:</span> youtube.com/embed/VIDEO_ID{" | "}
              <span className="font-medium">Vimeo:</span> player.vimeo.com/video/VIDEO_ID
            </p>
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoría *</Label>
              <Select 
                value={formData.categoria} 
                onValueChange={(value) => setFormData({ ...formData, categoria: value as VideoCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="orden">Orden de visualización</Label>
              <Input
                id="orden"
                type="number"
                min="0"
                placeholder="0"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Los videos se ordenan de menor a mayor
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {video ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEditVideoModal;
