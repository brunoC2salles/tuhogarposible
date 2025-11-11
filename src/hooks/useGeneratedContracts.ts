import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedContract, DatosContrato, TipoContrato } from '@/types/contratos';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { generateContratoCompraVenta, generateContratoAlquiler, generateContratoReserva } from '@/lib/contractGenerator';

export const useGeneratedContracts = (leadId?: string) => {
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['generated-contracts', leadId],
    queryFn: async () => {
      let query = supabase
        .from('generated_contracts')
        .select('*')
        .order('generated_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        datos_contrato: item.datos_contrato as any as DatosContrato
      })) as GeneratedContract[];
    },
    enabled: !!leadId
  });

  const generateContract = useMutation({
    mutationFn: async ({ 
      leadId, 
      inmuebleId, 
      tipoContrato, 
      datosContrato,
      notas 
    }: { 
      leadId: string;
      inmuebleId?: string;
      tipoContrato: TipoContrato;
      datosContrato: DatosContrato;
      notas?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generate PDF based on contract type
      let pdf: jsPDF;
      switch (tipoContrato) {
        case 'compra_venta':
          pdf = generateContratoCompraVenta(datosContrato);
          break;
        case 'alquiler':
          pdf = generateContratoAlquiler(datosContrato);
          break;
        case 'reserva':
          pdf = generateContratoReserva(datosContrato);
          break;
        default:
          pdf = generateContratoCompraVenta(datosContrato);
      }

      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Upload to storage
      const fileName = `${user.id}/${Date.now()}_${tipoContrato}_${leadId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('generated-contracts')
        .upload(fileName, pdfBlob);

      if (uploadError) throw uploadError;

      // Save contract record
      const { data, error } = await supabase
        .from('generated_contracts')
        .insert({
          lead_id: leadId,
          inmueble_id: inmuebleId || null,
          tipo_contrato: tipoContrato,
          datos_contrato: datosContrato as any,
          file_path: fileName,
          generated_by: user.id,
          notas: notas || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-contracts'] });
      toast.success('Contrato generado correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al generar contrato: ' + error.message);
    }
  });

  const getContractUrl = async (filePath: string): Promise<string> => {
    const { data } = await supabase.storage
      .from('generated-contracts')
      .createSignedUrl(filePath, 3600);

    if (!data?.signedUrl) throw new Error('No se pudo generar URL del contrato');
    return data.signedUrl;
  };

  return {
    contracts: contracts || [],
    isLoading,
    generateContract,
    getContractUrl
  };
};
