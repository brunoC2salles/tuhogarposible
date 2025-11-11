import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Video, FileText, FileSignature } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainingVideos } from "@/hooks/useTrainingVideos";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import VideoCard from "@/components/academia/VideoCard";
import VideoModal from "@/components/academia/VideoModal";
import CreateEditVideoModal from "@/components/academia/CreateEditVideoModal";
import DocumentCard from "@/components/academia/DocumentCard";
import UploadDocumentModal from "@/components/academia/UploadDocumentModal";
import { TrainingVideo } from "@/types/academia";

const AcademiaAgentes = () => {
  const { isAdmin } = useAuth();
  const { videos, isLoading: loadingVideos, createVideo, updateVideo, deleteVideo } = useTrainingVideos();
  const { documents, isLoading: loadingDocs, uploadDocument, deleteDocument, getDownloadUrl } = useDocumentTemplates();

  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [createVideoModalOpen, setCreateVideoModalOpen] = useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);

  const handleVideoClick = (video: TrainingVideo) => {
    setSelectedVideo(video);
    setVideoModalOpen(true);
  };

  const handleDownloadDocument = async (filePath: string) => {
    try {
      const url = await getDownloadUrl(filePath);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Academia de Agentes</h1>
            <p className="text-muted-foreground">
              Recursos de capacitación y documentación para el equipo
            </p>
          </div>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Tutoriales en Video
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos y Plantillas
            </TabsTrigger>
            <TabsTrigger value="contratos" className="flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              Generar Contratos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Videos de Capacitación</h2>
              {isAdmin && (
                <Button onClick={() => setCreateVideoModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Video
                </Button>
              )}
            </div>

            {loadingVideos ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay videos disponibles aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    onClick={() => handleVideoClick(video)} 
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documentos" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Biblioteca de Documentos</h2>
              {isAdmin && (
                <Button onClick={() => setUploadDocModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Subir Documento
                </Button>
              )}
            </div>

            {loadingDocs ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay documentos disponibles aún</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <DocumentCard 
                    key={doc.id}
                    document={doc}
                    onDownload={() => handleDownloadDocument(doc.file_path)}
                    onDelete={isAdmin ? () => deleteDocument.mutate(doc) : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contratos" className="mt-6">
            <div className="text-center py-12">
              <FileSignature className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2 text-foreground">Generador de Contratos</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Esta funcionalidad estará disponible próximamente. Podrás generar contratos 
                personalizados con datos de leads e inmuebles.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <VideoModal 
        video={selectedVideo}
        open={videoModalOpen}
        onClose={() => {
          setVideoModalOpen(false);
          setSelectedVideo(null);
        }}
      />

      <CreateEditVideoModal
        open={createVideoModalOpen}
        onClose={() => setCreateVideoModalOpen(false)}
        onSave={(video) => createVideo.mutate(video as any)}
      />

      <UploadDocumentModal
        open={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        onUpload={(data) => uploadDocument.mutate(data)}
      />
    </div>
  );
};

export default AcademiaAgentes;
