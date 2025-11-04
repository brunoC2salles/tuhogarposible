import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Euro, Calendar, Edit, BedDouble, Bath, Maximize, Link } from "lucide-react";
import { Inmueble } from "@/types/inventario";
import { SolicitarVisitaModal } from "./SolicitarVisitaModal";
import { toast } from "sonner";

interface InmuebleCardProps {
  inmueble: Inmueble;
  showSolicitarVisita?: boolean;
  showEditButton?: boolean;
  onSolicitarVisita?: (inmuebleId: string, fecha: string, hora: string) => void;
  onEdit?: (inmueble: Inmueble) => void;
  visitasAgendadas?: number;
  visitasExistentes?: any[];
}

export function InmuebleCard({ 
  inmueble, 
  showSolicitarVisita = true,
  showEditButton = false,
  onSolicitarVisita,
  onEdit,
  visitasAgendadas = 0,
  visitasExistentes = []
}: InmuebleCardProps) {
  const [showVisitaModal, setShowVisitaModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const handleSolicitarVisita = (fecha: string, hora: string) => {
    if (onSolicitarVisita) {
      onSolicitarVisita(inmueble.id, fecha, hora);
    }
    setShowVisitaModal(false);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/produto/${inmueble.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

  return (
    <>
      <Card className="hover-lift rounded-2xl shadow-md border-0 bg-card animate-fade-in overflow-hidden">
        {inmueble.imageUrl && (
          <div className="w-full h-48 overflow-hidden relative">
            <img 
              src={inmueble.imageUrl} 
              alt={inmueble.titulo || `${inmueble.ciudad} (${inmueble.region})`}
              className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <Badge 
              variant={visitasAgendadas >= 2 ? "destructive" : (inmueble.disponible ? "default" : "destructive")}
              className="absolute top-3 right-3 shadow-md"
            >
              {visitasAgendadas >= 2 ? "En venta" : (inmueble.disponible ? "Disponible" : "Reservado")}
            </Badge>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="secondary" className="text-xs">
              {inmueble.tipo}
            </Badge>
            {!inmueble.imageUrl && (
              <Badge 
                variant={visitasAgendadas >= 2 ? "destructive" : (inmueble.disponible ? "default" : "destructive")}
                className="text-xs"
              >
                {visitasAgendadas >= 2 ? "En venta" : (inmueble.disponible ? "Disponible" : "Reservado")}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {inmueble.titulo || `${inmueble.ciudad} (${inmueble.region})`}
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{inmueble.direccion}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-primary font-semibold text-lg">
                <Euro className="w-5 h-5 mr-1" />
                <span>{formatPrice(inmueble.precio)}</span>
              </div>
              
              {(inmueble.quartos || inmueble.banheiros || inmueble.areaM2) && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {inmueble.quartos && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-4 w-4" />
                      {inmueble.quartos}
                    </span>
                  )}
                  {inmueble.banheiros && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {inmueble.banheiros}
                    </span>
                  )}
                  {inmueble.areaM2 && (
                    <span className="flex items-center gap-1">
                      <Maximize className="h-4 w-4" />
                      {inmueble.areaM2}m²
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0 flex gap-2">
          {showEditButton && onEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(inmueble);
              }}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
          )}
          
          {showSolicitarVisita && inmueble.disponible && (
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                setShowVisitaModal(true);
              }}
              className="flex-1"
              disabled={visitasAgendadas >= 2}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {visitasAgendadas >= 2 ? "No disponible" : "Solicitar visita"}
            </Button>
          )}
          
          <Button 
            variant="outline"
            size="sm" 
            onClick={handleCopyLink}
            className="flex-1"
          >
            <Link className="w-4 h-4 mr-1" />
            Copiar link
          </Button>
        </CardFooter>
      </Card>

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