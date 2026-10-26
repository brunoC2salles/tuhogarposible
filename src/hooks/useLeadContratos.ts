import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tabla nueva (20/10/2026) aún no incluida en los tipos generados de Supabase
const db = supabase as any;

export type ContratoEstado = 'pendiente' | 'generando' | 'firmando' | 'firmado' | 'error';

export interface LeadContrato {
  id: string;
  lead_id: string;
  token: string;
  honorarios: number;
  expires_at: string;
  estado: ContratoEstado;
  datos: { nombre: string; dni: string; domicilio: string; email: string } | null;
  enviado_at: string | null;
  pdf_path: string | null;
  lumin_status: string | null;
  firmado_path: string | null;
  firmado_at: string | null;
  // Encargo de Servicio de Tu Mejor Hipoteca (26/10/2026)
  tmh_pdf_path: string | null;
  tmh_lumin_status: string | null;
  tmh_firmado_path: string | null;
  tmh_firmado_at: string | null;
  error: string | null;
  created_at: string;
}

export const HONORARIOS_DEFECTO = 6000;

export const contratoUrl = (token: string) => `${window.location.origin}/contrato/${token}`;

/** Contratos generados antes del 26/10/2026 no tienen encargo TMH */
export const tieneTmh = (c: LeadContrato) => !!c.tmh_pdf_path;

export const contratoExpirado = (c: LeadContrato) =>
  c.estado === 'pendiente' && new Date(c.expires_at).getTime() < Date.now();

/** Contratos de un lead: mandato de compra + encargo TMH (último primero) */
export const useLeadContratos = (leadId: string | null) => {
  const [contratos, setContratos] = useState<LeadContrato[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContratos = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data, error } = await db
      .from('lead_contratos')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Contratos] Fetch error:', error);
      toast.error('Error al cargar los contratos');
    } else {
      setContratos((data || []) as LeadContrato[]);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchContratos(); }, [fetchContratos]);

  const crearContrato = async (honorarios: number): Promise<LeadContrato | null> => {
    if (!leadId) return null;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await db
      .from('lead_contratos')
      .insert({ lead_id: leadId, honorarios, created_by: u.user?.id })
      .select('*')
      .single();
    if (error) {
      console.error('[Contratos] Create error:', error);
      toast.error('No se pudo generar el enlace');
      return null;
    }
    await fetchContratos();
    return data as LeadContrato;
  };

  /** URL temporal (1 h) para descargar el PDF del bucket privado */
  const descargar = async (path: string, nombre: string) => {
    const { data, error } = await supabase.storage.from('mandatos').createSignedUrl(path, 3600, { download: nombre });
    if (error || !data?.signedUrl) {
      toast.error('No se pudo descargar el contrato');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  return { contratos, loading, fetchContratos, crearContrato, descargar };
};
