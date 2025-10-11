import { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatabaseInmueble } from "@/hooks/useInmuebles";

interface SearchBarAutocompleteProps {
  inmuebles: DatabaseInmueble[];
  value: string;
  onChange: (value: string) => void;
}

const tipoDisplayNames: Record<string, string> = {
  'apartamento': 'Piso',
  'casa': 'Casa',
  'local_comercial': 'Local comercial',
  'terreno': 'Terreno',
  'oficina': 'Oficina'
};

export function SearchBarAutocomplete({ 
  inmuebles, 
  value, 
  onChange 
}: SearchBarAutocompleteProps) {
  const [open, setOpen] = useState(false);

  // Extrair sugestões únicas dos inmuebles
  const suggestions = useMemo(() => {
    const ciudades = [...new Set(inmuebles.map(i => i.ciudad))].map(c => ({
      value: c,
      label: c,
      category: 'Ciudad'
    }));
    
    const regiones = [...new Set(inmuebles.map(i => i.region))].map(r => ({
      value: r,
      label: r,
      category: 'Región'
    }));
    
    const tipos = [...new Set(inmuebles.map(i => i.tipo))].map(t => ({
      value: t,
      label: tipoDisplayNames[t] || t,
      category: 'Tipo'
    }));
    
    // Adicionar endereços únicos (limitado a 10 mais relevantes)
    const direcciones = [...new Set(
      inmuebles
        .filter(i => i.direccion)
        .map(i => i.direccion)
    )]
    .slice(0, 10)
    .map(d => ({
      value: d,
      label: d,
      category: 'Dirección'
    }));

    return {
      ciudades,
      regiones,
      tipos,
      direcciones
    };
  }, [inmuebles]);

  // Filtrar sugestões baseado no input
  const filteredSuggestions = useMemo(() => {
    if (!value || value.length < 1) return null;
    
    const searchLower = value.toLowerCase();
    
    const filtered = {
      ciudades: suggestions.ciudades.filter(s => 
        s.value.toLowerCase().includes(searchLower)
      ),
      regiones: suggestions.regiones.filter(s => 
        s.value.toLowerCase().includes(searchLower)
      ),
      tipos: suggestions.tipos.filter(s => 
        s.value.toLowerCase().includes(searchLower) ||
        s.label.toLowerCase().includes(searchLower)
      ),
      direcciones: suggestions.direcciones.filter(s => 
        s.value.toLowerCase().includes(searchLower)
      )
    };
    
    const totalResults = 
      filtered.ciudades.length + 
      filtered.regiones.length + 
      filtered.tipos.length + 
      filtered.direcciones.length;
    
    return totalResults > 0 ? filtered : null;
  }, [value, suggestions]);

  const handleSelect = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setOpen(newValue.length >= 1);
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10 pointer-events-none" />
      <Popover open={open && !!filteredSuggestions} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            placeholder="Buscar por ciudad, dirección, región, tipo..."
            value={value}
            onChange={handleInputChange}
            onFocus={() => value.length >= 1 && setOpen(true)}
            className="pl-10 h-12 text-base"
          />
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          side="bottom"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {!filteredSuggestions && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No se encontraron sugerencias
                </div>
              )}
              
              {filteredSuggestions?.ciudades && filteredSuggestions.ciudades.length > 0 && (
                <div className="mb-4">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Ciudades
                  </div>
                  {filteredSuggestions.ciudades.map((item) => (
                    <button
                      key={`ciudad-${item.value}`}
                      onClick={() => handleSelect(item.value)}
                      className="w-full text-left px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredSuggestions?.regiones && filteredSuggestions.regiones.length > 0 && (
                <div className="mb-4">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Regiones
                  </div>
                  {filteredSuggestions.regiones.map((item) => (
                    <button
                      key={`region-${item.value}`}
                      onClick={() => handleSelect(item.value)}
                      className="w-full text-left px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredSuggestions?.tipos && filteredSuggestions.tipos.length > 0 && (
                <div className="mb-4">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Tipos de inmueble
                  </div>
                  {filteredSuggestions.tipos.map((item) => (
                    <button
                      key={`tipo-${item.value}`}
                      onClick={() => handleSelect(item.value)}
                      className="w-full text-left px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredSuggestions?.direcciones && filteredSuggestions.direcciones.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Direcciones
                  </div>
                  {filteredSuggestions.direcciones.map((item) => (
                    <button
                      key={`dir-${item.value}`}
                      onClick={() => handleSelect(item.value)}
                      className="w-full text-left px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
