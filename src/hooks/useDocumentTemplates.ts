import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DocumentTemplate, DocumentType } from '@/types/academia';
import { toast } from 'sonner';

export const useDocumentTemplates = (tipo?: DocumentType) => {
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['document-templates', tipo],
    queryFn: async () => {
      let query = supabase
        .from('document_templates')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentTemplate[];
    }
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, titulo, descripcion, tipo }: { 
      file: File; 
      titulo: string; 
      descripcion?: string;
      tipo: DocumentType;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Upload file to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contract-templates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          titulo,
          descripcion,
          tipo,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success('Documento subido correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al subir documento: ' + error.message);
    }
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: DocumentTemplate) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contract-templates')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success('Documento eliminado correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar documento: ' + error.message);
    }
  });

  const getDownloadUrl = async (filePath: string): Promise<string> => {
    const { data } = await supabase.storage
      .from('contract-templates')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (!data?.signedUrl) throw new Error('No se pudo generar URL de descarga');
    return data.signedUrl;
  };

  return {
    documents: documents || [],
    isLoading,
    uploadDocument,
    deleteDocument,
    getDownloadUrl
  };
};
