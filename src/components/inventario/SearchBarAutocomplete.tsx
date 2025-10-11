import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [inputFocused, setInputFocused] = useState(false);

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
    if (!value || value.length < 2) return null;
    
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

  // Abrir popover quando houver sugestões
  useEffect(() => {
    setOpen(inputFocused && !!filteredSuggestions && value.length >= 2);
  }, [filteredSuggestions, inputFocused, value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
          <Input
            placeholder="Buscar por ciudad, dirección, región, tipo..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </PopoverTrigger>
      
      {filteredSuggestions && (
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          side="bottom"
        >
          <Command>
            <CommandList>
              <CommandEmpty>No se encontraron sugerencias</CommandEmpty>
              
              {filteredSuggestions.ciudades.length > 0 && (
                <CommandGroup heading="Ciudades">
                  {filteredSuggestions.ciudades.map((item) => (
                    <CommandItem
                      key={`ciudad-${item.value}`}
                      value={item.value}
                      onSelect={handleSelect}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {filteredSuggestions.regiones.length > 0 && (
                <CommandGroup heading="Regiones">
                  {filteredSuggestions.regiones.map((item) => (
                    <CommandItem
                      key={`region-${item.value}`}
                      value={item.value}
                      onSelect={handleSelect}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {filteredSuggestions.tipos.length > 0 && (
                <CommandGroup heading="Tipos de inmueble">
                  {filteredSuggestions.tipos.map((item) => (
                    <CommandItem
                      key={`tipo-${item.value}`}
                      value={item.value}
                      onSelect={handleSelect}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {filteredSuggestions.direcciones.length > 0 && (
                <CommandGroup heading="Direcciones">
                  {filteredSuggestions.direcciones.map((item) => (
                    <CommandItem
                      key={`dir-${item.value}`}
                      value={item.value}
                      onSelect={handleSelect}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
