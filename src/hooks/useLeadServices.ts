import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadServices {
  id: string;
  lead_id: string;
  property_price: number;
  nota_simples: boolean;
  tasaciones: boolean;
  beneficios: boolean;
  inspeccion_tecnica: boolean;
  iva_incluido: boolean;
  comision_vivienda: boolean;
  comision_vivienda_percent: number;
  exclusivo: boolean;
  credito: boolean;
  credito_valor: number;
  hipoteca: boolean;
  hipoteca_percent: number;
  client_company_name?: string;
  client_address?: string;
  client_dni_nif?: string;
  client_email?: string;
  subtotal: number;
  iva_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
}

const FIXED_SERVICES = {
  nota_simples: 30,
  tasaciones: 600,
  beneficios: 290,
  inspeccion_tecnica: 3350,
  iva_incluido: 400
};

export const calculateServicesTotal = (services: Partial<LeadServices>) => {
  let subtotal = 0;
  const propertyPrice = services.property_price || 0;

  if (services.nota_simples) subtotal += FIXED_SERVICES.nota_simples;
  if (services.tasaciones) subtotal += FIXED_SERVICES.tasaciones;
  if (services.beneficios) subtotal += FIXED_SERVICES.beneficios;
  if (services.inspeccion_tecnica) subtotal += FIXED_SERVICES.inspeccion_tecnica;
  if (services.iva_incluido) subtotal += FIXED_SERVICES.iva_incluido;
  
  if (services.comision_vivienda) {
    const maxPercent = services.exclusivo ? 7 : 3;
    const percent = Math.min(services.comision_vivienda_percent || 1, maxPercent);
    subtotal += propertyPrice * (percent / 100);
  }
  
  if (services.credito) {
    subtotal += services.credito_valor || 300;
  }
  
  if (services.hipoteca) {
    const percent = services.hipoteca_percent || 0.4;
    subtotal += propertyPrice * (percent / 100);
  }

  const ivaAmount = subtotal * 0.21;
  const total = subtotal + ivaAmount;

  return { subtotal, ivaAmount, total };
};

export const useLeadServices = (leadId?: string) => {
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['lead-services', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('lead_services')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LeadServices | null;
    },
    enabled: !!leadId
  });

  const saveServices = useMutation({
    mutationFn: async (servicesData: Omit<LeadServices, 'id' | 'created_at' | 'updated_at'>) => {
      const { subtotal, ivaAmount, total } = calculateServicesTotal(servicesData);
      
      const dataToSave = {
        ...servicesData,
        subtotal,
        iva_amount: ivaAmount,
        total
      };

      // Check if services already exist for this lead
      const { data: existing } = await supabase
        .from('lead_services')
        .select('id')
        .eq('lead_id', servicesData.lead_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('lead_services')
          .update(dataToSave)
          .eq('lead_id', servicesData.lead_id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('lead_services')
          .insert(dataToSave)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-services', leadId] });
      toast.success('Servicios guardados exitosamente');
    },
    onError: (error) => {
      console.error('Error saving services:', error);
      toast.error('Error al guardar servicios');
    }
  });

  return {
    services,
    isLoading,
    saveServices,
    FIXED_SERVICES
  };
};
