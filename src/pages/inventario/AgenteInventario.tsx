import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { FiltrosInmuebles } from "@/components/inventario/FiltrosInmuebles";
import { InmovillaCasafariSection } from "@/components/inventario/InmovillaCasafariSection";
import { FiltrosBusqueda } from "@/types/inventario";
import { useInmuebles, DatabaseInmueble } from "@/hooks/useInmuebles";
import { useReservas, DatabaseReserva } from "@/hooks/useReservas";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Home, LogOut, UserCircle, ChevronLeft, ChevronRight, Menu, Search, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { matchesAnyField } from "@/lib/textUtils";
import Logo from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

const contarMaxVisitasPorSemana = (visitas: DatabaseReserva[]): number => {
  const visitasPorSemana: Record<string, number> = {};
  
  visitas.forEach(v => {
    if (!v.fecha_visita || v.estado === 'cancelada') return;
    
    const visitaDate = new Date(v.fecha_visita);
    const semana = getWeekNumber(visitaDate);
    const ano = visitaDate.getFullYear();
    const chave = `${ano}-W${semana}`;
    
    visitasPorSemana[chave] = (visitasPorSemana[chave] || 0) + 1;
  });
  
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
  const [activeTab, setActiveTab] = useState<string>("casafari");
  
  const ciudadesDisponibles = useMemo(() => {
    const allCities = allCiudades.length > 0 ? allCiudades : Array.from(new Set(inmuebles.map(i => i.ciudad)));
    return allCities.sort();
  }, [allCiudades, inmuebles.length]);

  const tiposDisponibles = useMemo(() => {
    const allTypes = allTipos.length > 0 ? allTipos : Array.from(new Set(inmuebles.map(i => i.tipo)));
    return allTypes.sort();
  }, [allTipos, inmuebles.length]);

  const inmuebleIdsHash = useMemo(
    () => inmueblesFiltrados.map(i => i.id).sort().join(','),
    [inmueblesFiltrados.length]
  );

  const filtrosActivosHash = useMemo(
    () => JSON.stringify(filtrosActivos),
    [filtrosActivos.ciudad, filtrosActivos.tipo, filtrosActivos.precioMin, filtrosActivos.precioMax, filtrosActivos.quartos]
  );

  // OPTIMIZED: Single RPC call for distinct filter values instead of 2 separate queries
  useEffect(() => {
    const fetchDistinctValues = async () => {
      try {
        const { data, error } = await supabase.rpc('get_distinct_filter_values');
        
        if (error) {
          console.error('[Inventario] RPC error, falling back:', error);
          // Fallback to old method if RPC fails
          const [ciudadesRes, tiposRes] = await Promise.all([
            supabase.from('inmuebles').select('ciudad').eq('disponible', true),
            supabase.from('inmuebles').select('tipo').eq('disponible', true)
          ]);
          if (ciudadesRes.data) setAllCiudades([...new Set(ciudadesRes.data.map(i => i.ciudad))].sort());
          if (tiposRes.data) setAllTipos([...new Set(tiposRes.data.map(i => i.tipo))].sort());
          return;
        }
        
        if (data && data[0]) {
          setAllCiudades(data[0].ciudades || []);
          setAllTipos(data[0].tipos || []);
        }
        
        console.log('[Inventario] Loaded filter values via RPC');
      } catch (err) {
        console.error('[Inventario] Error loading distinct values:', err);
      }
    };
    
    fetchDistinctValues();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInmueblesWithFilters = useCallback(async () => {
    try {
      // Quando há termo de busca, buscamos TODOS os resultados filtrados por outros critérios
      // e filtramos client-side com normalização de acentos
      const hasSearchTerm = debouncedSearchTerm.trim().length > 0;
      
      let query = supabase
        .from('inmuebles')
        .select('*', { count: 'exact' })
        .eq('disponible', true)
        .order('created_at', { ascending: false });

      // NÃO aplicamos filtro de texto server-side - será feito client-side com normalização
      // Apenas aplicamos os outros filtros server-side

      if (filtrosActivos.ciudad) {
        query = query.eq('ciudad', filtrosActivos.ciudad);
      }

      if (filtrosActivos.tipo) {
        query = query.eq('tipo', filtrosActivos.tipo as any);
      }

      if (filtrosActivos.precioMin !== undefined) {
        query = query.gte('precio', filtrosActivos.precioMin);
      }
      
      if (filtrosActivos.precioMax !== undefined) {
        query = query.lte('precio', filtrosActivos.precioMax);
      }

      if (filtrosActivos.quartos) {
        query = query.gte('quartos', filtrosActivos.quartos);
      }

      // Se há busca de texto, buscamos mais dados para filtrar client-side
      // Se não há busca, fazemos paginação normal
      if (hasSearchTerm) {
        // Buscar até 500 resultados para filtrar client-side (limite razoável)
        query = query.limit(500);
      } else {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage - 1;
        query = query.range(start, end);
      }

      const { data, error, count } = await query;
      
      if (error) {
        console.error("[Inventario] Query error:", error);
        toast.error("Error al filtrar inmuebles");
        return;
      }
      
      let converted = (data || []).map(item => ({
        ...item,
        images: Array.isArray(item.images) ? item.images as string[] : undefined
      }));

      // Se há busca de texto, filtrar client-side com normalização de acentos
      if (hasSearchTerm) {
        const searchFields = ['ciudad', 'direccion', 'region', 'titulo', 'codigo_inventario'];
        converted = converted.filter(item => 
          matchesAnyField(item as unknown as Record<string, unknown>, searchFields, debouncedSearchTerm)
        );
        
        // Aplicar paginação client-side após filtragem
        const totalFiltered = converted.length;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        
        setTotalInmuebles(totalFiltered);
        setInmueblesFiltrados(converted.slice(start, end));
        
        console.log("[Inventario] Filtrados client-side:", totalFiltered, "inmuebles, página", currentPage);
      } else {
        setInmueblesFiltrados(converted);
        setTotalInmuebles(count || 0);
        console.log("[Inventario] Filtrados server-side:", count, "inmuebles, página", currentPage);
      }
    } catch (err) {
      console.error("[Inventario] Exception:", err);
      toast.error("Error al aplicar filtros");
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filtrosActivosHash]);

  useEffect(() => {
    if (activeTab === 'inventario') {
      console.log('🔵 [Debug] AgenteInventario - useEffect fetchInmueblesWithFilters disparado');
      fetchInmueblesWithFilters();
    }
  }, [fetchInmueblesWithFilters, activeTab]);

  const handleFiltrosChange = useCallback((filtros: FiltrosBusqueda) => {
    setFiltrosActivos(filtros);
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  const handleSolicitarVisita = async (inmuebleId: string, fecha: string, hora: string) => {
    console.log("[Inventario] Solicitando visita", { inmuebleId, fecha, hora });
    
    await createReserva({
      inmueble_id: inmuebleId,
      fecha_visita: fecha,
      hora_visita: hora,
    });
  };

  const totalPages = Math.ceil(totalInmuebles / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalInmuebles);

  useEffect(() => {
    if (activeTab !== 'inventario') return;
    
    console.log('🟢 [Debug] AgenteInventario - useEffect cargarVisitas disparado');
    const cargarVisitas = async () => {
      if (inmueblesFiltrados.length === 0) {
        setVisitasPorInmueble({});
        return;
      }

      try {
        const inmuebleIds = inmueblesFiltrados.map(i => i.id);
        
        const { data, error } = await supabase
          .from('reservas')
          .select('*')
          .in('inmueble_id', inmuebleIds)
          .in('estado', ['pendiente', 'confirmada']);
        
        if (error) {
          console.error('[Inventario] Error loading visits:', error);
          return;
        }
        
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
  }, [inmuebleIdsHash, activeTab]);

  if (loading && inmuebles.length === 0 && activeTab === 'inventario') {
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
                    Bienvenido, {profile?.nombre}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões Desktop */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <Link to="/inventario/agente/crm">
                <Button variant="outline" size="sm">
                  <UserCircle className="w-4 h-4 mr-2" />
                  CRM
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>

            {/* Menu Hambúrguer Mobile */}
            <div className="flex sm:hidden items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/inventario/agente/crm" className="flex items-center cursor-pointer">
                      <UserCircle className="w-4 h-4 mr-2" />
                      CRM
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="flex items-center cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="casafari" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Casafari / Inmovilla</span>
              <span className="sm:hidden">Casafari</span>
            </TabsTrigger>
            <TabsTrigger value="inventario" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inventario Propio</span>
              <span className="sm:hidden">Inventario</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="casafari">
            <InmovillaCasafariSection />
          </TabsContent>

          <TabsContent value="inventario">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
                <Input
                  placeholder="Buscar por ciudad, dirección, región..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
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
                    Array.from({ length: 12 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-6">
                          <Skeleton className="h-48 w-full mb-4" />
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    inmueblesFiltrados.map((inmueble) => (
                      <InmuebleCard 
                        key={inmueble.id} 
                        inmueble={{
                          ...inmueble,
                          fechaCreacion: new Date(inmueble.created_at),
                          agenteAsignado: inmueble.agente_asignado || undefined,
                          titulo: inmueble.titulo || undefined,
                          imageUrl: inmueble.image_url || undefined,
                          urlExterna: inmueble.url_externa || undefined,
                          areaM2: inmueble.area_m2 ? Number(inmueble.area_m2) : undefined,
                          codigoInventario: inmueble.codigo_inventario || undefined,
                        }}
                        onSolicitarVisita={handleSolicitarVisita}
                        visitasAgendadas={contarMaxVisitasPorSemana(visitasPorInmueble[inmueble.id] || [])}
                        visitasExistentes={visitasPorInmueble[inmueble.id] || []}
                      />
                    ))
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AgenteInventario;
