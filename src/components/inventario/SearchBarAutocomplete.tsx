import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";

interface SearchBarAutocompleteProps {
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
  value, 
  onChange 
}: SearchBarAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const { suggestions: filteredSuggestions, loading } = useSearchSuggestions(value);

  // Abrir popover apenas com resultados
  useEffect(() => {
    setOpen(!!filteredSuggestions && value.length >= 1);
  }, [filteredSuggestions, value]);

  const handleSelect = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10 pointer-events-none" />
          <Input
            placeholder="Buscar por ciudad, dirección, región, tipo..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10 pr-10 h-12 text-base"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      
      {filteredSuggestions && (
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          side="bottom"
        >
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {filteredSuggestions.ciudades.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Ciudades
                  </div>
                  {filteredSuggestions.ciudades.map((ciudad) => (
                    <button
                      key={`ciudad-${ciudad}`}
                      onClick={() => handleSelect(ciudad)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    >
                      {ciudad}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredSuggestions.regiones.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Regiones
                  </div>
                  {filteredSuggestions.regiones.map((region) => (
                    <button
                      key={`region-${region}`}
                      onClick={() => handleSelect(region)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredSuggestions.tipos.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Tipos de inmueble
                  </div>
                  {filteredSuggestions.tipos.map((tipo) => (
                    <button
                      key={`tipo-${tipo}`}
                      onClick={() => handleSelect(tipo)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    >
                      {tipoDisplayNames[tipo] || tipo}
                    </button>
                  ))}
                </div>
              )}
              
              {filteredSuggestions.direcciones.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Direcciones
                  </div>
                  {filteredSuggestions.direcciones.map((dir) => (
                    <button
                      key={`dir-${dir}`}
                      onClick={() => handleSelect(dir)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              )}
              
              {!filteredSuggestions.ciudades.length && 
               !filteredSuggestions.regiones.length && 
               !filteredSuggestions.tipos.length && 
               !filteredSuggestions.direcciones.length && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No se encontraron sugerencias
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      )}
    </Popover>
  );
}
