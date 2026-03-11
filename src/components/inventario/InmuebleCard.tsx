import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Euro, Calendar, Edit, BedDouble, Bath, Maximize, Link, ExternalLink, Hash, TrendingDown, TrendingUp } from "lucide-react";
import { Inmueble } from "@/types/inventario";
import { SolicitarVisitaModal } from "./SolicitarVisitaModal";
import { toast } from "sonner";
import type { MarketComparison } from "@/lib/marketPriceUtils";

interface InmuebleCardProps {
  inmueble: Inmueble;
  showSolicitarVisita?: boolean;
  showEditButton?: boolean;
  onSolicitarVisita?: (inmuebleId: string, fecha: string, hora: string) => void;
  onEdit?: (inmueble: Inmueble) => void;
  visitasAgendadas?: number;
  visitasExistentes?: any[];
  marketComparison?: MarketComparison | null;
}

export function InmuebleCard({ 
  inmueble, 
  showSolicitarVisita = true,
  showEditButton = false,
  onSolicitarVisita,
  onEdit,
  visitasAgendadas = 0,
  visitasExistentes = [],
  marketComparison
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
          <div className="w-full h-48 overflow-hidden relative bg-muted">
            <img 
              src={inmueble.imageUrl} 
              alt={inmueble.titulo || `${inmueble.ciudad} (${inmueble.region})`}
              className="w-full h-full object-cover transition-all duration-300 hover:scale-105 opacity-0"
              loading="lazy"
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                target.classList.remove('opacity-0');
                target.classList.add('opacity-100');
              }}
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
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-primary font-semibold text-lg">
                  <Euro className="w-5 h-5 mr-1" />
                  <span>{formatPrice(inmueble.precio)}</span>
                </div>
                {marketComparison && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      marketComparison.diferenciaPorcentaje <= -15 ? 'border-green-500 text-green-600' :
                      marketComparison.diferenciaPorcentaje <= -5 ? 'border-green-400 text-green-500' :
                      marketComparison.diferenciaPorcentaje <= 5 ? '' :
                      marketComparison.diferenciaPorcentaje <= 20 ? 'border-amber-500 text-amber-600' :
                      'border-destructive text-destructive'
                    }`}
                  >
                    {marketComparison.diferenciaPorcentaje < -5 && <TrendingDown className="h-3 w-3 mr-1" />}
                    {marketComparison.diferenciaPorcentaje > 5 && <TrendingUp className="h-3 w-3 mr-1" />}
                    {Math.abs(marketComparison.diferenciaPorcentaje) <= 5 
                      ? 'En media' 
                      : `${Math.abs(marketComparison.diferenciaPorcentaje)}% ${marketComparison.diferenciaPorcentaje > 0 ? 'sobre' : 'bajo'} media`}
                  </Badge>
                )}
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

        <CardFooter className="pt-0 px-4 pb-4 flex flex-col gap-2">
          {(inmueble.codigoInventario || inmueble.urlExterna) && (
            <div className="flex items-center gap-2 w-full pb-2 border-b">
              {inmueble.codigoInventario && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{inmueble.codigoInventario}</span>
                </div>
              )}
              
              {inmueble.urlExterna && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="ml-auto h-7 text-xs"
                >
                  <a 
                    href={inmueble.urlExterna} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver en {inmueble.proveedor}
                  </a>
                </Button>
              )}
            </div>
          )}
          
          <div className="flex gap-2 w-full">
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
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/produto/${inmueble.id}`, '_blank', 'noopener,noreferrer');
              }}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Abrir
            </Button>
          </div>
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