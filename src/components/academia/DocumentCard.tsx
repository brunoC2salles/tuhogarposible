import { FileText, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentTemplate } from "@/types/academia";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentCardProps {
  document: DocumentTemplate;
  onDownload: () => void;
  onDelete?: () => void;
}

const DocumentCard = ({ document, onDownload, onDelete }: DocumentCardProps) => {
  const { isAdmin } = useAuth();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">{document.titulo}</CardTitle>
              {document.descripcion && (
                <CardDescription className="mb-2">{document.descripcion}</CardDescription>
              )}
              <p className="text-sm text-muted-foreground">
                Tamaño: {formatFileSize(document.file_size)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={onDownload}>
              <Download className="w-4 h-4" />
            </Button>
            {isAdmin && onDelete && (
              <Button size="icon" variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentCard;
