import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentChecklistItem {
  key: keyof LeadDocumentChecklist;
  label: string;
  description: string;
  required: boolean;
  conditional?: string;
}

export interface LeadDocumentChecklist {
  id: string;
  lead_id: string;
  dni_nie_ambas_caras: boolean;
  dni_pais_origen: boolean;
  ultima_renta: boolean;
  dos_ultimas_rentas_autonomo: boolean;
  cuatro_modelos_trimestrales: boolean;
  contrato_trabajo: boolean;
  tres_ultimas_nominas: boolean;
  vida_laboral: boolean;
  movimientos_bancarios_6_meses: boolean;
  tres_recibos_prestamos: boolean;
  cuadro_amortizacion_prestamos: boolean;
  justificante_deuda_saldada: boolean;
  tres_recibos_hipoteca: boolean;
  cuadro_amortizacion_hipoteca: boolean;
  nota_simple: boolean;
  arras_vivienda_no_bancaria: boolean;
  fotos_vivienda: boolean;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_CHECKLIST: DocumentChecklistItem[] = [
  {
    key: 'dni_nie_ambas_caras',
    label: 'DNI/NIE por ambas caras',
    description: 'Documento de identidad completo (anverso y reverso)',
    required: true,
  },
  {
    key: 'dni_pais_origen',
    label: 'DNI del país de origen',
    description: 'En caso de NIE comunitario de la UE',
    required: false,
    conditional: 'Si NIE de UE',
  },
  {
    key: 'ultima_renta',
    label: 'Última renta',
    description: 'Declaración de la renta del último año',
    required: true,
  },
  {
    key: 'dos_ultimas_rentas_autonomo',
    label: '2 últimas rentas (autónomos)',
    description: 'Declaraciones de renta de los dos últimos años',
    required: false,
    conditional: 'Si es autónomo',
  },
  {
    key: 'cuatro_modelos_trimestrales',
    label: '4 modelos trimestrales',
    description: 'Últimos 4 modelos trimestrales (130, 131, 390...)',
    required: false,
    conditional: 'Si es autónomo',
  },
  {
    key: 'contrato_trabajo',
    label: 'Contrato de trabajo',
    description: 'Contrato laboral vigente',
    required: true,
  },
  {
    key: 'tres_ultimas_nominas',
    label: '3 últimas nóminas',
    description: 'Comprobantes de pago de los últimos 3 meses',
    required: true,
  },
  {
    key: 'vida_laboral',
    label: 'Vida laboral actualizada',
    description: 'Máximo 30 días de antigüedad desde expedición',
    required: true,
  },
  {
    key: 'movimientos_bancarios_6_meses',
    label: 'Movimientos bancarios 6 meses',
    description: 'De todas las cuentas con IBAN + titularidad',
    required: true,
  },
  {
    key: 'tres_recibos_prestamos',
    label: '3 últimos recibos de préstamos',
    description: 'De cada préstamo activo',
    required: false,
    conditional: 'Si tiene préstamos',
  },
  {
    key: 'cuadro_amortizacion_prestamos',
    label: 'Cuadro de amortización de préstamos',
    description: 'De cada préstamo activo',
    required: false,
    conditional: 'Si tiene préstamos',
  },
  {
    key: 'justificante_deuda_saldada',
    label: 'Justificante deuda saldada',
    description: 'Si liquida algún préstamo',
    required: false,
    conditional: 'Si liquida préstamo',
  },
  {
    key: 'tres_recibos_hipoteca',
    label: '3 últimos recibos de hipoteca',
    description: 'Con cuota e importe pendiente visible',
    required: false,
    conditional: 'Si tiene hipoteca',
  },
  {
    key: 'cuadro_amortizacion_hipoteca',
    label: 'Cuadro de amortización de hipoteca',
    description: 'Detalle completo de la hipoteca',
    required: false,
    conditional: 'Si tiene hipoteca',
  },
  {
    key: 'nota_simple',
    label: 'Nota simple',
    description: 'Para pre-tasación y tasación (actualizada para tasación)',
    required: true,
  },
  {
    key: 'arras_vivienda_no_bancaria',
    label: 'Arras',
    description: 'Para viviendas no bancarias',
    required: false,
    conditional: 'Si no es bancaria',
  },
  {
    key: 'fotos_vivienda',
    label: 'Fotos de la vivienda',
    description: 'Para la pre-tasación',
    required: true,
  },
];

export const useLeadDocumentChecklist = (leadId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['lead-document-checklist', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('lead_document_checklist')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LeadDocumentChecklist | null;
    },
    enabled: !!leadId,
  });

  const createChecklist = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase
        .from('lead_document_checklist')
        .insert({ lead_id: leadId })
        .select()
        .single();

      if (error) throw error;
      return data as LeadDocumentChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-document-checklist'] });
    },
    onError: (error: Error) => {
      toast.error('Error al crear checklist: ' + error.message);
    },
  });

  const updateChecklist = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeadDocumentChecklist> }) => {
      const { data, error } = await supabase
        .from('lead_document_checklist')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadDocumentChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-document-checklist'] });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar checklist: ' + error.message);
    },
  });

  const toggleItem = async (itemKey: keyof LeadDocumentChecklist) => {
    if (!checklist) return;
    
    const currentValue = checklist[itemKey];
    await updateChecklist.mutateAsync({
      id: checklist.id,
      updates: { [itemKey]: !currentValue },
    });
  };

  const calculateProgress = (): number => {
    if (!checklist) return 0;
    
    const totalItems = DOCUMENT_CHECKLIST.length;
    const completedItems = DOCUMENT_CHECKLIST.filter(
      (item) => checklist[item.key] === true
    ).length;
    
    return Math.round((completedItems / totalItems) * 100);
  };

  return {
    checklist,
    isLoading,
    createChecklist,
    updateChecklist,
    toggleItem,
    progress: calculateProgress(),
  };
};
