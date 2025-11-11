import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrainingVideo } from "@/types/academia";

interface VideoModalProps {
  video: TrainingVideo | null;
  open: boolean;
  onClose: () => void;
}

const VideoModal = ({ video, open, onClose }: VideoModalProps) => {
  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{video.titulo}</DialogTitle>
          {video.descripcion && (
            <DialogDescription>{video.descripcion}</DialogDescription>
          )}
        </DialogHeader>
        <div className="aspect-video">
          <iframe
            src={video.url_embed}
            className="w-full h-full rounded-lg"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
