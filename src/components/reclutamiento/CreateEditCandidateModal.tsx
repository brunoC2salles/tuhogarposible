import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AgentCandidate, AgentCandidateFormData } from '@/types/reclutamiento';
import { useAgentCandidates } from '@/hooks/useAgentCandidates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface CreateEditCandidateModalProps {
  open: boolean;
  onClose: () => void;
  candidate?: AgentCandidate;
}

export const CreateEditCandidateModal = ({ 
  open, 
  onClose, 
  candidate 
}: CreateEditCandidateModalProps) => {
  const { createCandidate, updateCandidate, fetchCandidateDocuments, uploadDocument, deleteDocument } = useAgentCandidates();
  const [formData, setFormData] = useState<AgentCandidateFormData>({
    nombre_completo: '',
    telefono: '',
    email: '',
    ciudad: '',
    dni: '',
    notas: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFormData({
        nombre_completo: candidate.nombre_completo,
        telefono: candidate.telefono,
        email: candidate.email,
        ciudad: candidate.ciudad || '',
        dni: candidate.dni || '',
        notas: candidate.notas || ''
      });
      loadDocuments();
    } else {
      setFormData({
        nombre_completo: '',
        telefono: '',
        email: '',
        ciudad: '',
        dni: '',
        notas: ''
      });
      setDocuments([]);
    }
  }, [candidate, open]);

  const loadDocuments = async () => {
    if (candidate) {
      const docs = await fetchCandidateDocuments(candidate.id);
      setDocuments(docs);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nombre_completo || !formData.telefono || !formData.email) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }

    setSubmitting(true);
    
    let success = false;
    if (candidate) {
      success = await updateCandidate(candidate.id, formData);
    } else {
      success = await createCandidate(formData);
    }

    setSubmitting(false);
    if (success) {
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!candidate) {
      toast.error('Primero guarda el candidato para subir documentos');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10MB');
      return;
    }

    setUploading(true);
    const success = await uploadDocument(candidate.id, file);
    setUploading(false);

    if (success) {
      await loadDocuments();
    }
    e.target.value = '';
  };

  const handleDeleteDocument = async (docId: string) => {
    const success = await deleteDocument(docId);
    if (success) {
      await loadDocuments();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {candidate ? 'Editar Candidato' : 'Nuevo Candidato'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="docs" disabled={!candidate}>Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nombre_completo">
                  Nombre Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <Label htmlFor="telefono">
                  Teléfono <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+34 600 000 000"
                />
              </div>

              <div>
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  placeholder="Barcelona"
                />
              </div>

              <div>
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  placeholder="12345678A"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  candidate ? 'Actualizar' : 'Crear Candidato'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Documentos del candidato
              </p>
              <Button
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('doc-upload')?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Subir PDF
              </Button>
              <input
                id="doc-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay documentos
                </p>
              ) : (
                documents.map((doc) => (
                  <Card key={doc.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText className="h-4 w-4 text-primary" />
                        <a
                          href={doc.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline truncate"
                        >
                          {doc.file_name}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
