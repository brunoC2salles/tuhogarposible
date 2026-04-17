import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeadDocumentAnalysis {
  id: string;
  lead_id: string;
  request_id: string | null;
  tipo: string;
  status: string;
  file_path: string | null;
  result: any;
  viabilidade_sugerida: any;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
  updated_at: string;
}

export const useLeadDocumentAnalysis = (leadId: string | undefined) => {
  const [analyses, setAnalyses] = useState<LeadDocumentAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = async () => {
    if (!leadId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_document_analysis")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (!error && data) setAnalyses(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!leadId) return;
    fetchAnalyses();

    const channel = supabase
      .channel(`lead_doc_analysis_${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_document_analysis",
          filter: `lead_id=eq.${leadId}`,
        },
        () => fetchAnalyses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  return { analyses, loading, refetch: fetchAnalyses };
};
