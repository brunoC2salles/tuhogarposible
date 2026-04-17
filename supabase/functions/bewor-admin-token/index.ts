// Admin-only: faz login na Bewor e cria um third-party token (JWT) que pode ser usado em chamadas server-to-server.
// O usuário deve copiar o token retornado e adicioná-lo como secret BEWOR_THIRD_PARTY_JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: userErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar role admin
    const userId = userData.user.id;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("BEWOR_BASE_URL")!;
    const email = Deno.env.get("BEWOR_EMAIL")!;
    const password = Deno.env.get("BEWOR_PASSWORD")!;

    // 1. Login na Bewor
    const loginRes = await fetch(`${baseUrl}/api/v1/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      return new Response(
        JSON.stringify({ error: "Bewor login failed", status: loginRes.status, body: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loginData = await loginRes.json();
    const accessToken = loginData?.token || loginData?.access_token || loginData?.accessToken;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "No access_token in Bewor login response", response: loginData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Criar third-party token
    const tpRes = await fetch(`${baseUrl}/api/v1/company/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: "Tu Hogar Posible CRM" }),
    });

    if (!tpRes.ok) {
      const text = await tpRes.text();
      return new Response(
        JSON.stringify({ error: "Bewor third-party token creation failed", status: tpRes.status, body: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tpData = await tpRes.json();
    const thirdPartyToken =
      tpData?.token || tpData?.access_token || tpData?.jwt || tpData?.thirdPartyToken;

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Copia o valor de 'third_party_token' abaixo e adiciona como secret BEWOR_THIRD_PARTY_JWT.",
        third_party_token: thirdPartyToken,
        raw: tpData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bewor-admin-token error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
