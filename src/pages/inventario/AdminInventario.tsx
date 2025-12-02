import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { InmuebleCard } from "@/components/inventario/InmuebleCard";
import { EditInmuebleModal } from "@/components/inventario/EditInmuebleModal";
import { CreateReservaModal } from "@/components/inventario/CreateReservaModal";
import { SearchBarAutocomplete } from "@/components/inventario/SearchBarAutocomplete";
import { ScrapingModal } from "@/components/inventario/ScrapingModal";
import { useInmuebles, CreateInmuebleData, DatabaseInmueble } from "@/hooks/useInmuebles";
import { useReservas, DatabaseReserva } from "@/hooks/useReservas";
import { useAgentes } from "@/hooks/useAgentes";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Upload, Users, Building2, Calendar, Trash2, Edit, Download, FileJson, X } from "lucide-react";
import { toast } from "sonner";
import { Inmueble } from "@/types/inventario";
import { AdminLayout } from "@/components/admin/AdminLayout";

const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

const contarVisitasSemanaAtual = (visitas: DatabaseReserva[]): number => {
  const hoje = new Date();
  const semanaAtual = getWeekNumber(hoje);
  const anoAtual = hoje.getFullYear();
  
  return visitas.filter(v => {
    if (!v.fecha_visita || v.estado === 'cancelada') return false;
    const visitaDate = new Date(v.fecha_visita);
    return getWeekNumber(visitaDate) === semanaAtual && 
           visitaDate.getFullYear() === anoAtual;
  }).length;
};

