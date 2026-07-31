import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Logo from "@/components/Logo";
import AuthButton from "@/components/AuthButton";
import { useNavigate } from "react-router-dom";
import { AgentAvailabilityEditor } from "@/components/agents/AgentAvailabilityEditor";

export default function AgentSettings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
  });
  const [activo, setActivo] = useState(true);
  const [savingActivo, setSavingActivo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || "",
        telefono: profile.telefono || "",
      });
      setActivo(profile.activo ?? true);
      setIsLoading(false);
    }
  }, [profile]);

  const handleToggleActivo = async (next: boolean) => {
    const prev = activo;
    setActivo(next);
    setSavingActivo(true);
    const { error } = await supabase.from("profiles").update({ activo: next }).eq("id", user?.id);
    setSavingActivo(false);
    if (error) {
      setActivo(prev);
      toast.error("Error al actualizar tu disponibilidad");
      return;
    }
    toast.success(next ? "Ahora recibirás nuevos leads" : "No recibirás nuevos leads");
  };


  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: formData.nombre.trim(),
          telefono: formData.telefono.trim() || null,
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

  if (isLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sky-blue-light p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Logo size="sm" />
          </div>
          <AuthButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mi Perfil</CardTitle>
            <CardDescription>Actualiza tu información personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled className="bg-gray-100" />
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
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="pr-4">
                <Label htmlFor="activo" className="text-base">Disponible para recibir leads</Label>
                <p className="text-sm text-muted-foreground">
                  Si lo desactivas, el reparto automático (round-robin) dejará de asignarte leads nuevos.
                </p>
              </div>
              <Switch id="activo" checked={activo} disabled={savingActivo} onCheckedChange={handleToggleActivo} />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mi Disponibilidad</CardTitle>
            <CardDescription>
              Define los días y horarios en los que puedes atender leads. El sistema asignará automáticamente los leads
              a los agentes disponibles en el horario de la reunión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentAvailabilityEditor agentId={user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
