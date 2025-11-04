import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MapPin, Euro, BedDouble, Bath, Maximize, ExternalLink, Calendar } from "lucide-react";
import { Inmueble } from "@/types/inventario";
import { SolicitarVisitaModal } from "./SolicitarVisitaModal";

interface InmuebleDetailsModalProps {
  inmueble: Inmueble;
  isOpen: boolean;
  onClose: () => void;
  onSolicitarVisita: (fecha: string, hora: string) => void;
  visitasAgendadas: number;
  visitasExistentes: any[];
}

export function InmuebleDetailsModal({
  inmueble,
  isOpen,
  onClose,
  onSolicitarVisita,
  visitasAgendadas,
  visitasExistentes,
}: InmuebleDetailsModalProps) {
  const [showVisitaModal, setShowVisitaModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const handleSolicitarVisita = (fecha: string, hora: string) => {
    onSolicitarVisita(fecha, hora);
    setShowVisitaModal(false);
  };

  // Determinar imagens para o carrossel
  const images = inmueble.images && inmueble.images.length > 0 
    ? inmueble.images 
    : inmueble.imageUrl 
      ? [inmueble.imageUrl] 
      : [];

  const hasMultipleImages = images.length > 1;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {inmueble.titulo || `${inmueble.ciudad} (${inmueble.region})`}
            </DialogTitle>
          </DialogHeader>

          {/* Carrossel de Imagens */}
          {images.length > 0 && (
            <div className="relative">
              {hasMultipleImages ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {images.map((imageUrl, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-video w-full overflow-hidden rounded-lg">
                          <img
                            src={imageUrl}
                            alt={`${inmueble.titulo || inmueble.ciudad} - Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              ) : (
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  <img
                    src={images[0]}
                    alt={inmueble.titulo || inmueble.ciudad}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* Badge de status */}
              <Badge 
                variant={visitasAgendadas >= 2 ? "destructive" : (inmueble.disponible ? "default" : "destructive")}
                className="absolute top-4 right-4 shadow-lg"
              >
                {visitasAgendadas >= 2 ? "En venta" : (inmueble.disponible ? "Disponible" : "Reservado")}
              </Badge>
            </div>
          )}

          {/* Informações principais */}
          <div className="space-y-6">
            {/* Preço e Tipo */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center text-primary font-bold text-3xl">
                <Euro className="w-7 h-7 mr-2" />
                <span>{formatPrice(inmueble.precio)}</span>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {inmueble.tipo}
              </Badge>
            </div>

            {/* Características */}
            {(inmueble.quartos || inmueble.banheiros || inmueble.areaM2) && (
              <div className="flex items-center gap-6 text-muted-foreground">
                {inmueble.quartos && (
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-5 w-5" />
                    <span className="font-medium">{inmueble.quartos} dormitorios</span>
                  </div>
                )}
                {inmueble.banheiros && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5" />
                    <span className="font-medium">{inmueble.banheiros} baños</span>
                  </div>
                )}
                {inmueble.areaM2 && (
                  <div className="flex items-center gap-2">
                    <Maximize className="h-5 w-5" />
                    <span className="font-medium">{inmueble.areaM2}m²</span>
                  </div>
                )}
              </div>
            )}

            {/* Localização */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{inmueble.direccion}</p>
                  <p className="text-sm">{inmueble.ciudad}, {inmueble.region}</p>
                </div>
              </div>
            </div>

            {/* Detalhes adicionais */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              {inmueble.codigoInventario && (
                <div>
                  <p className="text-xs text-muted-foreground">Código de Inventario</p>
                  <p className="font-mono font-medium">{inmueble.codigoInventario}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="font-medium">{inmueble.proveedor}</p>
              </div>
              {inmueble.urlExterna && (
                <div className="col-span-2">
                  <a 
                    href={inmueble.urlExterna} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2 font-medium"
                  >
                    Ver anuncio externo <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Botão de ação */}
            {inmueble.disponible && (
              <Button
                size="lg"
                onClick={() => setShowVisitaModal(true)}
                disabled={visitasAgendadas >= 2}
                className="w-full"
              >
                <Calendar className="w-5 h-5 mr-2" />
                {visitasAgendadas >= 2 ? "No disponible" : "Solicitar visita"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showVisitaModal && (
        <SolicitarVisitaModal
          inmueble={inmueble}
          isOpen={showVisitaModal}
          onClose={() => setShowVisitaModal(false)}
          onSubmit={handleSolicitarVisita}
          visitasExistentes={visitasExistentes}
        />
      )}
    </>
  );
}
