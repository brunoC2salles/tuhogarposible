import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Edit, UserCheck, UserX, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgentStatisticsBadge } from "@/components/admin/AgentStatisticsBadge";

interface Agent {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  tidycal_url?: string;
  region_round_robin?: string;
  activo: boolean;
}

export default function AdminAgentes() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [editModal, setEditModal] = useState<{
    open: boolean;
    agent: Agent | null;
  }>({ open: false, agent: null });

  const [editFormData, setEditFormData] = useState({
    nombre: "",
    telefono: "",
    tidycal_url: "",
    region_round_robin: "",
    activo: true,
  });

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, email, telefono, tidycal_url, region_round_robin, activo, role")
        .eq("role", "agente")
        .order("nombre");

      if (error) throw error;
      setAgents(data || []);
      setFilteredAgents(data || []);
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      toast.error("Error al cargar agentes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    let filtered = agents;

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por región
    if (regionFilter !== "all") {
      filtered = filtered.filter((a) => a.region_round_robin === regionFilter);
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.activo === (statusFilter === "active"));
    }

    setFilteredAgents(filtered);
  }, [searchTerm, regionFilter, statusFilter, agents]);

  const handleEdit = (agent: Agent) => {
    setEditFormData({
      nombre: agent.nombre,
      telefono: agent.telefono || "",
      tidycal_url: agent.tidycal_url || "",
      region_round_robin: agent.region_round_robin || "",
      activo: agent.activo,
    });
    setEditModal({ open: true, agent });
  };

  const handleSaveEdit = async () => {
    if (!editModal.agent) return;

    if (!editFormData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (editFormData.tidycal_url && !editFormData.tidycal_url.startsWith("https://tidycal.com/")) {
      toast.error("La URL de Tidycal debe comenzar con https://tidycal.com/");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: editFormData.nombre.trim(),
          telefono: editFormData.telefono.trim() || null,
          tidycal_url: editFormData.tidycal_url.trim() || null,
          region_round_robin: editFormData.region_round_robin || null,
          activo: editFormData.activo,
        })
        .eq("id", editModal.agent.id);

      if (error) throw error;

      toast.success("Agente actualizado correctamente");
      setEditModal({ open: false, agent: null });
      fetchAgents();
    } catch (error: any) {
      console.error("Error updating agent:", error);
      toast.error("Error al actualizar agente");
    }
  };

  const toggleAgentStatus = async (agent: Agent) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ activo: !agent.activo })
        .eq("id", agent.id);

      if (error) throw error;

      toast.success(`Agente ${!agent.activo ? "activado" : "desactivado"} correctamente`);
      fetchAgents();
    } catch (error: any) {
      console.error("Error toggling agent status:", error);
      toast.error("Error al cambiar estado del agente");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sky-blue-light p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/inventario/admin/crm")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Gestión de Agentes</CardTitle>
            <CardDescription>
              Administra los agentes y su configuración de Round-Robin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label>Buscar</Label>
                <Input
                  placeholder="Nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label>Región</Label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Cataluña">Cataluña</SelectItem>
                    <SelectItem value="Geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabela */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>URL Tidycal</TableHead>
                    <TableHead>Región</TableHead>
                    <TableHead>Estadísticas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow 
                      key={agent.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/agentes/${agent.id}`)}
                    >
                      <TableCell className="font-medium">{agent.nombre}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>{agent.telefono || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {agent.tidycal_url ? (
                          <a
                            href={agent.tidycal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {agent.tidycal_url}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Sin configurar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {agent.region_round_robin ? (
                          <Badge variant="outline">{agent.region_round_robin}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AgentStatisticsBadge agentId={agent.id} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={agent.activo ? "default" : "secondary"}>
                          {agent.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(agent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={agent.activo ? "destructive" : "default"}
                          onClick={() => toggleAgentStatus(agent)}
                        >
                          {agent.activo ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No se encontraron agentes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de edição */}
        <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Agente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre *</Label>
                <Input
                  id="edit-nombre"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editModal.agent?.email || ""} disabled className="bg-gray-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={editFormData.telefono}
                  onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tidycal">URL Tidycal</Label>
                <Input
                  id="edit-tidycal"
                  value={editFormData.tidycal_url}
                  onChange={(e) => setEditFormData({ ...editFormData, tidycal_url: e.target.value })}
                  placeholder="https://tidycal.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-region">Región Round-Robin</Label>
                <Select
                  value={editFormData.region_round_robin}
                  onValueChange={(value) => setEditFormData({ ...editFormData, region_round_robin: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona región" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cataluña">Cataluña</SelectItem>
                    <SelectItem value="Geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-activo"
                  checked={editFormData.activo}
                  onChange={(e) => setEditFormData({ ...editFormData, activo: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-activo">Agente activo</Label>
              </div>

              <Button onClick={handleSaveEdit} className="w-full">
                Guardar Cambios
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
