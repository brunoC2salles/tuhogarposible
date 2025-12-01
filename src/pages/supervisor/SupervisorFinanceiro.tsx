import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductInvoices } from '@/hooks/useProductInvoices';
import { useFaturacoes } from '@/hooks/useFaturacoes';
import { DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SupervisorFinanceiro = () => {
  const { profile } = useAuth();
  const { invoices, isLoading: loadingInvoices } = useProductInvoices();
  const { faturacoes, isLoading: loadingFaturacoes } = useFaturacoes();

  // Filtrar apenas faturas do supervisor
  const myInvoices = invoices.filter(inv => inv.agent_id === profile?.id);
  const myFaturacoes = faturacoes.filter(fat => fat.agente_id === profile?.id);

  // Calcular totais
  const totalInvoices = myInvoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0);
  const totalFaturacoes = myFaturacoes.reduce((sum, fat) => sum + fat.valor, 0);
  const totalComissoes = totalInvoices * ((profile?.comision_porcentaje || 0) / 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mi Control Financiero</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalFaturacoes)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisión ({profile?.comision_porcentaje}%)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalComissoes)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas de Productos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myInvoices.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Product Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Facturas de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="text-center py-8">Cargando...</div>
            ) : myInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay facturas</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.lead_name}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Caducada' : 'Generada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.created_at && format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Faturacoes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Facturaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFaturacoes ? (
              <div className="text-center py-8">Cargando...</div>
            ) : myFaturacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay facturaciones</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myFaturacoes.map((fat) => (
                    <TableRow key={fat.id}>
                      <TableCell className="font-medium">{fat.descricao}</TableCell>
                      <TableCell>{fat.cliente_nome || '-'}</TableCell>
                      <TableCell>{formatCurrency(fat.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={fat.status === 'pago' ? 'default' : 'secondary'}>
                          {fat.status || 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fat.data_faturacao && format(new Date(fat.data_faturacao), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorFinanceiro;