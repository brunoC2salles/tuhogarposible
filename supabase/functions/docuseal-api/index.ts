import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const DOCUSEAL_API_URL = 'https://api.docuseal.com';
const DOCUSEAL_API_TOKEN = Deno.env.get('DOCUSEAL_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/docuseal-api/', '');

    console.log('[DocuSeal API] Path:', path);

    // Endpoint: POST /send-for-signature
    if (path === 'send-for-signature' && req.method === 'POST') {
      const { contractId, signerEmail, signerName } = await req.json();

      console.log('[DocuSeal] Sending contract for signature:', { contractId, signerEmail });

      // Buscar contrato
      const { data: contract, error: contractError } = await supabase
        .from('generated_contracts')
        .select('*, leads(nombre_completo, email, telefono)')
        .eq('id', contractId)
        .single();

      if (contractError || !contract) {
        throw new Error('Contrato não encontrado');
      }

      // Buscar PDF do storage
      if (!contract.file_path) {
        throw new Error('Contrato não possui PDF gerado');
      }

      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('generated-contracts')
        .download(contract.file_path);

      if (downloadError || !pdfData) {
        throw new Error('Erro ao baixar PDF: ' + downloadError?.message);
      }

      // Converter Blob para base64
      const arrayBuffer = await pdfData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Enviar para DocuSeal
      const docusealPayload = {
        template: {
          name: `Contrato ${contract.tipo_contrato} - ${contract.leads?.nombre_completo}`,
          documents: [
            {
              name: 'contrato.pdf',
              file: `data:application/pdf;base64,${base64}`
            }
          ],
          fields: [
            {
              name: 'signature',
              type: 'signature',
              submitter_uuid: 'signer',
              required: true,
              page: 0,
              x: 100,
              y: 700,
              w: 150,
              h: 50
            }
          ],
          submitters: [
            {
              uuid: 'signer',
              name: signerName || contract.leads?.nombre_completo || 'Cliente'
            }
          ]
        },
        submissions: [
          {
            submitter_uuid: 'signer',
            email: signerEmail || contract.leads?.email,
            send_email: true,
            message: `Por favor firme el contrato de ${contract.tipo_contrato}`,
            metadata: {
              contract_id: contractId,
              lead_name: contract.leads?.nombre_completo
            }
          }
        ]
      };

      console.log('[DocuSeal] Sending request to DocuSeal API');

      const docusealResponse = await fetch(`${DOCUSEAL_API_URL}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': DOCUSEAL_API_TOKEN || ''
        },
        body: JSON.stringify(docusealPayload)
      });

      if (!docusealResponse.ok) {
        const errorText = await docusealResponse.text();
        console.error('[DocuSeal] API Error:', errorText);
        throw new Error(`DocuSeal API error: ${docusealResponse.status} - ${errorText}`);
      }

      const docusealResult = await docusealResponse.json();
      console.log('[DocuSeal] Template created:', docusealResult);

      // Extrair submission ID (primeiro submission da resposta)
      const submissionId = docusealResult.submissions?.[0]?.id;

      if (!submissionId) {
        throw new Error('DocuSeal não retornou submission ID');
      }

      // Atualizar contrato com status de assinatura
      const { error: updateError } = await supabase
        .from('generated_contracts')
        .update({
          signature_status: 'sent',
          signature_submission_id: submissionId
        })
        .eq('id', contractId);

      if (updateError) {
        console.error('[DocuSeal] Error updating contract:', updateError);
      }

      console.log('[DocuSeal] Contract updated with submission ID:', submissionId);

      return new Response(
        JSON.stringify({
          success: true,
          submissionId,
          message: 'Contrato enviado para assinatura'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Endpoint: POST /webhook
    if (path === 'webhook' && req.method === 'POST') {
      const webhook = await req.json();
      console.log('[DocuSeal Webhook] Received:', webhook);

      const { submission_id, status, metadata } = webhook;

      if (status === 'completed') {
        console.log('[DocuSeal Webhook] Submission completed:', submission_id);

        // Buscar contrato pelo submission_id
        const { data: contract, error: findError } = await supabase
          .from('generated_contracts')
          .select('*')
          .eq('signature_submission_id', submission_id)
          .single();

        if (findError || !contract) {
          console.error('[DocuSeal Webhook] Contract not found for submission:', submission_id);
          return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404 });
        }

        // Buscar PDF assinado do DocuSeal
        const signedPdfResponse = await fetch(
          `${DOCUSEAL_API_URL}/submissions/${submission_id}/download`,
          {
            headers: {
              'X-Auth-Token': DOCUSEAL_API_TOKEN || ''
            }
          }
        );

        if (signedPdfResponse.ok) {
          const signedPdfBlob = await signedPdfResponse.blob();

          // Salvar PDF assinado no storage
          const signedFileName = `${contract.generated_by}/${Date.now()}_signed_${submission_id}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('generated-contracts')
            .upload(signedFileName, signedPdfBlob);

          if (!uploadError) {
            // Atualizar contrato com PDF assinado
            await supabase
              .from('generated_contracts')
              .update({
                signature_status: 'signed',
                signed_file_path: signedFileName,
                signed_at: new Date().toISOString()
              })
              .eq('id', contract.id);

            console.log('[DocuSeal Webhook] Contract updated with signed PDF');
          } else {
            console.error('[DocuSeal Webhook] Error uploading signed PDF:', uploadError);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Endpoint: GET /status/:submissionId
    if (path.startsWith('status/') && req.method === 'GET') {
      const submissionId = path.replace('status/', '');

      const statusResponse = await fetch(
        `${DOCUSEAL_API_URL}/submissions/${submissionId}`,
        {
          headers: {
            'X-Auth-Token': DOCUSEAL_API_TOKEN || ''
          }
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to fetch DocuSeal status');
      }

      const statusData = await statusResponse.json();

      return new Response(JSON.stringify(statusData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[DocuSeal API] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
