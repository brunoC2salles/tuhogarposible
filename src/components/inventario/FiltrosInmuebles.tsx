import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FiltrosBusqueda } from "@/types/inventario";
import { Filter, Search, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

interface FiltrosInmueblesProps {
  onFiltrosChange: (filtros: FiltrosBusqueda) => void;
  ciudadesDisponibles: string[];
  tiposDisponibles: string[];
}

export function FiltrosInmuebles({ 
  onFiltrosChange, 
  ciudadesDisponibles, 
  tiposDisponibles 
}: FiltrosInmueblesProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosBusqueda>({
    precioMin: 0,
    precioMax: 450000,
  });

  const handleFiltroChange = (key: keyof FiltrosBusqueda, value: any) => {
    let nuevosFiltros = { ...filtros, [key]: value };
    
    // Validación de precio
    if (key === "precioMin" && nuevosFiltros.precioMax && value > nuevosFiltros.precioMax) {
      nuevosFiltros.precioMax = value;
    }
    if (key === "precioMax" && nuevosFiltros.precioMin && value < nuevosFiltros.precioMin) {
      nuevosFiltros.precioMin = value;
    }
    
    setFiltros(nuevosFiltros);
    onFiltrosChange(nuevosFiltros);
    console.log("[Inventario] Filtros actualizados:", nuevosFiltros);
  };

  const handlePrecioChange = (valores: number[]) => {
    const nuevosFiltros = { 
      ...filtros, 
      precioMin: valores[0], 
      precioMax: valores[1] 
    };
    setFiltros(nuevosFiltros);
    onFiltrosChange(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    const filtrosLimpios: FiltrosBusqueda = {
      precioMin: 0,
      precioMax: 450000,
    };
    setFiltros(filtrosLimpios);
    onFiltrosChange(filtrosLimpios);
    console.log("[Inventario] Filtros limpiados");
  };

  const tipoDisplayNames: Record<string, string> = {
    'apartamento': 'Piso',
    'casa': 'Casa',
    'local_comercial': 'Local comercial',
    'terreno': 'Terreno',
    'oficina': 'Oficina'
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const FiltersContent = () => (
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Select
            value={filtros.ciudad || ""}
            onValueChange={(value) => handleFiltroChange("ciudad", value === "todas" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las ciudades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las ciudades</SelectItem>
              {ciudadesDisponibles.map((ciudad) => (
                <SelectItem key={ciudad} value={ciudad}>
                  {ciudad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo de inmueble</Label>
          <Select
            value={filtros.tipo || ""}
            onValueChange={(value) => handleFiltroChange("tipo", value === "todos" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tiposDisponibles.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipoDisplayNames[tipo] || tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quartos">Habitaciones</Label>
          <Select
            value={filtros.quartos?.toString() || ""}
            onValueChange={(value) => handleFiltroChange("quartos", value === "todos" ? undefined : Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Cualquier cantidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Cualquier cantidad</SelectItem>
              <SelectItem value="1">1 habitación</SelectItem>
              <SelectItem value="2">2 habitaciones</SelectItem>
              <SelectItem value="3">3 habitaciones</SelectItem>
              <SelectItem value="4">4+ habitaciones</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Rango de precio</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="precioMin" className="text-xs text-muted-foreground">
              Precio mínimo
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="precioMin"
                type="number"
                min={0}
                max={450000}
                step={1000}
                value={filtros.precioMin || 0}
                onChange={(e) => handleFiltroChange("precioMin", Number(e.target.value))}
                className="pl-8"
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="precioMax" className="text-xs text-muted-foreground">
              Precio máximo
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="precioMax"
                type="number"
                min={0}
                max={450000}
                step={1000}
                value={filtros.precioMax || 450000}
                onChange={(e) => handleFiltroChange("precioMax", Number(e.target.value))}
                className="pl-8"
                placeholder="450000"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
          <span>{formatPrice(filtros.precioMin || 0)}</span>
          <span className="text-xs">→</span>
          <span>{formatPrice(filtros.precioMax || 450000)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={limpiarFiltros} variant="outline" size="sm" className="flex-1">
          <X className="w-4 h-4 mr-1" />
          Limpiar filtros
        </Button>
      </div>
    </CardContent>
  );

  if (isMobile) {
    return (
      <Card className="mb-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros de búsqueda
                </div>
                <Button variant="ghost" size="sm">
                  {isOpen ? "Ocultar" : "Mostrar"}
                </Button>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FiltersContent />
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5" />
          Filtros de búsqueda
        </CardTitle>
      </CardHeader>
      <FiltersContent />
    </Card>
  );
}