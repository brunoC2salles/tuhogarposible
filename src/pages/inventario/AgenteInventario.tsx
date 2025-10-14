import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { FiltrosInmuebles } from "@/components/inventario/FiltrosInmuebles";
import { SearchBarAutocomplete } from "@/components/inventario/SearchBarAutocomplete";
import { FiltrosBusqueda } from "@/types/inventario";
import { useInmuebles, DatabaseInmueble } from "@/hooks/useInmuebles";
import { useReservas, DatabaseReserva } from "@/hooks/useReservas";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Home, CheckCircle, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

const contarMaxVisitasPorSemana = (visitas: DatabaseReserva[]): number => {
  // Agrupar visitas por semana
  const visitasPorSemana: Record<string, number> = {};
  
  visitas.forEach(v => {
    if (!v.fecha_visita || v.estado === 'cancelada') return;
    
    const visitaDate = new Date(v.fecha_visita);
    const semana = getWeekNumber(visitaDate);
    const ano = visitaDate.getFullYear();
    const chave = `${ano}-W${semana}`; // Ex: "2025-W42"
    
    visitasPorSemana[chave] = (visitasPorSemana[chave] || 0) + 1;
  });
  
  // Retornar o máximo de visitas em qualquer semana
  const maxVisitas = Math.max(0, ...Object.values(visitasPorSemana));
  return maxVisitas;
};

const AgenteInventario = () => {
  const { profile, signOut } = useAuth();
  const { inmuebles, loading } = useInmuebles();
  const { reservas, createReserva, fetchReservasByInmueble } = useReservas();
  const [inmueblesFiltrados, setInmueblesFiltrados] = useState<DatabaseInmueble[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(48);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [visitasPorInmueble, setVisitasPorInmueble] = useState<Record<string, DatabaseReserva[]>>({});

  const ciudadesDisponibles = [...new Set(inmuebles.filter(i => i.disponible).map(i => i.ciudad))].sort();
  const tiposDisponibles = [...new Set(inmuebles.filter(i => i.disponible).map(i => i.tipo))].sort();

  useEffect(() => {
    console.log("[Inventario] Cargando inmuebles para agente");
    // Filtrar solo inmuebles disponibles
    const disponibles = inmuebles.filter(inmueble => inmueble.disponible);
    setInmueblesFiltrados(disponibles);
  }, [inmuebles]);

  // Debounce para search term (evita filtrar a cada tecla)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFiltrosChange = (filtros: FiltrosBusqueda) => {
    let filtrados = inmuebles.filter(inmueble => inmueble.disponible);

    // Busca global
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtrados = filtrados.filter(inmueble => 
        inmueble.ciudad.toLowerCase().includes(searchLower) ||
        inmueble.direccion.toLowerCase().includes(searchLower) ||
        inmueble.region.toLowerCase().includes(searchLower) ||
        (inmueble.titulo && inmueble.titulo.toLowerCase().includes(searchLower)) ||
        (inmueble.codigo_inventario && inmueble.codigo_inventario.toLowerCase().includes(searchLower))
      );
    }

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

    if (filtros.quartos) {
      filtrados = filtrados.filter(inmueble => 
        inmueble.quartos && inmueble.quartos >= filtros.quartos!
      );
    }

    setInmueblesFiltrados(filtrados);
    setCurrentPage(1);
    console.log("[Inventario] Filtrados:", filtrados.length, "inmuebles");
  };

  useEffect(() => {
    handleFiltrosChange({});
  }, [debouncedSearchTerm, inmuebles]);

  const handleSolicitarVisita = async (inmuebleId: string, fecha: string, hora: string) => {
    console.log("[Inventario] Solicitando visita", { inmuebleId, fecha, hora });
    
    await createReserva({
      inmueble_id: inmuebleId,
      fecha_visita: fecha,
      hora_visita: hora,
    });
  };

  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente').length;

  // Cálculos de paginação
  const totalPages = Math.ceil(inmueblesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const inmueblesExibidos = inmueblesFiltrados.slice(startIndex, endIndex);

  useEffect(() => {
    const cargarVisitas = async () => {
      if (inmueblesExibidos.length === 0) {
        setVisitasPorInmueble({});
        return;
      }

      try {
        const inmuebleIds = inmueblesExibidos.map(i => i.id);
        
        // Single query for all properties - huge performance boost
        const { data, error } = await supabase
          .from('reservas')
          .select('*')
          .in('inmueble_id', inmuebleIds)
          .in('estado', ['pendiente', 'confirmada']);
        
        if (error) {
          console.error('[Inventario] Error loading visits:', error);
          return;
        }
        
        // Map visits by property ID
        const visitasMap: Record<string, DatabaseReserva[]> = {};
        inmuebleIds.forEach(id => visitasMap[id] = []);
        
        (data || []).forEach(visita => {
          if (visitasMap[visita.inmueble_id]) {
            visitasMap[visita.inmueble_id].push(visita as DatabaseReserva);
          }
        });
        
        setVisitasPorInmueble(visitasMap);
        console.log('[Inventario] Loaded visits for', inmuebleIds.length, 'properties in 1 query');
      } catch (error) {
        console.error('[Inventario] Error:', error);
      }
    };
    
    cargarVisitas();
  }, [inmueblesExibidos.map(i => i.id).join(',')]);

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
                <Logo size="sm" />
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
        <div className="mb-6">
          <SearchBarAutocomplete
            inmuebles={inmuebles}
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        <FiltrosInmuebles
          onFiltrosChange={handleFiltrosChange}
          ciudadesDisponibles={ciudadesDisponibles}
          tiposDisponibles={tiposDisponibles}
        />

        {/* Indicador de resultados e seletor de itens por página */}
        {inmueblesFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(endIndex, inmueblesFiltrados.length)} de {inmueblesFiltrados.length} inmuebles
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                setItemsPerPage(Number(val));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inmueblesExibidos.map((inmueble) => {
                const visitasInmueble = visitasPorInmueble[inmueble.id] || [];
                const visitasSemana = contarMaxVisitasPorSemana(visitasInmueble);
                
                return (
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
                      titulo: inmueble.titulo || undefined,
                      quartos: inmueble.quartos || undefined,
                      banheiros: inmueble.banheiros || undefined,
                      areaM2: inmueble.area_m2 || undefined,
                      urlExterna: inmueble.url_externa || undefined,
                      imageUrl: inmueble.image_url || undefined,
                      codigoInventario: inmueble.codigo_inventario || undefined,
                    }}
                    onSolicitarVisita={handleSolicitarVisita}
                    visitasAgendadas={visitasSemana}
                    visitasExistentes={visitasInmueble}
                  />
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostrar primeira, última e páginas próximas à atual
                      return page === 1 || 
                             page === totalPages || 
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span key={`ellipsis-${page}`} className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-9"
                        >
                          {page}
                        </Button>
                      </>
                    ))
                  }
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AgenteInventario;