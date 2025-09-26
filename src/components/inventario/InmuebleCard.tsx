import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Euro, Building2, Eye, Calendar, Edit } from "lucide-react";
import { Inmueble } from "@/types/inventario";
import { SolicitarVisitaModal } from "./SolicitarVisitaModal";

interface InmuebleCardProps {
  inmueble: Inmueble;
  showSolicitarVisita?: boolean;
  showEditButton?: boolean;
  onSolicitarVisita?: (inmuebleId: string, fecha: string, hora: string) => void;
  onEdit?: (inmueble: Inmueble) => void;
}

export function InmuebleCard({ 
  inmueble, 
  showSolicitarVisita = true,
  showEditButton = false,
  onSolicitarVisita,
  onEdit
}: InmuebleCardProps) {
  const [showDetails, setShowDetails] = useState(false);
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

  return (
    <>
      <Card className="hover-lift rounded-2xl shadow-md border-0 bg-card animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="secondary" className="text-xs">
              {inmueble.tipo}
            </Badge>
            <Badge 
              variant={inmueble.disponible ? "default" : "destructive"}
              className="text-xs"
            >
              {inmueble.disponible ? "Disponible" : "Reservado"}
            </Badge>
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {inmueble.ciudad} ({inmueble.region})
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="text-sm">{inmueble.direccion}</span>
            </div>
            
            <div className="flex items-center text-primary font-semibold text-lg">
              <Euro className="w-5 h-5 mr-1" />
              <span>{formatPrice(inmueble.precio)}</span>
            </div>

            {showDetails && (
              <div className="mt-4 pt-3 border-t animate-fade-in">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proveedor:</span>
                    <span>{inmueble.proveedor}</span>
                  </div>
                  {inmueble.codigoInventario && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Código de Inventario:</span>
                      <span className="font-mono">{inmueble.codigoInventario}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID del inmueble:</span>
                    <span className="font-mono text-xs">{inmueble.id.slice(-8)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showDetails ? "Ocultar" : "Ver más"}
          </Button>
          
          {showEditButton && onEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(inmueble)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
          )}
          
          {showSolicitarVisita && inmueble.disponible && (
            <Button 
              size="sm" 
              onClick={() => setShowVisitaModal(true)}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Solicitar visita
            </Button>
          )}
        </CardFooter>
      </Card>

      {showVisitaModal && (
        <SolicitarVisitaModal
          inmueble={inmueble}
          isOpen={showVisitaModal}
          onClose={() => setShowVisitaModal(false)}
          onSubmit={handleSolicitarVisita}
        />
      )}
    </>
  );
}