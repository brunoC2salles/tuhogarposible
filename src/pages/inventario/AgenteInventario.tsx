import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { FiltrosInmuebles } from "@/components/inventario/FiltrosInmuebles";
import { FiltrosBusqueda } from "@/types/inventario";
import { useInmuebles, DatabaseInmueble } from "@/hooks/useInmuebles";
import { useReservas } from "@/hooks/useReservas";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Home, CheckCircle, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AgenteInventario = () => {
  const { profile, signOut } = useAuth();
  const { inmuebles, loading } = useInmuebles();
  const { reservas, createReserva } = useReservas();
  const [inmueblesFiltrados, setInmueblesFiltrados] = useState<DatabaseInmueble[]>([]);

  const ciudadesDisponibles = [...new Set(inmuebles.filter(i => i.disponible).map(i => i.ciudad))].sort();
  const tiposDisponibles = [...new Set(inmuebles.filter(i => i.disponible).map(i => i.tipo))].sort();

  useEffect(() => {
    console.log("[Inventario] Cargando inmuebles para agente");
    // Filtrar solo inmuebles disponibles
    const disponibles = inmuebles.filter(inmueble => inmueble.disponible);
    setInmueblesFiltrados(disponibles);
  }, [inmuebles]);

  const handleFiltrosChange = (filtros: FiltrosBusqueda) => {
    let filtrados = inmuebles.filter(inmueble => inmueble.disponible);

    if (filtros.ciudad) {
      filtrados = filtrados.filter(inmueble => inmueble.ciudad === filtros.ciudad);
    }

    if (filtros.tipo) {
      filtrados = filtrados.filter(inmueble => inmueble.tipo === filtros.tipo);
    }

    if (filtros.precioMin !== undefined && filtros.precioMax !== undefined) {
      filtrados = filtrados.filter(inmueble => 
        inmueble.precio >= filtros.precioMin! && 
        inmueble.precio <= filtros.precioMax!
      );
    }

    setInmueblesFiltrados(filtrados);
    console.log("[Inventario] Filtrados:", filtrados.length, "inmuebles");
  };

  const handleSolicitarVisita = async (inmuebleId: string, fecha: string, hora: string) => {
    console.log("[Inventario] Solicitando visita", { inmuebleId, fecha, hora });
    
    await createReserva({
      inmueble_id: inmuebleId,
      fecha_visita: fecha,
      hora_visita: hora,
    });
  };

  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-blue-light rounded-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Portal del Agente</h1>
                  <p className="text-sm text-muted-foreground">
                    Bienvenido, {profile?.nombre} - {inmueblesFiltrados.length} inmuebles disponibles
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reservasPendientes > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {reservasPendientes} visitas pendientes
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <FiltrosInmuebles
          onFiltrosChange={handleFiltrosChange}
          ciudadesDisponibles={ciudadesDisponibles}
          tiposDisponibles={tiposDisponibles}
        />

        {inmueblesFiltrados.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No se encontraron inmuebles</h3>
              <p className="text-muted-foreground mb-4">
                Prueba ajustando los filtros de búsqueda
              </p>
              <Button 
                variant="outline" 
                onClick={() => handleFiltrosChange({})}
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {inmueblesFiltrados.map((inmueble) => (
              <InmuebleCard
                key={inmueble.id}
                inmueble={{
                  id: inmueble.id,
                  ciudad: inmueble.ciudad,
                  region: inmueble.region,
                  tipo: inmueble.tipo,
                  precio: inmueble.precio,
                  direccion: inmueble.direccion,
                  proveedor: inmueble.proveedor,
                  disponible: inmueble.disponible,
                  fechaCreacion: new Date(inmueble.created_at),
                  agenteAsignado: inmueble.agente_asignado,
                }}
                onSolicitarVisita={handleSolicitarVisita}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AgenteInventario;