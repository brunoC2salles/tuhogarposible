import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductInvoice {
  id: string;
  invoice_number: string;
  lead_name: string;
  total: number;
  payment_due_date: string;
  agent_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting invoice deadline check...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calcular data de hoje e data de 3 dias a partir de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    console.log('Checking invoices between:', today.toISOString(), 'and', threeDaysFromNow.toISOString());

    // Buscar faturas não pagas com vencimento nos próximos 3 dias
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from('product_invoices')
      .select('id, invoice_number, lead_name, total, payment_due_date, agent_id')
      .is('paid_at', null)
      .gte('payment_due_date', today.toISOString())
      .lte('payment_due_date', threeDaysFromNow.toISOString())
      .eq('status', 'generada');

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      throw invoicesError;
    }

    console.log(`Found ${invoices?.length || 0} invoices near deadline`);

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No invoices near deadline found',
          count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Buscar todos os admins
    const { data: admins, error: adminsError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      throw adminsError;
    }

    console.log(`Found ${admins?.length || 0} admins to notify`);

    // Criar notificações para cada admin para cada fatura
    const notifications = [];
    for (const invoice of invoices) {
      const dueDate = new Date(invoice.payment_due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
      };

      const message = daysUntilDue === 0 
        ? `La factura ${invoice.invoice_number} (${invoice.lead_name}) vence HOY. Total: ${formatCurrency(invoice.total)}`
        : `La factura ${invoice.invoice_number} (${invoice.lead_name}) vence en ${daysUntilDue} día${daysUntilDue > 1 ? 's' : ''}. Total: ${formatCurrency(invoice.total)}`;

      for (const admin of admins || []) {
        notifications.push({
          user_id: admin.user_id,
          type: 'payment_deadline',
          title: 'Factura Próxima al Vencimiento',
          message,
          link: '/admin/financeiro',
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            lead_name: invoice.lead_name,
            due_date: invoice.payment_due_date,
            days_until_due: daysUntilDue,
            total: invoice.total
          }
        });
      }

      // Notificar também o agente se houver
      if (invoice.agent_id) {
        notifications.push({
          user_id: invoice.agent_id,
          type: 'payment_deadline',
          title: 'Factura Próxima al Vencimiento',
          message,
          link: '/agente/financeiro',
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            lead_name: invoice.lead_name,
            due_date: invoice.payment_due_date,
            days_until_due: daysUntilDue,
            total: invoice.total
          }
        });
      }
    }

    console.log(`Creating ${notifications.length} notifications...`);

    // Inserir todas as notificações
    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (notificationsError) {
      console.error('Error creating notifications:', notificationsError);
      throw notificationsError;
    }

    console.log('Invoice deadline check completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully checked ${invoices.length} invoices and created ${notifications.length} notifications`,
        invoicesChecked: invoices.length,
        notificationsCreated: notifications.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in check-invoice-deadlines function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
