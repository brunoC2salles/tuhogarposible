import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { FiltrosInmuebles } from "@/components/inventario/FiltrosInmuebles";
import { Inmueble, FiltrosBusqueda, Reserva } from "@/types/inventario";
import { ArrowLeft, Home, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Mock data - En producción esto vendría de una API
const INMUEBLES_MOCK: Inmueble[] = [
  {
    id: "INM001",
    ciudad: "Madrid",
    region: "Comunidad de Madrid",
    tipo: "Piso",
    precio: 350000,
    direccion: "Calle Gran Vía, 45",
    proveedor: "Inmobiliaria Central",
    disponible: true,
    fechaCreacion: new Date("2024-01-15"),
  },
  {
    id: "INM002",
    ciudad: "Barcelona",
    region: "Cataluña",
    tipo: "Apartamento",
    precio: 280000,
    direccion: "Paseo de Gracia, 123",
    proveedor: "Barcelona Properties",
    disponible: true,
    fechaCreacion: new Date("2024-01-20"),
  },
  {
    id: "INM003",
    ciudad: "Valencia",
    region: "Comunidad Valenciana",
    tipo: "Casa",
    precio: 450000,
    direccion: "Avenida del Puerto, 67",
    proveedor: "Valencia Homes",
    disponible: false,
    fechaCreacion: new Date("2024-01-10"),
  },
  {
    id: "INM004",
    ciudad: "Sevilla",
    region: "Andalucía",
    tipo: "Dúplex",
    precio: 320000,
    direccion: "Calle Sierpes, 89",
    proveedor: "Andaluza Real Estate",
    disponible: true,
    fechaCreacion: new Date("2024-01-25"),
  },
  {
    id: "INM005",
    ciudad: "Madrid",
    region: "Comunidad de Madrid",
    tipo: "Estudio",
    precio: 180000,
    direccion: "Calle Malasaña, 12",
    proveedor: "Inmobiliaria Central",
    disponible: true,
    fechaCreacion: new Date("2024-02-01"),
  },
];

const AgenteInventario = () => {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>(INMUEBLES_MOCK);
  const [inmueblesFiltrados, setInmueblesFiltrados] = useState<Inmueble[]>(INMUEBLES_MOCK);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  const ciudadesDisponibles = [...new Set(inmuebles.map(i => i.ciudad))].sort();
  const tiposDisponibles = [...new Set(inmuebles.map(i => i.tipo))].sort();

  useEffect(() => {
    console.log("[Inventario] Cargando inmuebles para agente");
    // Simulamos carga de datos
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const handleFiltrosChange = (filtros: FiltrosBusqueda) => {
    let filtrados = [...inmuebles];

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
    
    const nuevaReserva: Reserva = {
      id: `RES${Date.now()}`,
      inmuebleId,
      agenteId: "AGENTE001", // Mock agente ID
      fechaSolicitud: new Date(),
      fechaVisita: new Date(fecha),
      horaVisita: hora,
      estado: 'pendiente',
    };

    setReservas(prev => [...prev, nuevaReserva]);
    
    toast.success("Solicitud de visita enviada correctamente", {
      description: `Tu visita para el ${fecha} a las ${hora} está pendiente de confirmación.`
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
                    {inmueblesFiltrados.length} inmuebles disponibles
                  </p>
                </div>
              </div>
            </div>

            {reservasPendientes > 0 && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {reservasPendientes} visitas pendientes
              </Badge>
            )}
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
                inmueble={inmueble}
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