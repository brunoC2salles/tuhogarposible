import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AgentCandidate, AgentCandidateFormData, AgentCandidateStage, AgentCandidateDocument } from '@/types/reclutamiento';

export const useAgentCandidates = () => {
  const [candidates, setCandidates] = useState<AgentCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
      toast.error('Error al cargar candidatos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const createCandidate = async (candidateData: AgentCandidateFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('agent_candidates')
        .insert({
          ...candidateData,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Candidato creado correctamente');
      await fetchCandidates();
      return true;
    } catch (error: any) {
      console.error('Error creating candidate:', error);
      toast.error('Error al crear candidato');
      return false;
    }
  };

  const updateCandidate = async (candidateId: string, updates: Partial<AgentCandidate>) => {
    try {
      const { error } = await supabase
        .from('agent_candidates')
        .update(updates)
        .eq('id', candidateId);

      if (error) throw error;

      toast.success('Candidato actualizado');
      await fetchCandidates();
      return true;
    } catch (error: any) {
      console.error('Error updating candidate:', error);
      toast.error('Error al actualizar candidato');
      return false;
    }
  };

  const updateCandidateStage = async (candidateId: string, newStage: AgentCandidateStage) => {
    return updateCandidate(candidateId, { stage: newStage });
  };

  const deleteCandidate = async (candidateId: string) => {
    try {
      const { error } = await supabase
        .from('agent_candidates')
        .delete()
        .eq('id', candidateId);

      if (error) throw error;

      toast.success('Candidato eliminado');
      await fetchCandidates();
      return true;
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast.error('Error al eliminar candidato');
      return false;
    }
  };

  const fetchCandidateDocuments = async (candidateId: string): Promise<AgentCandidateDocument[]> => {
    try {
      const { data, error } = await supabase
        .from('agent_candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      return [];
    }
  };

  const uploadDocument = async (candidateId: string, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidateId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-candidate-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agent-candidate-documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('agent_candidate_documents')
        .insert({
          candidate_id: candidateId,
          file_name: file.name,
          file_path: publicUrl,
          file_size: file.size,
          uploaded_by: user?.id
        });

      if (insertError) throw insertError;

      toast.success('Documento subido correctamente');
      return true;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
      return false;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('agent_candidate_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Documento eliminado');
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar documento');
      return false;
    }
  };

  return {
    candidates,
    loading,
    createCandidate,
    updateCandidate,
    updateCandidateStage,
    deleteCandidate,
    fetchCandidateDocuments,
    uploadDocument,
    deleteDocument,
    refetch: fetchCandidates
  };
};
