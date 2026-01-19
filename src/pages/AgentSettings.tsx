import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TURNOS_DISPONIBILIDAD = [
  { value: 'mañana', label: 'Mañana (08:00-14:00)', icon: '☀️' },
  { value: 'tarde', label: 'Tarde (14:00-20:00)', icon: '🌤️' },
  { value: 'noche', label: 'Noche (20:00-08:00)', icon: '🌙' },
];

export default function AgentSettings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    tidycal_url: "",
    region_round_robin: "",
    disponibilidad: ['mañana', 'tarde', 'noche'] as string[],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || "",
        telefono: profile.telefono || "",
        tidycal_url: (profile as any).tidycal_url || "",
        region_round_robin: (profile as any).region_round_robin || "",
        disponibilidad: (profile as any).disponibilidad || ['mañana', 'tarde', 'noche'],
      });
      setIsLoading(false);
    }
  }, [profile]);

  const handleSave = async () => {
    // Validação básica
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (formData.tidycal_url && !formData.tidycal_url.startsWith("https://tidycal.com/")) {
      toast.error("La URL de Tidycal debe comenzar con https://tidycal.com/");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: formData.nombre.trim(),
          telefono: formData.telefono.trim() || null,
          tidycal_url: formData.tidycal_url.trim() || null,
          region_round_robin: formData.region_round_robin || null,
          disponibilidad: formData.disponibilidad,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDisponibilidad = (turno: string) => {
    if (formData.disponibilidad.includes(turno)) {
      setFormData({
        ...formData,
        disponibilidad: formData.disponibilidad.filter(t => t !== turno)
      });
    } else {
      setFormData({
        ...formData,
        disponibilidad: [...formData.disponibilidad, turno]
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sky-blue-light p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/inventario/agente/crm")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al CRM
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mi Perfil</CardTitle>
            <CardDescription>
              Actualiza tu información personal y configuración de Tidycal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-muted-foreground">El email no puede ser modificado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tidycal_url">URL de Tidycal</Label>
              <Input
                id="tidycal_url"
                value={formData.tidycal_url}
                onChange={(e) => setFormData({ ...formData, tidycal_url: e.target.value })}
                placeholder="https://tidycal.com/tu-usuario/30-minute-meeting"
              />
              <p className="text-sm text-muted-foreground">
                Solo agentes con URL de Tidycal reciben leads automáticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Región Round-Robin</Label>
              <Select
                value={formData.region_round_robin || "none"}
                onValueChange={(value) => setFormData({ ...formData, region_round_robin: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una región" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No asignada al Round Robin</SelectItem>
                  <SelectItem value="Cataluña">Cataluña</SelectItem>
                  <SelectItem value="General">General (todas las demás regiones)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecciona la región donde quieres recibir leads
              </p>
            </div>

            <div className="space-y-3">
              <Label>Disponibilidad (Turnos)</Label>
              <div className="flex flex-wrap gap-4">
                {TURNOS_DISPONIBILIDAD.map((turno) => (
                  <div key={turno.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`agent-turno-${turno.value}`}
                      checked={formData.disponibilidad.includes(turno.value)}
                      onCheckedChange={() => toggleDisponibilidad(turno.value)}
                    />
                    <Label htmlFor={`agent-turno-${turno.value}`} className="font-normal cursor-pointer">
                      {turno.icon} {turno.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Horarios en que puedes recibir leads del sistema Round-Robin
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
