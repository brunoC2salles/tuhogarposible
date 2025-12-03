import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductInvoices } from '@/hooks/useProductInvoices';
import { useFaturacoes } from '@/hooks/useFaturacoes';
import { useAgentVariableCosts } from '@/hooks/useAgentVariableCosts';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SupervisorFinanceiro = () => {
  const { profile } = useAuth();
  const { invoices, isLoading: loadingInvoices } = useProductInvoices();
  const { faturacoes, isLoading: loadingFaturacoes } = useFaturacoes();
  const { costs, isLoading: loadingCosts, calculateMonthlyBalance } = useAgentVariableCosts(profile?.id);

  // Filtrar apenas faturas do supervisor (pagas)
  const myInvoices = invoices.filter(inv => inv.agent_id === profile?.id);
  const myPaidInvoices = myInvoices.filter(inv => inv.status === 'pagada' || inv.paid_at);
  const myFaturacoes = faturacoes.filter(fat => fat.agente_id === profile?.id);

  // Calcular totais
  const totalPaidInvoices = myPaidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalFaturacoes = myFaturacoes.reduce((sum, fat) => sum + fat.valor, 0);
  const totalComissoes = totalPaidInvoices * ((profile?.comision_porcentaje || 0) / 100);
  
  // Saldo mensal previsto (baseado em custos variáveis pendentes do mês atual)
  const saldoMensual = calculateMonthlyBalance();

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Mensual Previsto</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(saldoMensual)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Comisiones pendientes este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facturado (Pagado)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPaidInvoices)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {myPaidInvoices.length} facturas pagadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mi Comisión ({profile?.comision_porcentaje}%)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalComissoes)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas de Productos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myInvoices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total asignadas
              </p>
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
                        <Badge variant={invoice.status === 'pagada' || invoice.paid_at ? 'default' : 'secondary'}>
                          {invoice.status === 'pagada' || invoice.paid_at ? 'Pagada' : invoice.status === 'draft' ? 'Borrador' : 'Generada'}
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

        {/* My Variable Costs (Commissions) */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Comisiones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCosts ? (
              <div className="text-center py-8">Cargando...</div>
            ) : costs.filter(c => c.status === 'pendiente').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay comisiones pendientes</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.filter(c => c.status === 'pendiente').map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">{cost.description}</TableCell>
                      <TableCell className="text-primary font-semibold">{formatCurrency(cost.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pendiente</Badge>
                      </TableCell>
                      <TableCell>
                        {cost.created_at && format(new Date(cost.created_at), 'dd MMM yyyy', { locale: es })}
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