const AdminInventario = () => {
  const { profile, signOut } = useAuth();
  const { inmuebles, loading, createInmueble, updateInmueble, deleteInmueble, deleteMultipleInmuebles, fetchInmuebles } = useInmuebles();
  const { reservas, createReserva, deleteReserva, fetchReservasByInmueble } = useReservas();
  const { agentes } = useAgentes();
  
  const [activeTab, setActiveTab] = useState("inmuebles");
  const [showCreateInmueble, setShowCreateInmueble] = useState(false);
  const [showCreateReserva, setShowCreateReserva] = useState(false);
  const [showEditInmueble, setShowEditInmueble] = useState(false);
  const [selectedInmuebleForEdit, setSelectedInmuebleForEdit] = useState<DatabaseInmueble | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInmuebles, setSelectedInmuebles] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [visitasPorInmueble, setVisitasPorInmueble] = useState<Record<string, DatabaseReserva[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(48);
  const [totalInmuebles, setTotalInmuebles] = useState(0);
  const totalPages = Math.ceil(totalInmuebles / itemsPerPage);

  // ✅ FASE 3: Hash estável para IDs dos imóveis
  const inmueblesIdsHash = useMemo(
    () => inmuebles.map(i => i.id).sort().join(','),
    [inmuebles.length]
  );

  // Fetch paginado inicial
  useEffect(() => {
    console.log('🔴 [Debug] AdminInventario - useEffect loadPage disparado');
    const loadPage = async () => {
      console.log("[AdminInventario] Cargando página", currentPage);
      const result = await fetchInmuebles(currentPage, itemsPerPage);
      setTotalInmuebles(result.total);
    };
    loadPage();
  }, [currentPage, itemsPerPage]);

  // Form states
  const [newInmueble, setNewInmueble] = useState<{
    ciudad: string;
    region: string;
    tipo: CreateInmuebleData['tipo'] | '';
    precio: string;
    direccion: string;
    proveedor: string;
    codigo_inventario: string;
  }>({
    ciudad: "",
    region: "",
    tipo: "",
    precio: "",
    direccion: "",
    proveedor: "",
    codigo_inventario: "",
  });

  useEffect(() => {
    console.log("[Inventario] Panel de administración cargado");
  }, []);

  useEffect(() => {
    console.log('🟡 [Debug] AdminInventario - useEffect cargarVisitas disparado');
    const cargarVisitas = async () => {
      if (inmuebles.length === 0) {
        setVisitasPorInmueble({});
        return;
      }

      try {
        const ids = inmuebles.map(i => i.id);
        
        const { data: visitas, error } = await supabase
          .from('reservas')
          .select('*')
          .in('inmueble_id', ids);

        if (error) throw error;

        const visitasMap: Record<string, DatabaseReserva[]> = {};
        visitas?.forEach((visita) => {
          if (!visitasMap[visita.inmueble_id]) {
            visitasMap[visita.inmueble_id] = [];
          }
          visitasMap[visita.inmueble_id].push(visita);
        });

        setVisitasPorInmueble(visitasMap);
      } catch (error) {
        console.error('[AdminInventario] Error cargando visitas:', error);
      }
    };
    
    cargarVisitas();
  }, [inmueblesIdsHash]);

  const handleCreateInmueble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInmueble.tipo) {
      toast.error("Selecciona un tipo de inmueble");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const inmuebleData: CreateInmuebleData = {
        ciudad: newInmueble.ciudad,
        region: newInmueble.region,
        tipo: newInmueble.tipo as CreateInmuebleData['tipo'],
        precio: parseInt(newInmueble.precio),
        direccion: newInmueble.direccion,
        proveedor: newInmueble.proveedor,
        codigo_inventario: newInmueble.codigo_inventario || undefined,
      };

      const { error } = await createInmueble(inmuebleData);
      
      if (!error) {
        setNewInmueble({ 
          ciudad: "", 
          region: "", 
          tipo: "", 
          precio: "", 
          direccion: "", 
          proveedor: "", 
          codigo_inventario: "" 
        });
        setShowCreateInmueble(false);
      }
    } catch (error) {
      console.error("[Inventario] Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: Implementar gestión de agentes con Supabase Auth
  const handleCreateAgente = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Función en desarrollo: Crear agentes con Supabase Auth");
  };

  const handleDeleteInmueble = async (id: string) => {
    await deleteInmueble(id);
  };

  const handleBulkDelete = async () => {
    if (selectedInmuebles.length === 0) {
      toast.error("Selecciona al menos un inmueble para eliminar");
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteMultipleInmuebles(selectedInmuebles);
      setSelectedInmuebles([]);
      setShowBulkActions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectInmueble = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInmuebles(prev => [...prev, id]);
    } else {
      setSelectedInmuebles(prev => prev.filter(inmuebleId => inmuebleId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInmuebles(inmuebles.map(i => i.id));
    } else {
      setSelectedInmuebles([]);
    }
  };

  const handleDeleteReserva = async (id: string) => {
    await deleteReserva(id);
  };

  const handleCreateReserva = async (data: any) => {
    setIsSubmitting(true);
    try {
      const result = await createReserva(data);
      if (!result.error) {
        setShowCreateReserva(false);
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInmueble = (inmueble: Inmueble) => {
    const dbInmueble = inmuebles.find(i => i.id === inmueble.id);
    if (dbInmueble) {
      setSelectedInmuebleForEdit(dbInmueble);
      setShowEditInmueble(true);
    }
  };

  const handleUpdateInmueble = async (id: string, data: Partial<CreateInmuebleData>) => {
    return await updateInmueble(id, data);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim()); // Filtrar líneas vacías
      
      console.log('[CSV Import] Iniciando importación de', lines.length - 1, 'registros');
      
      let successCount = 0;
      let errorCount = 0;
      const processedData: CreateInmuebleData[] = [];
      
      // Procesar cada línea (saltando header si existe)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Usar regex para manejar comas dentro de comillas
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(val => 
          val.replace(/^"(.*)"$/, '$1').trim()
        ) || [];
        
        // Orden: Ciudad, Región, Tipo, Precio (€), Dirección, Proveedor, Código de Inventario
        if (values.length >= 6) {
          const tipoValue = values[2]?.toLowerCase() || '';
          let tipo: CreateInmuebleData['tipo'];
          
          // Mapear tipos CSV exactamente
          switch (tipoValue) {
            case 'piso':
            case 'apartamento':
              tipo = 'apartamento';
              break;
            case 'casa':
            case 'chalet':
              tipo = 'casa';
              break;
            case 'local':
            case 'local comercial':
            case 'local_comercial':
              tipo = 'local_comercial';
              break;
            case 'terreno':
              tipo = 'terreno';
              break;
            case 'oficina':
              tipo = 'oficina';
              break;
            default:
              console.warn(`[CSV Import] Tipo desconocido '${tipoValue}', usando 'apartamento'`);
              tipo = 'apartamento';
          }

          // Limpiar precio - remover símbolos y espacios
          const precioStr = values[3]?.replace(/[€\s,\.]/g, '') || '0';
          const precio = parseInt(precioStr) || 0;
          
          if (precio === 0) {
            console.warn(`[CSV Import] Precio inválido en línea ${i + 1}: '${values[3]}'`);
          }

          const inmuebleData: CreateInmuebleData = {
            ciudad: values[0] || '', // Campo en blanco permitido
            region: values[1] || '', // Campo en blanco permitido  
            tipo,
            precio,
            direccion: values[4] || '', // Campo en blanco permitido
            proveedor: values[5] || '', // Campo en blanco permitido
            codigo_inventario: values[6] || undefined, // Campo opcional
          };
          
          processedData.push(inmuebleData);
          console.log(`[CSV Import] Línea ${i + 1}:`, inmuebleData);

          const { error } = await createInmueble(inmuebleData);
          if (error) {
            console.error(`[CSV Import] Error línea ${i + 1}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          console.warn(`[CSV Import] Línea ${i + 1} tiene columnas insuficientes:`, values.length);
          errorCount++;
        }
      }

      console.log('[CSV Import]', { 
        total: lines.length - 1,
        successful: successCount, 
        errors: errorCount,
        processedData 
      });

      if (successCount > 0) {
        toast.success(`${successCount} inmuebles importados correctamente`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} líneas no pudieron ser procesadas`);
      }
      
    } catch (error) {
      toast.error("Error al procesar el archivo CSV");
      console.error("[CSV Import] Error general:", error);
    } finally {
      setIsSubmitting(false);
    }

    // Reset input
    event.target.value = "";
  };

  // Parser JSON - Função para processar arquivos JSON do Solvia
  const parseAddress = (address: string): { ciudad: string; region: string; direccion: string } => {
    // Exemplo: "Toledo , Carpio de Tajo (El) - C/ El Sol"
    const parts = address.split(' - ');
    const direccion = parts[1]?.trim() || '';
    
    const locationParts = parts[0].split(' , ');
    const region = locationParts[0]?.trim() || '';
    const ciudad = locationParts[1]?.trim() || '';
    
    return { ciudad, region, direccion };
  };

  const mapPropertyType = (jsonType: string | null): CreateInmuebleData['tipo'] => {
    const typeMap: Record<string, CreateInmuebleData['tipo']> = {
      'piso': 'apartamento',
      'chalet': 'casa',
      'garaje': 'local_comercial',
    };
    
    return typeMap[jsonType?.toLowerCase() || ''] || 'apartamento';
  };

  // ============================================
  // 🔧 PARSERS UNIVERSAIS - COMPATIBILIDADE TOTAL
  // ============================================

  // 1️⃣ Parser de Preço (aceita número ou string formatada)
  const parsePrice = (priceValue: any): number => {
    if (typeof priceValue === 'number') return priceValue;
    
    if (typeof priceValue === 'string') {
      const cleaned = priceValue.replace(/[€\s\.]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  };

  // 2️⃣ Parser de Área (aceita número ou string com unidade)
  const parseArea = (areaValue: any): number | undefined => {
    if (typeof areaValue === 'number') return areaValue;
    if (!areaValue) return undefined;
    
    if (typeof areaValue === 'string') {
      const cleaned = areaValue.replace(/m[2²]|\s/gi, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    
    return undefined;
  };

  // 3️⃣ Parser de Números Simples (quartos/banheiros)
  const parseSimpleNumber = (value: any): number | undefined => {
    if (typeof value === 'number') return value;
    if (!value || value === '-') return undefined;
    
    if (typeof value === 'string') {
      const parsed = parseInt(value.trim());
      return isNaN(parsed) ? undefined : parsed;
    }
    
    return undefined;
  };

  // 4️⃣ Auto-detectar Tipo de Propriedade
  const detectPropertyType = (title: string = '', url: string = ''): CreateInmuebleData['tipo'] => {
    const text = `${title} ${url}`.toLowerCase();
    
    if (text.includes('piso') || text.includes('apartamento') || 
        text.includes('duplex') || text.includes('dúplex') || text.includes('ático')) {
      return 'apartamento';
    }
    
    if (text.includes('chalet') || text.includes('casa') || 
        text.includes('adosado') || text.includes('unifamiliar')) {
      return 'casa';
    }
    
    if (text.includes('local') || text.includes('garaje') || 
        text.includes('nave') || text.includes('comercial')) {
      return 'local_comercial';
    }
    
    if (text.includes('terreno') || text.includes('parcela') || 
        text.includes('solar') || text.includes('suelo')) {
      return 'terreno';
    }
    
    if (text.includes('oficina') || text.includes('despacho')) {
      return 'oficina';
    }
    
    return 'apartamento';
  };

  // 5️⃣ Gerar chave única do produto (proveedor + codigo_inventario)
  const generateProductKey = (proveedor: string, codigoInventario?: string): string => {
    return `${proveedor}:${codigoInventario || 'unknown'}`;
  };

  // ============================================
  // 🔄 SINCRONIZAÇÃO INTELIGENTE DE INVENTÁRIO
  // ============================================
  const syncInventory = async (newProducts: CreateInmuebleData[], proveedor: string) => {
    console.log(`[Sync] Iniciando sincronização para proveedor: ${proveedor}`);
    console.log(`[Sync] Novos produtos recebidos: ${newProducts.length}`);
    
    try {
      // 1️⃣ Buscar produtos existentes do proveedor
      const { data: existingProducts, error: fetchError } = await supabase
        .from('inmuebles')
        .select('id, codigo_inventario, proveedor, precio, quartos, banheiros, area_m2, titulo, direccion, image_url, images')
        .eq('proveedor', proveedor);

      if (fetchError) throw fetchError;

      console.log(`[Sync] Produtos existentes no BD: ${existingProducts?.length || 0}`);

      // 2️⃣ Buscar produtos protegidos (com reservas ou leads)
      const { data: protectedIds, error: protectedError } = await supabase
        .rpc('get_protected_inmuebles', { provider: proveedor });

      if (protectedError) throw protectedError;

      const protectedSet = new Set(protectedIds?.map((p: any) => p.inmueble_id) || []);
      console.log(`[Sync] Produtos protegidos: ${protectedSet.size}`);

      // 3️⃣ Criar mapas para identificação
      const existingMap = new Map(
        (existingProducts || []).map(p => [
          generateProductKey(p.proveedor, p.codigo_inventario),
          p
        ])
      );

      const newProductsMap = new Map(
        newProducts.map(p => [
          generateProductKey(p.proveedor, p.codigo_inventario),
          p
        ])
      );

      // 4️⃣ Classificar produtos
      const toAdd: CreateInmuebleData[] = [];
      const toUpdate: { id: string; updates: Partial<CreateInmuebleData> }[] = [];
      const toDisable: string[] = [];

      // Identificar novos e atualizações
      for (const [key, newProduct] of newProductsMap.entries()) {
        const existing = existingMap.get(key);
        
        if (!existing) {
          // Produto novo
          toAdd.push(newProduct);
        } else {
          // Verificar se precisa atualizar
          const needsUpdate = 
            existing.precio !== newProduct.precio ||
            existing.quartos !== newProduct.quartos ||
            existing.banheiros !== newProduct.banheiros ||
            existing.area_m2 !== newProduct.area_m2 ||
            existing.titulo !== newProduct.titulo ||
            existing.direccion !== newProduct.direccion ||
            existing.image_url !== newProduct.image_url;

          if (needsUpdate) {
            toUpdate.push({
              id: existing.id,
              updates: newProduct
            });
          }
        }
      }

      // Identificar produtos para desabilitar (não no JSON novo e não protegidos)
      for (const [key, existing] of existingMap.entries()) {
        if (!newProductsMap.has(key) && !protectedSet.has(existing.id)) {
          toDisable.push(existing.id);
        }
      }

      console.log(`[Sync] Classificação:`, {
        toAdd: toAdd.length,
        toUpdate: toUpdate.length,
        toDisable: toDisable.length,
        protected: protectedSet.size
      });

      // 5️⃣ Executar operações em lotes
      let addedCount = 0;
      let updatedCount = 0;
      let disabledCount = 0;

      // Adicionar novos usando UPSERT (batches de 100)
      if (toAdd.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
          const batch = toAdd.slice(i, i + BATCH_SIZE);
          
          // Usar UPSERT para evitar duplicados
          const { data, error } = await supabase
            .from('inmuebles')
            .upsert(batch, { 
              onConflict: 'codigo_inventario,proveedor',
              ignoreDuplicates: false 
            })
            .select();

          if (error) {
            console.error('[Sync] Erro ao adicionar/atualizar batch:', error);
          } else {
            addedCount += data.length;
            toast.info(`➕ Sincronizando: ${addedCount}/${toAdd.length}`, { id: 'sync-progress' });
          }
        }
      }

      // Atualizar existentes (batches de 50)
      if (toUpdate.length > 0) {
        for (const { id, updates } of toUpdate) {
          const { error } = await supabase
            .from('inmuebles')
            .update(updates)
            .eq('id', id);

          if (!error) {
            updatedCount++;
            if (updatedCount % 10 === 0) {
              toast.info(`🔄 Atualizando: ${updatedCount}/${toUpdate.length}`, { id: 'sync-progress' });
            }
          }
        }
      }

      // Desabilitar removidos (batch único)
      if (toDisable.length > 0) {
        const { error } = await supabase
          .from('inmuebles')
          .update({ disponible: false })
          .in('id', toDisable);

        if (!error) {
          disabledCount = toDisable.length;
        }
      }

      return {
        added: addedCount,
        updated: updatedCount,
        disabled: disabledCount,
        protected: protectedSet.size,
        errors: 0
      };

    } catch (err: any) {
      console.error('[Sync] Erro na sincronização:', err);
      throw err;
    }
  };

  const handleJSONUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Por favor, seleccione un archivo JSON válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      console.log('[JSON Import] Archivo cargado:', jsonData);
      
      const items = jsonData.items || [];
      const validItems: CreateInmuebleData[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // ✅ Validação UNIVERSAL - detecta ambos os formatos
          const precioRaw = item.price || item.price_eur;
          if (!precioRaw || !item.address) {
            errors.push(`Item ${i + 1}: Preço ou endereço ausente`);
            continue;
          }
          
          const { ciudad, region, direccion } = parseAddress(item.address);
          
          // ⚠️ Validação mais flexível - permite endereços parciais
          if (!ciudad && !region && !direccion) {
            errors.push(`Item ${i + 1}: Endereço completamente inválido: "${item.address}"`);
            continue;
          }
          
          // Extraer código de inventario de la URL
          let codigoInventario: string | undefined;
          if (item.url) {
            const urlParts = item.url.split('-');
            codigoInventario = urlParts[urlParts.length - 1];
          }

          // ✅ Processar imagens - TODOS OS FORMATOS
          let images: string[] | undefined;
          if (item.images && Array.isArray(item.images)) {
            images = item.images;
          } else if (item.image_urls && Array.isArray(item.image_urls)) {
            images = item.image_urls;
          } else if (item.image_url && typeof item.image_url === 'string') {
            images = [item.image_url];
          } else if (item.image && typeof item.image === 'string') {
            // ✨ NOVO: suporte ao campo "image" (formato novo)
            images = [item.image];
          }

          // ✅ Pegar primeira imagem para compatibilidade
          const firstImage = images?.[0] || item.image_url || item.image || '';

          // ✅ Detectar proveedor do JSON (source ou portal)
          const proveedor = jsonData.source || jsonData.portal || 'Solvia';
          
          const inmueble: CreateInmuebleData = {
            titulo: item.title || '',
            ciudad: ciudad || 'N/D',
            region: region || 'N/D',
            tipo: item.property_type 
              ? mapPropertyType(item.property_type)
              : detectPropertyType(item.title, item.url),
            precio: parsePrice(precioRaw),
            direccion,
            proveedor: proveedor,
            quartos: parseSimpleNumber(item.rooms),
            banheiros: parseSimpleNumber(item.bathrooms),
            area_m2: parseArea(item.area || item.area_m2),
            url_externa: item.url || '',
            image_url: firstImage,
            images: images,
            codigo_inventario: codigoInventario,
          };
          
          validItems.push(inmueble);
          
        } catch (err: any) {
          errors.push(`Item ${i + 1}: ${err.message}`);
        }
      }
      
      console.log('[JSON Import] Items válidos:', validItems.length);
      console.log('[JSON Import] Erros:', errors);
      
      if (errors.length > 0) {
        console.warn('[JSON Import] Errores encontrados:', errors);
        toast.warning(`${errors.length} items con problemas (verifique console)`);
      }
      
      if (validItems.length === 0) {
        toast.error('Ningún item válido encontrado en el JSON');
        setIsSubmitting(false);
        return;
      }
      
      // 🔄 SINCRONIZAÇÃO INTELIGENTE DE INVENTÁRIO
      const proveedor = jsonData.source || jsonData.portal || 'Solvia';
      console.log(`[JSON Import] Iniciando sincronização para: ${proveedor}`);
      
      const syncResult = await syncInventory(validItems, proveedor);
      
      // Refresh the list after sync
      await fetchInmuebles();
      
      // Toast detalhado com resumo
      const summaryLines = [
        `✅ ${syncResult.added} novos produtos adicionados`,
        `🔄 ${syncResult.updated} produtos atualizados`,
        `❌ ${syncResult.disabled} produtos desabilitados`,
        syncResult.protected > 0 ? `🛡️ ${syncResult.protected} produtos protegidos (mantidos)` : null
      ].filter(Boolean);

      toast.success(
        <div className="space-y-1">
          <div className="font-bold">Sincronização concluída!</div>
          {summaryLines.map((line, i) => (
            <div key={i} className="text-sm">{line}</div>
          ))}
        </div>,
        { 
          id: 'sync-progress',
          duration: 6000
        }
      );
      
      console.log('[JSON Import] Sincronização concluída:', syncResult);
      
      
    } catch (error: any) {
      console.error('[JSON Import] Error:', error);
      toast.error('Error al procesar archivo JSON');
    } finally {
      setIsSubmitting(false);
    }
    
    // Reset input
    event.target.value = '';
  };


  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente');

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inmuebles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInmuebles}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visitas Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservasPendientes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inmuebles.filter(i => i.disponible).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inmuebles">Inmuebles</TabsTrigger>
            <TabsTrigger value="reservas">Reservas</TabsTrigger>
          </TabsList>

          {/* Inmuebles Tab */}
          <TabsContent value="inmuebles" className="space-y-6">
              <div className="mb-6">
                <SearchBarAutocomplete
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                {searchTerm && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      Buscando: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm("")}
                        className="ml-2 hover:text-foreground"
                      >
                        ✕
                      </button>
                    </Badge>
                  </div>
                )}
              </div>

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestión de Inmuebles</h2>
              <div className="flex gap-2">
                {selectedInmuebles.length > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm text-muted-foreground">
                      {selectedInmuebles.length} seleccionados
                    </span>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Seleccionados
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedInmuebles([]);
                        setShowBulkActions(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir CSV
                    </span>
                  </Button>
                </Label>
                
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJSONUpload}
                  className="hidden"
                  id="json-upload"
                />
                <Label htmlFor="json-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <FileJson className="w-4 h-4 mr-2" />
                      Subir JSON
                    </span>
                  </Button>
                </Label>
                
                <ScrapingModal />
                
                <Dialog open={showCreateInmueble} onOpenChange={setShowCreateInmueble}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Inmueble
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Inmueble</DialogTitle>
                      <DialogDescription>
                        Añade un nuevo inmueble al inventario
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateInmueble} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ciudad">Ciudad</Label>
                          <Input
                            id="ciudad"
                            value={newInmueble.ciudad}
                            onChange={(e) => setNewInmueble(prev => ({...prev, ciudad: e.target.value}))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="region">Región</Label>
                          <Input
                            id="region"
                            value={newInmueble.region}
                            onChange={(e) => setNewInmueble(prev => ({...prev, region: e.target.value}))}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select value={newInmueble.tipo} onValueChange={(value: CreateInmuebleData['tipo']) => setNewInmueble(prev => ({...prev, tipo: value}))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
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
                          <Label htmlFor="precio">Precio (€)</Label>
                          <Input
                            id="precio"
                            type="number"
                            value={newInmueble.precio}
                            onChange={(e) => setNewInmueble(prev => ({...prev, precio: e.target.value}))}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                          id="direccion"
                          value={newInmueble.direccion}
                          onChange={(e) => setNewInmueble(prev => ({...prev, direccion: e.target.value}))}
                          required
                        />
                      </div>
                        <div className="space-y-2">
                          <Label htmlFor="proveedor">Proveedor</Label>
                          <Input
                            id="proveedor"
                            value={newInmueble.proveedor}
                            onChange={(e) => setNewInmueble(prev => ({...prev, proveedor: e.target.value}))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="codigo_inventario">Código de Inventario</Label>
                          <Input
                            id="codigo_inventario"
                            value={newInmueble.codigo_inventario}
                            onChange={(e) => setNewInmueble(prev => ({...prev, codigo_inventario: e.target.value}))}
                          />
                        </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCreateInmueble(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Creando..." : "Crear Inmueble"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Bulk selection controls */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedInmuebles.length === inmuebles.length && inmuebles.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Seleccionar todos ({inmuebles.length})
                </Label>
              </div>
              
              {!showBulkActions && selectedInmuebles.length === 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkActions(true)}
                >
                  Modo Selección
                </Button>
              )}
            </div>

            {/* Controles de paginação */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  Total: {totalInmuebles} inmuebles
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                // Loading skeletons
                Array.from({ length: 12 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                inmuebles
                  .filter(inmueble => {
                    if (!searchTerm.trim()) return true;
                    const searchLower = searchTerm.toLowerCase();
                    return (
                      inmueble.ciudad.toLowerCase().includes(searchLower) ||
                      inmueble.direccion.toLowerCase().includes(searchLower) ||
                      inmueble.region.toLowerCase().includes(searchLower) ||
                      (inmueble.titulo && inmueble.titulo.toLowerCase().includes(searchLower)) ||
                      (inmueble.codigo_inventario && inmueble.codigo_inventario.toLowerCase().includes(searchLower))
                    );
                  })
                  .map((inmueble) => {
                    const visitasInmueble = visitasPorInmueble[inmueble.id] || [];
                    const visitasSemana = contarVisitasSemanaAtual(visitasInmueble);
                    
                    return (
                  <div key={inmueble.id} className="relative">
                    {(showBulkActions || selectedInmuebles.length > 0) && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedInmuebles.includes(inmueble.id)}
                          onCheckedChange={(checked) => handleSelectInmueble(inmueble.id, checked as boolean)}
                          className="bg-white"
                        />
                      </div>
                    )}
                    <InmuebleCard 
                      inmueble={{
                        id: inmueble.id,
                        ciudad: inmueble.ciudad,
                        region: inmueble.region,
                        tipo: inmueble.tipo,
                        precio: inmueble.precio,
                        direccion: inmueble.direccion,
                        proveedor: inmueble.proveedor,
                        disponible: inmueble.disponible,
                        fechaCreacion: new Date(inmueble.created_at),
                        agenteAsignado: inmueble.agente_asignado,
                        titulo: inmueble.titulo || undefined,
                        quartos: inmueble.quartos || undefined,
                        banheiros: inmueble.banheiros || undefined,
                        areaM2: inmueble.area_m2 || undefined,
                        urlExterna: inmueble.url_externa || undefined,
                        imageUrl: inmueble.image_url || undefined,
                        codigoInventario: inmueble.codigo_inventario || undefined,
                      }}
                      showSolicitarVisita={false}
                      showEditButton={true}
                      onEdit={handleEditInmueble}
                      visitasAgendadas={visitasSemana}
                      visitasExistentes={visitasInmueble}
                    />
                    {!showBulkActions && selectedInmuebles.length === 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleDeleteInmueble(inmueble.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Agentes Tab - Removed for now */}

          {/* Reservas Tab */}
          <TabsContent value="reservas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reservas de Visitas</h2>
              <Button onClick={() => setShowCreateReserva(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Reserva
              </Button>
            </div>
            
            <div className="grid gap-4">
              {reservas.map((reserva) => {
                return (
                  <Card key={reserva.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          Visita #{reserva.id.slice(-6)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            reserva.estado === 'pendiente' ? 'default' :
                            reserva.estado === 'confirmada' ? 'default' :
                            reserva.estado === 'cancelada' ? 'destructive' : 'default'
                          }>
                            {reserva.estado}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteReserva(reserva.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p><strong>Agente:</strong> {reserva.profiles?.nombre || 'No asignado'}</p>
                        <p><strong>Email:</strong> {reserva.profiles?.email || 'No disponible'}</p>
                        <p><strong>Inmueble:</strong> {reserva.inmuebles?.direccion}, {reserva.inmuebles?.ciudad}</p>
                        <p><strong>Tipo:</strong> {reserva.inmuebles?.tipo} - €{reserva.inmuebles?.precio?.toLocaleString()}</p>
                        <p><strong>Fecha:</strong> {reserva.fecha_visita}</p>
                        <p><strong>Hora:</strong> {reserva.hora_visita}</p>
                        <p><strong>Solicitado:</strong> {new Date(reserva.fecha_solicitud).toLocaleDateString('es-ES')}</p>
                        {reserva.notas && <p><strong>Notas:</strong> {reserva.notas}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <CreateReservaModal
              open={showCreateReserva}
              onOpenChange={setShowCreateReserva}
              onCreateReserva={handleCreateReserva}
              inmuebles={inmuebles}
              agentes={agentes}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
        </Tabs>
        
        {/* Edit Inmueble Modal */}
        {selectedInmuebleForEdit && (
          <EditInmuebleModal
            open={showEditInmueble}
            onOpenChange={setShowEditInmueble}
            inmueble={selectedInmuebleForEdit}
            onUpdateInmueble={handleUpdateInmueble}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInventario;