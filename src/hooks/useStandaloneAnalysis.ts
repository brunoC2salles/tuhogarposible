import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LeadDocumentAnalysis } from "./useLeadDocumentAnalysis";

/** Análises sem lead vinculado (standalone) — para área "Análisis sin asignar" */
export const useStandaloneAnalysis = () => {
  const [analyses, setAnalyses] = useState<LeadDocumentAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_document_analysis")
      .select("*")
      .is("lead_id", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setAnalyses(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalyses();

    const channel = supabase
      .channel("standalone_doc_analysis")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_document_analysis",
          filter: "lead_id=is.null",
        },
        () => fetchAnalyses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const linkToLead = async (analysisId: string, leadId: string) => {
    const { error } = await supabase
      .from("lead_document_analysis")
      .update({ lead_id: leadId })
      .eq("id", analysisId);
    if (error) {
      console.error("linkToLead error:", error);
      return false;
    }
    await fetchAnalyses();
    return true;
  };

  return { analyses, loading, refetch: fetchAnalyses, linkToLead };
};
