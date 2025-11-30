import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDocuSeal = () => {
  const queryClient = useQueryClient();

  const sendForSignature = useMutation({
    mutationFn: async ({
      contractId,
      signerEmail,
      signerName
    }: {
      contractId: string;
      signerEmail: string;
      signerName?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('docuseal-api/send-for-signature', {
        body: { contractId, signerEmail, signerName }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-contracts'] });
      toast.success('Contrato enviado para assinatura');
    },
    onError: (error: any) => {
      console.error('Error sending for signature:', error);
      toast.error('Erro ao enviar contrato: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const getSignatureStatus = async (submissionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        `docuseal-api/status/${submissionId}`
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching signature status:', error);
      return null;
    }
  };

  return {
    sendForSignature,
    getSignatureStatus
  };
};
