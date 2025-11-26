import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { ArrowLeft, Home, CheckCircle, LogOut, UserCircle, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
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
  const { inmuebles, loading, fetchInmuebles } = useInmuebles();
  const { reservas, createReserva, fetchReservasByInmueble } = useReservas();
  const [inmueblesFiltrados, setInmueblesFiltrados] = useState<DatabaseInmueble[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(48);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [visitasPorInmueble, setVisitasPorInmueble] = useState<Record<string, DatabaseReserva[]>>({});
  const [totalInmuebles, setTotalInmuebles] = useState(0);
  const [filtrosActivos, setFiltrosActivos] = useState<FiltrosBusqueda>({});
  const [allCiudades, setAllCiudades] = useState<string[]>([]);
  const [allTipos, setAllTipos] = useState<string[]>([]);
  
  // Memoizar cálculos pesados para evitar loops infinitos
  const ciudadesDisponibles = useMemo(() => {
    const allCities = allCiudades.length > 0 ? allCiudades : Array.from(new Set(inmuebles.map(i => i.ciudad)));
    return allCities.sort();
  }, [allCiudades, inmuebles.length]);

  const tiposDisponibles = useMemo(() => {
    const allTypes = allTipos.length > 0 ? allTipos : Array.from(new Set(inmuebles.map(i => i.tipo)));
    return allTypes.sort();
  }, [allTipos, inmuebles.length]);

  // ✅ FASE 2: Hash estável para IDs dos imóveis filtrados
  const inmuebleIdsHash = useMemo(
    () => inmueblesFiltrados.map(i => i.id).sort().join(','),
    [inmueblesFiltrados.length]
  );

  // ✅ FASE 2: Hash estável para filtros ativos
  const filtrosActivosHash = useMemo(
    () => JSON.stringify(filtrosActivos),
    [filtrosActivos.ciudad, filtrosActivos.tipo, filtrosActivos.precioMin, filtrosActivos.precioMax, filtrosActivos.quartos]
  );

  // Carregar cidades e tipos distintos do banco (apenas 1x)
  useEffect(() => {
    const fetchDistinctValues = async () => {
      try {
        const { data: ciudadesData } = await supabase
          .from('inmuebles')
          .select('ciudad')
          .eq('disponible', true);
        
        const { data: tiposData } = await supabase
          .from('inmuebles')
          .select('tipo')
          .eq('disponible', true);
        
        if (ciudadesData) {
          setAllCiudades([...new Set(ciudadesData.map(i => i.ciudad))].sort());
        }
        
        if (tiposData) {
          setAllTipos([...new Set(tiposData.map(i => i.tipo))].sort());
        }
      } catch (err) {
        console.error('[Inventario] Error loading distinct values:', err);
      }
    };
    
    fetchDistinctValues();
  }, []); // Apenas 1x ao montar

  // Debounce para search term (evita filtrar a cada tecla)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch inmuebles with filters (memoizado para estabilidade)
  const fetchInmueblesWithFilters = useCallback(async () => {
    try {
      let query = supabase
        .from('inmuebles')
        .select('*', { count: 'exact' })
        .eq('disponible', true)
        .order('created_at', { ascending: false });

      // Global search
      if (debouncedSearchTerm.trim()) {
        const searchLower = `%${debouncedSearchTerm.toLowerCase()}%`;
        query = query.or(`ciudad.ilike.${searchLower},direccion.ilike.${searchLower},region.ilike.${searchLower},titulo.ilike.${searchLower},codigo_inventario.ilike.${searchLower}`);
      }

      // City filter
      if (filtrosActivos.ciudad) {
        query = query.eq('ciudad', filtrosActivos.ciudad);
      }

      // Type filter
      if (filtrosActivos.tipo) {
        query = query.eq('tipo', filtrosActivos.tipo as any);
      }

      // Price filter - aplicar min y max de forma independiente
      if (filtrosActivos.precioMin !== undefined) {
        query = query.gte('precio', filtrosActivos.precioMin);
      }
      
      if (filtrosActivos.precioMax !== undefined) {
        query = query.lte('precio', filtrosActivos.precioMax);
      }

      // Rooms filter
      if (filtrosActivos.quartos) {
        query = query.gte('quartos', filtrosActivos.quartos);
      }

      // Pagination
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Convert Json type to string[] for images
      const converted = (data || []).map(item => ({
        ...item,
        images: Array.isArray(item.images) ? item.images as string[] : undefined
      }));
      
      setInmueblesFiltrados(converted);
      setTotalInmuebles(count || 0);
      
      console.log("[Inventario] Filtrados server-side:", count, "inmuebles, página", currentPage);
    } catch (err) {
      console.error("[Inventario] Error filtering:", err);
      toast.error("Error al aplicar filtros");
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filtrosActivosHash]);

  // Fetch initial data (depende de fetchInmueblesWithFilters que é estável via useCallback)
  useEffect(() => {
    console.log('🔵 [Debug] AgenteInventario - useEffect fetchInmueblesWithFilters disparado');
    fetchInmueblesWithFilters();
  }, [fetchInmueblesWithFilters]);

  // Memoizar handler para evitar recriação
  const handleFiltrosChange = useCallback((filtros: FiltrosBusqueda) => {
    setFiltrosActivos(filtros);
    setSearchTerm(""); // ✅ Limpar pesquisa ao mudar filtros
    setCurrentPage(1); // Reset para primeira página
  }, []);

  const handleSolicitarVisita = async (inmuebleId: string, fecha: string, hora: string) => {
    console.log("[Inventario] Solicitando visita", { inmuebleId, fecha, hora });
    
    await createReserva({
      inmueble_id: inmuebleId,
      fecha_visita: fecha,
      hora_visita: hora,
    });
  };

  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente').length;

  // Server-side pagination calculations
  const totalPages = Math.ceil(totalInmuebles / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalInmuebles);

  // Fetch visits quando mudar página ou lista (otimizado para não recriar arrays)
  useEffect(() => {
    console.log('🟢 [Debug] AgenteInventario - useEffect cargarVisitas disparado');
    const cargarVisitas = async () => {
      if (inmueblesFiltrados.length === 0) {
        setVisitasPorInmueble({});
        return;
      }

      try {
        const inmuebleIds = inmueblesFiltrados.map(i => i.id);
        
        // Single query for all properties on current page
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
  }, [inmuebleIdsHash]);

  if (loading && inmuebles.length === 0) {
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
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver</span>
                </Button>
              </Link>
          <div className="flex items-center gap-3">
                <Logo size="sm" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">Portal del Agente</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Bienvenido, {profile?.nombre} - {totalInmuebles} inmuebles
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {reservasPendientes > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span className="hidden xs:inline">{reservasPendientes} visitas</span>
                  <span className="xs:hidden">{reservasPendientes}</span>
                </Badge>
              )}
              <a href="https://crm.inmovilla.com/panel/" target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  <ExternalLink className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Colaboración Inmovilla</span>
                </Button>
              </a>
              <Link to="/inventario/agente/crm">
                <Button variant="outline" size="sm">
                  <UserCircle className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">CRM</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SearchBarAutocomplete
            value={searchTerm}
            onChange={setSearchTerm}
          />
          {searchTerm && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Buscando: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-2 hover:text-foreground"
                >
                  ✕
                </button>
              </Badge>
            </div>
          )}
        </div>

        <FiltrosInmuebles
          onFiltrosChange={handleFiltrosChange}
          ciudadesDisponibles={ciudadesDisponibles}
          tiposDisponibles={tiposDisponibles}
        />

        {/* Indicador de resultados e seletor de itens por página */}
        {totalInmuebles > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{endIndex} de {totalInmuebles} inmuebles
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

        {totalInmuebles === 0 ? (
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
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 12 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  inmueblesFiltrados.map((inmueble) => {
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
                  })
                )}
              </div>

              {/* Card Productos Adicionales */}
              <a 
                href="https://es.casafari.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block mt-6"
              >
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-1">
                        Productos adicionales
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Si no puede encontrar el producto adecuado, haga clic aquí.
                      </p>
                    </div>
                    <div className="text-primary group-hover:translate-x-1 transition-transform">
                      <ExternalLink className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              </a>

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
                      <React.Fragment key={`page-${page}`}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-9"
                        >
                          {page}
                        </Button>
                      </React.Fragment>
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