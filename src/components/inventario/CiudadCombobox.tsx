import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CiudadComboboxProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  ciudades: string[];
}

export function CiudadCombobox({ value, onValueChange, ciudades }: CiudadComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filtrar cidades pelo termo de busca, priorizando as que COMEÇAM com o termo
  const searchLower = search.toLowerCase();
  const filteredCiudades = ciudades
    .filter(c => c.toLowerCase().includes(searchLower))
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStartsWith = aLower.startsWith(searchLower);
      const bStartsWith = bLower.startsWith(searchLower);
      
      // Prioridade: cidades que começam com o termo
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Se ambas começam ou não, ordenar alfabeticamente
      return aLower.localeCompare(bLower);
    })
    .slice(0, 50);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Todas las ciudades"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar ciudad..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No se encontró ciudad.</CommandEmpty>
            <CommandGroup>
              <CommandItem 
                value="__todas__"
                onSelect={() => { 
                  onValueChange(undefined); 
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                Todas las ciudades
              </CommandItem>
              {filteredCiudades.map((ciudad) => (
                <CommandItem
                  key={ciudad}
                  value={ciudad}
                  onSelect={() => { 
                    onValueChange(ciudad); 
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === ciudad ? "opacity-100" : "opacity-0")} />
                  {ciudad}
                </CommandItem>
              ))}
              {filteredCiudades.length === 50 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                  Escribe para filtrar más resultados...
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
