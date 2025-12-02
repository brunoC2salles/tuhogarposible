import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicContractLink } from '@/types/contratos';
import { toast } from 'sonner';

export const usePublicContractLinks = (leadId?: string) => {
  const queryClient = useQueryClient();

  const { data: links, isLoading } = useQuery({
    queryKey: ['public-contract-links', leadId],
    queryFn: async () => {
      let query = supabase
        .from('public_contract_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PublicContractLink[];
    },
    enabled: !!leadId
  });

  const generateLink = useMutation({
    mutationFn: async ({
      leadId,
      templateId,
      expiresInDays = 7
    }: {
      leadId: string;
      templateId: string;
      expiresInDays?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('public_contract_links')
        .insert({
          token,
          lead_id: leadId,
          template_id: templateId,
          agente_id: user.id,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-contract-links'] });
      toast.success('Link gerado com sucesso');
    },
    onError: (error: any) => {
      console.error('[Contract Links] Generate error:', error);
      toast.error('Erro ao gerar link');
    }
  });

  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('public_contract_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-contract-links'] });
      toast.success('Link eliminado correctamente');
    },
    onError: (error: any) => {
      console.error('[Contract Links] Delete error:', error);
      toast.error('Error al eliminar link');
    }
  });

  const getPublicLink = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/contrato/${token}`;
  };

  return {
    links: links || [],
    isLoading,
    generateLink,
    deleteLink,
    getPublicLink
  };
};
