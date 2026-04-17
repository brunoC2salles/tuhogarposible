import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeadDocumentToken {
  id: string;
  lead_id: string | null;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const generateToken = (length = 32) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
};

export const useLeadDocumentTokens = (leadId: string | undefined) => {
  const [tokens, setTokens] = useState<LeadDocumentToken[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTokens = async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lead_document_tokens")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (data) setTokens(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const createToken = async (): Promise<LeadDocumentToken | null> => {
    if (!leadId) return null;
    const token = generateToken(32);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("lead_document_tokens")
      .insert({ lead_id: leadId, token, created_by: user?.id })
      .select()
      .single();
    if (error) {
      console.error("createToken error:", error);
      return null;
    }
    await fetchTokens();
    return data as any;
  };

  const buildPublicUrl = (token: string) => {
    return `${window.location.origin}/documentos/${token}`;
  };

  return { tokens, loading, createToken, buildPublicUrl, refetch: fetchTokens };
};

/** Hook para gerar tokens standalone (sem lead associado) */
export const useStandaloneTokens = () => {
  const [tokens, setTokens] = useState<LeadDocumentToken[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTokens = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lead_document_tokens")
      .select("*")
      .is("lead_id", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setTokens(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const createToken = async (): Promise<LeadDocumentToken | null> => {
    const token = generateToken(32);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("lead_document_tokens")
      .insert({ lead_id: null, token, created_by: user?.id })
      .select()
      .single();
    if (error) {
      console.error("createStandaloneToken error:", error);
      return null;
    }
    await fetchTokens();
    return data as any;
  };

  const buildPublicUrl = (token: string) => {
    return `${window.location.origin}/documentos/${token}`;
  };

  return { tokens, loading, createToken, buildPublicUrl, refetch: fetchTokens };
};
