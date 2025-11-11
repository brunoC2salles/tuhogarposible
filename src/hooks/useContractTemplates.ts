import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContractTemplate, CampoFormulario } from '@/types/contratos';
import { toast } from 'sonner';

export const useContractTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        campos_formulario: t.campos_formulario as any as CampoFormulario[]
      })) as ContractTemplate[];
    }
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<ContractTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          nombre: template.nombre!,
          descripcion: template.descripcion,
          campos_formulario: template.campos_formulario as any,
          template_content: template.template_content!,
          activo: template.activo,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: any) => {
      console.error('[Templates] Create error:', error);
      toast.error('Erro ao criar template');
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractTemplate> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updateData.campos_formulario) {
        updateData.campos_formulario = updateData.campos_formulario as any;
      }
      
      const { data, error } = await supabase
        .from('contract_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: any) => {
      console.error('[Templates] Update error:', error);
      toast.error('Erro ao atualizar template');
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('Template excluído com sucesso');
    },
    onError: (error: any) => {
      console.error('[Templates] Delete error:', error);
      toast.error('Erro ao excluir template');
    }
  });

  return {
    templates: templates || [],
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
};
