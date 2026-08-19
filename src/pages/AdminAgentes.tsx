import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Edit, UserCheck, UserX, Trash2, Clock } from "lucide-react";
import { AgentAvailabilityEditor } from "@/components/agents/AgentAvailabilityEditor";
import { AgentStarRating } from "@/components/agents/AgentStarRating";
import { useAuth } from "@/contexts/AuthContext";

interface Agent {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  activo: boolean;
  estrellas?: number;
}


export default function AdminAgentes() {
  const { isAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);

  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editModal, setEditModal] = useState<{ open: boolean; agent: Agent | null }>({
    open: false,
    agent: null,
  });
  const [availabilityModal, setAvailabilityModal] = useState<{ open: boolean; agent: Agent | null }>({
    open: false,
    agent: null,
  });

  const [editFormData, setEditFormData] = useState({
    nombre: "",
    telefono: "",
    activo: true,
  });

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, email, telefono, activo, role, estrellas")
        .eq("role", "agente")
        .order("nombre");

      if (error) throw error;
      const list = (data || []) as Agent[];
      setAgents(list);
      setFilteredAgents(list);
    } catch (error: any) {
      console.error("[AdminAgentes] Error fetching agents:", error);
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
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.activo === (statusFilter === "active"));
    }
    setFilteredAgents(filtered);
  }, [searchTerm, statusFilter, agents]);

  const handleEdit = (agent: Agent) => {
    setEditFormData({
      nombre: agent.nombre,
      telefono: agent.telefono || "",
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
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: editFormData.nombre.trim(),
          telefono: editFormData.telefono.trim() || null,
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

  const updateEstrellas = async (agent: Agent, estrellas: number) => {
    if (!isAdmin) return;
    const prev = agents;
    setAgents((list) => list.map((a) => (a.id === agent.id ? { ...a, estrellas } : a)));
    setFilteredAgents((list) => list.map((a) => (a.id === agent.id ? { ...a, estrellas } : a)));
    const { error } = await supabase.from("profiles").update({ estrellas }).eq("id", agent.id);
    if (error) {
      console.error("Error updating estrellas:", error);
      toast.error("Error al guardar la clasificación");
      setAgents(prev);
      fetchAgents();
      return;
    }
    toast.success(`${agent.nombre}: ${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"}`);
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

  const deleteAgent = async (agent: Agent) => {
    const confirmed = confirm(
      `⚠️ ATENCIÓN: Esta acción es IRREVERSIBLE.\n\n` +
        `¿Eliminar permanentemente al agente ${agent.nombre}?`,
    );
    if (!confirmed) return;

    try {
      const { error: rolesError } = await supabase.from("user_roles").delete().eq("user_id", agent.id);
      if (rolesError) throw rolesError;
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", agent.id);
      if (profileError) throw profileError;
      toast.success(`Agente ${agent.nombre} eliminado permanentemente.`);
      fetchAgents();
    } catch (error: any) {
      console.error("Error deleting agent:", error);
      toast.error(`Error al eliminar agente: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Agentes</h1>
          <p className="text-muted-foreground mt-1">
            Administra los agentes y su disponibilidad horaria semanal
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Agentes</CardTitle>
            <CardDescription>
              Todos los agentes atienden todas las regiones. La asignación de leads se hace por disponibilidad horaria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label>Buscar</Label>
                <Input
                  placeholder="Nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Estado</TableHead>

                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.nombre}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>{agent.telefono || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={agent.activo ? "default" : "secondary"}>
                          {agent.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAvailabilityModal({ open: true, agent })}
                            title="Gestionar disponibilidad"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(agent)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={agent.activo ? "destructive" : "default"}
                            onClick={() => toggleAgentStatus(agent)}
                          >
                            {agent.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteAgent(agent)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No se encontraron agentes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Agente</DialogTitle>
            </DialogHeader>
            <form
              id="edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
              className="space-y-4 py-4"
            >
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-activo"
                  checked={editFormData.activo}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, activo: checked === true })}
                />
                <Label htmlFor="edit-activo">Agente activo</Label>
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModal({ open: false, agent: null })}>
                Cancelar
              </Button>
              <Button type="submit" form="edit-form">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={availabilityModal.open}
          onOpenChange={(open) => setAvailabilityModal({ ...availabilityModal, open })}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Disponibilidad — {availabilityModal.agent?.nombre}</DialogTitle>
            </DialogHeader>
            {availabilityModal.agent && (
              <AgentAvailabilityEditor agentId={availabilityModal.agent.id} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
