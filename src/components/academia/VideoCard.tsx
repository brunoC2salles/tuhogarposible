import { Play, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { TrainingVideo } from "@/types/academia";

interface VideoCardProps {
  video: TrainingVideo;
  onClick: () => void;
}

const VideoCard = ({ video, onClick }: VideoCardProps) => {
  // Extrair thumbnail do YouTube
  const getYoutubeThumbnail = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/)?.[1];
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  const thumbnail = getYoutubeThumbnail(video.url_embed);

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
