import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { EditInmuebleModal } from "@/components/inventario/EditInmuebleModal";
import { CreateReservaModal } from "@/components/inventario/CreateReservaModal";
import { SearchBarAutocomplete } from "@/components/inventario/SearchBarAutocomplete";
import { useInmuebles, CreateInmuebleData, DatabaseInmueble } from "@/hooks/useInmuebles";
import { useReservas, DatabaseReserva } from "@/hooks/useReservas";
import { useAgentes } from "@/hooks/useAgentes";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Plus, Upload, Users, Building2, Calendar, Trash2, Edit, Download, LogOut, X, FileJson } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Inmueble } from "@/types/inventario";
import Logo from "@/components/Logo";

const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

const contarVisitasSemanaAtual = (visitas: DatabaseReserva[]): number => {
  const hoje = new Date();
  const semanaAtual = getWeekNumber(hoje);
  const anoAtual = hoje.getFullYear();
  
  return visitas.filter(v => {
    if (!v.fecha_visita || v.estado === 'cancelada') return false;
    const visitaDate = new Date(v.fecha_visita);
    return getWeekNumber(visitaDate) === semanaAtual && 
           visitaDate.getFullYear() === anoAtual;
  }).length;
};

const AdminInventario = () => {
  const { profile, signOut } = useAuth();
  const { inmuebles, loading, createInmueble, updateInmueble, deleteInmueble, deleteMultipleInmuebles, fetchInmuebles } = useInmuebles();
  const { reservas, createReserva, deleteReserva, fetchReservasByInmueble } = useReservas();
  const { agentes } = useAgentes();
  
  const [activeTab, setActiveTab] = useState("inmuebles");
  const [showCreateInmueble, setShowCreateInmueble] = useState(false);
  const [showCreateReserva, setShowCreateReserva] = useState(false);
  const [showEditInmueble, setShowEditInmueble] = useState(false);
  const [selectedInmuebleForEdit, setSelectedInmuebleForEdit] = useState<DatabaseInmueble | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInmuebles, setSelectedInmuebles] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [visitasPorInmueble, setVisitasPorInmueble] = useState<Record<string, DatabaseReserva[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(48);
  const [totalInmuebles, setTotalInmuebles] = useState(0);
  const totalPages = Math.ceil(totalInmuebles / itemsPerPage);

  // ✅ FASE 3: Hash estável para IDs dos imóveis
  const inmueblesIdsHash = useMemo(
    () => inmuebles.map(i => i.id).sort().join(','),
    [inmuebles.length]
  );

  // Fetch paginado inicial
  useEffect(() => {
    console.log('🔴 [Debug] AdminInventario - useEffect loadPage disparado');
    const loadPage = async () => {
      console.log("[AdminInventario] Cargando página", currentPage);
      const result = await fetchInmuebles(currentPage, itemsPerPage);
      setTotalInmuebles(result.total);
    };
    loadPage();
  }, [currentPage, itemsPerPage]);

  // Form states
  const [newInmueble, setNewInmueble] = useState<{
    ciudad: string;
    region: string;
    tipo: CreateInmuebleData['tipo'] | '';
    precio: string;
    direccion: string;
    proveedor: string;
    codigo_inventario: string;
  }>({
    ciudad: "",
    region: "",
    tipo: "",
    precio: "",
    direccion: "",
    proveedor: "",
    codigo_inventario: "",
  });

  useEffect(() => {
    console.log("[Inventario] Panel de administración cargado");
  }, []);

  useEffect(() => {
    console.log('🟡 [Debug] AdminInventario - useEffect cargarVisitas disparado');
    const cargarVisitas = async () => {
      if (inmuebles.length === 0) {
        setVisitasPorInmueble({});
        return;
      }

      try {
        const ids = inmuebles.map(i => i.id);
        
        const { data: visitas, error } = await supabase
          .from('reservas')
          .select('*')
          .in('inmueble_id', ids);

        if (error) throw error;

        const visitasMap: Record<string, DatabaseReserva[]> = {};
        visitas?.forEach((visita) => {
          if (!visitasMap[visita.inmueble_id]) {
            visitasMap[visita.inmueble_id] = [];
          }
          visitasMap[visita.inmueble_id].push(visita);
        });

        setVisitasPorInmueble(visitasMap);
      } catch (error) {
        console.error('[AdminInventario] Error cargando visitas:', error);
      }
    };
    
    cargarVisitas();
  }, [inmueblesIdsHash]);

  const handleCreateInmueble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInmueble.tipo) {
      toast.error("Selecciona un tipo de inmueble");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const inmuebleData: CreateInmuebleData = {
        ciudad: newInmueble.ciudad,
        region: newInmueble.region,
        tipo: newInmueble.tipo as CreateInmuebleData['tipo'],
        precio: parseInt(newInmueble.precio),
        direccion: newInmueble.direccion,
        proveedor: newInmueble.proveedor,
        codigo_inventario: newInmueble.codigo_inventario || undefined,
      };

      const { error } = await createInmueble(inmuebleData);
      
      if (!error) {
        setNewInmueble({ 
          ciudad: "", 
          region: "", 
          tipo: "", 
          precio: "", 
          direccion: "", 
          proveedor: "", 
          codigo_inventario: "" 
        });
        setShowCreateInmueble(false);
      }
    } catch (error) {
      console.error("[Inventario] Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: Implementar gestión de agentes con Supabase Auth
  const handleCreateAgente = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Función en desarrollo: Crear agentes con Supabase Auth");
  };

  const handleDeleteInmueble = async (id: string) => {
    await deleteInmueble(id);
  };

  const handleBulkDelete = async () => {
    if (selectedInmuebles.length === 0) {
      toast.error("Selecciona al menos un inmueble para eliminar");
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteMultipleInmuebles(selectedInmuebles);
      setSelectedInmuebles([]);
      setShowBulkActions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectInmueble = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInmuebles(prev => [...prev, id]);
    } else {
      setSelectedInmuebles(prev => prev.filter(inmuebleId => inmuebleId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInmuebles(inmuebles.map(i => i.id));
    } else {
      setSelectedInmuebles([]);
    }
  };

  const handleDeleteReserva = async (id: string) => {
    await deleteReserva(id);
  };

  const handleCreateReserva = async (data: any) => {
    setIsSubmitting(true);
    try {
      const result = await createReserva(data);
      if (!result.error) {
        setShowCreateReserva(false);
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInmueble = (inmueble: Inmueble) => {
    const dbInmueble = inmuebles.find(i => i.id === inmueble.id);
    if (dbInmueble) {
      setSelectedInmuebleForEdit(dbInmueble);
      setShowEditInmueble(true);
    }
  };

  const handleUpdateInmueble = async (id: string, data: Partial<CreateInmuebleData>) => {
    return await updateInmueble(id, data);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim()); // Filtrar líneas vacías
      
      console.log('[CSV Import] Iniciando importación de', lines.length - 1, 'registros');
      
      let successCount = 0;
      let errorCount = 0;
      const processedData: CreateInmuebleData[] = [];
      
      // Procesar cada línea (saltando header si existe)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Usar regex para manejar comas dentro de comillas
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(val => 
          val.replace(/^"(.*)"$/, '$1').trim()
        ) || [];
        
        // Orden: Ciudad, Región, Tipo, Precio (€), Dirección, Proveedor, Código de Inventario
        if (values.length >= 6) {
          const tipoValue = values[2]?.toLowerCase() || '';
          let tipo: CreateInmuebleData['tipo'];
          
          // Mapear tipos CSV exactamente
          switch (tipoValue) {
            case 'piso':
            case 'apartamento':
              tipo = 'apartamento';
              break;
            case 'casa':
            case 'chalet':
              tipo = 'casa';
              break;
            case 'local':
            case 'local comercial':
            case 'local_comercial':
              tipo = 'local_comercial';
              break;
            case 'terreno':
              tipo = 'terreno';
              break;
            case 'oficina':
              tipo = 'oficina';
              break;
            default:
              console.warn(`[CSV Import] Tipo desconocido '${tipoValue}', usando 'apartamento'`);
              tipo = 'apartamento';
          }

          // Limpiar precio - remover símbolos y espacios
          const precioStr = values[3]?.replace(/[€\s,\.]/g, '') || '0';
          const precio = parseInt(precioStr) || 0;
          
          if (precio === 0) {
            console.warn(`[CSV Import] Precio inválido en línea ${i + 1}: '${values[3]}'`);
          }

          const inmuebleData: CreateInmuebleData = {
            ciudad: values[0] || '', // Campo en blanco permitido
            region: values[1] || '', // Campo en blanco permitido  
            tipo,
            precio,
            direccion: values[4] || '', // Campo en blanco permitido
            proveedor: values[5] || '', // Campo en blanco permitido
            codigo_inventario: values[6] || undefined, // Campo opcional
          };
          
          processedData.push(inmuebleData);
          console.log(`[CSV Import] Línea ${i + 1}:`, inmuebleData);

          const { error } = await createInmueble(inmuebleData);
          if (error) {
            console.error(`[CSV Import] Error línea ${i + 1}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          console.warn(`[CSV Import] Línea ${i + 1} tiene columnas insuficientes:`, values.length);
          errorCount++;
        }
      }

      console.log('[CSV Import]', { 
        total: lines.length - 1,
        successful: successCount, 
        errors: errorCount,
        processedData 
      });

      if (successCount > 0) {
        toast.success(`${successCount} inmuebles importados correctamente`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} líneas no pudieron ser procesadas`);
      }
      
    } catch (error) {
      toast.error("Error al procesar el archivo CSV");
      console.error("[CSV Import] Error general:", error);
    } finally {
      setIsSubmitting(false);
    }

    // Reset input
    event.target.value = "";
  };

  // Parser JSON - Função para processar arquivos JSON do Solvia
  const parseAddress = (address: string): { ciudad: string; region: string; direccion: string } => {
    // Exemplo: "Toledo , Carpio de Tajo (El) - C/ El Sol"
    const parts = address.split(' - ');
    const direccion = parts[1]?.trim() || '';
    
    const locationParts = parts[0].split(' , ');
    const region = locationParts[0]?.trim() || '';
    const ciudad = locationParts[1]?.trim() || '';
    
    return { ciudad, region, direccion };
  };

  const mapPropertyType = (jsonType: string | null): CreateInmuebleData['tipo'] => {
    const typeMap: Record<string, CreateInmuebleData['tipo']> = {
      'piso': 'apartamento',
      'chalet': 'casa',
      'garaje': 'local_comercial',
    };
    
    return typeMap[jsonType?.toLowerCase() || ''] || 'apartamento';
  };

  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Por favor, seleccione un archivo JSON válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      console.log('[JSON Import] Archivo cargado:', jsonData);
      
      const items = jsonData.items || [];
      const validItems: CreateInmuebleData[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // Validación de campos obligatorios
          if (!item.price_eur || !item.address) {
            errors.push(`Item ${i + 1}: Preço ou endereço ausente`);
            continue;
          }
          
          const { ciudad, region, direccion } = parseAddress(item.address);
          
          if (!ciudad || !region) {
            errors.push(`Item ${i + 1}: No se pudo extraer ciudad/región de "${item.address}"`);
            continue;
          }
          
          // Extraer código de inventario de la URL
          let codigoInventario: string | undefined;
          if (item.url) {
            const urlParts = item.url.split('-');
            codigoInventario = urlParts[urlParts.length - 1];
          }
          
          const inmueble: CreateInmuebleData = {
            titulo: item.title || '',
            ciudad,
            region,
            tipo: mapPropertyType(item.property_type),
            precio: item.price_eur,
            direccion,
            proveedor: 'Solvia',
            quartos: item.rooms || undefined,
            banheiros: item.bathrooms || undefined,
            area_m2: item.area_m2 || undefined,
            url_externa: item.url || '',
            image_url: item.image_url || '',
            codigo_inventario: codigoInventario,
          };
          
          validItems.push(inmueble);
          
        } catch (err: any) {
          errors.push(`Item ${i + 1}: ${err.message}`);
        }
      }
      
      console.log('[JSON Import] Items válidos:', validItems.length);
      console.log('[JSON Import] Erros:', errors);
      
      if (errors.length > 0) {
        console.warn('[JSON Import] Errores encontrados:', errors);
        toast.warning(`${errors.length} items con problemas (verifique console)`);
      }
      
      if (validItems.length === 0) {
        toast.error('Ningún item válido encontrado en el JSON');
        setIsSubmitting(false);
        return;
      }
      
      // Batch import optimization - 100 items per batch
      const BATCH_SIZE = 100;
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
        const batch = validItems.slice(i, i + BATCH_SIZE);
        
        try {
          // Insert entire batch in a single query
          const { data, error } = await supabase
            .from('inmuebles')
            .insert(batch)
            .select();
          
          if (error) throw error;
          
          successCount += data.length;
          
          // Update progress
          const progress = Math.round((successCount / validItems.length) * 100);
          toast.info(`📦 Importando: ${progress}% (${successCount}/${validItems.length})`, {
            id: 'batch-progress'
          });
          
        } catch (err: any) {
          console.error('[JSON Import] Batch error:', err);
          failCount += batch.length;
        }
      }
      
      // Refresh the list after import
      await fetchInmuebles();
      
      toast.success(`✅ ${successCount} inmuebles importados con éxito!`, {
        id: 'batch-progress'
      });
      if (failCount > 0) {
        toast.error(`❌ ${failCount} inmuebles fallaron en la importación`);
      }
      
      console.log('[JSON Import] Concluído:', { successCount, failCount });
      
    } catch (error: any) {
      console.error('[JSON Import] Error:', error);
      toast.error('Error al procesar archivo JSON');
    } finally {
      setIsSubmitting(false);
    }
    
    // Reset input
    event.target.value = '';
  };

  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente');

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
                  <h1 className="text-2xl font-bold">Panel de Administración</h1>
                  <p className="text-sm text-muted-foreground">
                    Bienvenido, {profile?.nombre} - Gestiona inmuebles y reservas
                  </p>
                </div>
              </div>
            </div>
            
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inmuebles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inmuebles.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visitas Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservasPendientes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inmuebles.filter(i => i.disponible).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inmuebles">Inmuebles</TabsTrigger>
            <TabsTrigger value="reservas">Reservas</TabsTrigger>
          </TabsList>

          {/* Inmuebles Tab */}
          <TabsContent value="inmuebles" className="space-y-6">
              <div className="mb-6">
                <SearchBarAutocomplete
                  inmuebles={inmuebles}
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
              </div>

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestión de Inmuebles</h2>
              <div className="flex gap-2">
                {selectedInmuebles.length > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm text-muted-foreground">
                      {selectedInmuebles.length} seleccionados
                    </span>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Seleccionados
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedInmuebles([]);
                        setShowBulkActions(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir CSV
                    </span>
                  </Button>
                </Label>
                
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJSONUpload}
                  className="hidden"
                  id="json-upload"
                />
                <Label htmlFor="json-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <FileJson className="w-4 h-4 mr-2" />
                      Subir JSON
                    </span>
                  </Button>
                </Label>
                
                <Dialog open={showCreateInmueble} onOpenChange={setShowCreateInmueble}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Inmueble
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Inmueble</DialogTitle>
                      <DialogDescription>
                        Añade un nuevo inmueble al inventario
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateInmueble} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ciudad">Ciudad</Label>
                          <Input
                            id="ciudad"
                            value={newInmueble.ciudad}
                            onChange={(e) => setNewInmueble(prev => ({...prev, ciudad: e.target.value}))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="region">Región</Label>
                          <Input
                            id="region"
                            value={newInmueble.region}
                            onChange={(e) => setNewInmueble(prev => ({...prev, region: e.target.value}))}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select value={newInmueble.tipo} onValueChange={(value: CreateInmuebleData['tipo']) => setNewInmueble(prev => ({...prev, tipo: value}))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="apartamento">Apartamento</SelectItem>
                              <SelectItem value="casa">Casa</SelectItem>
                              <SelectItem value="local_comercial">Local Comercial</SelectItem>  
                              <SelectItem value="terreno">Terreno</SelectItem>
                              <SelectItem value="oficina">Oficina</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="precio">Precio (€)</Label>
                          <Input
                            id="precio"
                            type="number"
                            value={newInmueble.precio}
                            onChange={(e) => setNewInmueble(prev => ({...prev, precio: e.target.value}))}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                          id="direccion"
                          value={newInmueble.direccion}
                          onChange={(e) => setNewInmueble(prev => ({...prev, direccion: e.target.value}))}
                          required
                        />
                      </div>
                        <div className="space-y-2">
                          <Label htmlFor="proveedor">Proveedor</Label>
                          <Input
                            id="proveedor"
                            value={newInmueble.proveedor}
                            onChange={(e) => setNewInmueble(prev => ({...prev, proveedor: e.target.value}))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="codigo_inventario">Código de Inventario</Label>
                          <Input
                            id="codigo_inventario"
                            value={newInmueble.codigo_inventario}
                            onChange={(e) => setNewInmueble(prev => ({...prev, codigo_inventario: e.target.value}))}
                          />
                        </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCreateInmueble(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Creando..." : "Crear Inmueble"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Bulk selection controls */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedInmuebles.length === inmuebles.length && inmuebles.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Seleccionar todos ({inmuebles.length})
                </Label>
              </div>
              
              {!showBulkActions && selectedInmuebles.length === 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkActions(true)}
                >
                  Modo Selección
                </Button>
              )}
            </div>

            {/* Controles de paginação */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  Total: {totalInmuebles} inmuebles
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inmuebles
                .filter(inmueble => {
                  if (!searchTerm.trim()) return true;
                  const searchLower = searchTerm.toLowerCase();
                  return (
                    inmueble.ciudad.toLowerCase().includes(searchLower) ||
                    inmueble.direccion.toLowerCase().includes(searchLower) ||
                    inmueble.region.toLowerCase().includes(searchLower) ||
                    (inmueble.titulo && inmueble.titulo.toLowerCase().includes(searchLower)) ||
                    (inmueble.codigo_inventario && inmueble.codigo_inventario.toLowerCase().includes(searchLower))
                  );
                })
                .map((inmueble) => {
                  const visitasInmueble = visitasPorInmueble[inmueble.id] || [];
                  const visitasSemana = contarVisitasSemanaAtual(visitasInmueble);
                  
                  return (
                  <div key={inmueble.id} className="relative">
                    {(showBulkActions || selectedInmuebles.length > 0) && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedInmuebles.includes(inmueble.id)}
                          onCheckedChange={(checked) => handleSelectInmueble(inmueble.id, checked as boolean)}
                          className="bg-white"
                        />
                      </div>
                    )}
                    <InmuebleCard 
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
                      showSolicitarVisita={false}
                      showEditButton={true}
                      onEdit={handleEditInmueble}
                      visitasAgendadas={visitasSemana}
                      visitasExistentes={visitasInmueble}
                    />
                    {!showBulkActions && selectedInmuebles.length === 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleDeleteInmueble(inmueble.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Agentes Tab - Removed for now */}

          {/* Reservas Tab */}
          <TabsContent value="reservas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reservas de Visitas</h2>
              <Button onClick={() => setShowCreateReserva(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Reserva
              </Button>
            </div>
            
            <div className="grid gap-4">
              {reservas.map((reserva) => {
                return (
                  <Card key={reserva.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          Visita #{reserva.id.slice(-6)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            reserva.estado === 'pendiente' ? 'default' :
                            reserva.estado === 'confirmada' ? 'default' :
                            reserva.estado === 'cancelada' ? 'destructive' : 'default'
                          }>
                            {reserva.estado}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteReserva(reserva.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Agente:</strong> {reserva.profiles?.nombre || 'No asignado'}</p>
                        <p><strong>Email:</strong> {reserva.profiles?.email || 'No disponible'}</p>
                        <p><strong>Inmueble:</strong> {reserva.inmuebles?.direccion}, {reserva.inmuebles?.ciudad}</p>
                        <p><strong>Tipo:</strong> {reserva.inmuebles?.tipo} - €{reserva.inmuebles?.precio?.toLocaleString()}</p>
                        <p><strong>Fecha:</strong> {reserva.fecha_visita}</p>
                        <p><strong>Hora:</strong> {reserva.hora_visita}</p>
                        <p><strong>Solicitado:</strong> {new Date(reserva.fecha_solicitud).toLocaleDateString('es-ES')}</p>
                        {reserva.notas && <p><strong>Notas:</strong> {reserva.notas}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <CreateReservaModal
              open={showCreateReserva}
              onOpenChange={setShowCreateReserva}
              onCreateReserva={handleCreateReserva}
              inmuebles={inmuebles}
              agentes={agentes}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>
        
        {/* Edit Inmueble Modal */}
        {selectedInmuebleForEdit && (
          <EditInmuebleModal
            open={showEditInmueble}
            onOpenChange={setShowEditInmueble}
            inmueble={selectedInmuebleForEdit}
            onUpdateInmueble={handleUpdateInmueble}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    </div>
  );
};

export default AdminInventario;