import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductInvoice {
  id: string;
  invoice_number: string;
  lead_id?: string;
  lead_name: string;
  property_price?: number;
  monto_directo?: number;
  descripcion_directa?: string;
  aplicar_iva?: boolean;
  agent_id?: string;
  client_company_name: string;
  client_address: string;
  client_dni_nif: string;
  client_email: string;
  nota_simples: boolean;
  tasaciones: boolean;
  beneficios: boolean;
  inspeccion_tecnica: boolean;
  iva_incluido: boolean;
  comision_vivienda: boolean;
  comision_vivienda_percent?: number;
  credito: boolean;
  credito_valor?: number;
  hipoteca: boolean;
  hipoteca_percent?: number;
  subtotal: number;
  iva_amount: number;
  total: number;
  status: string;
  pdf_path?: string;
  payment_due_date?: string;
  paid_at?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export const useProductInvoices = () => {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['product-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductInvoice[];
    }
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: Omit<ProductInvoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get next invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('get_next_invoice_number');
      
      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from('product_invoices')
        .insert({
          ...invoice,
          invoice_number: invoiceNumber as string,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-invoices'] });
      toast.success('Factura creada exitosamente');
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error('Error al crear factura');
    }
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...invoice }: Partial<ProductInvoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_invoices')
        .update(invoice)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-invoices'] });
      toast.success('Factura actualizada exitosamente');
    },
    onError: () => toast.error('Error al actualizar factura')
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-invoices'] });
      toast.success('Factura eliminada exitosamente');
    },
    onError: () => toast.error('Error al eliminar factura')
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      // Get invoice details first
      const { data: invoice, error: fetchError } = await supabase
        .from('product_invoices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Update invoice status
      const { data, error } = await supabase
        .from('product_invoices')
        .update({ 
          status: 'pagada',
          paid_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Create variable costs for agent commission (if agent assigned)
      // NOTE: Bruno's commission is now calculated monthly on total billing, not per invoice
      if (invoice.agent_id) {
        const agentCommissionPercent = 0;
        const agentCommission = invoice.total * (agentCommissionPercent / 100);
        
        if (agentCommission > 0) {
          await supabase.from('agent_variable_costs').insert({
            invoice_id: id,
            agent_id: invoice.agent_id,
            description: `Comisión ${agentCommissionPercent}% - Factura ${invoice.invoice_number}`,
            amount: agentCommission,
            status: 'pendiente'
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['agent-variable-costs'] });
      toast.success('Factura marcada como pagada - Comisión del agente creada');
    },
    onError: () => toast.error('Error al marcar factura como pagada')
  });

  return {
    invoices: invoices || [],
    isLoading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid
  };
};
