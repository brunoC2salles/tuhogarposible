import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Video, FileText, FileSignature, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainingVideos } from "@/hooks/useTrainingVideos";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import VideoCard from "@/components/academia/VideoCard";
import VideoModal from "@/components/academia/VideoModal";
import CreateEditVideoModal from "@/components/academia/CreateEditVideoModal";
import DocumentCard from "@/components/academia/DocumentCard";
import UploadDocumentModal from "@/components/academia/UploadDocumentModal";
import { TrainingVideo, VideoCategory, CATEGORIA_LABELS } from "@/types/academia";

const AcademiaAgentes = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { videos, isLoading: loadingVideos, createVideo, updateVideo, deleteVideo } = useTrainingVideos();
  const { documents, isLoading: loadingDocs, uploadDocument, deleteDocument, getDownloadUrl } = useDocumentTemplates();

  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [createVideoModalOpen, setCreateVideoModalOpen] = useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<TrainingVideo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | 'todas'>('todas');

  const handleVideoClick = (video: TrainingVideo) => {
    setSelectedVideo(video);
    setVideoModalOpen(true);
  };

  const handleEditVideo = (video: TrainingVideo) => {
    setEditingVideo(video);
    setCreateVideoModalOpen(true);
  };

  const handleDeleteVideo = (video: TrainingVideo) => {
    setDeletingVideo(video);
  };

  const confirmDelete = () => {
    if (deletingVideo) {
      deleteVideo.mutate(deletingVideo.id);
      setDeletingVideo(null);
    }
  };

  const handleCloseVideoModal = () => {
    setCreateVideoModalOpen(false);
    setEditingVideo(null);
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
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
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

            {/* Filtros por categoría */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'todas' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('todas')}
                >
                  Todas
                </Button>
                {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(key as VideoCategory)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {loadingVideos ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando videos...</p>
              </div>
            ) : (() => {
              const filteredVideos = selectedCategory === 'todas' 
                ? videos 
                : videos.filter(v => v.categoria === selectedCategory);
              
              return filteredVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {selectedCategory === 'todas' 
                      ? 'No hay videos disponibles aún' 
                      : `No hay videos en la categoría "${CATEGORIA_LABELS[selectedCategory as VideoCategory]}"`}
                  </p>
                  {isAdmin && (
                    <Button 
                      onClick={() => setCreateVideoModalOpen(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Primer Video
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVideos.map((video) => (
                    <VideoCard 
                      key={video.id} 
                      video={video} 
                      onClick={() => handleVideoClick(video)}
                      isAdmin={isAdmin}
                      onEdit={handleEditVideo}
                      onDelete={handleDeleteVideo}
                    />
                  ))}
                </div>
              );
            })()}
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
        onClose={handleCloseVideoModal}
        video={editingVideo || undefined}
        onSave={(video) => {
          if (editingVideo) {
            updateVideo.mutate({ ...video, id: editingVideo.id } as any);
          } else {
            createVideo.mutate(video as any);
          }
        }}
      />

      <AlertDialog open={!!deletingVideo} onOpenChange={() => setDeletingVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar video?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El video "{deletingVideo?.titulo}" 
              será eliminado permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UploadDocumentModal
        open={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        onUpload={(data) => uploadDocument.mutate(data)}
      />
    </div>
  );
};

export default AcademiaAgentes;
