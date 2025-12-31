import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string | null;
  onDownload: () => void;
}

export const DocumentPreviewModal = ({
  open,
  onClose,
  fileName,
  fileUrl,
  onDownload,
}: DocumentPreviewModalProps) => {
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName.toLowerCase());

  if (!fileUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-3 border-b flex-shrink-0">
          <div className="flex items-center gap-4 pr-8">
            <DialogTitle className="text-lg truncate flex-1">{fileName}</DialogTitle>
            <Button variant="outline" size="sm" onClick={onDownload} className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden p-4 bg-muted/30">
          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-full rounded-lg border"
              title={fileName}
            />
          )}
          
          {isImage && (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}
          
          {!isPdf && !isImage && (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <p>Vista previa no disponible para este tipo de archivo</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
