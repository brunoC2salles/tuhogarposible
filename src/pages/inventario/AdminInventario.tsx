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
import { Inmueble, Agente, Reserva, CSVInmueble } from "@/types/inventario";
import { ArrowLeft, Plus, Upload, Users, Building2, Calendar, Trash2, Edit, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Mock data
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
];

const AGENTES_MOCK: Agente[] = [
  {
    id: "AGE001",
    nombre: "María García",
    email: "maria.garcia@email.com",
    telefono: "+34 666 123 456",
    fechaCreacion: new Date("2024-01-01"),
    activo: true,
  },
  {
    id: "AGE002",
    nombre: "Juan Pérez", 
    email: "juan.perez@email.com",
    telefono: "+34 666 789 012",
    fechaCreacion: new Date("2024-01-05"),
    activo: true,
  },
];

const RESERVAS_MOCK: Reserva[] = [
  {
    id: "RES001",
    inmuebleId: "INM001",
    agenteId: "AGE001",
    fechaSolicitud: new Date("2024-02-01"),
    fechaVisita: new Date("2024-02-15"),
    horaVisita: "10:00",
    estado: 'pendiente',
  },
];

const AdminInventario = () => {
  const [activeTab, setActiveTab] = useState("inmuebles");
  const [inmuebles, setInmuebles] = useState<Inmueble[]>(INMUEBLES_MOCK);
  const [agentes, setAgentes] = useState<Agente[]>(AGENTES_MOCK);
  const [reservas, setReservas] = useState<Reserva[]>(RESERVAS_MOCK);
  const [showCreateInmueble, setShowCreateInmueble] = useState(false);
  const [showCreateAgente, setShowCreateAgente] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newInmueble, setNewInmueble] = useState({
    ciudad: "",
    region: "",
    tipo: "",
    precio: "",
    direccion: "",
    proveedor: "",
  });

  const [newAgente, setNewAgente] = useState({
    nombre: "",
    email: "",
    telefono: "",
  });

  useEffect(() => {
    console.log("[Inventario] Panel de administración cargado");
  }, []);

  const handleCreateInmueble = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const inmueble: Inmueble = {
        id: `INM${String(inmuebles.length + 1).padStart(3, '0')}`,
        ciudad: newInmueble.ciudad,
        region: newInmueble.region,
        tipo: newInmueble.tipo,
        precio: parseInt(newInmueble.precio),
        direccion: newInmueble.direccion,
        proveedor: newInmueble.proveedor,
        disponible: true,
        fechaCreacion: new Date(),
      };

      setInmuebles(prev => [...prev, inmueble]);
      setNewInmueble({ ciudad: "", region: "", tipo: "", precio: "", direccion: "", proveedor: "" });
      setShowCreateInmueble(false);
      
      toast.success("Inmueble creado correctamente");
      console.log("[Inventario] Nuevo inmueble creado:", inmueble.id);
    } catch (error) {
      toast.error("Error al crear el inmueble");
      console.error("[Inventario] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const agente: Agente = {
        id: `AGE${String(agentes.length + 1).padStart(3, '0')}`,
        nombre: newAgente.nombre,
        email: newAgente.email,
        telefono: newAgente.telefono,
        fechaCreacion: new Date(),
        activo: true,
      };

      setAgentes(prev => [...prev, agente]);
      setNewAgente({ nombre: "", email: "", telefono: "" });
      setShowCreateAgente(false);
      
      toast.success("Agente creado correctamente");
      console.log("[Inventario] Nuevo agente creado:", agente.id);
    } catch (error) {
      toast.error("Error al crear el agente");
      console.error("[Inventario] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInmueble = (id: string) => {
    setInmuebles(prev => prev.filter(i => i.id !== id));
    toast.success("Inmueble eliminado");
    console.log("[Inventario] Inmueble eliminado:", id);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      const newInmuebles: Inmueble[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 6) {
          const inmueble: Inmueble = {
            id: values[0].trim() || `INM${Date.now()}_${i}`,
            ciudad: values[1].trim(),
            region: values[1].trim(), // Usando ciudad como región por simplicidad
            tipo: values[2].trim(),
            precio: parseInt(values[3].trim()) || 0,
            direccion: values[4].trim(),
            proveedor: values[5].trim(),
            disponible: true,
            fechaCreacion: new Date(),
          };
          newInmuebles.push(inmueble);
        }
      }

      setInmuebles(prev => [...prev, ...newInmuebles]);
      toast.success(`${newInmuebles.length} inmuebles importados correctamente`);
      console.log("[Inventario] CSV importado:", newInmuebles.length, "inmuebles");
    } catch (error) {
      toast.error("Error al procesar el archivo CSV");
      console.error("[Inventario] Error CSV:", error);
    }

    // Reset input
    event.target.value = "";
  };

  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente');
  const agenteActivos = agentes.filter(a => a.activo);

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
                    Gestiona inmuebles, agentes y reservas
                  </p>
                </div>
              </div>
            </div>
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
              <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agenteActivos.length}</div>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inmuebles">Inmuebles</TabsTrigger>
            <TabsTrigger value="agentes">Agentes</TabsTrigger>
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
                          <Select value={newInmueble.tipo} onValueChange={(value) => setNewInmueble(prev => ({...prev, tipo: value}))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Piso">Piso</SelectItem>
                              <SelectItem value="Casa">Casa</SelectItem>
                              <SelectItem value="Apartamento">Apartamento</SelectItem>
                              <SelectItem value="Dúplex">Dúplex</SelectItem>
                              <SelectItem value="Estudio">Estudio</SelectItem>
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
                        <Button type="submit" disabled={loading}>
                          {loading ? "Creando..." : "Crear Inmueble"}
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
                  <InmuebleCard inmueble={inmueble} showSolicitarVisita={false} />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleDeleteInmueble(inmueble.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Agentes Tab */}
          <TabsContent value="agentes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestión de Agentes</h2>
              <Dialog open={showCreateAgente} onOpenChange={setShowCreateAgente}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Agente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Cuenta de Agente</DialogTitle>
                    <DialogDescription>
                      Añade un nuevo agente al sistema
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAgente} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo</Label>
                      <Input
                        id="nombre"
                        value={newAgente.nombre}
                        onChange={(e) => setNewAgente(prev => ({...prev, nombre: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newAgente.email}
                        onChange={(e) => setNewAgente(prev => ({...prev, email: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={newAgente.telefono}
                        onChange={(e) => setNewAgente(prev => ({...prev, telefono: e.target.value}))}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateAgente(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Creando..." : "Crear Agente"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {agentes.map((agente) => (
                <Card key={agente.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{agente.nombre}</CardTitle>
                        <CardDescription>{agente.email}</CardDescription>
                      </div>
                      <Badge variant={agente.activo ? "default" : "secondary"}>
                        {agente.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Teléfono: {agente.telefono || "No especificado"}</p>
                      <p>Fecha de registro: {agente.fechaCreacion.toLocaleDateString('es-ES')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Reservas Tab */}
          <TabsContent value="reservas" className="space-y-6">
            <h2 className="text-xl font-semibold">Reservas de Visitas</h2>
            <div className="grid gap-4">
              {reservas.map((reserva) => {
                const agente = agentes.find(a => a.id === reserva.agenteId);
                const inmueble = inmuebles.find(i => i.id === reserva.inmuebleId);
                
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
                        <p><strong>Agente:</strong> {agente?.nombre}</p>
                        <p><strong>Inmueble:</strong> {inmueble?.direccion}, {inmueble?.ciudad}</p>
                        <p><strong>Fecha:</strong> {reserva.fechaVisita?.toLocaleDateString('es-ES')}</p>
                        <p><strong>Hora:</strong> {reserva.horaVisita}</p>
                        <p><strong>Solicitado:</strong> {reserva.fechaSolicitud.toLocaleDateString('es-ES')}</p>
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