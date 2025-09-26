import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateInmuebleData, DatabaseInmueble } from "@/hooks/useInmuebles";

interface EditInmuebleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inmueble: DatabaseInmueble;
  onUpdateInmueble: (id: string, data: Partial<CreateInmuebleData>) => Promise<{ data: any; error: any }>;
  isSubmitting: boolean;
}

export function EditInmuebleModal({
  open,
  onOpenChange,
  inmueble,
  onUpdateInmueble,
  isSubmitting
}: EditInmuebleModalProps) {
  const [formData, setFormData] = useState<{
    ciudad: string;
    region: string;
    tipo: CreateInmuebleData['tipo'];
    precio: string;
    direccion: string;
    proveedor: string;
    codigo_inventario: string;
  }>({
    ciudad: '',
    region: '',
    tipo: 'apartamento',
    precio: '',
    direccion: '',
    proveedor: '',
    codigo_inventario: '',
  });

  useEffect(() => {
    if (inmueble && open) {
      setFormData({
        ciudad: inmueble.ciudad,
        region: inmueble.region,
        tipo: inmueble.tipo,
        precio: inmueble.precio.toString(),
        direccion: inmueble.direccion,
        proveedor: inmueble.proveedor,
        codigo_inventario: inmueble.codigo_inventario || '',
      });
    }
  }, [inmueble, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: Partial<CreateInmuebleData> = {
      ciudad: formData.ciudad,
      region: formData.region,
      tipo: formData.tipo,
      precio: parseInt(formData.precio),
      direccion: formData.direccion,
      proveedor: formData.proveedor,
      codigo_inventario: formData.codigo_inventario || undefined,
    };

    console.log('[Edit Property]', { inmuebleId: inmueble.id, changes: updateData });

    const { error } = await onUpdateInmueble(inmueble.id, updateData);
    
    if (!error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Inmueble</DialogTitle>
          <DialogDescription>
            Modifica los datos de la propiedad
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ciudad">Ciudad</Label>
              <Input
                id="edit-ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData(prev => ({...prev, ciudad: e.target.value}))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-region">Región</Label>
              <Input
                id="edit-region"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({...prev, region: e.target.value}))}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tipo">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(value: CreateInmuebleData['tipo']) => setFormData(prev => ({...prev, tipo: value}))}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="edit-precio">Precio (€)</Label>
              <Input
                id="edit-precio"
                type="number"
                value={formData.precio}
                onChange={(e) => setFormData(prev => ({...prev, precio: e.target.value}))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-direccion">Dirección</Label>
            <Input
              id="edit-direccion"
              value={formData.direccion}
              onChange={(e) => setFormData(prev => ({...prev, direccion: e.target.value}))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-proveedor">Proveedor</Label>
            <Input
              id="edit-proveedor"
              value={formData.proveedor}
              onChange={(e) => setFormData(prev => ({...prev, proveedor: e.target.value}))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-codigo">Código de Inventario</Label>
            <Input
              id="edit-codigo"
              value={formData.codigo_inventario}
              onChange={(e) => setFormData(prev => ({...prev, codigo_inventario: e.target.value}))}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}