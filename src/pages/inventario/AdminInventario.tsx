import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { useInmuebles, CreateInmuebleData } from "@/hooks/useInmuebles";
import { useReservas } from "@/hooks/useReservas";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Plus, Upload, Users, Building2, Calendar, Trash2, Edit, Download, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const AdminInventario = () => {
  const { profile, signOut } = useAuth();
  const { inmuebles, loading, createInmueble, deleteInmueble } = useInmuebles();
  const { reservas } = useReservas();
  
  const [activeTab, setActiveTab] = useState("inmuebles");
  const [showCreateInmueble, setShowCreateInmueble] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newInmueble, setNewInmueble] = useState<{
    ciudad: string;
    region: string;
    tipo: CreateInmuebleData['tipo'] | '';
    precio: string;
    direccion: string;
    proveedor: string;
  }>({
    ciudad: "",
    region: "",
    tipo: "",
    precio: "",
    direccion: "",
    proveedor: "",
  });

  useEffect(() => {
    console.log("[Inventario] Panel de administración cargado");
  }, []);

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
      };

      const { error } = await createInmueble(inmuebleData);
      
      if (!error) {
        setNewInmueble({ ciudad: "", region: "", tipo: "", precio: "", direccion: "", proveedor: "" });
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

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 6 && values[0].trim()) {
          const tipoValue = values[2].trim().toLowerCase();
          let tipo: CreateInmuebleData['tipo'];
          
          // Mapear tipos CSV a tipos del enum
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
              tipo = 'apartamento';
          }

          const inmuebleData: CreateInmuebleData = {
            ciudad: values[1].trim(),
            region: values[1].trim(), // Usando ciudad como región
            tipo,
            precio: parseInt(values[3].trim()) || 0,
            direccion: values[4].trim(),
            proveedor: values[5].trim(),
          };

          const { error } = await createInmueble(inmuebleData);
          if (error) {
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} inmuebles importados correctamente`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} inmuebles no pudieron ser importados`);
      }
      
      console.log("[Inventario] CSV importado:", successCount, "éxitos,", errorCount, "errores");
    } catch (error) {
      toast.error("Error al procesar el archivo CSV");
      console.error("[Inventario] Error CSV:", error);
    } finally {
      setIsSubmitting(false);
    }

    // Reset input
    event.target.value = "";
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
                <div className="w-10 h-10 bg-sky-blue-light rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestión de Inmuebles</h2>
              <div className="flex gap-2">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inmuebles.map((inmueble) => (
                <div key={inmueble.id} className="relative">
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
                    }}
                    showSolicitarVisita={false} 
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleDeleteInmueble(inmueble.id)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Agentes Tab - Removed for now */}

          {/* Reservas Tab */}
          <TabsContent value="reservas" className="space-y-6">
            <h2 className="text-xl font-semibold">Reservas de Visitas</h2>
            <div className="grid gap-4">
              {reservas.map((reserva) => {
                const inmueble = inmuebles.find(i => i.id === reserva.inmueble_id);
                
                return (
                  <Card key={reserva.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          Visita {reserva.id}
                        </CardTitle>
                        <Badge variant={
                          reserva.estado === 'pendiente' ? 'default' :
                          reserva.estado === 'confirmada' ? 'default' :
                          reserva.estado === 'cancelada' ? 'destructive' : 'default'
                        }>
                          {reserva.estado}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Agente:</strong> {reserva.profiles?.nombre}</p>
                        <p><strong>Inmueble:</strong> {reserva.inmuebles?.direccion}, {reserva.inmuebles?.ciudad}</p>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminInventario;