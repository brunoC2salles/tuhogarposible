import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadDocument {
  name: string;
  id: string;
  created_at: string;
}

// Sanitizar nombre de archivo para evitar errores en Supabase Storage
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_');
};

export const useLeadDocuments = (leadId: string) => {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('lead-documents')
        .list(leadId, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  const uploadDocument = async (file: File) => {
    if (!leadId) {
      toast.error('ID de lead inválido');
      return false;
    }

    // Validar tipo de archivo (PDF e imagens)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF e imágenes (JPG, PNG, GIF, WEBP)');
      return false;
    }

    // Validar tamaño (10MB máximo)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB en bytes
    if (file.size > MAX_SIZE) {
      toast.error('El archivo no puede superar los 10MB');
      return false;
    }

    setUploading(true);
    try {
      // Sanitizar nombre del archivo para evitar errores con caracteres especiales
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `${leadId}/${sanitizedFileName}`;

      const { error } = await supabase.storage
        .from('lead-documents')
        .upload(filePath, file, {
          upsert: false, // No sobrescribir si existe
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Ya existe un archivo con ese nombre');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Documento subido exitosamente');
      await fetchDocuments();
      return true;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (fileName: string) => {
    if (!leadId) return;

    try {
      const { data, error } = await supabase.storage
        .from('lead-documents')
        .download(`${leadId}/${fileName}`);

      if (error) throw error;

      // Crear URL para descargar
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Documento descargado');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar el documento');
    }
  };

  const deleteDocument = async (fileName: string) => {
    if (!leadId) return false;

    try {
      const { error } = await supabase.storage
        .from('lead-documents')
        .remove([`${leadId}/${fileName}`]);

      if (error) throw error;

      toast.success('Documento eliminado');
      await fetchDocuments();
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
      return false;
    }
  };

  const getPreviewUrl = async (fileName: string): Promise<string | null> => {
    if (!leadId) return null;

    try {
      const { data, error } = await supabase.storage
        .from('lead-documents')
        .createSignedUrl(`${leadId}/${fileName}`, 3600); // 1 hora

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error: any) {
      console.error('Error getting preview URL:', error);
      toast.error('Error al obtener la vista previa');
      return null;
    }
  };

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    getPreviewUrl,
    refreshDocuments: fetchDocuments,
  };
};
