import { Play, Clock, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { TrainingVideo } from "@/types/academia";
import { convertToEmbedUrl } from "@/lib/videoUtils";

interface VideoCardProps {
  video: TrainingVideo;
  onClick: () => void;
  isAdmin?: boolean;
  onEdit?: (video: TrainingVideo) => void;
  onDelete?: (video: TrainingVideo) => void;
}

const VideoCard = ({ video, onClick, isAdmin, onEdit, onDelete }: VideoCardProps) => {
  // Extrair thumbnail do YouTube e Vimeo
  const getThumbnail = (url: string) => {
    const embedUrl = convertToEmbedUrl(url) || url;
    
    // Detectar YouTube
    const youtubeMatch = embedUrl.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/);
    if (youtubeMatch?.[1]) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
    }
    
    // Detectar Vimeo (retornar null, não temos API key)
    const vimeoMatch = embedUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch?.[1]) {
      return null; // Vimeo requer API key para thumbnails
    }
    
    return null;
  };

  const thumbnail = getThumbnail(video.url_embed);

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={video.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Menu dropdown - apenas para admin */}
        {isAdmin && (
          <div 
            className="absolute top-2 right-2 z-10" 
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit?.(video)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Video
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete?.(video)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Video
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play className="w-16 h-16 text-white" />
        </div>
      </div>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2 line-clamp-2">{video.titulo}</CardTitle>
        {video.descripcion && (
          <CardDescription className="line-clamp-2 mb-2">
            {video.descripcion}
          </CardDescription>
        )}
        {video.duracion_minutos && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-1" />
            {video.duracion_minutos} min
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoCard;
